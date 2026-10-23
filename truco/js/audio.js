/* ============================================================
   audio.js — trilha chiptune procedural + efeitos (Web Audio)
   Sem arquivos externos: tudo sintetizado.
   ============================================================ */

const Sound = {
  musicVol: 0.7, sfxVol: 0.8, voices: true,
  /* aplica os volumes dos Ajustes sem cortar a música */
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.musicGain) { const g = this.musicGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(this.music ? 0.16 * this.musicVol : 0, t, 0.05); }
    if (this.sfxGain) { const g = this.sfxGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(this.sfx ? 0.35 * this.sfxVol : 0, t, 0.03); }
  },
  ctx: null,
  music: true,
  sfx: true,
  master: null,
  musicGain: null,
  sfxGain: null,
  timer: null,
  step: 0,

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.music ? 0.16 * this.musicVol : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfx ? 0.35 * this.sfxVol : 0;
    this.sfxGain.connect(this.master);
    this.startMusic();
  },

  setMusic(on) {
    this.music = on;
    if (this.musicGain) {
      const g = this.musicGain.gain;
      if (this.ctx) g.cancelScheduledValues(this.ctx.currentTime);
      g.value = on ? 0.16 * this.musicVol : 0;
    }
  },
  setSfx(on) {
    this.sfx = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.35 * this.sfxVol : 0;
  },

  tone(freq, dur, type = 'square', gain = 0.5, dest = null, detune = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  noise(dur = 0.12, gain = 0.4, hp = 1200) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
  },

  click() { this.tone(660, 0.06, 'square', 0.3); },
  deal() { this.noise(0.09, 0.3, 1800); },
  card() { this.noise(0.13, 0.35, 900); this.tone(320, 0.05, 'triangle', 0.15); },
  truco() {
    [392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.35), i * 70));
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.3), i * 90));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'square', 0.28), i * 110));
  },
  tick() { this.tone(1200, 0.04, 'square', 0.12); },

  /* segredo achado: arpejo brilhante subindo, com eco e um brilho no fim */
  secret() {
    const notes = [523, 659, 784, 988, 1175, 1319, 1568, 2093];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.tone(f, 0.16, 'triangle', 0.32);
        setTimeout(() => this.tone(f, 0.12, 'triangle', 0.1), 120);   // eco
      }, i * 65);
    });
    setTimeout(() => { this.tone(1568, 0.5, 'square', 0.12, null, 6); this.tone(2093, 0.5, 'triangle', 0.18); }, notes.length * 65 + 40);
  },
  /* brilho discreto quando um segredo aparece por perto */
  shimmer() {
    [1760, 2217, 2637].forEach((f, i) => setTimeout(() => this.tone(f, 0.09, 'triangle', 0.1), i * 50));
  },
  /* "voz" de cada personagem: bipes com timbre e altura próprios */
  blip(id, soft) {
    if (!this.voices) return;
    const V = { alfonso: [330, 'square'], prado: [220, 'triangle'], dimas: [262, 'sawtooth'], chihiro: [392, 'triangle'], martins: [523, 'square'] };
    const v = V[id] || [440, 'square'];
    const f = v[0] * (1 + (Math.random() - 0.5) * 0.18);
    this.tone(f, soft ? 0.035 : 0.07, v[1], soft ? 0.09 : 0.18);
  },

  /* --- utilitários agendados (relógio do áudio, sem atraso) --- */
  toneAt(when, freq, dur, type = 'square', gain = 0.5, dest = null, detune = 0) {
    if (!this.ctx) return;
    const t = Math.max(when, this.ctx.currentTime);
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest || this.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.03);
  },
  noiseAt(when, dur, gain, hp, dest = null) {
    if (!this.ctx) return;
    const t = Math.max(when, this.ctx.currentTime);
    if (!this._nbuf) {
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      this._nbuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._nbuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource(); src.buffer = this._nbuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest || this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  },
  kickAt(when, gain = 0.5, dest = null) {
    if (!this.ctx) return;
    const t = Math.max(when, this.ctx.currentTime);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.3);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(dest || this.sfxGain); o.start(t); o.stop(t + 0.42);
  },

  /* --- efeitos da mesa com impacto --- */
  // cada carta da vaza sobe uma nota (dó, ré, mi, fá, sol, lá)
  cardNote(k, manilha) {
    if (!this.ctx) return;
    const N = [523.25, 587.33, 659.25, 698.46, 783.99, 880];
    const f = N[Math.max(0, k) % N.length], t = this.ctx.currentTime;
    this.toneAt(t, f, 0.2, 'square', 0.22);
    this.toneAt(t, f * 2, 0.12, 'triangle', 0.1);
    if (manilha) { this.toneAt(t + 0.07, f * 1.5, 0.22, 'triangle', 0.16); this.toneAt(t + 0.14, f * 2, 0.3, 'triangle', 0.12); }
  },
  // grito de truco/seis/nove/doze: pancada grave + acorde que sobe com o nível
  shout(level = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.duck(1.1);
    this.kickAt(t, 0.55 + level * 0.1);
    this.noiseAt(t, 0.22, 0.4, 600);
    [392, 494, 587].forEach((f, i) => this.toneAt(t + 0.05 + i * 0.06, f * (1 + level * 0.06), 0.2, 'sawtooth', 0.22));
  },
  // abaixa a música um instante para o grito aparecer
  duck(sec = 0.9) {
    if (!this.ctx || !this.musicGain || !this.music) return;
    const g = this.musicGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.04 * this.musicVol, t + 0.06);
    g.linearRampToValueAtTime(0.16 * this.musicVol, t + sec);
  },

  /* --- trilha viva: choro em Am com camadas que entram conforme a tensão
     mood 0 = calmo · 1 = truco na mesa (pandeiro + cavaquinho) · 2 = Mão de Ferro
     Agendada à frente no relógio do Web Audio: não atrasa no celular. --- */
  mood: 0,
  setMood(m) {
    if (this.mood === m) return;
    this.mood = m;
    if (!this.ctx || !this.lp) return;
    const t = this.ctx.currentTime;
    this.lp.frequency.cancelScheduledValues(t);
    this.lp.frequency.setValueAtTime(this.lp.frequency.value, t);
    this.lp.frequency.linearRampToValueAtTime(m === 2 ? 700 : 12000, t + 0.6);
  },

  startMusic() {
    if (!this.ctx || this.timer) return;
    // filtro da trilha (abafa na Mão de Ferro)
    this.lp = this.ctx.createBiquadFilter();
    this.lp.type = 'lowpass'; this.lp.frequency.value = 12000;
    this.musicGain.disconnect();
    this.musicGain.connect(this.lp).connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 1;
    this.musicBus.connect(this.musicGain);

    const BASS = [110, 110, 82.4, 82.4, 98, 98, 87.3, 87.3]; // A A E E G G F#
    const MEL = [
      440, 523, 659, 523, 587, 494, 440, 392,
      440, 523, 659, 880, 784, 659, 587, 523,
      392, 494, 587, 494, 523, 440, 392, 330,
      440, 523, 659, 523, 587, 659, 784, 880,
    ];
    const CHORD = [[220, 261.6, 329.6], [164.8, 207.7, 246.9], [196, 246.9, 293.7], [185, 220, 277.2]];
    const STEP = [0.3, 0.255, 0.33]; // segundos por passo em cada clima
    const bus = this.musicBus;
    this.next = this.ctx.currentTime + 0.08;

    const schedule = () => {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      if (this.next < ctx.currentTime - 0.25) this.next = ctx.currentTime + 0.05; // voltou do segundo plano
      while (this.next < ctx.currentTime + 0.15) {
        const t = this.next, m = this.mood, sp = STEP[m] || 0.3;
        const s = this.step % 32, bar = Math.floor(s / 8) % 4;
        if (this.music) {
          // baixo
          if (s % 2 === 0) this.toneAt(t, BASS[(s / 2) % 8] / (m === 2 ? 2 : 1), sp * (m === 2 ? 2.2 : 1.15), 'triangle', 0.55, bus);
          // melodia (some na Mão de Ferro, fica só um eco grave)
          if (m !== 2) this.toneAt(t, MEL[s], sp * 0.66, 'square', 0.22, bus);
          else if (s % 8 === 0) this.toneAt(t, MEL[s] / 2, sp * 6, 'triangle', 0.18, bus);
          // contracanto suave
          if (m === 0 && s % 8 === 4) this.toneAt(t, MEL[s] * 1.5, 0.16, 'square', 0.1, bus, 8);
          // percussão base
          if (m === 0 && s % 4 === 2) this.noiseAt(t, 0.06, 0.22, 4000, bus);
          // truco na mesa: pandeiro em semicolcheias + cavaquinho no contratempo + surdo
          if (m === 1) {
            this.noiseAt(t, 0.035, s % 4 === 0 ? 0.32 : 0.14, 5000, bus);
            this.noiseAt(t + sp / 2, 0.03, 0.1, 6000, bus);
            if (s % 2 === 1) CHORD[bar].forEach((f, i) => this.toneAt(t + i * 0.008, f * 2, 0.08, 'triangle', 0.09, bus));
            if (s % 8 === 0) this.kickAt(t, 0.35, bus);
          }
          // Mão de Ferro: coração batendo
          if (m === 2 && s % 4 === 0) { this.kickAt(t, 0.5, bus); this.kickAt(t + sp * 0.55, 0.3, bus); }
        }
        this.next += sp;
        this.step++;
      }
    };
    this.timer = setInterval(schedule, 25);
    schedule();
  },
};
window.Sound = Sound;
