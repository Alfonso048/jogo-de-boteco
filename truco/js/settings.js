/* ============================================================
   settings.js — opções extras da aba Ajustes.
   Som (volumes, vozes), jogo (velocidade, tempo de turno, falas,
   tiques, confirmação ao sair), tela (efeitos, texto, vibração,
   dicas, mão canhota) e dados (apagar progresso).
   Os valores ficam salvos junto com o progresso (App.persist).
   ============================================================ */

const Opts = {
  v: {
    musicVol: 70, sfxVol: 80, voices: true,
    speed: 'normal', turn: 20, oppTalk: true, tells: true, confirmQuit: true,
    fx: 'full', bigText: false, haptic: true, hints: true, review: true, lefty: false,
  },

  load(d) { if (d) this.v = { ...this.v, ...d }; },
  data() { return { ...this.v }; },

  /* multiplicadores lidos pelo resto do jogo */
  speedMul() { return { slow: 1.45, normal: 1, fast: 0.6 }[this.v.speed] || 1; },
  fxMul() { return { full: 1, light: 0.45, off: 0 }[this.v.fx] ?? 1; },

  apply() {
    const v = this.v;
    if (typeof Sound !== 'undefined') { Sound.musicVol = v.musicVol / 100; Sound.sfxVol = v.sfxVol / 100; Sound.applyVolumes && Sound.applyVolumes(); Sound.voices = v.voices; }
    if (window.Haptic) Haptic.on = v.haptic;
    if (window.Talk) Talk.muted = !v.oppTalk;
    const b = document.body;
    b.classList.toggle('opt-bigtext', v.bigText);
    b.classList.toggle('opt-lefty', v.lefty);
    b.classList.toggle('opt-nohints', !v.hints);
    b.classList.toggle('opt-nofx', v.fx === 'off');
  },

  set(k, val, app) {
    this.v[k] = val;
    this.apply();
    if (app) app.persist();
    this.render(app);
  },

  /* ---------- tela ---------- */
  render(app) {
    const box = document.getElementById('opts-body');
    if (!box) return;
    const v = this.v;
    box.innerHTML = '';
    const head = (key) => { const h = document.createElement('h4'); h.className = 'opt-h'; h.textContent = T.t(key); box.appendChild(h); };
    const row = (key, valTxt, onClick, hintKey) => {
      const b = document.createElement('button');
      b.className = 'row-btn';
      b.innerHTML = `<span>${T.t(key)}${hintKey ? `<small class="opt-hint">${T.t(hintKey)}</small>` : ''}</span><b>${valTxt}</b>`;
      b.onclick = () => { Sound.click(); onClick(); };
      box.appendChild(b);
    };
    const onoff = (k, key, hintKey) => row(key, v[k] ? T.t('on') : T.t('off'), () => this.set(k, !v[k], app), hintKey);
    const cycle = (k, key, opts, hintKey) => {
      const i = opts.findIndex((o) => o.v === v[k]);
      const cur = opts[i < 0 ? 0 : i];
      row(key, cur.l, () => this.set(k, opts[(Math.max(0, i) + 1) % opts.length].v, app), hintKey);
    };
    const slider = (k, key, onLive) => {
      const w = document.createElement('label');
      w.className = 'row-btn opt-range';
      w.innerHTML = `<span>${T.t(key)}</span><input type="range" min="0" max="100" step="5" value="${v[k]}" aria-label="${T.t(key)}"><b>${v[k]}%</b>`;
      const inp = w.querySelector('input'), out = w.querySelector('b');
      inp.addEventListener('input', () => { v[k] = +inp.value; out.textContent = v[k] + '%'; this.apply(); if (onLive) onLive(); });
      inp.addEventListener('change', () => { if (app) app.persist(); });
      box.appendChild(w);
    };

    head('opt_sound');
    slider('musicVol', 'opt_music_vol');
    slider('sfxVol', 'opt_sfx_vol', () => { if (!this._tk || Date.now() - this._tk > 120) { this._tk = Date.now(); Sound.click(); } });
    onoff('voices', 'opt_voices', 'opt_voices_d');

    head('opt_game');
    cycle('speed', 'opt_speed', [{ v: 'normal', l: T.t('opt_normal') }, { v: 'fast', l: T.t('opt_fast') }, { v: 'slow', l: T.t('opt_slow') }], 'opt_speed_d');
    cycle('turn', 'opt_turn', [{ v: 20, l: '20 s' }, { v: 30, l: '30 s' }, { v: 45, l: '45 s' }, { v: 15, l: '15 s' }, { v: 0, l: T.t('opt_nolimit') }], 'opt_turn_d');
    onoff('oppTalk', 'opt_opp_talk', 'opt_opp_talk_d');
    onoff('tells', 'opt_tells', 'opt_tells_d');
    onoff('confirmQuit', 'opt_confirm_quit');

    head('opt_screen');
    cycle('fx', 'opt_fx', [{ v: 'full', l: T.t('opt_full') }, { v: 'light', l: T.t('opt_light') }, { v: 'off', l: T.t('off') }], 'opt_fx_d');
    onoff('bigText', 'opt_bigtext');
    onoff('haptic', 'opt_haptic');
    onoff('hints', 'opt_hints');
    onoff('review', 'opt_review', 'opt_review_d');
    onoff('lefty', 'opt_lefty', 'opt_lefty_d');

    head('opt_data');
    const st = app ? app.stats : null;
    if (st) {
      const p = document.createElement('p'); p.className = 'note';
      p.textContent = T.t('opt_saved_info', { w: st.wins, l: st.losses }) + ' ' + (Save.persistent ? T.t('opt_saved_on') : T.t('opt_saved_off'));
      box.appendChild(p);
    }
    const del = document.createElement('button');
    del.className = 'btn btn--run opt-del';
    del.textContent = T.t('opt_reset');
    del.onclick = () => {
      Sound.click();
      const m = app.ui.openModal(T.t('opt_reset'), T.t('opt_reset_d'));
      app.mkBtn(m, T.t('opt_reset_yes'), 'btn--run', () => {
        app.resetting = true;
        if (!Save.clear()) {
          app.resetting = false;
          const error = app.ui.openModal(T.t('opt_reset'), T.t('opt_reset_error'));
          app.mkBtn(error, T.t('ok_go'), 'btn--accept', () => app.ui.closeModal());
          return;
        }
        location.reload();
      });
      app.mkBtn(m, T.t('opt_cancel'), 'btn--accept', () => app.ui.closeModal());
    };
    box.appendChild(del);
    const ver = document.createElement('p'); ver.className = 'note opt-ver'; ver.textContent = 'Truco de Boteco v1.5';
    box.appendChild(ver);
  },
};

window.Opts = Opts;
