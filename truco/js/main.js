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
  handPhotos: [],
  items: {},          // mochila do modo história
  ui: null,
  tutStep: 0,
  resetting: false,
  devToolsEnabled: false,
  devToolsOpen: false,

  screens: ['title', 'menu', 'config', 'game', 'world', 'tutorial', 'settings', 'ranking'],

  getActiveScreen() {
    const screens = Array.from(document.querySelectorAll('.screen--on'));
    return screens.reverse().find((screen) => {
      const style = window.getComputedStyle ? window.getComputedStyle(screen) : null;
      return !style || style.display !== 'none';
    }) || null;
  },

  getEnabledButtons(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('button:not([disabled])')).filter((el) => {
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      return !style || (style.display !== 'none' && style.visibility !== 'hidden');
    });
  },

  getScreenButtons() {
    return this.getEnabledButtons(this.getActiveScreen());
  },

  navigateButtons(buttons, e) {
    if (!buttons.length) return false;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const active = document.activeElement;
      const target = buttons.includes(active) ? active : buttons[this._navIndex || 0];
      if (target) target.click();
      return true;
    }

    const backwards = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    const forwards = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    if (!backwards && !forwards && e.key !== 'Home' && e.key !== 'End') return false;

    e.preventDefault();
    const activeIndex = buttons.indexOf(document.activeElement);
    let nextIndex = activeIndex >= 0 ? activeIndex : (this._navIndex || 0);
    if (backwards) nextIndex = (nextIndex - 1 + buttons.length) % buttons.length;
    else if (forwards) nextIndex = (nextIndex + 1) % buttons.length;
    else if (e.key === 'Home') nextIndex = 0;
    else nextIndex = buttons.length - 1;
    this._navIndex = nextIndex;
    buttons[nextIndex].focus();
    return true;
  },

  handleModalKeys(e) {
    const modal = this.ui && this.ui.el.modal;
    if (!modal || !this.ui.modalOpen) return false;
    const buttons = this.getEnabledButtons(modal);
    const key = e.key.toLowerCase();
    const action = key === 'a' ? 'accept' : key === 'r' ? 'run' : key === 't' ? 'raise' : key === 'p' ? 'play' : key === 'g' ? 'give' : null;
    if (action) {
      const button = buttons.find((el) => el.dataset.keyAction === action);
      if (button) { e.preventDefault(); button.click(); return true; }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      const cancel = buttons.find((el) => el.dataset.keyAction === 'cancel' || el.dataset.keyAction === 'back');
      if (cancel) cancel.click();
      else if (this.current === 'game' && this.ui.cancelPending) {
        const quit = document.getElementById('btn-quit-match');
        if (quit) quit.click();
      }
      return true;
    }
    return this.navigateButtons(buttons, e);
  },

  handleGameKeys(e) {
    if (this.ui && this.ui.modalOpen) return this.handleModalKeys(e);
    if (this.optsFrom) {
      if (e.key === 'Escape') { e.preventDefault(); this.closeOpts(); return true; }
      return this.navigateButtons(this.getScreenButtons(), e);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      const quit = document.getElementById('btn-quit-match');
      if (quit) quit.click();
      return true;
    }
    if (!this.ui || !this.ui.pending) return false;

    const cards = Array.from(document.querySelectorAll('#hand .card--in-hand'));
    if (e.key >= '1' && e.key <= '3') {
      const card = cards[Number(e.key) - 1];
      if (card) { e.preventDefault(); card.click(); return true; }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!cards.length) return false;
      e.preventDefault();
      const current = cards.indexOf(document.activeElement);
      const start = current >= 0 ? current : 0;
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      cards[(start + delta + cards.length) % cards.length].focus();
      return true;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (cards.includes(document.activeElement)) {
        e.preventDefault(); document.activeElement.click(); return true;
      }
    }
    if (e.key.toLowerCase() === 't') {
      const truco = document.querySelector('#actions .btn--truco');
      if (truco && !truco.disabled) { e.preventDefault(); truco.click(); return true; }
    }
    return false;
  },

  focusScreenButtons() {
    const btns = this.getScreenButtons();
    if (!btns.length) return;
    const active = document.activeElement;
    const idx = btns.indexOf(active);
    const target = idx >= 0 ? btns[idx] : btns[0];
    target.focus();
    this._navIndex = btns.indexOf(target);
  },

  handleGlobalKeys(e) {
    const tag = document.activeElement && document.activeElement.tagName;
    const isText = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (isText && e.key !== 'Escape') return;

    if (this.devToolsOpen && this.current === 'world') {
      if (e.key === 'Escape') { e.preventDefault(); this.toggleDevTools(false); }
      return;
    }
    if (this.ui && this.ui.modalOpen && this.handleModalKeys(e)) return;
    if (this.optsFrom && this.current !== 'game') {
      if (e.key === 'Escape') { e.preventDefault(); this.closeOpts(); return; }
      if (this.navigateButtons(this.getScreenButtons(), e)) return;
    }
    if (this.current === 'game' && this.handleGameKeys(e)) return;

    if (this.current === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); Sound.init(); Sound.click(); this.show('menu'); return;
    }

    const screenNav = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (screenNav.includes(e.key) || e.key === 'Enter' || e.key === ' ') {
      const isInteractionScreen = ['title', 'menu', 'config', 'tutorial', 'settings', 'ranking'].includes(this.current);
      if (!isInteractionScreen) return;
      this.navigateButtons(this.getScreenButtons(), e);
    }

    if (e.key === 'Escape') {
      if (this.current === 'menu') { this.show('title'); }
      else if (this.current !== 'title') { const back = document.querySelector('.screen--on [data-back]'); if (back) { Sound.click(); this.show(back.dataset.back); } }
    }
  },

  show(name) {
    this.screens.forEach((s) => {
      const el = document.getElementById('screen-' + s);
      if (el) el.classList.toggle('screen--on', s === name);
    });
    if (name === 'world') { World.resize(); World.start(); } else { World.stop(); }
    if (name !== 'game' && typeof Sound !== 'undefined' && Sound.setMood) Sound.setMood(0);
    this.current = name;
    setTimeout(() => this.focusScreenButtons(), 0);
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

  isLocalDevToolsAllowed() {
    const localOrigin = location.protocol === 'file:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]';
    return localOrigin && new URLSearchParams(location.search).get('dev') === '1';
  },

  toggleDevTools(force) {
    if (!this.devToolsEnabled || this.current !== 'world') return;
    const panel = document.getElementById('devtools-panel');
    const button = document.getElementById('btn-devtools');
    if (!panel || !button) return;
    this.devToolsOpen = typeof force === 'boolean' ? force : !this.devToolsOpen;
    panel.hidden = !this.devToolsOpen;
    button.setAttribute('aria-expanded', String(this.devToolsOpen));
    if (this.devToolsOpen) {
      World.stop();
      const firstAction = panel.querySelector('[data-dev-action]');
      if (firstAction) firstAction.focus();
    } else if (this.current === 'world' && !this.optsFrom && !this.ui.modalOpen) {
      World.start();
      button.focus();
    }
  },

  applyDevAction(action) {
    if (!this.devToolsEnabled || this.current !== 'world' || !this.devToolsOpen) return;
    const unlockStory = () => {
      World.rep = Math.max(World.rep, 45);
      for (const npc of NPCS) {
        if (npc.boss) World.bossDone[npc.id] = true;
        World.defeated[npc.id] = true;
      }
      World.storyComplete = true;
      World.city = World.buildCity();
      if (World.scene && World.scene.kind === 'city') World.scene = World.city;
    };
    const unlockCollections = () => {
      World.capsFound = Object.fromEntries(World.caps.map((cap) => [cap.id, true]));
      World.eggs = Object.fromEntries(EGGS.map((egg) => [egg.id, true]));
      for (const sticker of Collection.STICKERS) Collection.unlockSticker(sticker.id);
      for (const item of [...Collection.BACKS, ...Collection.FELTS]) Collection.owned[item.id] = true;
    };
    const completeSidequests = () => {
      World.rumors = Object.fromEntries(RUMORS.map((rumor) => [rumor.id, rumor.steps.length]));
      World.ensureRequests();
      for (const request of World.requests.items) {
        request.active = true;
        request.progress = request.goal;
        request.claimed = true;
      }
    };
    const grantResources = () => {
      World.money = 10000;
      for (const item of this.ITEMS) this.items[item.id] = 99;
      World.partnerBond = 10;
      World.pub = { ...World.pub, level: 3, stock: 99 };
    };
    const actions = {
      story: unlockStory,
      collections: unlockCollections,
      sidequests: completeSidequests,
      resources: grantResources,
      all: () => {
        unlockStory();
        unlockCollections();
        completeSidequests();
        grantResources();
      },
    };
    const run = actions[action];
    if (!run) return;
    run();
    World.hudRefresh();
    if (World.ctx && World.scene) World.draw();
    this.renderRanking();
    this.persist();
    const status = document.getElementById('devtools-status');
    if (status) status.textContent = 'Ação concluída e progresso salvo.';
  },

  /* ---------- progresso salvo ---------- */
  persist() {
    if (!Save.available || this.resetting) return;
    Save.write({
      lang: T.lang,
      music: Sound.music,
      sfx: Sound.sfx,
      cfg: this.cfg,
      stats: this.stats,
      world: {
        money: World.money, rep: World.rep, defeated: World.defeated,
        x: World.player.x,
        y: World.player.y,
        sceneKind: World.scene ? World.scene.kind : 'city',
        sceneId: World.scene ? World.scene.id : null,
        sceneZone: World.sceneZone || null,
        back: World.back,
        started: World.started,
        fedToday: World.fedToday,
        mealBonusAvailable: World.mealBonusAvailable,
        dailyResults: World.dailyResults,
        rumors: World.rumors,
        requests: World.requests,
        capsFound: World.capsFound,
        storyComplete: World.storyComplete,
        pub: World.pub,
        cabareRewardDay: World.cabareRewardDay,
        npcState: World.npcState, heat: World.heat, loanUsed: World.loanUsed,
        partnerBond: World.partnerBond,
        nightRun: this.nightRun,
        bossDone: World.bossDone, day: World.day, eventId: World.eventId,
        eggs: World.eggs, eggTalk: World.eggTalk,
        hour: World.hour, nextEventId: World.nextEventId,
      },
      items: this.items,
      collection: Collection.data(),
      handPhotos: this.handPhotos,
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
      World.storyComplete = d.world.storyComplete === true;
      if (typeof d.world.x === 'number') { World.player.x = d.world.x; World.player.y = d.world.y; }
      if (d.world.sceneKind === 'in' && d.world.sceneId && INTERIORS[d.world.sceneId]) {
        World.scene = World.buildInterior(d.world.sceneId);
        World.sceneZone = d.world.sceneZone || 'vila';
      } else {
        World.scene = World.city;
        World.sceneZone = null;
      }
      if (d.world.back && typeof d.world.back.x === 'number' && typeof d.world.back.y === 'number') World.back = d.world.back;
      World.started = d.world.started === true;
      World.fedToday = d.world.fedToday === true;
      World.mealBonusAvailable = d.world.mealBonusAvailable === true;
      World.dailyResults = Array.isArray(d.world.dailyResults) ? d.world.dailyResults : [];
      World.rumors = d.world.rumors && typeof d.world.rumors === 'object' ? d.world.rumors : {};
      World.requests = d.world.requests || null;
      World.capsFound = d.world.capsFound && typeof d.world.capsFound === 'object'
        ? Object.fromEntries(World.caps.filter((cap) => d.world.capsFound[cap.id] === true).map((cap) => [cap.id, true]))
        : {};
      World.pub = d.world.pub && typeof d.world.pub === 'object'
        ? { ...World.pub, ...d.world.pub }
        : { level: 0, stock: 0, openedToday: false, nights: 0, lastEarnings: 0 };
      World.cabareRewardDay = Number.isInteger(d.world.cabareRewardDay) ? d.world.cabareRewardDay : 0;
      World.npcState = d.world.npcState || {};
      World.partnerBond = Number.isFinite(d.world.partnerBond) ? Math.max(0, Math.min(10, d.world.partnerBond)) : 0;
      this.nightRun = d.world.nightRun && Number.isInteger(d.world.nightRun.stage)
        ? { stage: Math.max(0, Math.min(2, d.world.nightRun.stage)), wins: Math.max(0, d.world.nightRun.wins || 0) }
        : null;
      World.heat = d.world.heat || 0;
      World.loanUsed = d.world.loanUsed === true;
      World.bossDone = d.world.bossDone || {};
      World.storyComplete = World.storyComplete ||
        !!(World.bossDone.bigode && World.bossDone.nogueira && World.bossDone.lenda);
      if (World.storyComplete) {
        World.city = World.buildCity();
        if (World.scene.kind === 'city') World.scene = World.city;
      }
      World.day = d.world.day || 1;
      World.eventId = d.world.eventId || 'calmo';
      World.eggs = d.world.eggs || {};
      World.eggTalk = d.world.eggTalk || {};
      if (typeof d.world.hour === 'number') World.hour = d.world.hour;
      if (d.world.nextEventId) World.nextEventId = d.world.nextEventId;
      World.refreshRoutines(true);
    }
    if (d.items) this.items = d.items;
    Collection.load(d.collection);
    this.handPhotos = Array.isArray(d.handPhotos)
      ? d.handPhotos.filter((photo) =>
        photo && typeof photo.id === 'string' && typeof photo.title === 'string' &&
        Array.isArray(photo.score) && photo.score.length === 2 && Array.isArray(photo.moves))
        .slice(0, 20)
      : [];
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

  buildPlayers(format, difficulty, npc = null) {
    const pool = shuffle([...BOT_NAMES]);
    const av = shuffle([...AVATARS]);
    const players = [{ name: T.t('you'), team: 0, isHuman: true, avatar: '🙋' }];
    for (let i = 1; i < format; i++) {
      if (npc && i === 2) {
        players.push({
          name: T.t('story_partner'), team: i % 2, isHuman: false, avatar: '🤝',
          styleId: 'story_partner', isStoryPartner: true, bond: World.partnerBond,
        });
      } else {
        players.push({ name: pool[i % pool.length], team: i % 2, isHuman: false, avatar: av[i % av.length], styleId: Faces.GENERIC[(i * 3 + Math.floor(Math.random() * 10)) % Faces.GENERIC.length] });
      }
    }
    return players;
  },

  async startMatch(cfg, npc = null, stake = null) {
    this.storyNpc = npc;
    this.stake = stake;
    // padrão único: toda partida vale 12 pontos
    const target = 12;
    const players = this.buildPlayers(cfg.format, cfg.difficulty, npc);
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

    const weeklyRule = World.weeklyRule();
    window.Game = new TrucoGame({ ...cfg, players, target, edge, weeklyRuleId: weeklyRule.id }, this.ui);

    // itens e clima: cafezinho dá tempo, chuva tira
    // tempo de turno vem dos Ajustes (0 = sem limite); cafezinho e clima mexem nele
    const baseTurn = Opts.v.turn;
    const mealBonus = npc && World.mealBonusAvailable ? 5 : 0;
    this.ui.turnTime = baseTurn === 0 ? 0 : Math.max(10,
      baseTurn + (this.items.cafe ? 10 : 0) + (npc ? (World.mods().turn || 0) + mealBonus : 0) + (weeklyRule.turn || 0));
    if (npc && World.mealBonusAvailable) {
      World.mealBonusAvailable = false;
      this.persist();
    }
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
    if (winner === null) { this.nightRun = null; return; }
    this.pendingSticker = npc && winner === 0 ? Collection.unlockSticker(npc.id) : false;
    this.saveHistoricHand(winner, npc);
    if (npc) {
      World.dailyResults.push({ name: npc.name, won: winner === 0, day: World.day, boss: !!npc.boss });
      World.dailyResults = World.dailyResults.slice(-20);
      World.trackRequests('matches');
      if (winner === 0) World.trackRequests('wins');
      if (players.some((player) => player.isStoryPartner)) {
        World.partnerBond = Math.min(10, World.partnerBond + (winner === 0 ? 2 : 1));
      }
    }
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
    const nextScreen = await this.endMatchScreen(winner, npc, stake);
    await this.showHandReview(winner);
    if (fresh.length) await this.showUnlocks(fresh);
    this.persist();
    if (nextScreen === 'rematch' && !this.nightRun) {
      this.startMatch(this.cfg);
      return;
    }
    this.show(nextScreen);
    if (this.nightRun) this.advanceNightRun(winner);
  },

  showHandReview(winner) {
    if (!Opts.v.review || !Opts.v.hints) return;
    const rounds = window.Game.history.filter((round) => round.winner !== 0);
    const mistakes = [];
    for (const round of rounds) {
      for (const decision of round.decisions) {
        if (decision.teammateLeading || !Number.isFinite(decision.opponentBest)) continue;
        const couldBeat = decision.heldPowers.some((power) => power > decision.opponentBest);
        if (decision.cardPower <= decision.opponentBest && couldBeat) {
          mistakes.push({ hand: round.hand, round: round.round });
        }
      }
    }
    const box = this.ui.openModal(T.t('review_title'));
    if (mistakes.length) {
      mistakes.slice(0, 2).forEach((mistake) => {
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = T.t('review_mistake', mistake);
        box.appendChild(note);
      });
    } else {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = T.t(winner === 0 ? 'review_good' : 'review_none');
      box.appendChild(note);
    }
    return new Promise((resolve) => {
      this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => {
        this.ui.closeModal();
        resolve();
      });
    });
  },

  saveHistoricHand(winner, npc) {
    const game = window.Game;
    const round = [...game.history].reverse().find((entry) => entry.winner === winner) || game.history[game.history.length - 1];
    if (!round) return;
    const photo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      title: npc ? npc.name : T.t('photo_quick_match'),
      winner,
      score: game.scores.slice(),
      variant: game.variant,
      hand: round.hand,
      round: round.round,
      moves: round.moves.map((move) => ({
        name: String(move.name || ''),
        avatar: String(move.avatar || ''),
        team: move.team === 0 ? 0 : 1,
        card: move.card ? { id: move.card.id, rank: move.card.rank, suit: move.card.suit } : null,
      })),
    };
    this.handPhotos.unshift(photo);
    this.handPhotos = this.handPhotos.slice(0, 20);
  },

  openPhotoGallery() {
    const box = this.ui.openModal(T.t('photo_gallery'), T.t('photo_gallery_desc'));
    if (!this.handPhotos.length) {
      const empty = document.createElement('p');
      empty.className = 'note';
      empty.textContent = T.t('photo_empty');
      box.appendChild(empty);
    }
    this.handPhotos.forEach((photo) => {
      const button = document.createElement('button');
      button.className = 'nb-row nb-row--act';
      button.textContent = `${photo.title} · ${T.t('photo_score', { us: photo.score[0], them: photo.score[1] })}`;
      button.onclick = () => this.openPhoto(photo);
      box.appendChild(button);
    });
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  openPhoto(photo) {
    const box = this.ui.openModal(T.t('photo_title', { name: photo.title }));
    const canvas = this.renderHandPhoto(photo);
    canvas.className = 'photo-preview';
    box.appendChild(canvas);
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    this.mkBtn(actions, T.t('photo_share'), 'btn--accept', () => this.shareHandPhoto(photo));
    this.mkBtn(actions, T.t('photo_download'), '', () => this.downloadHandPhoto(photo));
    this.mkBtn(actions, T.t('photo_delete'), 'btn--run', () => this.deleteHandPhoto(photo.id));
    box.appendChild(actions);
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.openPhotoGallery());
  },

  renderHandPhoto(photo) {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#163d27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e8b93c';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = '#f4ead2';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRUCO DE BOTECO', 500, 68);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(photo.title, 500, 108, 900);
    ctx.font = '18px sans-serif';
    ctx.fillText(`${photo.score[0]} × ${photo.score[1]} · ${T.t(photo.variant)} · ${T.t('photo_hand_round', { hand: photo.hand, round: photo.round })}`, 500, 142);

    const moves = Array.isArray(photo.moves) ? photo.moves.slice(0, 6) : [];
    const width = 118, height = 172, gap = 26;
    const startX = (canvas.width - (moves.length * width + Math.max(0, moves.length - 1) * gap)) / 2;
    moves.forEach((move, index) => {
      const x = startX + index * (width + gap), y = 190;
      const card = move.card || {};
      const suitSymbols = { ouros: '♦', espadas: '♠', copas: '♥', paus: '♣' };
      const suitColors = { ouros: '#b5861e', espadas: '#2c5a85', copas: '#a6281c', paus: '#1f6b3a' };
      const winning = move.team === photo.winner;
      ctx.fillStyle = winning ? '#f2cf3a' : '#071009';
      ctx.fillRect(x - 4, y - 4, width + 8, height + 8);
      ctx.fillStyle = '#f4ead2';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = suitColors[card.suit] || '#202820';
      ctx.textAlign = 'left';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(String(card.rank || '?'), x + 12, y + 34);
      ctx.textAlign = 'center';
      ctx.font = '54px sans-serif';
      ctx.fillText(suitSymbols[card.suit] || '•', x + width / 2, y + 106);
      ctx.fillStyle = '#071009';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${move.avatar || ''} ${move.name}`, x + width / 2, y + 194, width + 24);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4ead2';
    ctx.font = '16px sans-serif';
    ctx.fillText(T.t(photo.winner === 0 ? 'photo_victory' : 'photo_defeat'), 500, 500);
    return canvas;
  },

  photoBlob(canvas) {
    const encoded = canvas.toDataURL('image/png').split(',')[1];
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: 'image/png' });
  },

  downloadHandPhoto(photo) {
    const canvas = this.renderHandPhoto(photo);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `truco-de-boteco-${photo.id}.png`;
    link.click();
  },

  async shareHandPhoto(photo) {
    const canvas = this.renderHandPhoto(photo);
    const blob = this.photoBlob(canvas);
    if (typeof File === 'function' && navigator.share && navigator.canShare) {
      const file = new File([blob], `truco-de-boteco-${photo.id}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: T.t('photo_gallery'), text: photo.title });
          return;
        } catch (error) {
          if (error && error.name === 'AbortError') return;
          const box = this.ui.openModal(T.t('photo_error_title'), T.t('photo_error'));
          this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
          return;
        }
      }
    }
    this.downloadHandPhoto(photo);
  },

  deleteHandPhoto(id) {
    this.handPhotos = this.handPhotos.filter((photo) => photo.id !== id);
    this.persist();
    this.openPhotoGallery();
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
        st.friendship = Math.min(10, st.friendship + (winner === 0 ? 2 : 1));
        st.lastPlayerWon = winner === 0;
        st.nicknameKey = winner === 0 ? 'nickname_good' : 'nickname_brave';
        const p = document.createElement('p');
        if (winner === 0) {
          const em = World.mods();
          const payout = Math.round(pot * (em.payMult || 1));
          const repGain = Math.max(1, Math.round((pot / 10) * (stake === 'high' ? 1.5 : 1) * (em.repMult || 1)));
          World.money += payout;
          World.rep += repGain;
          World.defeated[npc.id] = true;
          World.heat++;
          st.wins++;
          st.level++;                       // na próxima ele joga mais sério
          p.textContent = T.t('won_money', { n: payout, r: repGain });
        } else {
          const loss = Math.round(pot / 2);
          World.money = Math.max(0, World.money - loss);
          st.losses++;
          p.textContent = T.t('lost_money', { n: loss });
        }
        box.appendChild(p);
        if (winner === 0 && this.pendingSticker) {
          const sticker = document.createElement('p');
          sticker.className = 'nb__title';
          sticker.textContent = T.t('sticker_unlocked', { name: npc.name });
          box.appendChild(sticker);
        }

        // chefão derrubado: abre o bairro seguinte
        if (winner === 0 && npc.boss && !World.bossDone[npc.id]) {
          World.bossDone[npc.id] = true;
          const z = ZONES.find((zz) => zz.needs === npc.id);
          const bp = document.createElement('p');
          bp.className = 'nb__title';
          bp.textContent = z ? T.t('zone_open', { name: T.t(z.nameKey) }) : T.t('city_yours');
          box.appendChild(bp);
          if (z) World.spawnPickups();
          if (npc.id === 'lenda' && World.bossDone.bigode && World.bossDone.nogueira) {
            World.storyComplete = true;
            World.city = World.buildCity();
            if (World.scene.kind === 'city') World.scene = World.city;
            const pub = document.createElement('p');
            pub.className = 'nb__title';
            pub.textContent = T.t('pub_unlocked');
            box.appendChild(pub);
          }
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
      const mk = (label, cls, action) => {
        const b = document.createElement('button');
        b.className = 'btn ' + cls;
        b.textContent = label;
        b.onclick = () => { Sound.click(); this.ui.closeModal(); resolve(action); };
        box.appendChild(b);
      };
      if (!npc && !this.nightRun) mk(T.t('rematch'), 'btn--accept', 'rematch');
      mk(npc ? T.t('back') : T.t('to_menu'), 'btn--run', npc ? 'world' : 'menu');
    });
  },

  /* ---------- modo história ---------- */
  openStory() {
    this.show('world');
    if (!World.started) {
      World.goHome();
      World.started = true;
      this.persist();
    }
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
    if (label === T.t('back')) b.dataset.keyAction = 'back';
    else if (label === T.t('opt_cancel') || label === T.t('cancel')) b.dataset.keyAction = 'cancel';
    b.onclick = () => { Sound.click(); fn(b); };
    box.appendChild(b);
    return b;
  },

  /* ---------- conversa com o pessoal da cidade ---------- */
  talk() {
    if (World.nearBed) return this.askSleep();
    if (World.nearFridge) return this.eatAtHome();
    if (World.nearBoard) return this.openRequestBoard();
    if (World.nearPubManage) return this.managePub();
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
    if (n.id === 'mara-neon') return this.talkCabare();
    const st = World.stateOf(n.id);
    const beaten = !!World.defeated[n.id];
    const line = typeof st.lastPlayerWon === 'boolean'
      ? T.t(st.lastPlayerWon ? 'npc_rival_win' : 'npc_rival_loss', { nickname: T.t(st.nicknameKey || (st.lastPlayerWon ? 'nickname_good' : 'nickname_brave')) })
      : beaten ? T.t('npc_beat') : (n.line[T.lang] || n.line.pt);
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
      ` · ${T.t('points_to', { n: 12 })} · ${T.t('record', { w: st.wins, l: st.losses })}` +
      ` · ${T.t('friendship', { n: Math.floor(st.friendship / 2) })}`;
    box.appendChild(tag);

    if (n.id === 'bereba') {
      this.mkBtn(box, T.t('porrinha_play'), 'btn--truco', () => {
        this.ui.closeModal();
        this.playPorrinha();
      });
    }
    const label = st.wins || st.losses ? T.t('rematch_npc', { n: st.level + 1 }) : T.t('challenge_accept');
    this.rumorActions(n, box);
    this.mkBtn(box, label, 'btn--accept', () => this.askStake(n));
    this.mkBtn(box, T.t('challenge_decline'), 'btn--run', () => this.ui.closeModal());
  },

  talkCabare() {
    const box = this.ui.openModal(T.t('cabare_title'), T.t('cabare_intro'));
    this.mkBtn(box, T.t('cabare_rhythm'), 'btn--truco', () => {
      this.ui.closeModal();
      this.startCabareRhythm();
    });
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  startCabareRhythm() {
    this.cabareGame = {
      round: 0,
      score: 0,
      cue: Math.floor(Math.random() * 3),
    };
    this.playCabareRhythm();
  },

  playCabareRhythm() {
    const game = this.cabareGame;
    const box = this.ui.openModal(
      T.t('cabare_title'),
      T.t('cabare_cue', { n: game.round + 1, cue: T.t(`cabare_color_${game.cue}`) })
    );
    for (let light = 0; light < 3; light++) {
      this.mkBtn(box, T.t(`cabare_light_${light}`), '', () => {
        if (light === game.cue) game.score++;
        game.round++;
        if (game.round < 3) {
          game.cue = Math.floor(Math.random() * 3);
          this.playCabareRhythm();
        } else {
          this.finishCabareRhythm();
        }
      });
    }
  },

  finishCabareRhythm() {
    const game = this.cabareGame;
    const earned = game.score >= 2 && World.cabareRewardDay !== World.day;
    if (earned) {
      World.money += 8;
      World.cabareRewardDay = World.day;
      this.persist();
      World.hudRefresh();
    }
    const key = game.score < 2
      ? 'cabare_result_low'
      : earned ? 'cabare_result_reward' : 'cabare_result_repeat';
    const box = this.ui.openModal(
      T.t('cabare_title'),
      T.t(key, { score: game.score, reward: 8 })
    );
    this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
  },

  rumorActions(n, box) {
    for (const rumor of RUMORS) {
      const progress = Number(World.rumors[rumor.id]) || 0;
      const step = rumor.steps[progress];
      if (!step || step.npc !== n.id) continue;
      const label = T.t(progress === 0 ? 'rumor_start' : 'rumor_continue');
      this.mkBtn(box, label, 'btn--truco', () => {
        World.rumors[rumor.id] = progress + 1;
        const complete = progress + 1 === rumor.steps.length;
        if (complete) World.money += rumor.reward;
        this.persist();
        World.hudRefresh();
        this.ui.closeModal();
        const result = this.ui.openModal(T.t('rumor_title'), step.text[T.lang] || step.text.pt);
        if (complete) {
          const reward = document.createElement('p');
          reward.className = 'nb__title';
          reward.textContent = T.t('rumor_reward', { n: rumor.reward });
          result.appendChild(reward);
        }
        this.mkBtn(result, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
      });
    }
  },

  openRequestBoard() {
    World.ensureRequests();
    this.persist();
    const box = this.ui.openModal(T.t('request_board'), T.t('request_board_desc'));
    for (const request of World.requests.items) {
      const row = document.createElement('div');
      row.className = 'nb-row';
      const name = document.createElement('span');
      name.className = 'nb-row__name';
      name.textContent = T.t(`request_${request.id}`);
      row.appendChild(name);
      const progress = document.createElement('p');
      progress.className = 'nb-row__sub';
      progress.textContent = `${T.t('request_progress', { current: request.progress, goal: request.goal })} · R$ ${request.reward}`;
      row.appendChild(progress);
      if (request.claimed) {
        const status = document.createElement('span');
        status.className = 'nb-row__tag tag--beaten';
        status.textContent = T.t('request_done');
        row.appendChild(status);
      } else if (request.active && request.progress >= request.goal) {
        this.mkBtn(row, T.t('request_claim', { n: request.reward }), 'btn--gold', () => {
          request.claimed = true;
          World.money += request.reward;
          this.persist();
          World.hudRefresh();
          this.ui.closeModal();
          this.openRequestBoard();
        });
      } else if (request.active) {
        const status = document.createElement('span');
        status.className = 'nb-row__tag tag--open';
        status.textContent = T.t('request_active');
        row.appendChild(status);
      } else {
        this.mkBtn(row, T.t('request_accept'), 'btn--accept', () => {
          request.active = true;
          this.persist();
          this.ui.closeModal();
          this.openRequestBoard();
        });
      }
      box.appendChild(row);
    }
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  playPorrinha() {
    const cost = 5;
    if (World.money < cost) {
      const box = this.ui.openModal(T.t('porrinha_title'), T.t('porrinha_no_money', { n: cost }));
      this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
      return;
    }
    World.money -= cost;
    World.hudRefresh();
    this.persist();
    this.porrinha = { player: 3, bot: 3, round: 0, cost };
    const box = this.ui.openModal(T.t('porrinha_title'), T.t('porrinha_intro', { n: cost }));
    this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => {
      this.ui.closeModal();
      this.porrinhaRound();
    });
  },

  porrinhaRound() {
    const game = this.porrinha;
    game.round++;
    const maxHidden = Math.min(3, game.player);
    const box = this.ui.openModal(
      T.t('porrinha_title'),
      T.t('porrinha_hide', { sticks: game.player, max: maxHidden, round: game.round })
    );
    for (let amount = 0; amount <= maxHidden; amount++) {
      this.mkBtn(box, T.t('porrinha_amount', { n: amount }), '', () => {
        game.playerHidden = amount;
        game.botHidden = Math.floor(Math.random() * (Math.min(3, game.bot) + 1));
        game.botGuess = Math.floor(Math.random() * 7);
        this.ui.closeModal();
        this.porrinhaGuess();
      });
    }
  },

  porrinhaGuess() {
    const game = this.porrinha;
    const box = this.ui.openModal(
      T.t('porrinha_title'),
      T.t('porrinha_bot_guess', { guess: game.botGuess })
    );
    for (let guess = 0; guess <= 6; guess++) {
      if (guess === game.botGuess) continue;
      this.mkBtn(box, T.t('porrinha_amount', { n: guess }), '', () => {
        this.ui.closeModal();
        this.resolvePorrinhaRound(guess);
      });
    }
  },

  resolvePorrinhaRound(guess) {
    const game = this.porrinha;
    const total = game.playerHidden + game.botHidden;
    const playerHit = guess === total;
    const botHit = game.botGuess === total;
    if (playerHit) game.player--;
    if (botHit) game.bot--;
    const winner = game.player === 0 ? 'player' : game.bot === 0 ? 'bot' : game.round >= 10 ? 'draw' : null;
    if (winner === 'player') World.money += 10;
    else if (winner === 'draw') World.money += game.cost;
    if (winner) {
      World.hudRefresh();
      this.persist();
    }
    const outcomeKey = playerHit ? 'porrinha_hit_player' : botHit ? 'porrinha_hit_bot' : 'porrinha_hit_none';
    const desc = T.t('porrinha_result', {
      total,
      result: T.t(outcomeKey),
      player: game.player,
      bot: game.bot,
    });
    const endKey = winner ? `porrinha_end_${winner}` : null;
    const box = this.ui.openModal(T.t('porrinha_title'), endKey ? `${desc} ${T.t(endKey)}` : desc);
    this.mkBtn(box, T.t(winner ? 'ok_go' : 'porrinha_next'), 'btn--accept', () => {
      this.ui.closeModal();
      if (!winner) this.porrinhaRound();
    });
  },

  /* ---------- easter eggs: a turma dos devs ---------- */
  talkEgg(n) {
    const first = !World.eggs[n.id];
    if (first) {
      World.eggs[n.id] = true;
      Collection.unlockSticker(n.id);
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
      const sticker = document.createElement('p');
      sticker.className = 'note';
      sticker.textContent = T.t('sticker_found');
      box.appendChild(sticker);
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

    const bond = document.createElement('p');
    bond.className = 'note';
    const bondHearts = Math.floor(World.partnerBond / 2);
    bond.textContent = `${T.t('partner_bond', {
      hearts: `${'♥'.repeat(bondHearts)}${'♡'.repeat(5 - bondHearts)}`,
    })} · ${T.t('partner_bond_help')}`;
    box.appendChild(bond);

    const ev = document.createElement('p');
    ev.className = 'note';
    ev.textContent = `${T.t('day_lbl', { n: World.day })} · ${World.ev().ico} ${T.t('ev_' + World.eventId)}`;
    box.appendChild(ev);
    const weekly = document.createElement('p');
    weekly.className = 'note';
    weekly.textContent = `${T.t('weekly_title')}: ${T.t(World.weeklyRule().key)}`;
    box.appendChild(weekly);
    const festival = World.festival();
    if (festival) {
      const festNote = document.createElement('p');
      festNote.className = 'note';
      festNote.textContent = `${festival.ico} ${T.t(festival.nameKey)}: ${T.t(festival.descKey)}`;
      box.appendChild(festNote);
    }
    const capsNote = document.createElement('p');
    capsNote.className = 'note';
    capsNote.textContent = T.t('caps_found', { found: World.capCount(), total: World.caps.length });
    box.appendChild(capsNote);

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
            <span class="nb-row__sub">R$ ${stake} · \u2b50 ${n.rep} · ${T.t('record', { w: st.wins, l: st.losses })} · ${T.t('friendship', { n: Math.floor(st.friendship / 2) })}</span>
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

    this.mkBtn(box, T.t(this.nightRun ? 'night_continue' : 'night_start'), 'btn--truco', () => {
      this.ui.closeModal();
      if (!this.nightRun) this.nightRun = { stage: 0, wins: 0 };
      this.persist();
      this.openNightMap();
    });
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  openNightMap() {
    if (!this.nightRun) return;
    const paths = [
      [
        { key: 'night_path_1a', format: 2, difficulty: 'easy' },
        { key: 'night_path_1b', format: 4, difficulty: 'easy' },
      ],
      [
        { key: 'night_path_2a', format: 4, difficulty: 'medium' },
        { key: 'night_path_2b', format: 6, difficulty: 'medium' },
      ],
      [
        { key: 'night_path_3a', format: 4, difficulty: 'hard' },
        { key: 'night_path_3b', format: 6, difficulty: 'hard' },
      ],
    ];
    const box = this.ui.openModal(T.t('night_title'), T.t('night_progress', { n: this.nightRun.stage + 1 }));
    const route = document.createElement('p');
    route.className = 'note';
    route.textContent = `${'● '.repeat(this.nightRun.stage)}◉${' ○'.repeat(2 - this.nightRun.stage)}`;
    box.appendChild(route);
    for (const path of paths[this.nightRun.stage]) {
      this.mkBtn(box, T.t(path.key), 'btn--accept', () => {
        this.ui.closeModal();
        this.startMatch({ ...this.cfg, format: path.format, difficulty: path.difficulty });
      });
    }
    this.mkBtn(box, T.t('night_quit'), 'btn--run', () => {
      this.nightRun = null;
      this.persist();
      this.ui.closeModal();
    });
  },

  advanceNightRun(winner) {
    if (!this.nightRun) return;
    if (winner !== 0) {
      this.nightRun = null;
      this.persist();
      const box = this.ui.openModal(T.t('night_title'), T.t('night_lost'));
      this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
      return;
    }
    this.nightRun.wins++;
    this.nightRun.stage++;
    if (this.nightRun.stage >= 3) {
      this.nightRun = null;
      World.money += 50;
      this.persist();
      const box = this.ui.openModal(T.t('night_title'), T.t('night_won'));
      this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
      return;
    }
    this.persist();
    this.openNightMap();
  },

  /* ---------- eventos da cidade ---------- */
  newDay() {
    const results = World.dailyResults.slice();
    World.dailyResults = [];
    const e = World.rollEvent();
    const m = e.mods || {};
    if (m.cash) World.money += m.cash;
    World.hudRefresh();
    this.persist();
    this.showEvent(results);
  },

  askSleep() {
    const box = this.ui.openModal(T.t('sleep_title'), T.t('sleep_confirm'));
    this.mkBtn(box, T.t('sleep'), 'btn--accept', () => {
      this.ui.closeModal();
      World.hour = 8;
      World.fedToday = false;
      World.mealBonusAvailable = false;
      this.newDay();
    });
    this.mkBtn(box, T.t('challenge_decline'), 'btn--run', () => this.ui.closeModal());
  },

  eatAtHome() {
    const box = this.ui.openModal(T.t('eat_title'), World.fedToday ? T.t('eat_done') : T.t('eat_desc'));
    if (!World.fedToday) {
      this.mkBtn(box, T.t('eat'), 'btn--accept', () => {
        World.fedToday = true;
        World.mealBonusAvailable = true;
        this.persist();
        this.ui.closeModal();
        const done = this.ui.openModal(T.t('eat_title'), T.t('eat_done'));
        this.mkBtn(done, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
      });
    }
    this.mkBtn(box, T.t('challenge_decline'), 'btn--run', () => this.ui.closeModal());
  },

  capFound(completed) {
    this.persist();
    World.hudRefresh();
    const box = this.ui.openModal(T.t('cap_title'), T.t(completed ? 'cap_complete' : 'cap_found', {
      found: World.capCount(),
      total: World.caps.length,
    }));
    this.mkBtn(box, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
  },

  managePub() {
    const pub = World.pub;
    const box = this.ui.openModal(T.t('pub_manage'), T.t('pub_stats', {
      level: pub.level,
      stock: pub.stock,
      nights: pub.nights,
    }));
    if (!World.isNight()) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = T.t('pub_manage_at_night');
      box.appendChild(note);
    } else if (pub.openedToday) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = T.t('pub_already_open');
      box.appendChild(note);
    } else {
      if (pub.stock > 0) {
        this.mkBtn(box, T.t('pub_open'), 'btn--accept', () => {
          pub.stock--;
          pub.openedToday = true;
          this.persist();
          this.ui.closeModal();
          const opened = this.ui.openModal(T.t('pub_manage'), T.t('pub_opened'));
          this.mkBtn(opened, T.t('ok_go'), 'btn--accept', () => this.ui.closeModal());
        });
      }
      const supplyCost = 10;
      if (World.money >= supplyCost) {
        this.mkBtn(box, T.t('pub_buy_stock', { n: supplyCost }), '', () => {
          World.money -= supplyCost;
          pub.stock++;
          this.persist();
          World.hudRefresh();
          this.ui.closeModal();
          this.managePub();
        });
      }
      const upgradeCost = (pub.level + 1) * 100;
      if (pub.level < 3 && World.money >= upgradeCost) {
        this.mkBtn(box, T.t('pub_upgrade', { n: upgradeCost }), 'btn--gold', () => {
          World.money -= upgradeCost;
          pub.level++;
          this.persist();
          World.hudRefresh();
          this.ui.closeModal();
          this.managePub();
        });
      }
    }
    this.mkBtn(box, T.t('back'), 'btn--run', () => this.ui.closeModal());
  },

  showEvent(results = []) {
    const e = World.ev();
    const box = this.ui.openModal(`${e.ico} ${T.t('ev_' + e.id)}`, T.t('ev_' + e.id + '_d'));
    if (results.length) {
      const wins = results.filter((result) => result.won).length;
      const names = results.map((result) => result.name).join(', ');
      const radio = document.createElement('p');
      radio.className = 'note';
      radio.textContent = T.t('radio_report', { names, wins, losses: results.length - wins });
      box.appendChild(radio);
      const last = results[results.length - 1];
      const headlineKey = last.boss
        ? (last.won ? 'radio_boss_win' : 'radio_boss_loss')
        : wins === results.length ? 'radio_all_wins' : wins === 0 ? 'radio_no_wins' : 'radio_mixed';
      const headline = document.createElement('p');
      headline.className = 'note';
      headline.textContent = T.t(headlineKey, { name: last.name });
      box.appendChild(headline);
    } else {
      const radio = document.createElement('p');
      radio.className = 'note';
      radio.textContent = T.t('radio_quiet');
      box.appendChild(radio);
    }
    if (World.pub.lastEarnings > 0) {
      const pubReport = document.createElement('p');
      pubReport.className = 'note';
      pubReport.textContent = T.t('radio_pub', { n: World.pub.lastEarnings });
      box.appendChild(pubReport);
    }
    const festival = World.festival();
    if (festival) {
      const announcement = document.createElement('p');
      announcement.className = 'note';
      announcement.textContent = `${festival.ico} ${T.t(festival.nameKey)}: ${T.t(festival.descKey)}`;
      box.appendChild(announcement);
    }
    const d = document.createElement('p');
    d.className = 'note';
    d.textContent = T.t('day_lbl', { n: World.day });
    box.appendChild(d);
    const weekly = document.createElement('p');
    weekly.className = 'note';
    weekly.textContent = `${T.t('weekly_title')}: ${T.t(World.weeklyRule().key)}`;
    box.appendChild(weekly);
    const caps = document.createElement('p');
    caps.className = 'note';
    caps.textContent = T.t('caps_found', { found: World.capCount(), total: World.caps.length });
    box.appendChild(caps);
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
        if (this.ui.cancelPending) this.ui.cancelPending();
        this.ui.stopTimer(); this.ui.closeModal();
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
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
    window.addEventListener('pagehide', () => this.persist());
  },

  init() {
    const gameRoot = document.getElementById('screen-game');
    this.ui = new TableUI(gameRoot);
    window.TUI = this.ui;
    this.devToolsEnabled = this.isLocalDevToolsAllowed();

    // idioma inicial: português por padrão (trocável nos Ajustes)
    T.set('pt');

    // título -> menu
    const titleScreen = document.getElementById('screen-title');
    if (titleScreen) {
      titleScreen.addEventListener('click', () => {
        Sound.init(); Sound.click(); this.show('menu');
      });
    }

    const bind = (id, fn) => { const e = document.getElementById(id); if (e) e.onclick = () => { Sound.click(); fn(); }; };
    bind('btn-play', () => this.show('config'));
    bind('btn-story', () => this.openStory());
    bind('btn-tutorial', () => { this.tutStep = 0; this.renderTutorial(); this.show('tutorial'); });
    bind('btn-settings', () => { this.optsFrom = null; this.show('settings'); });
    bind('btn-world-opts', () => this.openOpts());
    const devButton = document.getElementById('btn-devtools');
    if (devButton) {
      devButton.hidden = !this.devToolsEnabled;
      devButton.onclick = () => this.toggleDevTools();
    }
    const devClose = document.getElementById('btn-devtools-close');
    if (devClose) devClose.onclick = () => this.toggleDevTools(false);
    document.querySelectorAll('[data-dev-action]').forEach((button) => {
      button.onclick = () => this.applyDevAction(button.dataset.devAction);
    });
    bind('btn-match-opts', () => this.openOpts());
    bind('btn-ranking', () => { this.renderRanking(); this.show('ranking'); });
    bind('btn-collection', () => { Sound.click(); Collection.open(this); });
    bind('btn-photos', () => this.openPhotoGallery());
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
        if (this.ui.cancelPending) this.ui.cancelPending();
        this.ui.stopTimer(); this.ui.closeModal();
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
      if (this.current !== 'world' || this.optsFrom || this.ui.modalOpen) return;
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

    window.addEventListener('keydown', (e) => this.handleGlobalKeys(e));

    if (window.Feel) Feel.init();
    const worldCanvas = document.getElementById('world-canvas');
    if (worldCanvas) World.init(worldCanvas, null);
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
