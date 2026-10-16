/* ============================================================
   talk.js — falas de boteco: provocações rápidas na mesa.
   Seis falas prontas para o jogador, resposta de cada bot com
   o seu jeito (calmo, marrento ou brincalhão), limite de 3 falas
   a cada 10 s e opção de silenciar os adversários.
   ============================================================ */

const Talk = {
  LIMIT: 3, WINDOW: 10000,
  used: [],
  muted: false,
  open: false,

  /* falas do jogador */
  MINE: [
    { id: 'truco', mood: 'tease', pt: 'Truco, marreco!', en: 'Truco, sucker!', es: '¡Truco, gallina!' },
    { id: 'cai', mood: 'tease', pt: 'Cai dentro!', en: 'Bring it on!', es: '¡Vení si te animás!' },
    { id: 'medo', mood: 'tease', pt: 'Tá com medo?', en: 'Scared?', es: '¿Tenés miedo?' },
    { id: 'boa', mood: 'nice', pt: 'Boa jogada', en: 'Nice play', es: 'Buena jugada' },
    { id: 'mal', mood: 'nice', pt: 'Foi mal', en: 'My bad', es: 'Perdón' },
    { id: 'desce', mood: 'nice', pt: 'Desce a próxima', en: 'Next round on me', es: 'Otra ronda' },
  ],

  /* respostas e falas espontâneas por jeito */
  LINES: {
    calmo: {
      tease: [['Calma, menino.', 'Easy, kid.', 'Calma, pibe.'], ['Vamos ver, né.', 'We will see.', 'Ya veremos.'], ['Na minha idade?', 'At my age?', '¿A mi edad?']],
      nice: [['Obrigado, filho.', 'Thank you, son.', 'Gracias, hijo.'], ['Acontece.', 'It happens.', 'Pasa.'], ['Mais um guaraná.', 'One more soda.', 'Otra gaseosa.']],
      bet: [['Vou arriscar.', 'I will risk it.', 'Me arriesgo.'], ['Truco, com licença.', 'Truco, if you please.', 'Truco, con permiso.']],
      accept: [['Aceito, sem pressa.', 'I accept, no rush.', 'Acepto, sin apuro.']],
      run: [['Essa eu deixo.', 'I will pass this one.', 'Esta la dejo.']],
      win: [['Foi sorte.', 'Just luck.', 'Fue suerte.'], ['Devagar se vai longe.', 'Slow and steady.', 'Despacito se llega.']],
    },
    marrento: {
      tease: [['Marreco é você!', 'You are the sucker!', '¡Gallina sos vos!'], ['Olha quem fala.', 'Look who is talking.', 'Mirá quién habla.'], ['Seis, então!', 'Six, then!', '¡Seis, entonces!']],
      nice: [['Eu sei.', 'I know.', 'Ya sé.'], ['Sorte sua.', 'Lucky you.', 'Suerte tuya.'], ['Essa é por sua conta.', 'Your treat.', 'Esta la pagás vos.']],
      bet: [['TRUCO, ladrão!', 'TRUCO, thief!', '¡TRUCO, ladrón!'], ['Truco! Corre não!', 'Truco! Do not run!', '¡Truco! ¡No corras!']],
      accept: [['Desce que eu quero ver.', 'Bring it, I want to see.', 'Dale, quiero ver.']],
      run: [['Hoje não, hoje não.', 'Not today.', 'Hoy no.']],
      win: [['Toma!', 'Take that!', '¡Tomá!'], ['É assim que se joga.', 'That is how it is done.', 'Así se juega.']],
    },
    brincalhao: {
      tease: [['Medo eu tenho é de boleto.', 'I only fear bills.', 'Solo le temo a las facturas.'], ['Ui, que bravo!', 'Ooh, feisty!', '¡Uy, qué bravo!'], ['Cai dentro você!', 'You bring it!', '¡Vení vos!']],
      nice: [['Anotado no caderninho.', 'Noted in my notebook.', 'Anotado en la libreta.'], ['Pede a porção também!', 'Order the snacks too!', '¡Pedí la picada también!'], ['Tá perdoado.', 'Forgiven.', 'Perdonado.']],
      bet: [['Truco! Tô brincando… só que não.', 'Truco! Kidding… not.', '¡Truco! Es broma… no.'], ['Lá vem truco!', 'Here comes truco!', '¡Ahí va truco!']],
      accept: [['Bora, que hoje eu tô com sorte.', 'Let us go, I feel lucky.', 'Dale, hoy tengo suerte.']],
      run: [['Corri, mas com estilo.', 'I ran, but with style.', 'Corrí, pero con estilo.']],
      win: [['Uhul!', 'Woohoo!', '¡Bien!'], ['Essa foi bonita, vai.', 'That was pretty, admit it.', 'Esa fue linda, dale.']],
    },
  },

  lang() { const L = { pt: 0, en: 1, es: 2 }; return L[(typeof T !== 'undefined' && T.lang) || 'pt'] || 0; },
  mine(l) { return l[(typeof T !== 'undefined' && T.lang) || 'pt'] || l.pt; },

  /* jeito do bot: fixo por personagem */
  kind(p) {
    const ids = { zeca: 'calmo', dona: 'calmo', padre: 'calmo', bereba: 'marrento', taxi: 'marrento', kombi: 'marrento', dj: 'brincalhao', dudu: 'brincalhao', feira: 'brincalhao', dete: 'brincalhao' };
    if (p.styleId && ids[p.styleId]) return ids[p.styleId];
    let h = 0; for (const ch of String(p.styleId || p.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return ['calmo', 'marrento', 'brincalhao'][h % 3];
  },
  VOICE: { calmo: [180, 'triangle'], marrento: [260, 'sawtooth'], brincalhao: [360, 'square'] },

  init(ui) {
    this.ui = ui;
    const table = document.getElementById('table');
    this.layer = document.createElement('div'); this.layer.className = 'talk-layer'; table.appendChild(this.layer);
    const btn = document.createElement('button');
    btn.id = 'btn-talk-match'; btn.className = 'talkbtn'; btn.setAttribute('aria-label', 'Falas');
    btn.innerHTML = '<span class="talkbtn__ico"></span>';
    table.appendChild(btn);
    const menu = document.createElement('div'); menu.className = 'talk-menu'; table.appendChild(menu);
    this.btn = btn; this.menu = menu;
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    document.addEventListener('pointerdown', (e) => { if (this.open && !menu.contains(e.target) && e.target !== btn) this.toggle(false); });
    setInterval(() => { if (this.open) this.renderMenu(); }, 1000);
  },

  left() { const now = Date.now(); this.used = this.used.filter((t) => now - t < this.WINDOW); return this.LIMIT - this.used.length; },

  toggle(force) {
    this.open = force === undefined ? !this.open : force;
    this.menu.classList.toggle('talk-menu--on', this.open);
    if (this.open) this.renderMenu();
  },

  renderMenu() {
    const left = this.left();
    this.menu.innerHTML = '';
    this.MINE.forEach((l) => {
      const b = document.createElement('button');
      b.textContent = this.mine(l); b.disabled = left <= 0;
      b.onclick = () => this.sayMine(l);
      this.menu.appendChild(b);
    });
    const foot = document.createElement('div'); foot.className = 'talk-menu__foot';
    foot.innerHTML = `<span>${left > 0 ? T.t('talk_left', { n: left }) : T.t('talk_wait')}</span>`;
    const mute = document.createElement('button');
    mute.className = 'talk-menu__mute'; mute.textContent = this.muted ? T.t('talk_unmute') : T.t('talk_mute');
    mute.onclick = () => {
      this.muted = !this.muted;
      if (window.Opts) Opts.v.oppTalk = !this.muted;
      if (typeof App !== 'undefined') App.persist();
      this.renderMenu();
    };
    foot.appendChild(mute);
    this.menu.appendChild(foot);
  },

  sayMine(l) {
    if (this.left() <= 0) return;
    this.used.push(Date.now());
    const g = window.Game; if (!g) return;
    const me = g.players.find((p) => p.isHuman);
    this.bubble(me.i, this.mine(l), true);
    this.voice(this.mine(l), 320, 'square');
    if (typeof App !== 'undefined') { App.stats.talks = (App.stats.talks || 0) + 1; }
    this.toggle(false);
    if (this.muted) return;
    // responde um adversário; às vezes o parceiro comenta também
    const opps = g.players.filter((p) => !p.isHuman && p.team !== me.team);
    const mates = g.players.filter((p) => !p.isHuman && p.team === me.team);
    const who = opps[Math.floor(Math.random() * opps.length)];
    if (who) setTimeout(() => this.botLine(who, l.mood), 700);
    if (mates.length && Math.random() < 0.3) setTimeout(() => this.botLine(mates[0], l.mood === 'tease' ? 'win' : 'nice'), 1700);
  },

  /* falas espontâneas dos bots durante a partida */
  event(kind, p, chance = 1) {
    if (!p || p.isHuman || Math.random() > chance) return;
    const g = window.Game; if (!g) return;
    const me = g.players.find((x) => x.isHuman);
    if (this.muted && me && p.team !== me.team) return;
    this.botLine(p, kind);
  },

  botLine(p, kind) {
    const k = this.kind(p);
    const pool = (this.LINES[k] && this.LINES[k][kind]) || this.LINES.calmo.nice;
    const line = pool[Math.floor(Math.random() * pool.length)][this.lang()];
    this.bubble(p.i, line, false);
    const v = this.VOICE[k]; this.voice(line, v[0], v[1]);
    // carinha reage
    const mood = kind === 'tease' || kind === 'bet' ? (k === 'marrento' ? { frown: true, alert: true } : { brow: true, smile: k !== 'calmo' }) :
      kind === 'run' ? { sweat: 6, look: -1 } : { smile: true };
    this.face(p, mood);
  },

  face(p, o) {
    const ui = this.ui, se = ui && ui.seatEls && ui.seatEls[p.i];
    const cv = se && se.el.querySelector('canvas'); if (!cv) return;
    const bg = p.team === 0 ? '#1f4a30' : '#4a2018';
    Faces.draw(cv.getContext('2d'), ui.styleOf(p), { bg, ...o });
    clearTimeout(cv._talkT);
    cv._talkT = setTimeout(() => Faces.draw(cv.getContext('2d'), ui.styleOf(p), { bg }), 1800);
  },

  bubble(i, text, mine) {
    const ui = this.ui; if (!ui || !ui.seatEls[i]) return;
    const seat = ui.seatEls[i].el;
    const b = document.createElement('div');
    b.className = 'tbubble' + (mine ? ' tbubble--me' : '');
    b.textContent = text;
    if (mine) { b.style.left = '50%'; b.style.top = '86%'; }
    else {
      const x = parseFloat(seat.style.left), y = parseFloat(seat.style.top);
      b.style.left = x + '%'; b.style.top = y + '%';
      b.classList.add(y < 30 ? 'tbubble--down' : 'tbubble--up');
      if (x < 30) b.classList.add('tbubble--right'); else if (x > 70) b.classList.add('tbubble--left');
    }
    // uma bolha por pessoa
    this.layer.querySelectorAll(`[data-i="${i}"]`).forEach((o) => o.remove());
    b.dataset.i = i;
    this.layer.appendChild(b);
    requestAnimationFrame(() => b.classList.add('tbubble--on'));
    setTimeout(() => { b.classList.remove('tbubble--on'); setTimeout(() => b.remove(), 250); }, 2300);
  },

  voice(text, base, type) {
    if (typeof Sound === 'undefined' || !Sound.ctx || !Sound.sfx || Sound.voices === false) return;
    const n = Math.min(9, Math.ceil(text.length / 3));
    for (let k = 0; k < n; k++) setTimeout(() => Sound.tone(base * (1 + (Math.random() - 0.5) * 0.25), 0.045, type, 0.1), k * 70);
  },

  clear() { if (this.layer) this.layer.innerHTML = ''; this.toggle(false); this.used = []; },
};

window.Talk = Talk;
