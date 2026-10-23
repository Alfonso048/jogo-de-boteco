/* ============================================================
   faces.js — rostos pixelados dos jogadores na mesa e os
   "tiques" (tells) que os bots deixam escapar quando trucam.
   Grade de 32x32; escala inteira para ficar nítido.
   ============================================================ */

const Faces = {
  /* estilos genéricos para partidas rápidas (mesmas cores do mundo) */
  GENERIC: ['zeca', 'dona', 'bereba', 'dudu', 'kombi', 'dete', 'feira', 'taxi', 'dj', 'padre'],

  style(id) {
    const STY = (typeof World !== 'undefined' && World.STY) || {};
    return STY[id] || STY.zeca || { skin: '#e0a878', hair: '#2a1a0e', hs: 'short', shirt: '#c0392b' };
  },

  shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  },

  /**
   * Desenha um rosto.
   * o: { winkL, brow, smile, frown, look (-1..1), sweat (0..14|null), tap, whistle, alert }
   */
  draw(ctx, styleId, o = {}, scale = 1) {
    const st = this.style(styleId);
    const S = scale;
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, (w || 1) * S, (h || 1) * S); };
    const skin = st.skin || '#e0a878', skinD = this.shade(skin, -0.22);
    const hair = st.hair || '#2a1a0e';
    const shirt = st.suit || st.vest || st.shirt || '#c0392b';
    const INK = '#170d0f';
    ctx.clearRect(0, 0, 32 * S, 32 * S);
    P(0, 0, 32, 32, o.bg || '#1a3324');
    P(0, 26, 32, 6, this.shade(o.bg || '#1a3324', -0.3));

    // ombros
    const wide = st.body === 'chubby' || st.body === 'chubbyMid' ? 2 : 0;
    P(4 - wide, 25, 24 + wide * 2, 8, INK); P(5 - wide, 26, 22 + wide * 2, 7, shirt);
    if (st.tie) P(15, 26, 2, 6, st.tie);
    if (st.chain) { P(12, 27, 8, 1, '#e8b93c'); }
    // pescoço
    P(13, 22, 6, 4, skinD);
    // cabeça
    P(8 - wide / 2, 6, 16 + wide, 18, INK); P(9 - wide / 2, 7, 14 + wide, 16, skin);
    // orelhas
    P(7 - wide / 2, 13, 2, 4, skin); P(23 + wide / 2, 13, 2, 4, skin);

    // cabelo
    if (st.hs !== 'bald') {
      P(8, 4, 16, 5, INK); P(9, 5, 14, 3, hair);
      if (st.hs === 'curly') { P(7, 4, 2, 6, hair); P(23, 4, 2, 6, hair); P(10, 3, 3, 2, hair); P(15, 2, 3, 3, hair); P(20, 3, 3, 2, hair); }
      if (st.hs === 'long') { P(7, 6, 2, 14, hair); P(23, 6, 2, 14, hair); }
      if (st.hs === 'bun') { P(13, 1, 6, 4, hair); }
      if (st.hs === 'slick') { P(9, 5, 14, 2, this.shade(hair, 0.15)); }
    } else {
      P(12, 7, 4, 1, this.shade(skin, 0.3));
    }
    // chapéus
    if (st.hat === 'cap' || st.hat === 'capback') { P(7, 3, 18, 5, INK); P(8, 4, 16, 3, st.hatc); if (st.hat === 'cap') P(5, 7, 10, 2, this.shade(st.hatc, -0.25)); }
    if (st.hat === 'fedora' || st.hat === 'straw') { P(10, 0, 12, 5, st.hatc); P(5, 5, 22, 2, this.shade(st.hatc, -0.2)); if (st.band) P(10, 3, 12, 1, st.band); }
    if (st.hat === 'tophat') { P(10, -2, 12, 8, st.hatc); P(6, 5, 20, 2, st.hatc); if (st.band) P(10, 4, 12, 1, st.band); }
    if (st.hat === 'scarf') { P(7, 3, 18, 5, st.hatc); P(10, 4, 1, 1, st.dotc); P(16, 5, 1, 1, st.dotc); P(21, 4, 1, 1, st.dotc); }
    if (st.phones) { P(6, 11, 3, 6, st.phones); P(23, 11, 3, 6, st.phones); P(8, 3, 16, 1, '#1c1c24'); }

    // sobrancelhas
    const up = o.brow ? -2 : 0, fr = o.frown ? 1 : 0;
    P(10, 10 + up + fr, 4, 1, this.shade(hair, -0.1)); P(18, 10 + up, 4, 1, this.shade(hair, -0.1));
    // olhos
    const lx = Math.round(o.look || 0);
    if (st.shades) { P(9, 11, 14, 4, '#101014'); P(10, 12, 2, 1, '#4a4a5a'); P(18, 12, 2, 1, '#4a4a5a'); }
    else {
      if (o.winkL) P(10, 13, 4, 1, INK); else { P(10, 12, 4, 3, '#f4ead2'); P(11 + Math.max(-1, Math.min(1, lx)) + (lx < 0 ? 0 : 0), 12, 2, 3, INK); }
      P(18, 12, 4, 3, '#f4ead2'); P(19 + Math.max(-1, Math.min(1, lx)), 12, 2, 3, INK);
    }
    if (st.glasses) {
      [[9, 11], [17, 11]].forEach(([x, y]) => { P(x, y, 6, 1, INK); P(x, y + 4, 6, 1, INK); P(x, y, 1, 5, INK); P(x + 5, y, 1, 5, INK); });
      P(15, 12, 2, 1, INK);
    }
    // nariz
    P(15, 15, 2, 3, skinD);
    // bigode / barba
    if (st.stache) P(11, 18, 10, st.stache === 'big' ? 2 : 1, hair);
    if (st.stubble) { for (let i = 0; i < 7; i++) P(10 + i * 2, 21, 1, 1, this.shade(skin, -0.35)); }
    // boca
    const M = '#5a1a10';
    if (o.whistle) { P(15, 19, 2, 2, M); }
    else if (o.smile) { P(12, 20, 8, 1, M); P(11, 19, 1, 1, M); P(20, 19, 1, 1, M); }
    else if (o.frown) { P(12, 20, 8, 1, M); P(11, 21, 1, 1, M); P(20, 21, 1, 1, M); }
    else P(12, 20, 8, 1, M);
    if (st.earring) { P(7, 17, 1, 2, '#f2cf3a'); P(24, 17, 1, 2, '#f2cf3a'); }

    // suor escorrendo
    if (o.sweat != null) { const y = 7 + (o.sweat % 12); P(24, y, 2, 3, '#9fd3e8'); P(24, y, 1, 1, '#ffffff'); P(7, 9 + ((o.sweat + 5) % 10), 2, 2, '#9fd3e8'); }
    // nota musical do assobio
    if (o.whistle) { const k = o.t || 0, y = 6 - (k % 20) / 4; P(25, Math.round(y) + 4, 1, 4, '#f4ead2'); P(26, Math.round(y) + 4, 2, 1, '#f4ead2'); P(23, Math.round(y) + 7, 2, 2, '#f4ead2'); }
    // dedo batucando na mesa
    if (o.tap) { const dn = (o.t || 0) % 12 < 6; P(24, dn ? 28 : 26, 4, 4, skin); P(24, dn ? 28 : 26, 4, 1, INK); }
    if (o.alert) { P(27, 1, 3, 6, '#e8b93c'); P(27, 8, 3, 2, '#e8b93c'); }
  },

  /* ---------- tiques ---------- */
  NERVOUS: ['sweat', 'eyes', 'tap'],
  CALM: ['smile', 'whistle'],

  /**
   * Decide o tique de um bot que acabou de trucar.
   * Fácil: quase sempre sincero. Difícil: finge metade das vezes.
   */
  rollTell(game, bluffing) {
    const d = (game.cfg.edge || 0) > 0.5 ? 'hard' : game.cfg.difficulty;
    const showP = { easy: 1, medium: 0.85, hard: 0.75 }[d] ?? 0.8;
    const honestP = { easy: 0.9, medium: 0.7, hard: 0.5 }[d] ?? 0.7;
    if (Math.random() > showP) return { kind: 'none' };
    const honest = Math.random() < honestP;
    const looksNervous = honest ? bluffing : !bluffing;
    const list = looksNervous ? this.NERVOUS : this.CALM;
    return { kind: list[Math.floor(Math.random() * list.length)] };
  },

  /* expressão animada de um tique no quadro t */
  tellFrame(kind, t) {
    switch (kind) {
      case 'sweat': return { sweat: Math.floor(t / 3), brow: Math.floor(t / 50) % 2 === 0 };
      case 'eyes': return { look: Math.floor(t / 14) % 2 ? 1 : -1, frown: true };
      case 'tap': return { tap: true, t, look: Math.floor(t / 40) % 2 ? 1 : 0 };
      case 'smile': return { smile: true, winkL: t % 150 < 10 };
      case 'whistle': return { whistle: true, t, brow: true };
      default: return {};
    }
  },
};

window.Faces = Faces;
