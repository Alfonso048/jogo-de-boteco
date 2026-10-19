/* ============================================================
   ai.js — bots: Fácil, Médio, Difícil (com blefe do Médio pra cima)
   ============================================================ */

const AI = {
  // 0..1 — força relativa de uma carta
  norm(game, card) {
    const p = game.power(card);
    if (p >= 100) return 0.88 + (p - 100) * 0.03; // manilhas: 0.91 .. 1.0
    return p / 9 * 0.82;
  },

  handStrength(game, player) {
    if (!player.hand.length) return 0;
    const vals = player.hand.map((c) => this.norm(game, c)).sort((a, b) => b - a);
    // a melhor carta pesa mais
    const w = [0.5, 0.3, 0.2];
    let s = 0, tw = 0;
    vals.forEach((v, i) => { s += v * (w[i] ?? 0.1); tw += (w[i] ?? 0.1); });
    return s / tw;
  },

  // melhor carta na mesa até agora e de quem é
  tableBest(game) {
    let best = null;
    for (const mv of game.hand.table) {
      const pw = game.power(mv.card);
      if (!best || pw > best.pw) best = { ...mv, pw };
    }
    return best;
  },

  chance(p) { return Math.random() < p; },

  BASE: {
    easy: { bluff: 0, aggr: 0.25, skill: 0.25, accept: 0.42, raise: 0.0 },
    medium: { bluff: 0.15, aggr: 0.5, skill: 0.65, accept: 0.36, raise: 0.08 },
    hard: { bluff: 0.26, aggr: 0.72, skill: 1.0, accept: 0.3, raise: 0.18 },
  },

  /* O bot evolui no modo história: game.cfg.edge (0..1) vem da fama
     e do nível de revanche do adversário. Quanto maior, mais técnico,
     mais blefe e menos medo de aumentar.
     game.debuffHands > 0 (cerveja) derruba o adversário para fácil. */
  profile(game) {
    if (game.debuffHands > 0) return { ...this.BASE.easy };

    const d = game.cfg.difficulty;
    const p = { ...(this.BASE[d] || this.BASE.hard) };
    const e = Math.max(0, Math.min(1, game.cfg.edge || 0));
    if (e <= 0) return p;

    p.skill = Math.min(1, p.skill + 0.45 * e);
    p.bluff = Math.min(0.5, p.bluff + 0.22 * e);
    p.aggr = Math.min(0.95, p.aggr + 0.25 * e);
    p.raise = Math.min(0.4, p.raise + 0.2 * e);
    p.accept = Math.max(0.16, p.accept - 0.14 * e); // corre menos, aceita mais frio
    return p;
  },

  /* ---------- escolha de jogada ---------- */
  decideTurn(game, player, mustPlay = false) {
    const prof = { ...this.profile(game) };
    if (player.isStoryPartner) {
      prof.skill = Math.min(1, prof.skill + Math.min(0.15, Math.max(0, player.bond || 0) * 0.015));
    }
    const str = this.handStrength(game, player);
    const opts = game.betOptions(player);

    // --- decide se pede truco/aumento ---
    if (!mustPlay && opts.canBet) {
      const rw = game.hand.roundWins;
      let want = 0;
      if (str > 0.78) want = 0.55 * prof.aggr + 0.35;
      else if (str > 0.6) want = 0.4 * prof.aggr;
      else if (str > 0.45) want = 0.18 * prof.aggr;
      // ganhou a primeira rodada: aperta
      if (rw[player.team] > rw[1 - player.team]) want += 0.22 * prof.aggr;
      // está perdendo feio: arrisca
      const mine = game.scores[player.team], theirs = game.scores[1 - player.team];
      if (theirs - mine >= 6) want += 0.15;
      // blefe puro
      if (str < 0.38 && this.chance(prof.bluff)) want = 0.65;
      // bluff = mão fraca de verdade; usado pelos tiques (faces.js)
      if (this.chance(want)) return { type: 'bet', value: opts.nextValue, bluff: str < 0.5 };
    }

    // --- escolhe a carta ---
    const hand = [...player.hand].sort((a, b) => game.power(a) - game.power(b));
    const best = this.tableBest(game);

    // bot fraco: pouca noção
    if (prof.skill < 0.4 && this.chance(0.45)) {
      return { type: 'play', card: hand[Math.floor(Math.random() * hand.length)] };
    }

    if (!best) {
      // abre a rodada
      const rw = game.hand.roundWins;
      if (game.hand.round === 0) {
        // guarda a manilha, abre com a média/forte conforme perfil
        return { type: 'play', card: prof.skill > 0.6 ? (hand[hand.length - 1] && str > 0.7 ? hand[hand.length - 2] || hand[0] : hand[hand.length - 1]) : hand[hand.length - 1] };
      }
      if (rw[player.team] > rw[1 - player.team]) {
        // basta empatar/ganhar: manda a maior
        return { type: 'play', card: hand[hand.length - 1] };
      }
      return { type: 'play', card: hand[hand.length - 1] };
    }

    const partnerWinning = best.team === player.team;
    if (partnerWinning && prof.skill > 0.5) {
      // parceiro está ganhando: economiza carta
      return { type: 'play', card: hand[0] };
    }

    // menor carta que mata a da mesa
    const killer = hand.find((c) => game.power(c) > best.pw);
    const tier = hand.find((c) => game.power(c) === best.pw);
    if (killer) {
      // difícil evita gastar zap em rodada irrelevante
      if (prof.skill > 0.8 && game.power(killer) >= 104 && game.hand.roundWins[player.team] === 0 && game.hand.round === 0) {
        const alt = hand.find((c) => game.power(c) > best.pw && game.power(c) < 104);
        if (alt) return { type: 'play', card: alt };
      }
      return { type: 'play', card: killer };
    }
    if (tier && prof.skill > 0.5) return { type: 'play', card: tier };
    return { type: 'play', card: hand[0] };
  },

  /* ---------- resposta a truco ---------- */
  decideBetResponse(game, player, value) {
    const prof = this.profile(game);
    const str = this.handStrength(game, player);
    const rw = game.hand.roundWins;
    let eff = str;
    if (rw[player.team] > rw[1 - player.team]) eff += 0.12;
    if (rw[player.team] < rw[1 - player.team]) eff -= 0.12;
    // já viu cartas na mesa? se está ganhando a vaza, confia mais
    const best = this.tableBest(game);
    if (best && best.team === player.team) eff += 0.08;

    // desespero: perdendo muito, aceita mais
    const mine = game.scores[player.team], theirs = game.scores[1 - player.team];
    if (theirs - mine >= 6) eff += 0.1;
    // quase ganhando, protege o placar
    if (mine >= game.target - 4) eff -= 0.05;

    const nextValue = [1, 3, 6, 9, 12][[1, 3, 6, 9, 12].indexOf(value) + 1];

    if (eff > 0.8 && nextValue && this.chance(prof.raise + 0.25)) return { type: 'raise', value: nextValue, bluff: false };
    if (eff < 0.3 && nextValue && this.chance(prof.bluff * 0.5)) return { type: 'raise', value: nextValue, bluff: true }; // contra-blefe
    if (eff >= prof.accept) return { type: 'accept' };
    if (this.chance(0.12)) return { type: 'accept' }; // teimosia
    return { type: 'run' };
  },
};
