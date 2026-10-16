/* ============================================================
   main.js — telas, menus, modo história e inicialização
   ============================================================ */

/* "Bigode, o Dono" -> "Bigode"; "Zeca da Esquina" -> "Zeca"; "A Lenda do Norte" -> "A Lenda" */
function shortName(name) {
  let w = name.split(',')[0].split(' ');
  if (w.length > 2) w = w.slice(0, 2);
  if (w.length === 2 && ['do', 'da', 'de', 'dos', 'das'].includes(w[1])) w = w.slice(0, 1);
  return w.join(' ');
}
const BOT_NAMES = ['Tião', 'Zeca', 'Ivete', 'Valdir', 'Juca', 'Nicão', 'Sueli', 'Bereba'];
const AVATARS = ['🎩', '🧢', '👵', '🕶️', '🐆', '🍺', '👨‍🌾', '🧔'];

const App = {
  cfg: { variant: 'paulista', format: 2, difficulty: 'medium' },
  stats: { wins: 0, losses: 0, points: 0, hands: 0, streak: 0, bestStreak: 0, storyWins: 0, nightWins: 0, rainWins: 0, bosses: 0, won12: 0, trucoWins: 0, talks: 0 },
  storyNpc: null,
  stake: null,
  items: {},          // mochila do modo história
  ui: null,
  tutStep: 0,

  screens: ['title', 'menu', 'config', 'game', 'world', 'tutorial', 'settings', 'ranking'],

  show(name) {
    this.screens.forEach((s) => {
      const el = document.getElementById('screen-' + s);
      if (el) el.classList.toggle('screen--on', s === name);
    });
    if (name === 'world') { World.resize(); World.start(); } else { World.stop(); }
    if (name !== 'game' && typeof Sound !== 'undefined' && Sound.setMood) Sound.setMood(0);
    this.current = name;
  },

  /* ---------- Ajustes por cima do jogo (mundo ou partida) ---------- */
  openOpts() {
    if (this.optsFrom) return;
    this.optsFrom = this.current;
    if (this.current === 'game') this.paused = true;
    if (this.current === 'world') World.stop();
    Opts.render(this);
    const el = document.getElementById('screen-settings');
    el.classList.add('screen--on', 'screen--overlay');
    el.querySelector('.panel__body').scrollTop = 0;
  },
  closeOpts() {
    const from = this.optsFrom;
    this.optsFrom = null;
    document.getElementById('screen-settings').classList.remove('screen--on', 'screen--overlay');
    this.paused = false;
    if (from === 'world' && this.current === 'world') { World.resize(); World.start(); }
    this.persist();
  },

  /* ---------- progresso salvo ---------- */
  persist() {
    if (!Save.available) return;
    Save.write({
      lang: T.lang,
      music: Sound.music,
      sfx: Sound.sfx,
      cfg: this.cfg,
      stats: this.stats,
      world: {
        money: World.money, rep: World.rep, defeated: World.defeated,
        x: World.back ? World.back.x : World.player.x,
        y: World.back ? World.back.y : World.player.y,
        npcState: World.npcState, heat: World.heat, loanUsed: World.loanUsed,
        bossDone: World.bossDone, day: World.day, eventId: World.eventId,
        eggs: World.eggs, eggTalk: World.eggTalk,
        hour: World.hour, nextEventId: World.nextEventId,
      },
      items: this.items,
      collection: Collection.data(),
      talkMute: Talk.muted,
      opts: Opts.data(),
      tutorialSeen: this.tutorialSeen === true,
    });
  },

  restore() {
    const d = Save.read();
    if (!d) return false;
    if (d.lang) T.set(d.lang);
    if (typeof d.music === 'boolean') Sound.setMusic(d.music);
    if (typeof d.sfx === 'boolean') Sound.setSfx(d.sfx);
    if (d.cfg) this.cfg = { ...this.cfg, ...d.cfg };
    if (d.stats) this.stats = { ...this.stats, ...d.stats };
    if (d.world) {
      World.money = d.world.money ?? World.money;
      World.rep = d.world.rep ?? World.rep;
      World.defeated = d.world.defeated || {};
      if (typeof d.world.x === 'number') { World.player.x = d.world.x; World.player.y = d.world.y; }
      World.npcState = d.world.npcState || {};
      World.heat = d.world.heat || 0;
      World.loanUsed = d.world.loanUsed === true;
      World.bossDone = d.world.bossDone || {};
      World.day = d.world.day || 1;
      World.eventId = d.world.eventId || 'calmo';
      World.eggs = d.world.eggs || {};
      World.eggTalk = d.world.eggTalk || {};
      if (typeof d.world.hour === 'number') World.hour = d.world.hour;
      if (d.world.nextEventId) World.nextEventId = d.world.nextEventId;
    }
    if (d.items) this.items = d.items;
    Collection.load(d.collection);
    Talk.muted = d.talkMute === true;
    Opts.load(d.opts);
    if (d.opts === undefined && d.talkMute === true) Opts.v.oppTalk = false;
    this.tutorialSeen = d.tutorialSeen === true;
    return true;
  },

  /* ---------- textos ---------- */
  applyLang() {
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T.t(el.dataset.t); });
    document.querySelectorAll('[data-t-title]').forEach((el) => { el.title = T.t(el.dataset.tTitle); el.setAttribute('aria-label', el.title); });
    document.getElementById('lang-value').textContent = T.t('lang_name');
    this.renderConfig();
    this.renderTutorial();
    this.renderRanking();
    Opts.render(this);
    const wh = document.getElementById('world-hint');
    if (wh) wh.textContent = T.t('world_hint');
    const mv = document.getElementById('music-value'), sv = document.getElementById('sfx-value');
    if (mv) mv.textContent = Sound.music ? T.t('on') : T.t('off');
    if (sv) sv.textContent = Sound.sfx ? T.t('on') : T.t('off');
    if (window.World) World.hudRefresh && World.hudRefresh();
  },

  /* ---------- configuração de partida ---------- */
  renderConfig() {
    const box = document.getElementById('config-body');
    if (!box) return;
    const target = 12;               // padrão único: toda partida vai até 12
    box.innerHTML = '';
    const group = (label, key, opts) => {
      const g = document.createElement('div');
      g.className = 'group';
      g.innerHTML = `<h4>${label}</h4>`;
      const row = document.createElement('div');
      row.className = 'chips';
      opts.forEach((o) => {
        const b = document.createElement('button');
        b.className = 'chip' + (this.cfg[key] === o.v ? ' chip--on' : '');
        b.textContent = o.l;
        b.onclick = () => { Sound.click(); this.cfg[key] = o.v; this.renderConfig(); };
        row.appendChild(b);
      });
      g.appendChild(row);
      box.appendChild(g);
    };
    group(T.t('variant'), 'variant', [{ v: 'paulista', l: T.t('paulista') }, { v: 'mineiro', l: T.t('mineiro') }]);
    group(T.t('format'), 'format', [{ v: 2, l: '1 x 1' }, { v: 4, l: '2 x 2' }, { v: 6, l: '3 x 3' }]);
    group(T.t('difficulty'), 'difficulty', [{ v: 'easy', l: T.t('easy') }, { v: 'medium', l: T.t('medium') }, { v: 'hard', l: T.t('hard') }]);
    const info = document.createElement('p');
    info.className = 'note';
    info.textContent = T.t('points_to', { n: target });
    box.appendChild(info);
  },

  buildPlayers(format, difficulty) {
    const pool = shuffle([...BOT_NAMES]);
    const av = shuffle([...AVATARS]);
    const players = [{ name: T.t('you'), team: 0, isHuman: true, avatar: '🙋' }];
    for (let i = 1; i < format; i++) {
      players.push({ name: pool[i % pool.length], team: i % 2, isHuman: false, avatar: av[i % av.length], styleId: Faces.GENERIC[(i * 3 + Math.floor(Math.random() * 10)) % Faces.GENERIC.length] });
    }
    return players;
  },

  async startMatch(cfg, npc = null, stake = null) {
    this.storyNpc = npc;
    this.stake = stake;
    // padrão único: toda partida vale 12 pontos
    const target = 12;
    const players = this.buildPlayers(cfg.format, cfg.difficulty);
    // no modo história, o adversário da frente tem o nome de quem te desafiou
    if (npc && players[1]) { players[1].name = shortName(npc.name); players[1].avatar = npc.emoji; players[1].styleId = npc.id; }
    this.show('game');
    Sound.init();
    Talk.clear();

    // o bot evolui: fama acumulada + nível de revanche do adversário
    let edge = 0;
    if (npc) {
      const st = World.stateOf(npc.id);
      const em = World.mods();
      edge = Math.min(1, Math.max(0,
        World.heat * 0.06 + st.level * 0.2 + (stake === 'high' ? 0.1 : 0) +
        (npc.boss ? 0.25 : 0) + (em.edge || 0)));
    }

    window.Game = new TrucoGame({ ...cfg, players, target, edge }, this.ui);

    // itens e clima: cafezinho dá tempo, chuva tira
    // tempo de turno vem dos Ajustes (0 = sem limite); cafezinho e clima mexem nele
    const baseTurn = Opts.v.turn;
    this.ui.turnTime = baseTurn === 0 ? 0 : Math.max(10, baseTurn + (this.items.cafe ? 10 : 0) + (npc ? (World.mods().turn || 0) : 0));
    this.ui.onUseItem = (op, id) => this.handleItem(op, id);
    // mãos vencidas: contam para a coleção (mão de 12, truco ganho)
    this.ui.onHandWon = (team, value, ran) => {
      if (team !== 0) return;
      if (value >= 12) this.stats.won12++;
      if (value >= 3) this.stats.trucoWins++;
    };
    // de noite ou de chuva valem conquistas próprias (o dia vira depois da partida)
    const wasNight = npc ? World.isNight() : false, wasRain = npc ? !!World.mods().rain : false;

    this.ui.update(window.Game.snapshot());
    const winner = await window.Game.run();
    this.ui.onUseItem = null;
    this.ui.turnTime = 20;
    if (winner === null) return;
    if (winner === 0) {
      this.stats.wins++; Sound.win(); if (window.Haptic) Haptic.win();
      this.stats.streak++; this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
      if (npc) {
        this.stats.storyWins++;
        if (wasNight) this.stats.nightWins++;
        if (wasRain) this.stats.rainWins++;
        if (npc.boss) this.stats.bosses++;
      }
    } else { this.stats.losses++; this.stats.streak = 0; Sound.lose(); if (window.Haptic) Haptic.lose(); }
    if (npc) World.hour = (World.hour + 1.5) % 24;   // uma partida leva um tempinho
    const fresh = Collection.check(this.stats);
    this.stats.points += window.Game.scores[0];
    this.renderRanking();
    this.persist();
    await this.endMatchScreen(winner, npc, stake);
    if (fresh.length) await this.showUnlocks(fresh);
    if (npc) this.newDay();
    this.persist();
  },

  /* ---------- coleção ---------- */
  showUnlocks(list) {
    return new Promise((resolve) => {
      const box = this.ui.openModal(T.t('unlocked_title'), T.t('unlocked_d'));
      const g = document.createElement('div'); g.className = 'coll-grid coll-grid--new';
      list.forEach((it) => {
        const b = document.createElement('div');
        b.className = 'coll-item coll-item--new' + (Collection.FELTS.includes(it) ? ' coll-item--felt' : '');
        b.style.backgroundImage = `url('${it.img}')`;
        const l = document.createElement('span'); l.textContent = T.t(it.key); b.appendChild(l);
        g.appendChild(b);
      });
      box.appendChild(g);
      [659, 784, 988, 1318].forEach((f, i) => setTimeout(() => Sound.tone(f, 0.12, 'square', 0.14), i * 70));
      this.mkBtn(box, T.t('equip_new'), 'btn--gold', () => { list.forEach((it) => Collection.equip(it.id)); this.persist(); this.ui.closeModal(); resolve(); });
      this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => { this.ui.closeModal(); resolve(); });
    });
  },

  /* ---------- itens ---------- */
  ITEMS: [
    { id: 'cafe', ico: 'coffee', nameKey: 'item_cafe', descKey: 'item_cafe_d', price: 15 },
    { id: 'beer', ico: 'beer', nameKey: 'item_beer', descKey: 'item_beer_d', price: 25 },
    { id: 'mirror', ico: 'mirror', nameKey: 'item_mirror', descKey: 'item_mirror_d', price: 40 },
  ],

  /* usados durante a partida; 'list' devolve o que dá para usar agora */
  handleItem(op, id) {
    if (op === 'list') {
      // o cafezinho já valeu no começo da partida, então não aparece na mesa
      return this.ITEMS.filter((it) => it.id !== 'cafe' && this.items[it.id]);
    }
    const g = window.Game;
    if (!g || !this.items[id]) return;
    if (id === 'beer') g.debuffHands = 1;
    if (id === 'mirror') {
      // vale já nesta mão: sorteia uma carta ainda na mão de cada adversário
      if (g.hand && !g.hand.finished) {
        g.revealedEnemy = [];
        g.players.filter((pl) => pl.team !== 0 && pl.hand.length).forEach((pl) => {
          const c = pl.hand[Math.floor(Math.random() * pl.hand.length)];
          if (c) g.revealedEnemy.push({ name: pl.name, card: c });
        });
      } else {
        g.mirror = 1;
      }
    }
    this.items[id] = 0;
    this.persist();
    this.ui.update(g.snapshot());
  },

  stakeValue(npc, stake) {
    const st = World.stateOf(npc.id);
    const base = Math.round(npc.bet * (1 + st.level * 0.5));   // revanche vale mais
    const mult = stake === 'low' ? 0.5 : stake === 'high' ? 2 : 1;
    return Math.max(5, Math.round(base * mult));
  },

  endMatchScreen(winner, npc, stake = null) {
    return new Promise((resolve) => {
      const titleBefore = npc ? World.title() : null;
      const box = this.ui.openModal(T.t('game_won', { team: winner === 0 ? T.t('us') : T.t('them') }));
      if (npc) {
        const st = World.stateOf(npc.id);
        const pot = this.stakeValue(npc, stake);
        const p = document.createElement('p');
        if (winner === 0) {
          const em = World.mods();
          const repGain = Math.max(1, Math.round((pot / 10) * (stake === 'high' ? 1.5 : 1) * (em.repMult || 1)));
          World.money += pot;
          World.rep += repGain;
          World.defeated[npc.id] = true;
          World.heat++;
          st.wins++;
          st.level++;                       // na próxima ele joga mais sério
          p.textContent = T.t('won_money', { n: pot, r: repGain });
        } else {
          const loss = Math.round(pot / 2);
          World.money = Math.max(0, World.money - loss);
          st.losses++;
          p.textContent = T.t('lost_money', { n: loss });
        }
        box.appendChild(p);

        // chefão derrubado: abre o bairro seguinte
        if (winner === 0 && npc.boss && !World.bossDone[npc.id]) {
          World.bossDone[npc.id] = true;
          const z = ZONES.find((zz) => zz.needs === npc.id);
          const bp = document.createElement('p');
          bp.className = 'nb__title';
          bp.textContent = z ? T.t('zone_open', { name: T.t(z.nameKey) }) : T.t('city_yours');
          box.appendChild(bp);
          if (z) World.spawnPickups();
        }

        // subiu de patente?
        if (World.title() !== titleBefore) {
          const up = document.createElement('p');
          up.className = 'nb__title';
          up.textContent = '\u2b50 ' + T.t(World.title());
          box.appendChild(up);
        }
        // a cidade endurece conforme você vence
        if (winner === 0 && World.heat === 3) {
          const hp = document.createElement('p');
          hp.className = 'note';
          hp.textContent = T.t('heat_up');
          box.appendChild(hp);
        }
        World.hudRefresh();
      }
      const mk = (label, cls, fn) => {
        const b = document.createElement('button');
        b.className = 'btn ' + cls;
        b.textContent = label;
        b.onclick = () => { Sound.click(); this.ui.closeModal(); fn(); resolve(); };
        box.appendChild(b);
      };
      if (!npc) mk(T.t('rematch'), 'btn--accept', () => this.startMatch(this.cfg));
      mk(npc ? T.t('back') : T.t('to_menu'), 'btn--run', () => this.show(npc ? 'world' : 'menu'));
    });
  },

  /* ---------- modo história ---------- */
  openStory() {
    this.show('world');
    World.hudRefresh();
    this.checkBroke();
    // a dica aparece e sai de cena, para não tapar a cidade
    const hint = document.getElementById('world-hint');
    if (hint) {
      hint.classList.remove('world__hint--off');
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => hint.classList.add('world__hint--off'), 7000);
    }
    if (!World.introShown) {
      World.introShown = true;
      const box = this.ui.openModal(T.t('story'), T.t('story_intro'));
      const b = document.createElement('button');
      b.className = 'btn btn--accept';
      b.textContent = T.t('start');
      b.onclick = () => { Sound.click(); this.ui.closeModal(); this.showEvent(); };
      box.appendChild(b);
    }
  },

  MINEIRO: ['padre', 'nogueira', 'cotinha', 'lenda'],
  npcVariant(n) { return this.MINEIRO.includes(n.id) ? 'mineiro' : 'paulista'; },
  npcFormat(n) { return n.format === 2 ? '1x1' : n.format === 4 ? '2x2' : '3x3'; },

  mkBtn(box, label, cls, fn) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = label;
    b.onclick = () => { Sound.click(); fn(b); };
    box.appendChild(b);
    return b;
  },

  /* ---------- conversa com o pessoal da cidade ---------- */
  talk() {
    if (World.nearShop) return this.openShop();
    if (World.nearDoor) { Sound.click(); World.enter(World.nearDoor); return; }
    if (World.nearExit) { Sound.click(); World.leave(); return; }
    const n = World.nearNpc;
    if (!n) return;
    Sound.click();
    if (n.egg) return this.talkEgg(n);

    if (!World.zoneOpen(n.zone)) {
      const z = World.zone(n.zone);
      const need = NPCS.find((x) => x.id === z.needs);
      const box = this.ui.openModal(n.emoji + ' ' + n.name,
        T.t('zone_locked', { zone: T.t(z.nameKey), boss: need ? need.name : '?' }));
      this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
      return;
    }
    if (World.rep < n.rep) {
      const box = this.ui.openModal(n.emoji + ' ' + n.name, T.t('locked', { r: n.rep }));
      this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
      return;
    }

    const st = World.stateOf(n.id);
    const beaten = !!World.defeated[n.id];
    const line = beaten ? T.t('npc_beat') : (n.line[T.lang] || n.line.pt);
    const box = this.ui.openModal(n.emoji + ' ' + n.name, line);

    if (n.boss) {
      const bt = document.createElement('p');
      bt.className = 'nb__title';
      bt.textContent = '👑 ' + T.t('boss_lbl');
      box.appendChild(bt);
    }
    const tag = document.createElement('p');
    tag.className = 'note';
    tag.textContent = `${this.npcFormat(n)} · ${T.t(n.diff)} · ${T.t(this.npcVariant(n))}` +
      ` · ${T.t('points_to', { n: 12 })} · ${T.t('record', { w: st.wins, l: st.losses })}`;
    box.appendChild(tag);

    const label = beaten ? T.t('rematch_npc', { n: st.level + 1 }) : T.t('challenge_accept');
    this.mkBtn(box, label, 'btn--accept', () => this.askStake(n));
    this.mkBtn(box, T.t('challenge_decline'), 'btn--run', () => this.ui.closeModal());
  },

  /* ---------- easter eggs: a turma dos devs ---------- */
  talkEgg(n) {
    const first = !World.eggs[n.id];
    if (first) {
      World.eggs[n.id] = true;
      World.money += 25;
      Sound.secret();
      if (window.Haptic) Haptic.win();
      World.eggBurst && World.eggBurst(n);
    } else {
      Sound.blip(n.id);
    }
    const idx = World.eggTalk[n.id] || 0;
    World.eggTalk[n.id] = idx + 1;
    const ln = n.lines[idx % n.lines.length];
    const box = this.ui.openModal(n.emoji + ' ' + n.name);
    box.classList.add('modal__box--egg');

    if (first) {
      const found = EGGS.filter((e) => World.eggs[e.id]).length;
      const b = document.createElement('div');
      b.className = 'egg-banner';
      b.innerHTML = `<span>${T.t('egg_found')}</span><b>${found}/${EGGS.length}</b>`;
      box.appendChild(b);
      const r = document.createElement('p');
      r.className = 'note';
      r.textContent = T.t('egg_reward', { n: 25 });
      box.appendChild(r);
      if (found === EGGS.length) {
        World.money += 100;
        const all = document.createElement('p');
        all.className = 'nb__title';
        all.textContent = T.t('egg_all');
        box.appendChild(all);
      }
    }

    // fala com efeito de digitação
    const say = document.createElement('p');
    say.className = 'egg-say';
    box.appendChild(say);
    const full = '\u201c' + (ln[T.lang] || ln.pt) + '\u201d';
    let i = 0;
    clearInterval(this._typeT);
    this._typeT = setInterval(() => {
      i += 1;
      say.textContent = full.slice(0, i);
      if (i % 3 === 0) Sound.blip(n.id, true);
      if (i >= full.length) clearInterval(this._typeT);
    }, 22);

    // a dupla inseparável sempre comenta
    if (n.pair) {
      const pr = document.createElement('p');
      pr.className = 'note';
      pr.textContent = T.t('egg_pair_' + n.id);
      box.appendChild(pr);
    }

    const st = World.stateOf(n.id);
    const tag = document.createElement('p');
    tag.className = 'note';
    tag.textContent = `1x1 · ${T.t(n.diff)} · ${T.t('points_to', { n: 12 })} · ${T.t('record', { w: st.wins, l: st.losses })}`;
    box.appendChild(tag);
    this.mkBtn(box, T.t('egg_play'), 'btn--accept', () => { clearInterval(this._typeT); this.askStake(n); });
    this.mkBtn(box, T.t('back'), 'btn--run', () => { clearInterval(this._typeT); this.ui.closeModal(); });
    World.hudRefresh();
    this.persist();
  },

  /* escolha da aposta antes de sentar à mesa */
  askStake(n) {
    const box = this.ui.openModal(T.t('stake_title'), T.t('stake_desc'));
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = `\ud83d\udcb0 R$ ${World.money}`;
    box.appendChild(note);

    const go = (stake) => {
      this.ui.closeModal();
      this.startMatch({ variant: this.npcVariant(n), format: n.format, difficulty: n.diff }, n, stake);
    };

    const high = this.stakeValue(n, 'high');
    this.mkBtn(box, T.t('stake_low', { n: this.stakeValue(n, 'low') }), '', () => go('low'));
    this.mkBtn(box, T.t('stake_mid', { n: this.stakeValue(n, 'mid') }), 'btn--accept', () => go('mid'));
    const hb = this.mkBtn(box, T.t('stake_high', { n: high }), 'btn--truco', () => go('high'));
    if (World.money < Math.round(high / 2)) {
      hb.disabled = true;
      hb.title = T.t('no_money');
    }
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  /* ---------- caderneta: quem já caiu, quem falta ---------- */
  openNotebook() {
    Sound.click();
    const box = this.ui.openModal(T.t('notebook'));

    const t = document.createElement('p');
    t.className = 'nb__title';
    t.textContent = `${T.t('title_lbl')}: ${T.t(World.title())}`;
    box.appendChild(t);

    const ev = document.createElement('p');
    ev.className = 'note';
    ev.textContent = `${T.t('day_lbl', { n: World.day })} · ${World.ev().ico} ${T.t('ev_' + World.eventId)}`;
    box.appendChild(ev);

    const list = document.createElement('div');
    list.className = 'nb';

    ZONES.forEach((z) => {
      const open = World.zoneOpen(z.id);
      const mine = NPCS.filter((n) => n.zone === z.id);
      const done = mine.filter((n) => World.defeated[n.id]).length;

      const head = document.createElement('div');
      head.className = 'nb-zone' + (open ? '' : ' nb-zone--locked');
      head.innerHTML = `<span>${T.t(z.nameKey)}</span><span>${done}/${mine.length}</span>`;
      list.appendChild(head);

      if (!open) {
        const need = NPCS.find((x) => x.id === z.needs);
        const p = document.createElement('p');
        p.className = 'note nb-zone__note';
        p.textContent = T.t('zone_need', { boss: need ? need.name : '?' });
        list.appendChild(p);
        return;
      }

      mine.forEach((n) => {
        const st = World.stateOf(n.id);
        const locked = World.npcLocked(n);
        const beaten = !!World.defeated[n.id];
        const row = document.createElement(locked ? 'div' : 'button');
        row.className = 'nb-row' + (locked ? ' nb-row--locked' : ' nb-row--act') + (n.boss ? ' nb-row--boss' : '');
        const tag = locked ? T.t('st_locked') : beaten ? T.t('st_beaten') : T.t('st_open');
        const tagCls = locked ? 'tag--locked' : beaten ? 'tag--beaten' : 'tag--open';
        const stake = this.stakeValue(n, 'mid');
        const place = n.place === 'city' ? T.t('in_street') : T.t(INTERIORS[n.place].nameKey);
        row.innerHTML = `<span class="nb-row__av">${n.emoji}</span>
          <span class="nb-row__mid">
            <span class="nb-row__name">${n.boss ? '👑 ' : ''}${n.name}</span>
            <span class="nb-row__sub">${place} · ${this.npcFormat(n)} · ${T.t(n.diff)}</span>
            <span class="nb-row__sub">R$ ${stake} · \u2b50 ${n.rep} · ${T.t('record', { w: st.wins, l: st.losses })}</span>
          </span>
          <span class="nb-row__tag ${tagCls}">${tag}</span>`;
        if (!locked) {
          row.onclick = () => {
            Sound.click();
            this.ui.closeModal();
            World.warpTo(n);          // já te leva até ele, dentro ou fora
            this.askStake(n);
          };
        }
        list.appendChild(row);
      });
    });
    // segredos: só mostra quem já foi achado
    const eh = document.createElement('div');
    eh.className = 'nb-zone nb-zone--egg';
    const nf = EGGS.filter((e) => World.eggs[e.id]).length;
    eh.innerHTML = `<span>\u2728 ${T.t('egg_secrets')}</span><span>${nf}/${EGGS.length}</span>`;
    list.appendChild(eh);
    EGGS.forEach((e) => {
      const row = document.createElement('div');
      const got = !!World.eggs[e.id];
      row.className = 'nb-row' + (got ? '' : ' nb-row--locked');
      row.innerHTML = got
        ? `<span class="nb-row__av">${e.emoji}</span><span class="nb-row__mid"><span class="nb-row__name">${e.name}</span><span class="nb-row__sub">1x1 · ${T.t(e.diff)} · ${T.t('record', { w: World.stateOf(e.id).wins, l: World.stateOf(e.id).losses })}</span></span><span class="nb-row__tag tag--beaten">\u2728</span>`
        : `<span class="nb-row__av">?</span><span class="nb-row__mid"><span class="nb-row__name">???</span><span class="nb-row__sub">${T.t('egg_hint')}</span></span>`;
      list.appendChild(row);
    });
    box.appendChild(list);

    const goal = document.createElement('p');
    goal.className = 'note';
    const nx = World.nextLocked();
    goal.textContent = nx ? T.t('next_goal', { name: nx.name, r: nx.rep }) : T.t('all_beaten');
    box.appendChild(goal);

    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  /* ---------- eventos da cidade ---------- */
  newDay() {
    const e = World.rollEvent();
    const m = e.mods || {};
    if (m.cash) World.money += m.cash;
    World.hudRefresh();
    this.persist();
    this.showEvent();
  },

  showEvent() {
    const e = World.ev();
    const box = this.ui.openModal(`${e.ico} ${T.t('ev_' + e.id)}`, T.t('ev_' + e.id + '_d'));
    const d = document.createElement('p');
    d.className = 'note';
    d.textContent = T.t('day_lbl', { n: World.day });
    box.appendChild(d);
    const fc = World.forecast();
    const f = document.createElement('p');
    f.className = 'note note--tv';
    f.textContent = `${World.clock()} · ${T.t('forecast', { ev: `${fc.ico} ${T.t('ev_' + fc.id)}` })}`;
    box.appendChild(f);
    this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
  },

  /* ---------- mercado ---------- */
  openShop() {
    Sound.click();
    const em = World.mods();
    if (em.noShop) {
      const b = this.ui.openModal(T.t('shop_title'), T.t('shop_closed'));
      this.mkBtn(b, T.t('back'), 'btn--run', () => this.ui.closeModal());
      return;
    }
    const off = em.shop || 1;
    const price = (it) => Math.max(1, Math.round(it.price * off));
    const box = this.ui.openModal(T.t('shop_title'), off < 1 ? T.t('shop_sale') : T.t('shop_desc'));
    const money = document.createElement('p');
    money.className = 'nb__title';
    box.appendChild(money);

    const list = document.createElement('div');
    list.className = 'nb';
    box.appendChild(list);

    const draw = () => {
      money.textContent = `\ud83d\udcb0 R$ ${World.money}`;
      list.innerHTML = '';
      this.ITEMS.forEach((it) => {
        const owned = !!this.items[it.id];
        const row = document.createElement('div');
        row.className = 'nb-row nb-row--shop';
        row.innerHTML = `<span class="shop-head">
            <span class="nb-row__av">${ICONS[it.ico](24)}</span>
            <span class="nb-row__name">${T.t(it.nameKey)}</span>
          </span>
          <span class="nb-row__sub">${T.t(it.descKey)}</span>`;
        const b = document.createElement('button');
        b.className = 'btn btn--icon shop-buy';
        if (owned) { b.textContent = T.t('owned'); b.disabled = true; }
        else {
          const pr = price(it);
          b.textContent = T.t('buy', { n: pr });
          b.disabled = World.money < pr;
          b.onclick = () => {
            if (World.money < pr) return;
            World.money -= pr;
            this.items[it.id] = 1;
            Sound.click();
            if (window.Haptic) Haptic.coin();
            World.hudRefresh();
            this.persist();
            draw();
          };
        }
        row.appendChild(b);
        list.appendChild(row);
      });
    };
    draw();
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  /* sem grana pra apostar: o boteco empresta, mas custa fama */
  checkBroke() {
    if (World.money >= 5 || World.loanUsed) return;
    World.loanUsed = true;
    const box = this.ui.openModal(T.t('broke_title'), T.t('broke_desc'));
    this.mkBtn(box, T.t('take_loan'), 'btn--accept', () => {
      World.money += 10;
      World.rep = Math.max(0, World.rep - 1);
      World.hudRefresh();
      this.persist();
      this.ui.closeModal();
    });
  },

  /* ---------- tutorial ---------- */
  tutorialArt(step) {
    const c = (rank, suit, man = false) =>
      renderCard({ rank, suit, id: rank + suit }, { small: true, manilha: man }).outerHTML;
    const back = '<div class="card card--sm card--back"></div>';
    const rows = [
      // 0 o baralho
      c('4', 'ouros') + c('7', 'copas') + c('Q', 'paus') + c('K', 'espadas') + c('3', 'ouros'),
      // 1 a manilha (vira -> manilha)
      c('J', 'ouros') + '<span class="tut__arrow">&rarr;</span>' + c('Q', 'paus', true),
      // 2 forca dos naipes
      c('4', 'paus', true) + c('7', 'copas', true) + c('A', 'espadas', true) + c('7', 'ouros', true),
      // 3 a mao
      back + back + back,
      // 4 empachou -> duelo as cegas
      back + '<span class="tut__arrow">vs</span>' + back,
      // 5 trucar
      '<div class="tut__chain"><b>1</b>&rarr;<b>3</b>&rarr;<b>6</b>&rarr;<b>9</b>&rarr;<b>12</b></div>',
      // 6 blefe (cartas fracas)
      c('4', 'ouros') + c('5', 'espadas') + c('6', 'ouros'),
      // 7 mao de ferro
      c('3', 'copas') + c('2', 'paus') + c('K', 'ouros'),
    ];
    return rows[Math.min(step, rows.length - 1)];
  },

  renderTutorial() {
    const box = document.getElementById('tut-body');
    if (!box) return;
    const steps = T.tut();
    const s = steps[Math.min(this.tutStep, steps.length - 1)];
    const art = this.tutorialArt(this.tutStep);
    box.innerHTML = `<div class="tut__n">${this.tutStep + 1}/${steps.length}</div>
      <h3>${s[0]}</h3><div class="tut__art">${art}</div><p>${s[1]}</p>`;
    document.getElementById('tut-next').textContent = this.tutStep >= steps.length - 1 ? T.t('back') : T.t('next');
  },

  /* ---------- ranking da sessão ---------- */
  renderRanking() {
    const box = document.getElementById('rank-body');
    if (!box) return;
    const total = this.stats.wins + this.stats.losses;
    const pct = total ? Math.round((this.stats.wins / total) * 100) : 0;
    box.innerHTML = `
      <div class="rank-row"><span>🏆 ${T.t('us')}</span><b>${this.stats.wins}</b></div>
      <div class="rank-row"><span>💀 ${T.t('them')}</span><b>${this.stats.losses}</b></div>
      <div class="rank-row"><span>📈 %</span><b>${pct}%</b></div>
      <div class="rank-row"><span>💰 ${T.t('money')}</span><b>R$ ${World.money}</b></div>
      <div class="rank-row"><span>⭐ ${T.t('rep')}</span><b>${World.rep}</b></div>`;
  },

  /* ---------- boot ---------- */
  /* ---------- integração nativa (Android) ---------- */
  bindNative() {
    const cap = window.Capacitor && window.Capacitor.Plugins;
    const nativeApp = cap && cap.App;

    const goBack = () => {
      const cur = this.current;
      if (cur === 'game') {
        if (window.Game) window.Game.aborted = true;
        this.ui.pending = false; this.ui.stopTimer(); this.ui.closeModal();
        this.show(this.storyNpc ? 'world' : 'menu');
      } else if (cur === 'world') {
        this.persist(); this.show('menu');
      } else if (cur === 'menu') {
        this.show('title');
      } else if (cur === 'title') {
        if (nativeApp && nativeApp.exitApp) nativeApp.exitApp();
      } else {
        this.show('menu');
      }
    };

    if (nativeApp && nativeApp.addListener) {
      nativeApp.addListener('backButton', goBack);
      nativeApp.addListener('pause', () => this.persist());
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') goBack();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
    window.addEventListener('pagehide', () => this.persist());
  },

  init() {
    this.ui = new TableUI(document.getElementById('screen-game'));
    window.TUI = this.ui;

    // idioma inicial: português por padrão (trocável nos Ajustes)
    T.set('pt');

    // título -> menu
    document.getElementById('screen-title').addEventListener('click', () => {
      Sound.init(); Sound.click(); this.show('menu');
    });

    const bind = (id, fn) => { const e = document.getElementById(id); if (e) e.onclick = () => { Sound.click(); fn(); }; };
    bind('btn-play', () => this.show('config'));
    bind('btn-story', () => this.openStory());
    bind('btn-tutorial', () => { this.tutStep = 0; this.renderTutorial(); this.show('tutorial'); });
    bind('btn-settings', () => { this.optsFrom = null; this.show('settings'); });
    bind('btn-world-opts', () => this.openOpts());
    bind('btn-match-opts', () => this.openOpts());
    bind('btn-ranking', () => { this.renderRanking(); this.show('ranking'); });
    bind('btn-collection', () => { Sound.click(); Collection.open(this); });
    bind('btn-start', () => this.startMatch(this.cfg));
    bind('tut-next', () => {
      const steps = T.tut();
      if (this.tutStep >= steps.length - 1) { this.show('menu'); this.tutStep = 0; }
      else { this.tutStep++; }
      this.renderTutorial();
    });
    bind('tut-skip', () => { this.tutStep = 0; this.show('menu'); });
    document.querySelectorAll('[data-back]').forEach((b) => {
      b.onclick = () => { Sound.click(); this.show(b.dataset.back); };
    });
    // o ◀ dos Ajustes volta para onde você estava (mundo, partida ou menu)
    const optsBack = document.querySelector('#screen-settings [data-back]');
    if (optsBack) optsBack.onclick = () => { Sound.click(); if (this.optsFrom) this.closeOpts(); else this.show('menu'); };
    bind('btn-quit-match', () => {
      const quit = () => {
        if (window.Game) window.Game.aborted = true;
        this.ui.pending = false; this.ui.stopTimer(); this.ui.closeModal();
        this.show('menu');
      };
      if (!Opts.v.confirmQuit) return quit();
      // guarda o que estava aberto (ex.: resposta de truco) para voltar se cancelar
      const md = this.ui.el.modal, prev = [...md.childNodes], wasOpen = md.classList.contains('modal--show');
      const m = this.ui.openModal(T.t('opt_quit_q'), T.t('opt_quit_d'));
      this.mkBtn(m, T.t('opt_quit_yes'), 'btn--run', quit);
      this.mkBtn(m, T.t('opt_cancel'), 'btn--accept', () => {
        md.innerHTML = ''; prev.forEach((n) => md.appendChild(n));
        if (!wasOpen) this.ui.closeModal();
      });
    });
    bind('talk-btn', () => this.talk());
    const nb = document.getElementById('btn-notebook');
    if (nb) nb.innerHTML = ICONS.notebook(22);
    bind('btn-notebook', () => this.openNotebook());
    // atalhos de teclado no mundo: E/Espaço interage, Q abre a caderneta
    window.addEventListener('keydown', (e) => {
      if (this.current !== 'world' || this.ui.modalOpen) return;
      const k = e.key.toLowerCase();
      if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); this.talk(); }
      if (k === 'q') { e.preventDefault(); this.openNotebook(); }
    });
    bind('lang-btn', () => {
      const order = ['pt', 'en', 'es'];
      T.set(order[(order.indexOf(T.lang) + 1) % 3]);
      this.applyLang();
      this.persist();
    });
    bind('music-btn', () => {
      Sound.setMusic(!Sound.music);
      document.getElementById('music-value').textContent = Sound.music ? T.t('on') : T.t('off');
      this.persist();
    });
    bind('sfx-btn', () => {
      Sound.setSfx(!Sound.sfx);
      document.getElementById('sfx-value').textContent = Sound.sfx ? T.t('on') : T.t('off');
      this.persist();
    });

    if (window.Feel) Feel.init();
    World.init(document.getElementById('world-canvas'), null);
    this.restore();
    Collection.apply();
    Talk.init(this.ui);
    Opts.apply();
    this.applyLang();
    this.bindNative();
    this.show('title');
  },
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => App.init());

/* ---- hook de estado textual (para testes automatizados) ---- */
window.render_game_to_text = function () {
  const g = window.Game;
  const base = { screen: App.current, lang: T.lang, cfg: App.cfg, stats: App.stats,
    world: { x: Math.round(World.player.x), y: Math.round(World.player.y), money: World.money, rep: World.rep, near: World.nearNpc ? World.nearNpc.id : null } };
  if (!g || App.current !== 'game') return JSON.stringify(base);
  const s = g.snapshot();
  return JSON.stringify({
    ...base,
    scores: s.scores, target: s.target, value: s.value, round: s.round, roundWins: s.roundWins,
    vira: s.vira ? s.vira.id : null, manilha: s.manilhaRank,
    current: s.current, awaitingHuman: !!App.ui.pending,
    table: s.table.map((m) => ({ p: m.player, card: m.card.id })),
    hands: s.players.map((p) => ({ name: p.name, team: p.team, human: !!p.isHuman, cards: p.hand.map((c) => c.id) })),
  });
};

/* ---- ações programáticas para teste ---- */
window.testPlay = function (idx) {
  const me = window.Game.players.find((p) => p.isHuman);
  if (App.ui.pending && me.hand[idx]) App.ui.resolveTurn({ type: 'play', card: me.hand[idx] });
};
window.testBet = function () {
  const b = document.querySelector('#actions .btn--truco');
  if (b) b.click();
};
