/* ============================================================
   world.js — mundo aberto em pixel art (canvas 2D)
   Três bairros (fases), interiores exploráveis, eventos do dia,
   moedas no chão e chefões atrás das portas.
   Depende de story.js (ZONES, GATES, NPCS, INTERIORS, EVENTS).
   ============================================================ */

const TS = 16;                       // tile de arte em px
const CITY_W = 72, CITY_H = 96;      // cidade inteira, com os 3 bairros

/* tipos de tile
   cidade: 0 grama 1 rua 2 praça 3 prédio 5 árvore 6 porta 7 muro 8 fonte 9 cancela
   interior: 10 piso 11 parede 12 móvel 13 tapete de saída */
const SOLID_CITY = [3, 5, 6, 7, 8];
const SOLID_IN = [11, 12];
const CITY_CAPS = [
  { id: 'cap-vila-square', x: 30, y: 24, zone: 'vila' },
  { id: 'cap-vila-road', x: 8, y: 18, zone: 'vila' },
  { id: 'cap-vila-east', x: 60, y: 18, zone: 'vila' },
  { id: 'cap-center-square', x: 46, y: 44, zone: 'centro' },
  { id: 'cap-center-road', x: 22, y: 48, zone: 'centro' },
  { id: 'cap-center-east', x: 58, y: 58, zone: 'centro' },
  { id: 'cap-hill-square', x: 44, y: 75, zone: 'morro' },
  { id: 'cap-hill-road', x: 22, y: 80, zone: 'morro' },
  { id: 'cap-hill-east', x: 64, y: 88, zone: 'morro' },
];

const World = {
  canvas: null, ctx: null, scale: 3,
  scene: null, city: null, interiors: {},
  player: { x: 14 * TS, y: 18 * TS, dir: 'down', frame: 0, speed: 1.15 },
  keys: {}, running: false, money: 20, rep: 0, defeated: {}, eggs: {}, eggTalk: {},
  nearNpc: null, nearShop: false, nearDoor: null, nearExit: false, nearBoard: false, nearPubManage: false,
  onChallenge: null, camX: 0, camY: 0, t: 0,
  npcState: {},        // id -> { wins, losses, level }
  heat: 0,             // a cidade endurece conforme você vence
  loanUsed: false,
  bossDone: {},        // id do chefão -> true (abre o bairro seguinte)
  day: 1, eventId: 'calmo', nextEventId: null,
  hour: 9,              // relógio do mundo: 1 hora a cada 15 s andando (dia inteiro em 6 min)
  pickups: [],
  back: null,          // de onde entrei, para poder sair
  started: false,
  fedToday: false,
  mealBonusAvailable: false,
  dailyResults: [],
  rumors: {},
  partnerBond: 0,
  requests: null,
  cabareRewardDay: 0,
  storyComplete: false,
  pub: { level: 0, stock: 0, openedToday: false, nights: 0, lastEarnings: 0 },
  caps: CITY_CAPS,
  capsFound: {},

  /* ---------- patentes ---------- */
  TITLES: [
    { rep: 45, key: 't_rei' },
    { rep: 30, key: 't_lenda' },
    { rep: 18, key: 't_maodeferro' },
    { rep: 9, key: 't_truqueiro' },
    { rep: 3, key: 't_pernadepau' },
    { rep: 0, key: 't_novato' },
  ],
  title() { return (this.TITLES.find((t) => this.rep >= t.rep) || this.TITLES[this.TITLES.length - 1]).key; },

  stateOf(id) {
    if (!this.npcState[id]) this.npcState[id] = { wins: 0, losses: 0, level: 0, friendship: 0 };
    const state = this.npcState[id];
    if (typeof state.friendship !== 'number') state.friendship = 0;
    return state;
  },
  capCount() { return this.caps.filter((cap) => this.capsFound[cap.id]).length; },

  refreshRoutines(force) {
    let changed = false;
    for (const n of NPCS) {
      if (!n.schedule) continue;
      const slot = n.schedule.find((s) => this.hour >= s.from && this.hour < s.to);
      if (!slot) continue;
      const key = `${slot.place}:${slot.x}:${slot.y}`;
      if (!force && n._routineKey === key) continue;
      n._routineKey = key;
      n.place = slot.place;
      n.x = slot.x;
      n.y = slot.y;
      changed = true;
    }
    if (!changed || !this.city) return;

    const eggs = window.EGGS || [];
    this.city.npcs = NPCS.filter((n) => n.place === 'city').concat(eggs.filter((n) => n.place === 'city'));
    this.fixSpots(this.city.map, this.city.npcs, SOLID_CITY.concat([9]));
    for (const [id, scene] of Object.entries(this.interiors)) {
      scene.npcs = NPCS.filter((n) => n.place === id).concat(eggs.filter((n) => n.place === id));
      this.fixSpots(scene.map, scene.npcs, SOLID_IN.concat([13]), [scene.exit.x, scene.h - 2]);
    }
  },

  goHome() {
    const building = this.city && this.city.buildings.find((b) => b.home);
    if (!building) return false;
    this.back = { x: building.door.x * TS + 8, y: (building.door.y + 1) * TS + 8 };
    this.scene = this.buildInterior('player_home');
    this.sceneZone = 'vila';
    this.hudRefresh();
    this.player.vx = 0; this.player.vy = 0;
    this.player.x = 9 * TS + 8;
    this.player.y = 10 * TS + 8;
    this.nearNpc = null; this.nearShop = false; this.nearDoor = null; this.nearExit = false; this.nearBoard = false; this.nearPubManage = false;
    this.nearBed = false; this.nearFridge = false;
    return true;
  },

  /* ---------- zonas / fases ---------- */
  zone(id) { return ZONES.find((z) => z.id === id) || ZONES[0]; },
  zoneOpen(id) {
    const z = this.zone(id);
    return !z.needs || !!this.bossDone[z.needs];
  },
  zoneAt(ty) { return ZONES.find((z) => ty >= z.y0 - 2 && ty <= z.y1 + 2) || ZONES[0]; },
  curZone() { return this.scene && this.scene.kind === 'city' ? this.zoneAt(Math.floor(this.player.y / TS)) : this.zone(this.sceneZone || 'vila'); },

  /* um desafiante está liberado? precisa da fama e do bairro aberto */
  npcLocked(n) { return n.egg ? !this.zoneOpen(n.zone) : (this.rep < n.rep || !this.zoneOpen(n.zone)); },

  nextLocked() {
    return NPCS.filter((n) => this.npcLocked(n)).sort((a, b) => a.rep - b.rep)[0] || null;
  },

  /* ---------- evento do dia ---------- */
  ev() { return EVENTS.find((e) => e.id === this.eventId) || EVENTS[0]; },
  festival() {
    const dayOfYear = ((this.day - 1) % 365) + 1;
    return (window.FESTIVALS || []).find((festival) => festival.day === dayOfYear) || null;
  },
  mods() {
    const daily = this.ev().mods || {};
    const seasonal = (this.festival() && this.festival().mods) || {};
    return {
      ...daily,
      ...seasonal,
      turn: (daily.turn || 0) + (seasonal.turn || 0),
      coins: (daily.coins || 0) + (seasonal.coins || 0),
      repMult: (daily.repMult || 1) * (seasonal.repMult || 1),
      payMult: (daily.payMult || 1) * (seasonal.payMult || 1),
      edge: (daily.edge || 0) + (seasonal.edge || 0),
    };
  },
  weeklyRule() {
    const rules = window.WEEKLY_RULES || [];
    const index = Math.floor((this.day - 1) / 7) % rules.length;
    return rules[index] || rules[0];
  },
  /* sorteia um clima/evento diferente do anterior */
  pickEvent(not) {
    const pool = EVENTS.filter((e) => e.id !== not);
    return pool[Math.floor(Math.random() * pool.length)].id;
  },
  /* a previsão de amanhã (o que a TV do boteco mostra) */
  forecast() {
    if (!this.nextEventId || this.nextEventId === this.eventId) this.nextEventId = this.pickEvent(this.eventId);
    return EVENTS.find((e) => e.id === this.nextEventId) || EVENTS[0];
  },
  /* luz do dia: 0 = sol a pino, 1 = noite fechada */
  darkness() {
    const h = this.hour;
    if (h < 5) return 1;
    if (h < 7.5) return 1 - (h - 5) / 2.5;
    if (h < 17) return 0;
    if (h < 19.5) return (h - 17) / 2.5;
    return 1;
  },
  isNight() { return this.hour >= 19 || this.hour < 5.5; },
  clock() { const h = Math.floor(this.hour) % 24, m = Math.floor((this.hour % 1) * 6) * 10; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
  rollEvent() {
    this.closePubNight();
    this.day++;
    // o dia novo segue a previsão; depois já sorteia a de amanhã
    this.eventId = this.forecast().id;
    this.nextEventId = this.pickEvent(this.eventId);
    this.refreshRoutines(true);
    const festival = this.festival();
    if (festival && festival.mods.cash) this.money += festival.mods.cash;
    this.spawnPickups();
    this.requests = null;
    return this.ev();
  },
  closePubNight() {
    if (!this.pub.openedToday) { this.pub.lastEarnings = 0; return 0; }
    const earnings = 25 + this.pub.level * 15 + Math.floor(Math.random() * 11);
    this.money += earnings;
    this.pub.nights++;
    this.pub.openedToday = false;
    this.pub.lastEarnings = earnings;
    return earnings;
  },

  ensureRequests() {
    if (this.requests && this.requests.day === this.day && Array.isArray(this.requests.items)) return;
    this.requests = {
      day: this.day,
      items: [
        { id: 'play-match', type: 'matches', goal: 1, progress: 0, active: false, claimed: false, reward: 15 },
        { id: 'win-match', type: 'wins', goal: 1, progress: 0, active: false, claimed: false, reward: 25 },
        { id: 'play-two-matches', type: 'matches', goal: 2, progress: 0, active: false, claimed: false, reward: 20 },
      ],
    };
  },
  trackRequests(type, amount = 1) {
    this.ensureRequests();
    for (const request of this.requests.items) {
      if (request.active && !request.claimed && request.type === type) {
        request.progress = Math.min(request.goal, request.progress + amount);
      }
    }
  },

  /* ---------- moedas pelo chão ---------- */
  spawnPickups() {
    this.pickups = [];
    const n = 5 + (this.mods().coins || 0);
    let tries = 0;
    while (this.pickups.length < n && tries++ < 600) {
      const zs = ZONES.filter((z) => this.zoneOpen(z.id));
      const z = zs[Math.floor(Math.random() * zs.length)];
      const x = 2 + Math.floor(Math.random() * (CITY_W - 4));
      const y = z.y0 + 1 + Math.floor(Math.random() * (z.y1 - z.y0 - 1));
      const t = this.city.map[y] && this.city.map[y][x];
      if (t === 0 || t === 1 || t === 2) this.pickups.push({ x, y, v: 3 + Math.floor(Math.random() * 6) });
    }
  },

  hudRefresh() {
    const hud = document.getElementById('world-hud');
    if (!hud || typeof T === 'undefined') return;
    const z = this.curZone();
    const e = this.ev();
    const place = this.scene && this.scene.kind === 'in' && INTERIORS[this.scene.id]
      ? T.t(INTERIORS[this.scene.id].nameKey)
      : T.t(z.nameKey);
    hud.innerHTML = `💰 R$ ${this.money} &nbsp; ⭐ ${this.rep} &nbsp; ${e.ico} <b class="world__clock">${this.clock()}</b> ` +
      `🧢 ${this.capCount()}/${this.caps.length} &nbsp; <span class="world__hud-t">${place} · ${T.t(this.title())}</span>`;
  },

  hash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); },

  /* ============================================================
     construção da cidade
     ============================================================ */
  BUILDINGS: [
    // Vila do Boteco
    { x: 10, y: 9, w: 8, h: 6, c: '#b5523a', roof: '#7a2e1e', name: 'boteco', interior: 'boteco' },
    { x: 27, y: 8, w: 7, h: 6, c: '#c98f3a', roof: '#8a5a1e', name: 'mercado', shop: true },
    { x: 44, y: 10, w: 7, h: 5, c: '#4a3f8a', roof: '#2e2560', name: 'fliperama', interior: 'fliperama' },
    { x: 12, y: 22, w: 8, h: 6, c: '#4f8a7a', roof: '#2e5a4e', name: 'oficina', interior: 'oficina' },
    { x: 56, y: 8, w: 8, h: 6, c: '#8a765e', roof: '#554431', name: 'casa_do_jogador', interior: 'player_home', home: true },
    // Centro
    { x: 43, y: 34, w: 7, h: 7, c: '#d8d2c0', roof: '#6f7a8a', name: 'igreja', interior: 'igreja' },
    { x: 10, y: 36, w: 7, h: 5, c: '#c9a83a', roof: '#8a6f1e', name: 'loterica', interior: 'loterica' },
    { x: 30, y: 41, w: 8, h: 7, c: '#8a6fb5', roof: '#4e3a7a', name: 'predio', interior: 'predio' },
    { x: 25, y: 52, w: 6, h: 5, c: '#c98f3a', roof: '#8a5a1e', name: 'mercado2', shop: true },
    { x: 48, y: 51, w: 9, h: 7, c: '#3f7a4f', roof: '#245232', name: 'clube', interior: 'clube' },
    { x: 56, y: 40, w: 7, h: 6, c: '#6a315d', roof: '#3a2038', name: 'cabare', interior: 'cabare' },
    // Morro do Truco
    { x: 12, y: 68, w: 9, h: 6, c: '#8a3f6f', roof: '#5a2448', name: 'baile', interior: 'baile' },
    { x: 34, y: 70, w: 7, h: 5, c: '#b58a5a', roof: '#7a5a34', name: 'casa', interior: 'casa' },
    { x: 26, y: 84, w: 6, h: 5, c: '#c98f3a', roof: '#8a5a1e', name: 'mercado3', shop: true },
    { x: 44, y: 82, w: 10, h: 8, c: '#3a3a4f', roof: '#1e1e2e', name: 'arena', interior: 'arena' },
    { x: 54, y: 68, w: 9, h: 7, c: '#766047', roof: '#463625', name: 'barracao', interior: 'player_pub', postgame: true },
  ],

  buildCity() {
    const m = [];
    for (let y = 0; y < CITY_H; y++) m.push(new Array(CITY_W).fill(0));

    const hRoads = [6, 18, 28, 38, 48, 58, 70, 80, 90];
    const vRoads = [8, 22, 36, 52, 64];
    for (const ry of hRoads) for (let x = 0; x < CITY_W; x++) { m[ry][x] = 1; m[ry + 1][x] = 1; }
    for (const rx of vRoads) for (let y = 0; y < CITY_H; y++) { m[y][rx] = 1; m[y][rx + 1] = 1; }

    // praças: uma por bairro
    const pracas = [{ x: 26, y: 20, w: 8, h: 6, f: true }, { x: 40, y: 43, w: 8, h: 4 }, { x: 40, y: 74, w: 8, h: 4 }];
    for (const p of pracas) {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) m[y][x] = 2;
      if (p.f) { m[p.y + 3][p.x + 3] = 8; m[p.y + 3][p.x + 4] = 8; }
    }

    // muros entre bairros, com cancela na rua
    for (const g of GATES) {
      for (let x = 0; x < CITY_W; x++) { m[g.y][x] = 7; m[g.y + 1][x] = 7; }
      m[g.y][g.pass] = 9; m[g.y][g.pass + 1] = 9;
      m[g.y + 1][g.pass] = 9; m[g.y + 1][g.pass + 1] = 9;
    }

    // prédios e portas
    const buildings = [];
    for (const b of this.BUILDINGS) {
      if (b.postgame && !this.storyComplete) continue;
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) m[y][x] = 3;
      const dx = b.x + Math.floor(b.w / 2);
      m[b.y + b.h - 1][dx] = 6;
      buildings.push({ ...b, door: { x: dx, y: b.y + b.h - 1 } });
    }

    // árvores e mato
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(this.hash(i, 7) * CITY_W), y = Math.floor(this.hash(i, 13) * CITY_H);
      if (m[y] && m[y][x] === 0 && this.hash(x, y) > 0.38) m[y][x] = 5;
    }
    // não deixa mato em cima de quem conversa nem na frente das portas
    for (const n of NPCS) {
      if (n.place !== 'city') continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (m[n.y + dy] && m[n.y + dy][n.x + dx] === 5) m[n.y + dy][n.x + dx] = 0;
      }
    }
    for (const b of buildings) {
      for (let dy = 1; dy <= 2; dy++) {
        const yy = b.door.y + dy;
        if (m[yy]) for (let dx = -1; dx <= 1; dx++) if (m[yy][b.door.x + dx] === 5) m[yy][b.door.x + dx] = 0;
      }
    }

    // esconderijos dos easter eggs: cerca de árvores com uma só passagem
    for (const h of (window.HIDEOUTS || [])) {
      for (let y = h.y0; y <= h.y1; y++) for (let x = h.x0; x <= h.x1; x++) {
        if (!m[y] || m[y][x] === undefined) continue;
        const edge = x === h.x0 || x === h.x1 || y === h.y0 || y === h.y1;
        if (m[y][x] === 0 || m[y][x] === 5) m[y][x] = edge ? 5 : 0;
      }
      for (const [gx, gy] of h.gap) {
        if (m[gy]) m[gy][gx] = 0;
        // abre também o caminho até a passagem
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const xx = gx + dx, yy = gy + dy;
          const inside = xx > h.x0 && xx < h.x1 && yy > h.y0 && yy < h.y1;
          const onEdge = xx >= h.x0 && xx <= h.x1 && yy >= h.y0 && yy <= h.y1;
          if (!onEdge && m[yy] && m[yy][xx] === 5) m[yy][xx] = 0;
          if (inside && m[yy][xx] === 5) m[yy][xx] = 0;
        }
      }
    }

    const eggs = (window.EGGS || []);
    this.fixSpots(m, NPCS.filter((n) => n.place === 'city').concat(eggs.filter((n) => n.place === 'city')), SOLID_CITY.concat([9]));
    this.city = { kind: 'city', w: CITY_W, h: CITY_H, map: m, buildings, npcs: NPCS.filter((n) => n.place === 'city').concat(eggs.filter((n) => n.place === 'city')) };
    return this.city;
  },

  buildInterior(id) {
    if (this.interiors[id]) {
      const sc = this.interiors[id];
      sc.npcs = NPCS.filter((n) => n.place === id).concat((window.EGGS || []).filter((n) => n.place === id));
      this.fixSpots(sc.map, sc.npcs, SOLID_IN.concat([13]), [sc.exit.x, sc.h - 2]);
      return sc;
    }
    const d = INTERIORS[id];
    const m = [];
    for (let y = 0; y < d.h; y++) m.push(new Array(d.w).fill(10));
    for (let x = 0; x < d.w; x++) { m[0][x] = 11; m[1][x] = 11; m[d.h - 1][x] = 11; }
    for (let y = 0; y < d.h; y++) { m[y][0] = 11; m[y][d.w - 1] = 11; }
    for (const f of d.deco) {
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (m[y] && m[y][x] === 10) m[y][x] = 12;
    }
    const ex = Math.floor(d.w / 2);
    m[d.h - 1][ex] = 13;
    m[d.h - 2][ex] = 10;
    this.fixSpots(m, NPCS.filter((n) => n.place === id).concat((window.EGGS || []).filter((n) => n.place === id)), SOLID_IN.concat([13]), [ex, d.h - 2]);
    const sc = {
      kind: 'in', id, w: d.w, h: d.h, map: m, def: d, buildings: [],
      npcs: NPCS.filter((n) => n.place === id).concat((window.EGGS || []).filter((n) => n.place === id)), exit: { x: ex, y: d.h - 1 },
    };
    this.interiors[id] = sc;
    return sc;
  },

  /* rede de segurança: ninguém fica em cima de telhado, mesa ou árvore.
     Se a posição cair num bloco sólido, a pessoa vai para o chão livre
     mais perto (menos quem está de propósito atrás de um balcão). */
  fixSpots(m, list, solid, avoid) {
    const free = (x, y) => m[y] && m[y][x] !== undefined && !solid.includes(m[y][x]) && !(avoid && avoid[0] === x && avoid[1] === y);
    for (const n of list) {
      if (n.behind || free(n.x, n.y)) continue;
      let best = null;
      for (let r = 1; r < 8 && !best; r++) {
        for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          // prefere ficar embaixo (de frente para quem chega) e na mesma coluna
          const x = n.x + dx, y = n.y + Math.abs(dy) * (dy < 0 ? -1 : 1);
          if (free(x, y) && free(x, y + 1)) { best = [x, y]; break; }
        }
      }
      if (best) { n.x = best[0]; n.y = best[1]; }
    }
  },

  solid(px, py) {
    const s = this.scene;
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    if (tx < 0 || ty < 0 || tx >= s.w || ty >= s.h) return true;
    const t = s.map[ty][tx];
    if (s.kind === 'in') return SOLID_IN.includes(t);
    if (t === 9) {                       // cancela: só passa se o bairro abriu
      const g = GATES.find((gg) => gg.y === ty || gg.y + 1 === ty);
      return g ? !this.zoneOpen(g.zone) : false;
    }
    return SOLID_CITY.includes(t);
  },

  /* ---------- entrar e sair de lugares ---------- */
  enter(building) {
    const id = building.interior;
    if (!id || !INTERIORS[id]) return false;
    this.back = { x: this.player.x, y: this.player.y };
    const sc = this.buildInterior(id);
    this.sceneZone = (NPCS.find((n) => n.place === id) || {}).zone || this.curZone().id;
    this.scene = sc;
    this.hudRefresh();
    this.player.vx = 0; this.player.vy = 0;
    this.player.x = sc.exit.x * TS + 8;
    this.player.y = (sc.h - 2) * TS + 8;
    this.nearNpc = null; this.nearShop = false; this.nearDoor = null; this.nearExit = true; this.nearBoard = false; this.nearPubManage = false;
    this.nearBed = false; this.nearFridge = false;
    if (window.Haptic) Haptic.tap();
    return true;
  },

  leave() {
    if (this.scene.kind !== 'in') return false;
    this.scene = this.city;
    this.sceneZone = null;
    this.hudRefresh();
    this.player.vx = 0; this.player.vy = 0;
    if (this.back) { this.player.x = this.back.x; this.player.y = this.back.y + 6; }
    this.nearExit = false;
    this.nearBoard = false;
    this.nearPubManage = false;
    this.nearBed = false; this.nearFridge = false;
    if (window.Haptic) Haptic.tap();
    return true;
  },

  /* leva o jogador direto até um desafiante (usado pela caderneta) */
  warpTo(n) {
    if (n.place === 'city') {
      this.scene = this.city;
      this.sceneZone = null;
      this.hudRefresh();
      this.player.x = n.x * TS + 8;
      this.player.y = n.y * TS + 22;
    } else {
      const b = this.city.buildings.find((bb) => bb.interior === n.place);
      if (b) this.back = { x: b.door.x * TS + 8, y: (b.door.y + 1) * TS + 8 };
      const sc = this.buildInterior(n.place);
      this.scene = sc;
      this.sceneZone = n.zone;
      this.hudRefresh();
      this.player.x = n.x * TS + 8;
      this.player.y = n.y * TS + 22;
    }
    this.nearNpc = n;
  },

  /* ============================================================
     ciclo de vida
     ============================================================ */
  init(canvas, onChallenge) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.onChallenge = onChallenge;
    if (!this.city) this.buildCity();
    if (!this.scene) this.scene = this.city;
    this.refreshRoutines(true);
    if (!this.pickups.length) this.spawnPickups();
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    const r = this.canvas.parentElement.getBoundingClientRect();
    const scale = Math.max(2, Math.min(4, Math.floor(r.width / 170)));
    this.scale = scale;
    this.canvas.width = Math.floor(r.width / scale);
    this.canvas.height = Math.floor(r.height / scale);
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
  },

  bindInput() {
    window.addEventListener('keydown', (e) => {
      const blocked = window.App && App.current === 'world' && (App.optsFrom || App.devToolsOpen || (App.ui && App.ui.modalOpen));
      if (blocked) return;
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    this.bindPad();
    this.bindRun();
  },

  /* botão CORRER: segura para correr */
  bindRun() {
    const b = document.getElementById('run-btn');
    if (!b || b.dataset.bound) return;
    b.dataset.bound = '1';
    const on = (e) => { e.preventDefault(); this.keys.run = true; b.classList.add('run--on'); if (window.Haptic) Haptic.buzz(8); };
    const off = () => { this.keys.run = false; b.classList.remove('run--on'); };
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, off));
    window.addEventListener('blur', off);
  },

  /* Direcional por posição: o pad inteiro captura o toque e calcula
     o sentido a partir do centro. Permite diagonal e arrastar o dedo
     de uma direção para a outra sem soltar. */
  bindPad() {
    const pad = document.getElementById('dpad');
    if (!pad || pad.dataset.bound) return;
    pad.dataset.bound = '1';

    const btns = {};
    pad.querySelectorAll('[data-dir]').forEach((b) => { btns[b.dataset.dir] = b; });
    const nub = pad.querySelector('.dpad__nub');
    const DIRS = ['up', 'down', 'left', 'right'];

    const clear = () => {
      DIRS.forEach((d) => { this.keys[d] = false; if (btns[d]) btns[d].classList.remove('dir--on'); });
      pad.classList.remove('dpad--live');
      if (nub) nub.style.transform = 'translate(0,0)';
    };

    const apply = (clientX, clientY) => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = clientX - cx, dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const dead = r.width * 0.11;
      if (dist < dead) { clear(); pad.classList.add('dpad--live'); return; }

      const ang = Math.atan2(dy, dx);
      const oct = Math.round(ang / (Math.PI / 4));
      const map = {
        0: ['right'], 1: ['right', 'down'], 2: ['down'], 3: ['left', 'down'],
        4: ['left'], '-4': ['left'], '-3': ['left', 'up'], '-2': ['up'], '-1': ['right', 'up'],
      };
      const active = map[oct] || map[String(oct)] || [];
      DIRS.forEach((d) => {
        const on = active.includes(d);
        this.keys[d] = on;
        if (btns[d]) btns[d].classList.toggle('dir--on', on);
      });
      pad.classList.add('dpad--live');
      if (nub) {
        const k = Math.min(1, dist / (r.width / 2)) * 13;
        nub.style.transform = `translate(${(dx / dist) * k}px, ${(dy / dist) * k}px)`;
      }
    };

    let padId = null;
    pad.addEventListener('pointerdown', (e) => {
      if (window.App && App.current === 'world' && (App.optsFrom || App.devToolsOpen || (App.ui && App.ui.modalOpen))) return;
      e.preventDefault();
      padId = e.pointerId;
      pad.setPointerCapture && pad.setPointerCapture(e.pointerId);
      if (window.Haptic) Haptic.buzz(8);
      apply(e.clientX, e.clientY);
    });
    pad.addEventListener('pointermove', (e) => {
      if (padId !== e.pointerId) return;
      e.preventDefault();
      apply(e.clientX, e.clientY);
    });
    const up = (e) => {
      if (padId !== null && e.pointerId !== undefined && padId !== e.pointerId) return;
      padId = null;
      clear();
    };
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointercancel', up);
    pad.addEventListener('pointerleave', (e) => { if (padId === e.pointerId) up(e); });
    window.addEventListener('blur', () => { padId = null; clear(); });
  },

  start() {
    if (this.running) return; // evita dois loops ao mesmo tempo (andaria em dobro)
    this.running = true; this._last = 0; this._acc = 0;
    requestAnimationFrame((t) => this.loop(t));
  },
  stop() {
    this.running = false;
    this.player.vx = 0; this.player.vy = 0;
    ['up', 'down', 'left', 'right', 'run', 'shift'].forEach((d) => { this.keys[d] = false; });
  },

  /* passo fixo de 60 por segundo: mesma velocidade em telas de 60, 90, 120 ou 144 Hz */
  loop(t) {
    if (!this.running) return;
    const STEP = 1000 / 60;
    if (!this._last) this._last = t - STEP;
    this._acc = Math.min((this._acc || 0) + (t - this._last), STEP * 5);
    this._last = t;
    let n = 0;
    while (this._acc >= STEP && n < 5) { this.step(); this._acc -= STEP; n++; }
    if (n) this.draw();
    requestAnimationFrame((tt) => this.loop(tt));
  },

  step() {
    this.t++;
    // relógio do mundo
    const previousHour = Math.floor(this.hour);
    const before = Math.floor(this.hour * 6);
    this.hour = (this.hour + 1 / 900) % 24;
    if (Math.floor(this.hour) !== previousHour) this.refreshRoutines(false);
    if (Math.floor(this.hour * 6) !== before) this.hudRefresh();
    const s = this.scene;
    let dx = 0, dy = 0;
    const k = this.keys;
    if (k['arrowleft'] || k['a'] || k['left']) dx -= 1;
    if (k['arrowright'] || k['d'] || k['right']) dx += 1;
    if (k['arrowup'] || k['w'] || k['up']) dy -= 1;
    if (k['arrowdown'] || k['s'] || k['down']) dy += 1;
    /* movimento com peso: acelera e freia rápido, corre segurando
       o botão CORRER (ou Shift). Velocidade de caminhada igual à antiga. */
    const p = this.player;
    if (p.vx === undefined) { p.vx = 0; p.vy = 0; p.squash = 0; }
    const moving = !!(dx || dy);
    const running = !!(k['shift'] || k['run']);
    const max = running ? p.speed * 1.75 : p.speed;
    const len = Math.hypot(dx, dy) || 1;
    const acc = moving ? 0.22 : 0.3;
    p.vx += ((moving ? (dx / len) * max : 0) - p.vx) * acc;
    p.vy += ((moving ? (dy / len) * max : 0) - p.vy) * acc;
    if (Math.abs(p.vx) < 0.03) p.vx = 0;
    if (Math.abs(p.vy) < 0.03) p.vy = 0;
    const spd = Math.hypot(p.vx, p.vy);
    if (p.vx || p.vy) {
      const nx = p.x + p.vx, ny = p.y + p.vy;
      const r = 4;
      if (!this.solid(nx - r, p.y + 6) && !this.solid(nx + r, p.y + 6)) p.x = nx; else p.vx = 0;
      if (!this.solid(p.x - r, ny + 6) && !this.solid(p.x + r, ny + 6)) p.y = ny; else p.vy = 0;
      p.frame += 0.16 * Math.max(0.4, spd / p.speed);
    }
    if (moving) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    if ((p._lastSpd || 0) > 0.9 && spd < 0.3) p.squash = 1;
    p.squash = (p.squash || 0) * 0.82;
    p._lastSpd = spd;

    // quem está por perto
    this.nearNpc = null;
    let bd = 26 * 26;
    for (const n of s.npcs) {
      const d = (n.x * TS + 8 - this.player.x) ** 2 + (n.y * TS + 8 - this.player.y) ** 2;
      if (d < bd) { bd = d; this.nearNpc = n; }
    }
    this.nearBoard = false;
    this.nearPubManage = false;
    if (s.kind === 'in' && s.id === 'boteco' && !this.nearNpc) {
      const boardX = 19 * TS + 8, boardY = 5 * TS + 8;
      this.nearBoard = (boardX - this.player.x) ** 2 + (boardY - this.player.y) ** 2 < 36 * 36;
    }

    this.nearShop = false;
    this.nearDoor = null;
    this.nearExit = false;

    if (s.kind === 'city') {
      let best = 30 * 30;
      for (const b of s.buildings) {
        const ddx = b.door.x * TS + 8 - this.player.x, ddy = b.door.y * TS + 14 - this.player.y;
        const d = ddx * ddx + ddy * ddy;
        if (d < best) {
          best = d;
          if (b.shop) { this.nearShop = true; this.nearDoor = null; }
          else if (b.interior) { this.nearDoor = b; this.nearShop = false; }
        }
      }
      // porta mais longe que o NPC? o NPC vem primeiro
      if (this.nearNpc && best > bd) { this.nearShop = false; this.nearDoor = null; }
      else if (this.nearShop || this.nearDoor) this.nearNpc = null;

      // moedas pelo chão
      for (const cap of this.caps) {
        if (this.capsFound[cap.id] || !this.zoneOpen(cap.zone)) continue;
        const capX = cap.x * TS + 8 - this.player.x, capY = cap.y * TS + 8 - this.player.y;
        if (capX * capX + capY * capY >= 12 * 12) continue;
        this.capsFound[cap.id] = true;
        this.money += 5;
        const completed = this.capCount() === this.caps.length;
        if (completed) this.money += 50;
        if (window.Haptic) Haptic.coin();
        if (window.Sound) Sound.secret();
        if (window.App) App.capFound(completed);
      }

      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        const ddx = p.x * TS + 8 - this.player.x, ddy = p.y * TS + 8 - this.player.y;
        if (ddx * ddx + ddy * ddy < 11 * 11) {
          this.money += p.v;
          this.pickups.splice(i, 1);
          if (window.Haptic) Haptic.coin();
          if (window.Sound) Sound.click();
          if (window.App) App.persist && App.persist();
        }
      }
    } else {
      const e = s.exit;
      const ddx = e.x * TS + 8 - this.player.x, ddy = e.y * TS + 8 - this.player.y;
      if (ddx * ddx + ddy * ddy < 24 * 24 && !this.nearNpc) this.nearExit = true;
      this.nearBed = false;
      this.nearFridge = false;
      if (s.id === 'player_home') {
        const bedX = 4 * TS + 8, bedY = 4 * TS + 8;
        const fridgeX = 14 * TS + 8, fridgeY = 5 * TS + 8;
        this.nearBed = (bedX - this.player.x) ** 2 + (bedY - this.player.y) ** 2 < 34 * 34;
        this.nearFridge = (fridgeX - this.player.x) ** 2 + (fridgeY - this.player.y) ** 2 < 34 * 34;
        if (this.nearBed || this.nearFridge) { this.nearExit = false; this.nearNpc = null; }
      }
      if (s.id === 'player_pub' && !this.nearNpc) {
        const counterX = 15 * TS + 8, counterY = 8 * TS + 8;
        this.nearPubManage = (counterX - this.player.x) ** 2 + (counterY - this.player.y) ** 2 < 38 * 38;
        if (this.nearPubManage) this.nearExit = false;
      }
      if (this.nearBoard) this.nearExit = false;
    }

    this.refreshActionBtn();
    this.hudRefresh();
  },

  /* botão de ação: mostra com quem (ou com o quê) dá pra interagir */
  refreshActionBtn() {
    const btn = document.getElementById('talk-btn');
    if (!btn || typeof T === 'undefined') return;
    const n = this.nearNpc;
    let icon, label, cls = '';
    if (n) { icon = n.emoji; label = n.name.split(' ')[0]; cls = 'on'; }
    else if (this.nearBed) { icon = ICONS.eye(26); label = T.t('sleep'); cls = 'door'; }
    else if (this.nearFridge) { icon = ICONS.cart(26); label = T.t('eat'); cls = 'shop'; }
    else if (this.nearBoard) { icon = '📋'; label = T.t('request_board'); cls = 'door'; }
    else if (this.nearPubManage) { icon = '🍻'; label = T.t('pub_manage'); cls = 'shop'; }
    else if (this.nearShop) { icon = ICONS.cart(26); label = T.t('shop'); cls = 'shop'; }
    else if (this.nearDoor) { icon = ICONS.door(26); label = T.t('enter'); cls = 'door'; }
    else if (this.nearExit) { icon = ICONS.door(26); label = T.t('leave'); cls = 'door'; }
    else { icon = ICONS.eye(26); label = T.t('talk'); }
    const sig = cls + '|' + icon + '|' + label;
    if (btn.dataset.sig !== sig) {
      btn.dataset.sig = sig;
      btn.innerHTML = `<span class="talk__icon">${icon}</span><span class="talk__lbl">${label}</span>`;
    }
    btn.classList.toggle('talk--on', cls === 'on');
    btn.classList.toggle('talk--shop', cls === 'shop');
    btn.classList.toggle('talk--door', cls === 'door');
  },

  /* ============================================================
     desenho
     ============================================================ */
  tileColor(t, x, y, zone) {
    const h = this.hash(x, y);
    switch (t) {
      case 0:
        if (zone === 'morro') return h > 0.7 ? '#4a6a3a' : h > 0.4 ? '#42602f' : '#3a5630';
        if (zone === 'centro') return h > 0.7 ? '#3f7a4a' : h > 0.4 ? '#37703f' : '#2f6638';
        return h > 0.7 ? '#3f7a3f' : h > 0.4 ? '#367034' : '#2e662e';
      case 1: return h > 0.75 ? '#5b5750' : '#4f4c46';
      case 2: return h > 0.6 ? '#9a9382' : '#8e8878';
      case 5: return zone === 'morro' ? '#3a5630' : '#2e662e';
      case 7: return h > 0.6 ? '#7a7264' : '#6c6558';
      case 8: return '#3f7fa8';
      case 9: return '#4f4c46';
      case 10: return h > 0.5 ? this.scene.def.floor : this.scene.def.floor2;
      case 11: return this.scene.def.wall;
      case 12: return this.scene.def.floor2;
      case 13: return '#3a2f1a';
      default: return '#2e662e';
    }
  },

  draw() {
    const s = this.scene;
    if (s.kind === 'in') return this.drawInterior();

    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    this.camX = Math.max(0, Math.min(s.w * TS - W, this.player.x - W / 2));
    this.camY = Math.max(0, Math.min(s.h * TS - H, this.player.y - H / 2));
    const ox = Math.floor(this.camX), oy = Math.floor(this.camY);
    const zid = this.curZone().id;

    ctx.fillStyle = this.curZone().sky;
    ctx.fillRect(0, 0, W, H);

    const x0 = Math.floor(ox / TS), y0 = Math.floor(oy / TS);
    const x1 = Math.min(s.w - 1, x0 + Math.ceil(W / TS) + 1);
    const y1 = Math.min(s.h - 1, y0 + Math.ceil(H / TS) + 1);

    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = s.map[y][x];
      const sx = x * TS - ox, sy = y * TS - oy;
      ctx.fillStyle = this.tileColor(t === 3 || t === 6 ? 2 : t, x, y, zid);
      ctx.fillRect(sx, sy, TS, TS);
      if (t === 1 && x % 4 === 0 && (y % 12 === 6 || y % 12 === 7)) {
        ctx.fillStyle = '#c9c27a'; ctx.fillRect(sx + 6, sy + 7, 4, 2);
      }
      if (t === 8) { ctx.fillStyle = '#7fc4e0'; ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6); }
      if (t === 7) {                       // muro de tijolo
        ctx.fillStyle = '#00000033';
        ctx.fillRect(sx, sy + 12, TS, 4);
        ctx.fillStyle = '#8c8474';
        ctx.fillRect(sx + 1, sy + 2, 6, 4); ctx.fillRect(sx + 9, sy + 2, 6, 4);
        ctx.fillRect(sx + 5, sy + 8, 6, 4);
      }
      if (t === 9) {                       // cancela
        const g = GATES.find((gg) => gg.y === y || gg.y + 1 === y);
        const open = g ? this.zoneOpen(g.zone) : true;
        ctx.fillStyle = open ? '#2f6f3f' : '#8a2f2f';
        ctx.fillRect(sx, sy + 6, TS, 4);
        ctx.fillStyle = open ? '#4fa05f' : '#c94f4f';
        ctx.fillRect(sx, sy + 6, TS, 2);
        if (!open) { ctx.fillStyle = '#e8d88a'; ctx.fillRect(sx + 6, sy + 2, 4, 3); }
      }
      if (t === 5) {
        ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx + 6, sy + 9, 4, 6);
        ctx.fillStyle = '#1e5c2a'; ctx.fillRect(sx + 2, sy + 1, 12, 9);
        ctx.fillStyle = '#2f8f3e'; ctx.fillRect(sx + 3, sy + 2, 9, 6);
        ctx.fillStyle = '#48b055'; ctx.fillRect(sx + 4, sy + 3, 4, 3);
      }
    }

    // placas nas cancelas
    for (const g of GATES) {
      const open = this.zoneOpen(g.zone);
      const sx = g.pass * TS - ox, sy = g.y * TS - oy;
      if (sx < -60 || sx > W + 60 || sy < -40 || sy > H + 40) continue;
      const z = this.zone(g.zone);
      ctx.fillStyle = '#0d1a12'; ctx.fillRect(sx - 22, sy - 20, 76, 14);
      ctx.fillStyle = open ? '#2f6f3f' : '#5a2020'; ctx.fillRect(sx - 21, sy - 19, 74, 12);
      ctx.fillStyle = open ? '#cfe8c0' : '#e8b0a0';
      ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText((typeof T !== 'undefined' ? T.t(z.nameKey) : z.id).toUpperCase(), sx + 16, sy - 10);
      ctx.textAlign = 'left';
    }

    // prédios
    for (const b of s.buildings) {
      const sx = b.x * TS - ox, sy = b.y * TS - oy, w = b.w * TS, h = b.h * TS;
      if (sx > W || sy > H || sx + w < 0 || sy + h < 0) continue;
      ctx.fillStyle = '#00000055'; ctx.fillRect(sx + 3, sy + 6, w, h);
      ctx.fillStyle = b.c; ctx.fillRect(sx, sy, w, h);
      ctx.fillStyle = b.roof; ctx.fillRect(sx - 2, sy - 6, w + 4, 12);
      ctx.fillStyle = '#00000033'; ctx.fillRect(sx, sy + h - 4, w, 4);
      for (let i = 0; i < b.w - 1; i += 2) for (let j = 0; j < b.h - 2; j += 2) {
        const wx = sx + 10 + i * TS, wy = sy + 14 + j * TS;
        ctx.fillStyle = (this.t % 240 < 120 && this.hash(i, j) > 0.7) ? '#ffe08a' : '#2b3a4a';
        ctx.fillRect(wx, wy, 8, 9);
        ctx.fillStyle = '#00000066'; ctx.fillRect(wx, wy, 8, 1);
      }
      const dx = b.door.x * TS - ox, dy = b.door.y * TS - oy;
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(dx + 3, dy + 2, 10, 14);
      ctx.fillStyle = '#d9a418'; ctx.fillRect(dx + 11, dy + 9, 2, 2);

      const bob = Math.sin(this.t / 18);
      if (b.shop) {
        ctx.fillStyle = '#0a1410'; ctx.fillRect(dx - 5, dy - 16 + bob, 26, 11);
        ctx.fillStyle = '#e8b93c'; ctx.fillRect(dx - 4, dy - 15 + bob, 24, 9);
        ctx.fillStyle = '#1b1109'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
        ctx.fillText('R$', dx + 8, dy - 8 + bob); ctx.textAlign = 'left';
      } else if (b.interior) {
        // quem tem desafiante dentro ganha um aviso na fachada
        const inside = NPCS.filter((n) => n.place === b.interior);
        const open = inside.filter((n) => !this.npcLocked(n) && !this.defeated[n.id]);
        const boss = inside.find((n) => n.boss);
        if (open.length) {
          ctx.fillStyle = '#ffe08a';
          ctx.fillRect(dx + 6, dy - 14 + bob, 3, 8);
          ctx.fillRect(dx + 6, dy - 4 + bob, 3, 3);
        }
        if (boss && !this.defeated[boss.id] && !this.npcLocked(boss)) {
          ctx.fillStyle = '#e8b93c';                   // coroinha de chefão
          ctx.fillRect(dx - 2, dy - 24 + bob, 20, 4);
          ctx.fillRect(dx - 2, dy - 28 + bob, 4, 4);
          ctx.fillRect(dx + 6, dy - 29 + bob, 4, 5);
          ctx.fillRect(dx + 14, dy - 28 + bob, 4, 4);
        }
      }
    }

    // moedas
    for (const p of this.pickups) {
      const sx = p.x * TS - ox, sy = p.y * TS - oy;
      if (sx < -16 || sy < -16 || sx > W + 16 || sy > H + 16) continue;
      const b2 = Math.sin((this.t + p.x * 7) / 12) * 1.5;
      ctx.fillStyle = '#00000044'; ctx.fillRect(sx + 5, sy + 13, 7, 2);
      ctx.fillStyle = '#e8b93c'; ctx.fillRect(sx + 5, sy + 4 + b2, 7, 7);
      ctx.fillStyle = '#fff0b0'; ctx.fillRect(sx + 6, sy + 5 + b2, 2, 5);
    }

    this.drawNpcs(ox, oy);
    this.drawPlayer(ox, oy);
    if (this.mods().rain) this.drawRain(W, H);

    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  drawInterior() {
    const s = this.scene, d = s.def;
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const mapW = s.w * TS, mapH = s.h * TS;
    this.camX = mapW <= W ? -(W - mapW) / 2 : Math.max(0, Math.min(mapW - W, this.player.x - W / 2));
    this.camY = mapH <= H ? -(H - mapH) / 2 : Math.max(0, Math.min(mapH - H, this.player.y - H / 2));
    const ox = Math.floor(this.camX), oy = Math.floor(this.camY);

    // fundo: noite do lado de fora do prédio, pra não sobrar tela preta
    ctx.fillStyle = '#0d1410'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += TS) for (let x = 0; x < W; x += TS) {
      const k = ((x / TS) + (y / TS)) % 2;
      ctx.fillStyle = k ? '#101a14' : '#0c130f';
      ctx.fillRect(x, y, TS, TS);
    }
    // sombra do prédio em volta do salão
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(-ox - 6, -oy - 6, mapW + 12, mapH + 12);

    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = s.map[y][x];
      const sx = x * TS - ox, sy = y * TS - oy;
      if (sx < -TS || sy < -TS || sx > W || sy > H) continue;
      ctx.fillStyle = this.tileColor(t === 12 ? 10 : t, x, y);
      ctx.fillRect(sx, sy, TS, TS);
      if (t === 11) {
        ctx.fillStyle = d.trim; ctx.fillRect(sx, sy + TS - 3, TS, 3);
        if (this.hash(x, y) > 0.8) { ctx.fillStyle = '#ffffff12'; ctx.fillRect(sx + 3, sy + 3, 5, 5); }
      }
      if (t === 13) {                      // tapete de saída
        ctx.fillStyle = '#7a5a2a'; ctx.fillRect(sx + 1, sy + 3, TS - 2, TS - 6);
        ctx.fillStyle = '#e8b93c'; ctx.fillRect(sx + 3, sy + 6, TS - 6, 2);
      }
    }

    // móveis
    for (const f of d.deco) {
      const sx = f.x * TS - ox, sy = f.y * TS - oy, w = f.w * TS, h = f.h * TS;
      ctx.fillStyle = '#00000055'; ctx.fillRect(sx + 2, sy + 4, w, h);
      ctx.fillStyle = f.c; ctx.fillRect(sx, sy, w, h);
      ctx.fillStyle = '#ffffff1a'; ctx.fillRect(sx, sy, w, 3);
      ctx.fillStyle = '#00000033'; ctx.fillRect(sx, sy + h - 3, w, 3);
      if (f.t === 'table') {               // cartas jogadas em cima da mesa
        ctx.fillStyle = '#f2ead6';
        ctx.fillRect(sx + 6, sy + 6, 5, 7); ctx.fillRect(sx + 13, sy + 5, 5, 7);
      }
      if (f.t === 'arcade') {
        ctx.fillStyle = '#101018'; ctx.fillRect(sx + 3, sy + 4, w - 6, h / 2);
        ctx.fillStyle = this.t % 40 < 20 ? '#7fe0ff' : '#ff7fd0';
        ctx.fillRect(sx + 6, sy + 7, w - 12, 6);
      }
      if (f.t === 'shelf') {
        for (let i = 0; i < f.w; i++) {
          ctx.fillStyle = ['#c94f4f', '#e8b93c', '#4f9ac9', '#8ac94f'][i % 4];
          ctx.fillRect(sx + 4 + i * TS, sy + 6, 5, 10);
        }
      }
      if (f.t === 'altar') { ctx.fillStyle = '#f2ead6'; ctx.fillRect(sx + w / 2 - 2, sy - 8, 4, 12); ctx.fillRect(sx + w / 2 - 7, sy - 4, 14, 4); }
      if (f.t === 'stage') { ctx.fillStyle = this.t % 30 < 15 ? '#ffffff55' : '#ffffff22'; ctx.fillRect(sx, sy, w, 4); }
      if (f.t === 'plant') { ctx.fillStyle = '#2f8f3e'; ctx.fillRect(sx + 3, sy - 6, w - 6, 10); }
    }

    // luzes
    for (const l of (d.lamps || [])) {
      const sx = l.x * TS - ox, sy = l.y * TS - oy;
      ctx.fillStyle = '#2a2016'; ctx.fillRect(sx + 7, sy - 6, 2, 8);
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(sx + 4, sy + 2, 8, 5);
      const g = ctx.createRadialGradient(sx + 8, sy + 6, 2, sx + 8, sy + 6, 40);
      g.addColorStop(0, 'rgba(255,224,138,0.22)'); g.addColorStop(1, 'rgba(255,224,138,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 34, sy - 28, 84, 84);
    }

    this.drawNpcs(ox, oy);
    this.drawPlayer(ox, oy);

    const g2 = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  },

  drawRain(W, H) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(180,210,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const x = (this.hash(i, 3) * W * 1.4 - this.t * 1.6 + i * 9) % (W + 40) - 20;
      const y = (this.hash(i, 9) * H + this.t * 3.2 + i * 13) % (H + 30) - 15;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 8); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,60,90,0.18)'; ctx.fillRect(0, 0, W, H);
  },

  drawNpcs(ox, oy) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    for (const n of this.scene.npcs) {
      const sx = n.x * TS - ox, sy = n.y * TS - oy;
      if (sx < -20 || sy < -24 || sx > W + 20 || sy > H + 20) continue;
      const bob = Math.sin((this.t + n.x * 9) / 22) * 1;
      if (n.boss) {                        // tapete e coroa de chefão
        ctx.fillStyle = '#e8b93c33'; ctx.fillRect(sx - 6, sy + 10, 24, 8);
      }
      this.drawPerson(sx + 2, sy + bob, n.color, '#f0c49a');
      const py = sy - 10 + Math.sin(this.t / 14) * 1.5;
      if (this.npcLocked(n)) {
        ctx.fillStyle = '#8c7d6a'; ctx.fillRect(sx + 5, sy - 8, 7, 6);
        ctx.fillStyle = '#c9b89c'; ctx.fillRect(sx + 6, sy - 11, 5, 3);
        ctx.fillStyle = '#4a4034'; ctx.fillRect(sx + 8, sy - 6, 1, 2);
      } else if (!this.defeated[n.id]) {
        ctx.fillStyle = n.boss ? '#e8b93c' : '#ffe08a';
        ctx.fillRect(sx + 7, py, 2, 6); ctx.fillRect(sx + 7, py + 7, 2, 2);
        if (n.boss) {
          ctx.fillRect(sx + 1, sy - 18, 12, 3);
          ctx.fillRect(sx + 1, sy - 21, 3, 3); ctx.fillRect(sx + 6, sy - 22, 3, 4); ctx.fillRect(sx + 11, sy - 21, 3, 3);
        }
      } else {
        ctx.fillStyle = '#9ad6a0';
        ctx.fillRect(sx + 6, sy - 9, 2, 2); ctx.fillRect(sx + 8, sy - 7, 2, 2); ctx.fillRect(sx + 10, sy - 11, 2, 2);
        const st = this.stateOf(n.id);
        if (st.level > 0) {
          ctx.fillStyle = '#e8b93c';
          for (let k = 0; k < Math.min(3, st.level); k++) ctx.fillRect(sx + 4 + k * 4, sy - 15, 2, 2);
        }
      }
    }
  },

  drawPlayer(ox, oy) {
    const px = Math.floor(this.player.x) - ox - 6, py = Math.floor(this.player.y) - oy - 8;
    const step = Math.floor(this.player.frame) % 2;
    this.drawPerson(px, py + (step ? -1 : 0), '#2f6fd9', '#f7d3ad');
  },

  drawPerson(x, y, shirt, skin) {
    const ctx = this.ctx;
    ctx.fillStyle = '#00000044'; ctx.fillRect(x + 1, y + 15, 10, 3);
    ctx.fillStyle = '#20242c'; ctx.fillRect(x + 3, y + 11, 3, 5); ctx.fillRect(x + 7, y + 11, 3, 5);
    ctx.fillStyle = shirt; ctx.fillRect(x + 2, y + 5, 9, 7);
    ctx.fillStyle = skin; ctx.fillRect(x + 3, y, 7, 6);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 3, y, 7, 2);
    ctx.fillStyle = '#111'; ctx.fillRect(x + 4, y + 3, 1, 1); ctx.fillRect(x + 8, y + 3, 1, 1);
    ctx.fillStyle = skin; ctx.fillRect(x + 1, y + 6, 2, 5); ctx.fillRect(x + 10, y + 6, 2, 5);
  },
};

window.World = World;
