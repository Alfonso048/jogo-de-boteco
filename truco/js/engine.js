/* ============================================================
   engine.js — motor de regras do Truco (Paulista / Mineiro)
   Fluxo assíncrono: o motor pede decisões ao adaptador de UI.
   ============================================================ */

const BET_CHAIN = [1, 3, 6, 9, 12];

class TrucoGame {
  /**
   * @param {object} cfg {variant, players:[{name,team,isHuman}], target, difficulty}
   * @param {object} ui  adaptador (ver ui.js)
   */
  constructor(cfg, ui) {
    this.cfg = cfg;
    this.ui = ui;
    this.variant = cfg.variant;
    this.target = cfg.target;
    this.players = cfg.players.map((p, i) => ({ ...p, i, hand: [] }));
    this.scores = [0, 0];
    this.dealer = Math.floor(Math.random() * this.players.length);
    this.aborted = false;
    this.history = [];
    // itens do modo história
    this.debuffHands = 0;    // cerveja: mãos em que os bots jogam mal
    this.mirror = 0;         // espelhinho: mãos com carta adversária revelada
    this.revealedEnemy = []; // [{ name, card }] da mão atual
    this.handNo = 0;
  }

  teamName(team) {
    return team === 0 ? T.t('us') : T.t('them');
  }

  // ---------- estado exposto para a UI ----------
  snapshot() {
    return {
      scores: this.scores,
      target: this.target,
      value: this.hand ? this.hand.value : 1,
      vira: this.hand ? this.hand.vira : null,
      manilhaRank: this.hand ? this.hand.manilhaRank : null,
      variant: this.variant,
      round: this.hand ? this.hand.round : 0,
      roundWins: this.hand ? this.hand.roundWins : [0, 0],
      table: this.hand ? this.hand.table : [],
      players: this.players,
      current: this.hand ? this.hand.current : -1,
      ironHand: this.hand ? this.hand.ironHand : false,
      revealPartner: this.hand ? this.hand.revealPartner : false,
      debuffHands: this.debuffHands,
      revealedEnemy: this.revealedEnemy,
    };
  }

  powerCtx() {
    return { variant: this.variant, manilhaRank: this.hand ? this.hand.manilhaRank : null };
  }

  power(card) { return cardPower(card, this.powerCtx()); }

  // ---------- laço principal ----------
  async run() {
    while (!this.aborted && this.scores[0] < this.target && this.scores[1] < this.target) {
      await this.playHand();
      this.dealer = (this.dealer + 1) % this.players.length;
    }
    if (this.aborted) return null;
    const winner = this.scores[0] >= this.target ? 0 : 1;
    await this.ui.announce(T.t('game_won', { team: this.teamName(winner) }), 'big');
    return winner;
  }

  // ---------- uma mão ----------
  async playHand() {
    this.handNo++;
    const deck = shuffle(makeDeck());
    const n = this.players.length;
    this.hand = {
      deck,
      value: this.cfg.weeklyRuleId === 'two-point-hand' ? 2 : 1,
      round: 0,
      roundWins: [0, 0],
      table: [],
      current: (this.dealer + 1) % n,
      vira: null,
      manilhaRank: null,
      betLocked: false,
      ironHand: false,
      revealPartner: this.cfg.weeklyRuleId === 'open-partner',
      lastBetTeam: -1,
      finished: false,
    };

    // distribui 3 cartas
    for (const p of this.players) p.hand = [];
    for (let k = 0; k < 3; k++) for (const p of this.players) p.hand.push(deck.pop());

    // vira (só Paulista)
    if (this.variant === 'paulista') {
      this.hand.vira = deck.pop();
      this.hand.manilhaRank = manilhaRankFromVira(this.hand.vira);
    }

    for (const p of this.players) {
      p.hand.sort((a, b) => this.power(a) - this.power(b));
    }

    // espelhinho: mostra uma carta de cada adversário nesta mão
    this.revealedEnemy = [];
    if (this.mirror > 0) {
      this.mirror--;
      this.players.filter((p) => p.team !== 0).forEach((p) => {
        const c = p.hand[Math.floor(Math.random() * p.hand.length)];
        if (c) this.revealedEnemy.push({ name: p.name, card: c });
      });
    }

    this.ui.update(this.snapshot());
    await this.ui.dealAnimation();
    if (this.aborted) return;

    // ----- Mão de Ferro (a 2 pontos da vitória) -----
    const thr = this.target - 2;
    const t0 = this.scores[0] >= thr, t1 = this.scores[1] >= thr;
    if (t0 || t1) {
      this.hand.ironHand = true;
      this.hand.betLocked = true;
      this.hand.value = 3;
      if (t0) this.hand.revealPartner = true; // time do jogador vê o parceiro
      this.ui.update(this.snapshot());
      const choice = t0 ? await this.ui.ironHandChoice() : 'play';
      if (this.aborted) return;
      if (choice === 'give') {
        this.scores[1] += 1;
        this.ui.update(this.snapshot());
        await this.ui.announce(T.t('hand_won', { team: this.teamName(1), points: 1 }));
        return;
      }
      await this.ui.announce(T.t('iron_hand'), 'big');
    }

    // ----- 3 rodadas -----
    while (this.hand.round < 3 && !this.hand.finished) {
      const res = await this.playRound();
      if (res === 'handOver') break;
    }

    if (this.aborted) return;
    if (!this.hand.finished) {
      // segurança: decide por rodadas ganhas
      const w = this.hand.roundWins[0] > this.hand.roundWins[1] ? 0 : 1;
      await this.awardHand(w);
    }

    // efeito da cerveja dura uma mão
    if (this.debuffHands > 0) this.debuffHands--;
    this.revealedEnemy = [];
  }

  activeOrder() {
    const n = this.players.length;
    const out = [];
    for (let k = 0; k < n; k++) out.push((this.hand.current + k) % n);
    return out;
  }

  // ---------- uma rodada (vaza) ----------
  async playRound() {
    const n = this.players.length;
    this.hand.table = [];
    const decisions = [];
    const order = this.activeOrder();

    for (const pi of order) {
      if (this.aborted || this.hand.finished) return 'handOver';
      const p = this.players[pi];
      this.hand.current = pi;
      this.ui.update(this.snapshot());

      // oportunidade de aposta + jogada
      let action;
      if (p.isHuman) {
        action = await this.ui.humanTurn(this.betOptions(p));
      } else {
        action = AI.decideTurn(this, p);
        await this.ui.thinking(p);
      }
      if (this.aborted) return 'handOver';

      if (action.type === 'bet') {
        this.hand.callerBluff = !!action.bluff;
        const accepted = await this.resolveBet(p, action.value);
        if (this.aborted) return 'handOver';
        if (this.hand.finished) return 'handOver';
        if (!accepted) return 'handOver';
        // após aceitar, o jogador segue e joga uma carta
        if (p.isHuman) action = await this.ui.humanTurn({ canBet: false });
        else action = AI.decideTurn(this, p, true);
        if (this.aborted) return 'handOver';
      }

      const card = action.card || p.hand[p.hand.length - 1];
      if (p.isHuman) {
        const opponents = this.hand.table.filter((move) => move.team !== p.team);
        const opponentBest = opponents.reduce((best, move) => Math.max(best, this.power(move.card)), -Infinity);
        const teammateLeading = this.hand.table.some((move) => move.team === p.team && this.power(move.card) > opponentBest);
        decisions.push({
          round: this.hand.round + 1,
          cardPower: this.power(card),
          heldPowers: p.hand.filter((held) => held.id !== card.id).map((held) => this.power(held)),
          opponentBest,
          teammateLeading,
        });
      }
      p.hand = p.hand.filter((c) => c.id !== card.id);
      this.hand.table.push({ player: pi, card, team: p.team });
      await this.ui.playCardAnimation(pi, card, action.hidden === true);
      this.ui.update(this.snapshot());
    }
    if (this.aborted) return 'handOver';

    // vencedor da rodada
    let best = null, tie = false;
    for (const mv of this.hand.table) {
      const pw = this.power(mv.card);
      if (!best || pw > best.pw) { best = { ...mv, pw }; tie = false; }
      else if (pw === best.pw && mv.team !== best.team) tie = true;
    }

    let winTeam;
    if (tie) {
      await this.ui.announce(T.t('round_tied'));
      winTeam = await this.blindDuel();
      if (this.aborted) return 'handOver';
    } else {
      winTeam = best.team;
      await this.ui.announce(T.t('round_won', { team: this.teamName(winTeam) }));
      if (this.aborted) return 'handOver';
      this.hand.current = best.player;
    }

    this.hand.roundWins[winTeam]++;
    this.history.push({
      hand: this.handNo,
      round: this.hand.round + 1,
      winner: winTeam,
      moves: this.hand.table.map((move) => ({
        player: move.player,
        name: this.players[move.player].name,
        avatar: this.players[move.player].avatar,
        team: move.team,
        cardId: move.card.id,
        card: { ...move.card },
      })),
      decisions,
    });
    this.hand.round++;
    this.ui.update(this.snapshot());
    await this.ui.clearTable();
    if (this.aborted) return 'handOver';

    if (this.hand.roundWins[winTeam] >= 2) {
      await this.awardHand(winTeam);
      return 'handOver';
    }
    return 'next';
  }

  // ---------- duelo às cegas (regra da casa p/ empacho) ----------
  async blindDuel() {
    while (true) {
      const a = this.hand.deck.pop();
      const b = this.hand.deck.pop();
      if (!a || !b) return Math.random() < 0.5 ? 0 : 1;
      const res = await this.ui.blindDuel(a, b, this.power(a), this.power(b));
      if (res !== null) return res;
    }
  }

  betOptions(p) {
    const canBet = !this.hand.betLocked
      && this.hand.value < 12
      && this.hand.lastBetTeam !== p.team;
    return { canBet, nextValue: BET_CHAIN[BET_CHAIN.indexOf(this.hand.value) + 1] };
  }

  betLabel(v) {
    return v === 3 ? T.t('truco') : v === 6 ? T.t('call_six') : v === 9 ? T.t('call_nine') : T.t('call_twelve');
  }

  /**
   * Resolve um pedido de truco/aumento. Retorna true se aceito (mão continua).
   */
  async resolveBet(caller, value) {
    const prev = this.hand.value;
    this.hand.value = value;
    this.hand.lastBetTeam = caller.team;
    if (this.ui.betStamp) this.ui._rolling = true;
    this.ui.update(this.snapshot());
    if (this.ui.betStamp) await this.ui.betStamp(prev, value);
    if (this.aborted) return false;
    if (window.Talk) Talk.event('bet', caller, 0.7);
    await this.ui.announce(T.t('asked_truco', { name: caller.name, value: this.betLabel(value) }), 'bet');
    if (this.aborted) return false;

    // quem responde: primeiro adversário "responsável" (o próximo adversário na ordem)
    const n = this.players.length;
    let responder = null;
    for (let k = 1; k <= n; k++) {
      const cand = this.players[(caller.i + k) % n];
      if (cand.team !== caller.team) { responder = cand; break; }
    }

    let resp;
    if (responder.isHuman) {
      // bot trucou: pode deixar escapar um tique (sincero ou fingido)
      const tell = (!caller.isHuman && window.Faces && !(window.Opts && !Opts.v.tells)) ? Faces.rollTell(this, !!this.hand.callerBluff) : null;
      resp = await this.ui.humanBetResponse(value, BET_CHAIN[BET_CHAIN.indexOf(value) + 1], tell, caller);
    } else {
      await this.ui.thinking(responder);
      resp = AI.decideBetResponse(this, responder, value);
    }

    if (this.aborted) return false;
    if (window.Talk && !responder.isHuman) Talk.event(resp.type === 'run' ? 'run' : 'accept', responder, 0.6);
    if (resp.type === 'run') {
      const pts = prev === 1 ? 1 : prev;
      this.scores[caller.team] += pts;
      this.hand.value = prev;
      if (this.ui.onHandWon) this.ui.onHandWon(caller.team, pts, true);
      this.ui.update(this.snapshot());
      await this.ui.announce(T.t('ran', { name: responder.name, team: this.teamName(caller.team), points: pts }), 'bet');
      this.hand.finished = true;
      await this.ui.clearTable();
      this.hand.table = [];
      this.ui.update(this.snapshot());
      await this.checkGameEnd();
      return false;
    }

    if (resp.type === 'raise') {
      this.hand.callerBluff = !!resp.bluff;
      await this.ui.announce(T.t('accepted', { name: responder.name, value: resp.value }), 'bet');
      return await this.resolveBet(responder, resp.value);
    }

    await this.ui.announce(T.t('accepted', { name: responder.name, value: value }), 'bet');
    return true;
  }

  async awardHand(team) {
    this.scores[team] += this.hand.value;
    this.hand.finished = true;
    if (this.ui.onHandWon) this.ui.onHandWon(team, this.hand.value, false);
    if (window.Talk) { const bots = this.players.filter((p) => !p.isHuman && p.team === team); if (bots.length) Talk.event('win', bots[Math.floor(Math.random() * bots.length)], this.hand.value >= 3 ? 0.8 : 0.3); }
    this.ui.update(this.snapshot());
    await this.ui.announce(T.t('hand_won', { team: this.teamName(team), points: this.hand.value }), 'big');
    await this.checkGameEnd();
  }

  async checkGameEnd() {
    if (this.scores[0] >= this.target || this.scores[1] >= this.target) {
      this.hand.finished = true;
    }
  }
}
