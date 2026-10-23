/* ============================================================
   ui.js — mesa, animações e entrada do jogador
   ============================================================ */

const SEAT_POS = {
  2: [{ x: 50, y: 82 }, { x: 50, y: 14 }],
  4: [{ x: 50, y: 82 }, { x: 12, y: 50 }, { x: 50, y: 14 }, { x: 88, y: 50 }],
  6: [{ x: 50, y: 84 }, { x: 10, y: 63 }, { x: 19, y: 20 }, { x: 50, y: 12 }, { x: 81, y: 20 }, { x: 90, y: 63 }],
};

const TURN_TIME = 20; // segundos (base; o cafezinho aumenta em App.items)

class TableUI {
  constructor(root) {
    this.root = root || document.createElement('div');
    const modal = document.getElementById('modal') || document.createElement('div');
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.el = {
      table: this.root.querySelector('#table'),
      seats: this.root.querySelector('#seats'),
      slots: this.root.querySelector('#slots'),
      hand: this.root.querySelector('#hand'),
      actions: this.root.querySelector('#actions'),
      toast: this.root.querySelector('#toast'),
      modal,
      scoreUs: this.root.querySelector('#score-us'),
      scoreThem: this.root.querySelector('#score-them'),
      labelUs: this.root.querySelector('#label-us'),
      labelThem: this.root.querySelector('#label-them'),
      value: this.root.querySelector('#hand-value'),
      valueLbl: this.root.querySelector('#hand-value-lbl'),
      vira: this.root.querySelector('#vira'),
      viraLbl: this.root.querySelector('#vira-lbl'),
      rounds: this.root.querySelector('#rounds'),
      timer: this.root.querySelector('#timer-bar'),
      timerWrap: this.root.querySelector('#timer'),
      partner: this.root.querySelector('#partner-peek'),
    };
    this.state = null;
    this.seatEls = [];
    this.turnTime = TURN_TIME;   // o cafezinho sobe isso para 30
    this.pending = false;
    this.resolveTurn = null;
    this.cancelPending = null;
    this.onUseItem = null;      // App liga aqui para gastar item na mesa

    // camada de efeitos da mesa (partículas + carimbo do grito)
    this.fx = document.createElement('canvas');
    this.fx.className = 'table__fx';
    if (this.el.table) this.el.table.appendChild(this.fx);
    this.fxc = this.fx.getContext ? this.fx.getContext('2d') : null;
    this.parts = [];
    this.fxRun = false;
    this.stampEl = document.createElement('div');
    this.stampEl.className = 'stamp';
    if (this.el.table) this.el.table.appendChild(this.stampEl);
    this.calm = !!(mq && mq.matches);
  }

  /* ---------- efeitos ---------- */
  sizeFx() {
    const r = this.el.table.getBoundingClientRect();
    if (this.fx.width !== Math.round(r.width) || this.fx.height !== Math.round(r.height)) {
      this.fx.width = Math.round(r.width); this.fx.height = Math.round(r.height);
    }
    return r;
  }

  burst(x, y, n, colors, power = 4) {
    const fxk = window.Opts ? Opts.fxMul() : 1;
    if (!fxk) return;
    n = Math.max(1, Math.round(n * fxk));
    if (this.calm) n = Math.ceil(n / 3);
    this.sizeFx();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * power;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, l: 1, c: colors[i % colors.length], z: 3 + Math.floor(Math.random() * 3) });
    }
    if (!this.fxRun) { this.fxRun = true; requestAnimationFrame(() => this.fxTick()); }
  }

  fxTick() {
    const c = this.fxc;
    c.clearRect(0, 0, this.fx.width, this.fx.height);
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.98; p.l -= 0.022;
      c.globalAlpha = Math.max(0, p.l); c.fillStyle = p.c;
      c.fillRect(Math.round(p.x), Math.round(p.y), p.z, p.z);
    }
    c.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.l > 0);
    if (this.parts.length) requestAnimationFrame(() => this.fxTick());
    else { this.fxRun = false; c.clearRect(0, 0, this.fx.width, this.fx.height); }
  }

  shake(amp, dur) {
    const fxk = window.Opts ? Opts.fxMul() : 1;
    if (!fxk) return;
    amp *= fxk;
    if (this.calm) return;
    const t = this.el.table;
    t.style.setProperty('--amp', amp + 'px');
    t.style.setProperty('--dur', dur + 'ms');
    t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
  }

  /* centro de um elemento em coordenadas da mesa */
  centerIn(el) {
    const tr = this.el.table.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - tr.left + r.width / 2, y: r.top - tr.top + r.height / 2 };
  }

  /* grito de truco: carimbo, tremor proporcional, contador rolando */
  async betStamp(prev, value) {
    const level = [3, 6, 9, 12].indexOf(value) + 1;
    this.stampEl.textContent = Game.betLabel(value).toUpperCase().replace(/!*$/, '!');
    this.stampEl.classList.remove('stamp--go'); void this.stampEl.offsetWidth; this.stampEl.classList.add('stamp--go');
    this.shake([0, 5, 8, 12, 16][level] || 6, [0, 260, 320, 400, 520][level] || 300);
    Sound.shout(level);
    if (window.Haptic) Haptic.truco();
    const r = this.sizeFx();
    this.burst(r.width / 2, r.height * 0.42, 26 + level * 10, ['#e8b93c', '#c0392b', '#ffffff'], 5 + level);
    // contador do valor
    this._rolling = true;
    const el = this.el.value, steps = Math.max(1, value - prev), iv = Math.max(35, 260 / steps);
    for (let n = prev + 1; n <= value; n++) {
      el.textContent = n;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      Sound.tone(700 + n * 40, 0.04, 'square', 0.12);
      await this.sleep(iv);
    }
    this._rolling = false;
    await this.sleep(420);
  }

  /* ---------- render ---------- */
  update(s) {
    this.state = s;
    const n = s.players.length;
    if (this.seatEls.length !== n) this.buildSeats(s);

    this.el.labelUs.textContent = T.t('us');
    this.el.labelThem.textContent = T.t('them');
    this.el.scoreUs.textContent = s.scores[0];
    this.el.scoreThem.textContent = s.scores[1];
    this.el.valueLbl.textContent = T.t('hand_worth');
    if (!this._rolling) this.el.value.textContent = s.value;
    // a trilha acompanha a tensão da mão
    if (typeof Sound !== 'undefined' && Sound.setMood) Sound.setMood(s.ironHand ? 2 : s.value >= 3 ? 1 : 0);
    this.el.viraLbl.textContent = s.variant === 'paulista' ? T.t('vira') : T.t('manilha');

    // vira / manilhas fixas
    this.el.vira.innerHTML = '';
    if (s.vira) {
      this.el.vira.appendChild(renderCard(s.vira, { small: true }));
    } else {
      const tag = document.createElement('div');
      tag.className = 'fixed-manilhas';
      tag.innerHTML = '<span>4♣</span><span>7♥</span><span>A♠</span><span>7♦</span>';
      this.el.vira.appendChild(tag);
    }

    // marcadores de rodada
    this.el.rounds.innerHTML = '';
    for (let r = 0; r < 3; r++) {
      const d = document.createElement('i');
      d.className = 'dot' + (r < s.roundWins[0] + s.roundWins[1] ? ' dot--done' : '');
      this.el.rounds.appendChild(d);
    }

    // assentos
    s.players.forEach((p, i) => {
      const se = this.seatEls[i];
      se.el.classList.toggle('seat--active', s.current === i);
      se.el.classList.toggle('seat--mine', p.team === 0);
      se.backs.innerHTML = '';
      const hidden = p.isHuman ? 0 : p.hand.length;
      for (let k = 0; k < hidden; k++) {
        const c = document.createElement('div');
        c.className = 'mini-back';
        se.backs.appendChild(c);
      }
    });

    // minha mão
    this.renderHand(s);

    // espiada nas cartas do parceiro (Mão de Ferro)
    this.el.partner.innerHTML = '';
    if (s.revealPartner) {
      const mate = s.players.find((p) => p.team === 0 && !p.isHuman);
      if (mate) {
        const lbl = document.createElement('span');
        lbl.className = 'peek__lbl';
        lbl.textContent = T.t('partner_cards');
        this.el.partner.appendChild(lbl);
        const row = document.createElement('div');
        row.className = 'peek__row';
        mate.hand.forEach((c) => row.appendChild(renderCard(c, { small: true })));
        this.el.partner.appendChild(row);
      }
    }
    if (s.revealedEnemy && s.revealedEnemy.length) {
      const lbl = document.createElement('span');
      lbl.className = 'peek__lbl';
      lbl.textContent = T.t('enemy_card');
      this.el.partner.appendChild(lbl);
      const row = document.createElement('div');
      row.className = 'peek__row';
      s.revealedEnemy.forEach((r) => row.appendChild(renderCard(r.card, { small: true })));
      this.el.partner.appendChild(row);
    }
  }

  /* mochila do modo história, ao lado das ações */
  renderBag() {
    // limpa a mochila anterior para não duplicar botões
    const prev = this.el.actions.querySelector('.bag');
    if (prev) prev.remove();
    if (!this.onUseItem) return;
    const items = this.onUseItem('list') || [];
    if (!items.length) return;
    const bag = document.createElement('div');
    bag.className = 'bag';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'item-btn';
      b.title = T.t(it.descKey);
      b.innerHTML = `<span class="item-btn__icon">${ICONS[it.ico](22)}</span>`;
      b.onclick = () => {
        if (window.Haptic) Haptic.coin();
        this.onUseItem('use', it.id);
        this.announce(T.t('item_used', { name: T.t(it.nameKey) }));
        this.renderBag();
      };
      bag.appendChild(b);
    });
    this.el.actions.appendChild(bag);
  }

  buildSeats(s) {
    const n = s.players.length;
    this.el.seats.innerHTML = '';
    this.el.slots.innerHTML = '';
    this.seatEls = [];
    const pos = SEAT_POS[n] || SEAT_POS[4];
    s.players.forEach((p, i) => {
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.style.left = pos[i].x + '%';
      seat.style.top = pos[i].y + '%';
      seat.innerHTML = `<div class="seat__av${p.isHuman ? '' : ' seat__av--face'}">${p.isHuman ? '🙋' : ''}</div>
        <div class="seat__name">${p.name}</div><div class="seat__backs"></div>`;
      if (!p.isHuman) {
        const cv = document.createElement('canvas');
        cv.width = 32; cv.height = 32;
        Faces.draw(cv.getContext('2d'), this.styleOf(p), { bg: p.team === 0 ? '#1f4a30' : '#4a2018' });
        seat.querySelector('.seat__av').appendChild(cv);
      }
      if (p.isHuman) seat.classList.add('seat--human');
      this.el.seats.appendChild(seat);

      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.left = (50 + (pos[i].x - 50) * 0.46) + '%';
      slot.style.top = (50 + (pos[i].y - 50) * 0.42) + '%';
      this.el.slots.appendChild(slot);

      this.seatEls.push({ el: seat, backs: seat.querySelector('.seat__backs'), slot });
    });
  }

  /* estilo visual do bot: NPC do mundo ou um estilo fixo pelo nome */
  styleOf(p) {
    if (p.styleId) return p.styleId;
    let h = 0; for (const ch of p.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return Faces.GENERIC[h % Faces.GENERIC.length];
  }

  renderHand(s) {
    const me = s.players.find((p) => p.isHuman);
    this.el.hand.innerHTML = '';
    if (!me) return;
    me.hand.forEach((c, i) => {
      const el = renderCard(c, { manilha: isManilha(c, { variant: s.variant, manilhaRank: s.manilhaRank }) });
      el.classList.add('card--in-hand');
      el.tabIndex = this.pending ? 0 : -1;
      el.dataset.handIndex = i;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${c.rank} de ${c.suit}`);
      if (this.pending) el.classList.add('card--playable');
      const shine = document.createElement('span');
      shine.className = 'card__shine';
      el.appendChild(shine);
      // inclina para o dedo/cursor (estilo Balatro)
      el.addEventListener('pointermove', (e) => {
        if (!this.pending || this.calm) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('card--tilt');
        el.style.transform = `translateY(-12px) scale(1.06) rotateX(${(-py * 16).toFixed(1)}deg) rotateY(${(px * 20).toFixed(1)}deg)`;
        el.style.boxShadow = `${(-px * 10).toFixed(0)}px 12px 0 rgba(0,0,0,.35)`;
        el.style.setProperty('--sx', ((px + 0.5) * 100).toFixed(0) + '%');
        el.style.setProperty('--sy', ((py + 0.5) * 100).toFixed(0) + '%');
      });
      el.addEventListener('pointerenter', () => { if (this.pending) Sound.tone(1320, 0.03, 'triangle', 0.08); });
      el.addEventListener('pointerleave', () => { el.classList.remove('card--tilt'); el.style.transform = ''; el.style.boxShadow = ''; });
      el.addEventListener('click', () => {
        if (!this.pending) return;
        if (window.Haptic) Haptic.card();
        this._flyFrom = el.getBoundingClientRect();
        Sound.card();
        this.resolveTurn({ type: 'play', card: c });
      });
      this.el.hand.appendChild(el);
    });
  }

  /* ---------- utilidades ---------- */
  /* o ritmo da mesa segue o ajuste "Velocidade dos bots" */
  // com os Ajustes abertos no meio da partida, a mesa fica parada esperando
  async sleep(ms) {
    const k = window.Opts ? Opts.speedMul() : 1;
    await new Promise((r) => setTimeout(r, ms * k));
    while (window.App && App.paused) await new Promise((r) => setTimeout(r, 120));
  }

  async announce(text, kind = 'info') {
    this.el.toast.textContent = text;
    this.el.toast.className = 'toast toast--show toast--' + kind;
    if (kind === 'bet') Sound.truco();
    if (kind === 'big') {
      Sound.win();
      const r = this.sizeFx();
      this.burst(r.width / 2, r.height / 2, 40, ['#e8b93c', '#3fae63', '#c0392b', '#f4ead2'], 6);
    }
    await this.sleep(kind === 'big' ? 1500 : 1000);
    this.el.toast.className = 'toast';
    await this.sleep(120);
  }

  async thinking(p) {
    const base = this.state && this.state.players.length > 4 ? 420 : 560;
    await this.sleep(base + Math.random() * 420);
  }

  async dealAnimation() {
    Sound.deal();
    this.el.hand.classList.add('hand--dealing');
    await this.sleep(420);
    this.el.hand.classList.remove('hand--dealing');
  }

  async playCardAnimation(pi, card, hidden) {
    const slot = this.seatEls[pi] && this.seatEls[pi].slot;
    if (!slot) return;
    const manilha = isManilha(card, { variant: this.state.variant, manilhaRank: this.state.manilhaRank });
    const el = renderCard(card, { small: true, faceDown: hidden, manilha });
    const human = this.state.players[pi].isHuman;
    slot.appendChild(el);
    const rot = (Math.random() * 6 - 3).toFixed(1);
    // de onde a carta vem: da mão (jogador) ou do assento (bot)
    const to = el.getBoundingClientRect();
    let from = null;
    if (human && this._flyFrom) from = this._flyFrom;
    else if (this.seatEls[pi]) from = this.seatEls[pi].el.getBoundingClientRect();
    this._flyFrom = null;
    if (!human) Sound.card();
    if (from && el.animate && !this.calm) {
      const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
      const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
      const s0 = human ? Math.min(1.6, from.width / Math.max(1, to.width)) : 0.5;
      const a = el.animate([
        { transform: `translate(${dx}px,${dy}px) scale(${s0}) rotate(0deg)`, opacity: human ? 1 : 0.3 },
        { transform: `translate(${dx * 0.35}px,${dy * 0.35 - 26}px) scale(1.2) rotate(${rot * 4}deg)`, opacity: 1, offset: 0.55 },
        { transform: `rotate(${rot}deg) scale(.94)`, offset: 0.82 },
        { transform: `rotate(${rot}deg) scale(1)` },
      ], { duration: human ? 380 : 340, easing: 'cubic-bezier(.3,.7,.3,1)' });
      await new Promise((r) => { a.onfinish = r; a.oncancel = r; });
    } else {
      el.classList.add('card--landing');
      await this.sleep(260);
      el.classList.remove('card--landing');
    }
    el.style.transform = `rotate(${rot}deg)`;
    // impacto: nota que sobe a cada carta da vaza, partículas e um tremor leve
    const k = this.el.slots.querySelectorAll('.card').length - 1;
    Sound.cardNote(k, manilha && !hidden);
    const c = this.centerIn(el);
    this.burst(c.x, c.y, manilha && !hidden ? 26 : 12, manilha && !hidden ? ['#e8b93c', '#fff6d0', '#f4ead2'] : ['#f4ead2', '#e8b93c', '#3fae63'], manilha ? 4.5 : 3);
    this.shake(manilha && !hidden ? 5 : 2, manilha && !hidden ? 240 : 160);
  }

  async clearTable() {
    this.el.slots.querySelectorAll('.card').forEach((c) => c.classList.add('card--leaving'));
    await this.sleep(300);
    this.el.slots.querySelectorAll('.slot').forEach((s) => (s.innerHTML = ''));
  }

  /* ---------- turno do jogador ---------- */
  humanTurn(opts = {}) {
    return new Promise((resolve) => {
      this.pending = true;
      this.resolveTurn = (action) => {
        if (!this.pending) return;
        this.pending = false;
        this.cancelPending = null;
        this.stopTimer();
        this.el.actions.innerHTML = '';
        this.renderHand(this.state);
        resolve(action);
      };
      this.cancelPending = () => this.resolveTurn({ type: 'abort' });

      this.el.actions.innerHTML = '';
      if (opts.canBet) {
        const b = document.createElement('button');
        b.className = 'btn btn--truco btn--ready';
        b.textContent = opts.nextValue === 3 ? T.t('truco') : T.t('raise') + ' ' + opts.nextValue;
        b.onclick = () => {
          if (window.Haptic) Haptic.truco();
          Sound.truco();
          this.resolveTurn({ type: 'bet', value: opts.nextValue });
        };
        this.el.actions.appendChild(b);
      }
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = T.t('your_turn');
      this.el.actions.appendChild(hint);
      this.renderBag();

      this.renderHand(this.state);
      const firstCard = this.el.hand.querySelector('.card--in-hand');
      if (firstCard) firstCard.focus();
      this.startTimer(() => {
        const me = this.state.players.find((p) => p.isHuman);
        const biggest = me.hand.reduce((a, b) => (Game.power(a) > Game.power(b) ? a : b));
        this.announce(T.t('timeout'));
        this.resolveTurn({ type: 'play', card: biggest });
      });
    });
  }

  humanBetResponse(value, next, tell = null, caller = null) {
    return new Promise((resolve) => {
      let raf = 0;
      this.pending = true;
      const done = (r) => {
        if (!this.pending) return;
        this.pending = false;
        this.cancelPending = null;
        cancelAnimationFrame(raf);
        this.closeModal();
        this.stopTimer();
        resolve(r);
      };
      this.cancelPending = () => done({ type: 'accept' });
      const box = this.openModal(Game.betLabel(value));
      // o rosto de quem trucou, com o tique (ou a cara de paisagem)
      if (tell && caller) {
        const wrap = document.createElement('div');
        wrap.className = 'tell';
        const cv = document.createElement('canvas');
        cv.width = 64; cv.height = 64;
        const txt = document.createElement('div');
        txt.className = 'tell__txt';
        txt.innerHTML = `${T.t('tell_' + tell.kind, { name: caller.name })}<span class="tell__tip">${T.t('tell_tip')}</span>`;
        wrap.append(cv, txt);
        box.appendChild(wrap);
        const ctx = cv.getContext('2d'), st = this.styleOf(caller);
        let t = 0;
        const loop = () => {
          t++;
          Faces.draw(ctx, st, { bg: '#4a2018', ...Faces.tellFrame(tell.kind, t) }, 2);
          raf = requestAnimationFrame(loop);
        };
        loop();
      }
      const mk = (label, cls, action, fn) => {
        const b = document.createElement('button');
        b.className = 'btn ' + cls;
        b.textContent = label;
        b.dataset.keyAction = action;
        b.onclick = () => { Sound.click(); fn(); };
        box.appendChild(b);
      };
      mk(T.t('accept'), 'btn--accept', 'accept', () => done({ type: 'accept' }));
      if (next) mk(T.t('raise') + ' ' + next, 'btn--truco', 'raise', () => done({ type: 'raise', value: next }));
      mk(T.t('run'), 'btn--run', 'run', () => done({ type: 'run' }));
      this.startTimer(() => done({ type: 'accept' }));
    });
  }

  ironHandChoice() {
    return new Promise((resolve) => {
      this.pending = true;
      const done = (value) => {
        if (!this.pending) return;
        this.pending = false;
        this.cancelPending = null;
        this.closeModal();
        resolve(value);
      };
      this.cancelPending = () => done('play');
      const box = this.openModal(T.t('iron_hand'), T.t('iron_hand_desc'));
      const mate = this.state.players.find((p) => p.team === 0 && !p.isHuman);
      if (mate) {
        const row = document.createElement('div');
        row.className = 'peek__row';
        mate.hand.forEach((c) => row.appendChild(renderCard(c, { small: true })));
        box.appendChild(row);
      }
      const mk = (label, cls, action, val) => {
        const b = document.createElement('button');
        b.className = 'btn ' + cls;
        b.textContent = label;
        b.dataset.keyAction = action;
        b.onclick = () => { Sound.click(); done(val); };
        box.appendChild(b);
      };
      mk(T.t('iron_play'), 'btn--accept', 'play', 'play');
      mk(T.t('iron_give'), 'btn--run', 'give', 'give');
    });
  }

  async blindDuel(a, b, pa, pb) {
    const box = this.openModal(T.t('blind_duel'), T.t('blind_duel_desc'));
    const row = document.createElement('div');
    row.className = 'duel';
    const ca = renderCard(a, { faceDown: true });
    const cb = renderCard(b, { faceDown: true });
    const wrapA = document.createElement('div'); wrapA.className = 'duel__side';
    wrapA.innerHTML = `<span>${T.t('us')}</span>`; wrapA.appendChild(ca);
    const wrapB = document.createElement('div'); wrapB.className = 'duel__side';
    wrapB.innerHTML = `<span>${T.t('them')}</span>`; wrapB.appendChild(cb);
    row.append(wrapA, wrapB);
    box.appendChild(row);
    await this.sleep(700);
    Sound.card();
    wrapA.replaceChild(renderCard(a, {}), ca);
    wrapB.replaceChild(renderCard(b, {}), cb);
    await this.sleep(1100);
    this.closeModal();
    if (pa === pb) return null;
    return pa > pb ? 0 : 1;
  }

  /* ---------- modal & timer ---------- */
  get modalOpen() { return this.el.modal.classList.contains('modal--show'); }

  openModal(title, desc) {
    if (window.App && App.current === 'world' && window.World) World.stop();
    this.el.modal.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'modal__box';
    if (title) { const h = document.createElement('h3'); h.textContent = title; box.appendChild(h); }
    if (desc) { const p = document.createElement('p'); p.textContent = desc; box.appendChild(p); }
    this.el.modal.appendChild(box);
    this.el.modal.classList.add('modal--show');
    setTimeout(() => {
      if (!this.modalOpen) return;
      const first = this.el.modal.querySelector('button:not([disabled])');
      if (first) first.focus();
    }, 0);
    return box;
  }
  closeModal() {
    this.el.modal.classList.remove('modal--show');
    this.el.modal.innerHTML = '';
    if (window.App && App.current === 'world' && !App.optsFrom && window.World) World.start();
  }

  startTimer(onTimeout) {
    this.stopTimer();
    if (this.turnTime === 0) return;   // ajuste "sem limite"
    let start = Date.now();
    this.el.timerWrap.classList.add('timer--on');
    this.el.timer.style.transform = 'scaleX(1)';
    const TT = this.turnTime || TURN_TIME;
    let lastTick = TT;
    this._t = setInterval(() => {
      if (window.App && App.paused) { start += 100; return; }   // relógio parado nos Ajustes
      const left = TT - (Date.now() - start) / 1000;
      const f = Math.max(0, left / TT);
      this.el.timer.style.transform = 'scaleX(' + f + ')';
      this.el.timerWrap.classList.toggle('timer--warn', left <= 5);
      if (Math.ceil(left) !== lastTick && left <= 5 && left > 0) { lastTick = Math.ceil(left); Sound.tick(); }
      if (left <= 0) { this.stopTimer(); onTimeout(); }
    }, 100);
  }
  stopTimer() {
    if (this._t) clearInterval(this._t);
    this._t = null;
    this.el.timerWrap.classList.remove('timer--on', 'timer--warn');
  }
}
