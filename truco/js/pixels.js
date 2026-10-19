/* ============================================================
   pixels.js — arte em pixel do mundo aberto (versão detalhada)

   Substitui o desenho simples do world.js por:
   - cidade pré-renderizada num canvas fora da tela (grama com flores,
     asfalto com calçada e faixa, calçadão de pedra portuguesa, árvores
     variadas, muros de tijolo, prédios com telhado, janelas, toldos,
     placas e caixa d'água)
   - camada animada por cima (postes acesos, fonte, neon, fumaça,
     vagalumes, moedas girando, personagens)
   - personagens com contorno, 4 direções, passo animado, piscada e
     roupa própria de cada desafiante
   - interiores com piso, parede, quadros e móveis detalhados
   Tudo procedural: nenhuma imagem externa.
   ============================================================ */
(function () {
  if (typeof World === 'undefined') return;
  const W0 = World;
  const TS = 16;

  /* ---------- utilidades de cor e ruído ---------- */
  function hx(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map((k) => k + k).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function rgb(r, g, b) {
    const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  }
  // amt > 0 clareia, < 0 escurece
  function sh(c, amt) {
    const [r, g, b] = hx(c);
    if (amt >= 0) return rgb(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    return rgb(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  }
  function mix(a, b, t) {
    const A = hx(a), B = hx(b);
    return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function h3(x, y, k) {
    const n = Math.sin(x * 127.1 + y * 311.7 + (k || 0) * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w || 1, h || 1); }
  function blob(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      c.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }
  function mk(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    return [cv, c];
  }

  /* ---------- fontezinha 3x5 (placas nítidas, sem borrar) ---------- */
  const GLY = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    $: '011110010011110', '!': '010010010000010', '.': '000000000000010', '-': '000000111000000',
    ' ': '000000000000000', '·': '000000010000000', '+': '000010111010000',
  };
  function norm(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
  function textW(s) { return norm(s).length * 4 - 1; }
  function ptext(c, s, x, y, col, shadow) {
    s = norm(s);
    if (shadow) ptext(c, s, x + 1, y + 1, shadow);
    c.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = GLY[s[i]] || GLY[' '];
      for (let k = 0; k < 15; k++) if (g[k] === '1') c.fillRect(x + i * 4 + (k % 3), y + Math.floor(k / 3), 1, 1);
    }
  }
  W0.ptext = ptext; W0.ptextW = textW;

  /* ============================================================
     PERSONAGENS
     ============================================================ */
  const STY = {
    player:   { skin: '#f2c79b', hair: '#4a2e1a', hs: 'short', shirt: '#2f6fd9', trim: '#f2f2f2', sleeve: 'short', pants: '#2e3f6a', shoes: '#f2f2f2' },
    zeca:     { skin: '#c98d5e', hair: '#2a1a10', hs: 'short', hat: 'cap', hatc: '#d9412e', shirt: '#f2cf3a', trim: '#2f8f3e', sleeve: 'short', pants: '#2f5fb5', shorts: true, shoes: 'chinelo' },
    dona:     { skin: '#f0c49a', hair: '#cfcac2', hs: 'bun', shirt: '#d96aa8', dots: '#fff0f6', sleeve: 'short', dress: true, pants: '#d96aa8', shoes: '#6a3a2a' },
    bereba:   { skin: '#8a5a3a', hair: '#1a1008', hs: 'bald', stache: true, shirt: '#f2efe6', sleeve: 'tank', pants: '#4a4a52', shorts: true, shoes: 'chinelo' },
    dudu:     { skin: '#f2c79b', hair: '#1a1a1a', hs: 'short', hat: 'capback', hatc: '#3f7fc9', shirt: '#9a3fc9', trim: '#e8e0ff', sleeve: 'short', pants: '#2a2a34', shoes: '#d9412e' },
    bigode:   { skin: '#d9a07a', hair: '#2a1a10', hs: 'short', hat: 'fedora', hatc: '#2a1a10', band: '#e8b93c', stache: 'big', shirt: '#f2efe6', vest: '#6a2a1a', sleeve: 'long', chain: true, pants: '#2a2228', shoes: '#141014' },
    padre:    { skin: '#f0c49a', hair: '#9a948a', hs: 'short', shirt: '#1c1c24', collar: true, sleeve: 'long', robe: true, pants: '#1c1c24', shoes: '#141014' },
    kombi:    { skin: '#b57a4e', hair: '#2a1a10', hs: 'short', hat: 'cap', hatc: '#3f8a4f', stubble: true, shirt: '#3a6aa8', overall: '#2f5490', sleeve: 'short', pants: '#2f5490', shoes: '#3a2a1a' },
    dete:     { skin: '#e8b48a', hair: '#9a2a1a', hs: 'curly', earring: true, shirt: '#3fb0c9', sleeve: 'short', pants: '#2e2e3a', dress: true, shoes: '#c93f5a' },
    sindico:  { skin: '#f2c79b', hair: '#b5b0a8', hs: 'short', hat: 'tophat', hatc: '#16161c', band: '#c9412e', stache: true, shirt: '#f2efe6', suit: '#5a5a6a', tie: '#c9412e', sleeve: 'long', pants: '#45454f', shoes: '#141014' },
    feira:    { skin: '#c98d5e', hair: '#3a2410', hs: 'short', hat: 'straw', hatc: '#e0c060', shirt: '#c9412e', plaid: '#8a2418', apron: '#f2efe6', sleeve: 'short', pants: '#6a4a2a', shoes: '#3a2a1a' },
    nogueira: { skin: '#f0c49a', hair: '#1e1e1e', hs: 'slick', glasses: true, shirt: '#f2efe6', suit: '#1f2a4a', tie: '#e8b93c', sleeve: 'long', pants: '#1a2238', shoes: '#141014' },
    taxi:     { skin: '#a8703e', hair: '#1a1008', hs: 'short', hat: 'cap', hatc: '#e8c418', shirt: '#f2efe6', stripe: '#e8c418', sleeve: 'short', pants: '#2a2a34', shoes: '#3a2a1a' },
    dj:       { skin: '#6a4028', hair: '#120c08', hs: 'curly', phones: '#e83f8a', shirt: '#1c1c24', print: '#3fe0c9', chain: true, sleeve: 'short', pants: '#3a3a6a', shoes: '#f2f2f2' },
    cotinha:  { skin: '#8a5a3a', hair: '#e8e4dc', hs: 'short', hat: 'scarf', hatc: '#f2efe6', dotc: '#3f6fb5', shirt: '#3f6fb5', dots: '#f2efe6', beads: true, sleeve: 'long', dress: true, robe: true, pants: '#3f6fb5', shoes: '#6a3a2a' },
    lenda:    { skin: '#c98d5e', hair: '#120c08', hs: 'long', shades: true, shirt: '#2f8f4e', stripe: '#f2cf3a', chain: true, sleeve: 'short', pants: '#f2efe6', shoes: '#f2cf3a' },
    /* ---- a turma dos devs (easter eggs) ---- */
    alfonso:  { skin: '#f0c49a', hair: '#141014', hs: 'short', glasses: true, shirt: '#2a2a38', print: '#3fe0a0', sleeve: 'short', pants: '#2e3f6a', shoes: '#f2f2f2', body: 'tall' },
    dimas:    { skin: '#e8b48a', hair: '#141014', hs: 'slick', glasses: true, stubble: true, shirt: '#7a2a3a', trim: '#f2efe6', sleeve: 'long', pants: '#2a2a34', shoes: '#3a2a1a', body: 'tall' },
    prado:    { skin: '#e0a878', hair: '#141014', hs: 'curly', shirt: '#c9412e', print: '#f2cf3a', sleeve: 'short', pants: '#3a3a52', shoes: '#2a2a2e', body: 'chubby' },
    chihiro:  { skin: '#f0c49a', hair: '#1e1a18', hs: 'short', shirt: '#e8803a', stripe: '#fff0d8', sleeve: 'short', pants: '#4a5a3a', shoes: '#f2f2f2', body: 'chubbyMid' },
    martins:  { skin: '#f2c79b', hair: '#3a2410', hs: 'short', hat: 'capback', hatc: '#3fae6a', shirt: '#9ad0f2', print: '#e8508a', sleeve: 'short', pants: '#2e3f6a', shorts: true, shoes: '#e8508a', body: 'short' },
  };
  const OUT = '#170d0f';
  W0.STY = STY;

  /* muda o porte do boneco recortando/duplicando fileiras e colunas:
     tall = mais alto, short = baixinho, chubby = mais largo */
  function reshape(src, body) {
    if (!body) return src;
    const W = src.width, H = src.height;
    let rows = []; for (let y = 0; y < H; y++) rows.push(y);
    let cols = []; for (let x = 0; x < W; x++) cols.push(x);
    const R0 = 1 + OY;                       // fileira 0 do conteúdo
    const dupR = (r) => { const i = rows.indexOf(R0 + r); rows.splice(i, 0, R0 + r); };
    const delR = (r) => { const i = rows.indexOf(R0 + r); if (i >= 0) rows.splice(i, 1); };
    if (body === 'tall') { dupR(9); dupR(14); dupR(10); }
    if (body === 'chubbyMid') { dupR(14); }
    if (body === 'short') { delR(10); delR(14); }
    if (body === 'chubby' || body === 'chubbyMid') { const i = cols.indexOf(7); cols.splice(i, 0, 6, 7); cols.splice(cols.indexOf(4), 0, 4); }
    const [o, oc] = mk(cols.length, rows.length);
    rows.forEach((sy, dy) => cols.forEach((sx, dx) => oc.drawImage(src, sx, sy, 1, 1, dx, dy, 1, 1)));
    return o;
  }
  const OY = 4;                          // folga em cima para chapéus

  function paintSprite(c, st, dir, step, blink) {
    const P = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x + 1, y + 1 + OY, w || 1, h || 1); };
    const skin = st.skin, skD = sh(skin, -0.18), skDD = sh(skin, -0.38);
    const shirt = st.shirt, shL = sh(shirt, 0.18), shD = sh(shirt, -0.22);
    const pants = st.pants, paD = sh(pants, -0.25);
    const side = dir === 'left';
    const up = dir === 'up';

    // ---- pernas e sapatos ----
    const lift = (step === 1) ? 1 : 0, lift2 = (step === 3) ? 1 : 0;
    const legC = st.shorts ? skin : pants;
    const legX = side ? [4, 6] : [3, 6];
    if (!st.robe) {
      // perna esquerda / direita
      P(st.shorts ? pants : pants, legX[0], 13, 3, 1); P(st.shorts ? pants : pants, legX[1], 13, 3, 1);
      P(legC, legX[0], 14, 3, 2 - lift); P(legC, legX[1], 14, 3, 2 - lift2);
      P(st.shorts ? skD : paD, legX[0] + 2, 14, 1, 2 - lift); P(st.shorts ? skD : paD, legX[1] + 2, 14, 1, 2 - lift2);
    } else {
      P(pants, 2, 13, 8, 3); P(sh(pants, -0.2), 8, 13, 2, 3); P(sh(pants, 0.12), 2, 13, 1, 3);
    }
    const shoeC = st.shoes === 'chinelo' ? skin : st.shoes;
    const sx0 = side ? (step === 1 ? 2 : 3) : 2, sx1 = side ? (step === 3 ? 7 : 6) : 6;
    P(shoeC, sx0, 16 - lift, side ? 4 : 4, 1); P(shoeC, sx1, 16 - lift2, side ? 4 : 4, 1);
    if (st.shoes === 'chinelo') { P('#2f8f3e', sx0 + 1, 16 - lift, 2, 1); P('#2f8f3e', sx1 + 1, 16 - lift2, 2, 1); }
    else { P(sh(shoeC, -0.3), sx0, 16 - lift, 1, 1); P(sh(shoeC, -0.3), sx1 + 3, 16 - lift2, 1, 1); }

    // ---- tronco ----
    const body = st.suit || st.vest || st.overall || shirt;
    P(st.suit || st.vest ? body : shirt, 2, 7, 8, 6);
    P(st.suit || st.vest ? sh(body, 0.15) : shL, 2, 7, 1, 6);
    P(st.suit || st.vest ? sh(body, -0.25) : shD, 9, 7, 1, 6);
    if (st.plaid) { for (let y = 7; y < 13; y += 2) P(st.plaid, 2, y, 8, 1); P(st.plaid, 4, 7, 1, 6); P(st.plaid, 7, 7, 1, 6); }
    if (st.stripe) { P(st.stripe, 2, 9, 8, 1); P(st.stripe, 2, 11, 8, 1); }
    if (st.dots) { P(st.dots, 3, 8); P(st.dots, 7, 9); P(st.dots, 5, 11); P(st.dots, 8, 12); }
    if (st.print && !up) { P(st.print, 4, 8, 4, 1); P(st.print, 5, 9, 2, 2); P(sh(st.print, -0.3), 4, 10, 1, 1); }
    if (st.overall && !up) { P(shirt, 3, 7, 1, 1); P(shirt, 8, 7, 1, 1); P(st.overall, 4, 9, 4, 3); P('#e8b93c', 4, 8, 1, 1); P('#e8b93c', 7, 8, 1, 1); }
    if ((st.suit || st.vest) && !up) {
      P(shirt, 5, 7, 2, 4);
      if (st.tie) { P(st.tie, 5, 8, 2, 1); P(st.tie, 5, 9, 2, 3); P(sh(st.tie, -0.3), 6, 9, 1, 3); }
      P(sh(body, -0.35), 4, 7, 1, 3); P(sh(body, -0.35), 7, 7, 1, 3);
    }
    if (st.trim && !up) P(st.trim, 4, 7, 4, 1);
    if (st.collar && !up) P('#f2f2f2', 5, 7, 2, 1);
    if (st.apron && !up) { P(st.apron, 3, 9, 6, 4); P(sh(st.apron, -0.12), 8, 9, 1, 4); P(st.apron, 4, 8, 1, 1); P(st.apron, 7, 8, 1, 1); }
    if (st.chain && !up) { P('#f2cf3a', 4, 8); P('#f2cf3a', 7, 8); P('#f2cf3a', 5, 9, 2, 1); P('#fff6b0', 5, 9); }
    if (st.beads && !up) { P('#c9412e', 4, 8); P('#f2efe6', 5, 9); P('#c9412e', 6, 9); P('#f2efe6', 7, 8); }
    P(sh(pants, -0.1), 2, 12, 8, 1);                 // cinto
    if (!st.dress && !st.robe) P('#2a1e14', 2, 12, 8, 1);
    if (st.dress) { P(shirt, 2, 12, 8, 2); P(shD, 9, 12, 1, 2); P(sh(shirt, -0.3), 2, 14, 8, 1); }

    // ---- braços ----
    const armUp = (step === 1) ? -1 : (step === 3 ? 1 : 0);
    const sleeveC = st.suit || st.vest || shirt;
    const sleeveLen = st.sleeve === 'long' ? 4 : st.sleeve === 'tank' ? 0 : 2;
    const arm = (x, dy) => {
      if (sleeveLen) P(sleeveC, x, 7 + dy, 2, sleeveLen);
      P(skin, x, 7 + dy + sleeveLen, 2, 5 - sleeveLen);
      P(skD, x + 1, 7 + dy + sleeveLen, 1, 5 - sleeveLen);
    };
    if (side) arm(5, armUp);
    else { arm(0, armUp); arm(10, -armUp); }

    // ---- cabeça ----
    P(skin, 2, 0, 8, 7);
    P(skD, 9, 1, 1, 6); P(skD, 2, 6, 8, 1);
    if (!up && !side) { P(skD, 1, 3, 1, 2); P(skD, 10, 3, 1, 2); }  // orelhas
    if (side) P(skD, 6, 3, 1, 2);

    // rosto
    if (!up) {
      const eye = blink ? skDD : '#1a1012';
      if (side) {
        P(eye, 3, 3, 1, blink ? 1 : 2); if (!blink) P('#ffffff', 3, 3);
        P(skD, 1, 4, 1, 1);                               // nariz
        P(skDD, 2, 6 - 1, 2, 1);
        P(mix(skin, '#e86a6a', 0.35), 4, 5);
      } else {
        P(eye, 4, 3, 1, blink ? 1 : 2); P(eye, 7, 3, 1, blink ? 1 : 2);
        if (!blink) { P('#ffffff', 4, 3); P('#ffffff', 7, 3); }
        P(skDD, 5, 5, 2, 1);
        P(mix(skin, '#e86a6a', 0.35), 3, 5); P(mix(skin, '#e86a6a', 0.35), 8, 5);
      }
      if (st.stache) {
        const sc = st.hair === '#b5b0a8' ? '#d8d4cc' : (st.hs === 'bald' ? '#1a1008' : st.hair);
        if (side) P(sc, 1, 5, 3, 1); else { P(sc, 4, 5, 4, 1); if (st.stache === 'big') { P(sc, 3, 5, 1, 2); P(sc, 8, 5, 1, 2); } }
      }
      if (st.stubble) { if (side) P(skD, 1, 6, 4, 1); else P(skD, 3, 6, 6, 1); }
      if (st.glasses) {
        const gf = '#1a1a22';
        if (side) { P(gf, 2, 3, 4, 1); P(gf, 2, 4); P(gf, 4, 4); P('#1a1012', 3, 4); P(gf, 6, 3, 2, 1); }
        else { P(gf, 3, 3, 6, 1); P(gf, 3, 4); P(gf, 5, 4); P(gf, 6, 4); P(gf, 8, 4); P('#1a1012', 4, 4); P('#1a1012', 7, 4); }
      }
      if (st.shades) { if (side) P('#101014', 2, 3, 3, 2); else { P('#101014', 3, 3, 6, 2); P('#4a4a5a', 4, 3); P('#4a4a5a', 7, 3); } }
      if (st.earring && !side) { P('#f2cf3a', 1, 5); P('#f2cf3a', 10, 5); }
    }

    // cabelo
    const hc = st.hair, hcL = sh(hc, 0.22), hcD = sh(hc, -0.3);
    if (st.hs !== 'bald') {
      if (up) {
        P(hc, 2, 0, 8, 6); P(hcD, 2, 5, 8, 1); P(hcL, 3, 1, 3, 1);
        if (st.hs === 'long') P(hc, 2, 6, 8, 3);
      } else if (side) {
        P(hc, 2, 0, 8, 2); P(hc, 5, 2, 5, 2); P(hc, 7, 4, 3, 2); P(hcL, 3, 0, 4, 1);
        if (st.hs === 'long') P(hc, 6, 4, 4, 5);
        if (st.hs === 'curly') { P(hc, 1, 1, 1, 1); P(hc, 10, 1, 1, 2); }
      } else {
        P(hc, 2, 0, 8, 2); P(hc, 2, 2, 1, 2); P(hc, 9, 2, 1, 2); P(hcL, 3, 0, 4, 1);
        if (st.hs === 'slick') { P(hcL, 3, 1, 5, 1); P(hc, 6, 2, 3, 1); }
        if (st.hs === 'long') { P(hc, 1, 2, 1, 7); P(hc, 10, 2, 1, 7); }
        if (st.hs === 'curly') { P(hc, 1, 0, 1, 4); P(hc, 10, 0, 1, 4); P(hc, 2, -1, 3, 1); P(hc, 6, -1, 3, 1); P(hcD, 5, 1); P(hcD, 8, 0); P(hcD, 3, 1); P(hcL, 2, -1); P(hcL, 7, -1); P(hcL, 9, 1); P(hcL, 1, 2); P(hcD, 10, 3); }
      }
      if (st.hs === 'bun') { P(hc, 4, -2, 4, 2); P(hcL, 5, -2, 2, 1); P(hcD, 4, -1, 4, 1); }
    } else {
      P(sh(skin, 0.25), 4, 0, 2, 1);                      // brilho da careca
    }

    // chapéus
    if (st.hat) {
      const k = st.hatc, kL = sh(k, 0.2), kD = sh(k, -0.3);
      if (st.hat === 'cap' || st.hat === 'capback') {
        P(k, 2, -1, 8, 3); P(kL, 3, -1, 3, 1); P(kD, 2, 1, 8, 1);
        P('#ffffff', 5, -1, 2, 1);
        const back = st.hat === 'capback';
        if (side) { if (back) P(kD, 9, 1, 3, 1); else P(kD, 0, 1, 3, 1); }
        else if (!up && !back) P(kD, 3, 2, 6, 1);
        else if (up && back) P(kD, 3, 2, 6, 1);
      } else if (st.hat === 'fedora' || st.hat === 'straw') {
        P(k, 3, -2, 6, 3); P(kL, 4, -2, 2, 1); P(kD, 0, 1, 12, 1); P(k, 1, 1, 10, 1);
        if (st.band) P(st.band, 3, 0, 6, 1);
        if (st.hat === 'straw') { P(kD, 4, -1); P(kD, 7, -1); P(kD, 2, 1); P(kD, 9, 1); P('#c9412e', 3, 0, 6, 1); }
      } else if (st.hat === 'tophat') {
        P(k, 3, -4, 6, 5); P(kL, 4, -4, 1, 4); P(st.band, 3, -1, 6, 1); P(k, 1, 1, 10, 1);
      } else if (st.hat === 'scarf') {
        P(k, 2, -1, 8, 3); P(k, 1, 1, 1, 5); P(k, 10, 1, 1, 5); P(sh(k, -0.15), 2, 1, 8, 1);
        P(st.dotc, 3, -1); P(st.dotc, 6, 0); P(st.dotc, 8, -1); P(st.dotc, 1, 3); P(st.dotc, 10, 4);
        if (side) P(k, 6, 2, 4, 4);
      }
    }
    if (st.phones) {
      P('#1c1c24', 2, -1, 8, 1);
      if (side) { P(st.phones, 5, 2, 3, 3); P(sh(st.phones, 0.3), 5, 2, 1, 1); }
      else { P(st.phones, 0, 2, 2, 3); P(st.phones, 10, 2, 2, 3); }
    }
  }

  const spriteCache = {};
  function sprite(id, dir, step, blink) {
    const key = id + '|' + dir + '|' + step + '|' + (blink ? 1 : 0);
    if (spriteCache[key]) return spriteCache[key];
    const st = STY[id] || STY.player;
    const flip = dir === 'right';
    const d = flip ? 'left' : dir;
    const [a0, ac] = mk(14, 18 + OY + 2);
    paintSprite(ac, st, d, step, blink);
    const a = reshape(a0, st.body);
    const SW = a.width, SH = a.height;
    // contorno: silhueta escura nas 4 direções
    const [o, oc] = mk(SW, SH);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) oc.drawImage(a, dx, dy);
    oc.globalCompositeOperation = 'source-in';
    oc.fillStyle = OUT; oc.fillRect(0, 0, SW, SH);
    oc.globalCompositeOperation = 'source-over';
    oc.drawImage(a, 0, 0);
    let out = o;
    if (flip) {
      const [f, fc] = mk(SW, SH);
      fc.translate(SW, 0); fc.scale(-1, 1); fc.drawImage(o, 0, 0);
      out = f;
    }
    spriteCache[key] = out;
    return out;
  }

  function shadow(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x + 1, y, w - 2, 1);
    ctx.fillRect(x, y + 1, w, 2);
    ctx.fillRect(x + 1, y + 3, w - 2, 1);
  }

  // x,y = canto superior esquerdo do corpo (12x17); pés em y+17
  function drawChar(ctx, id, x, y, dir, step, blink) {
    const sp = sprite(id, dir, step, blink);
    const ex = (sp.width - 14) / 2, ey = sp.height - 24;
    shadow(ctx, x - ex, y + 15, 12 + ex * 2);
    ctx.drawImage(sp, Math.round(x - 1 - ex), y - 1 - OY - ey);
  }
  W0.drawChar = drawChar;

  /* ============================================================
     CIDADE — camada estática
     ============================================================ */
  const H_ROADS = [6, 18, 28, 38, 48, 58, 70, 80, 90];
  const V_ROADS = [8, 22, 36, 52, 64];
  const GRASS = {
    vila:   ['#3f8f3f', '#4a9c45', '#357f36', '#5aae4f'],
    centro: ['#3a8550', '#45925b', '#31763f', '#56a565'],
    morro:  ['#6a8a3a', '#789a44', '#5a7832', '#8aac50'],
  };
  const FLOWERS = ['#f2e14a', '#ff7aa8', '#ffffff', '#b48aff', '#ff8a3a', '#7ad0ff'];

  function zoneOfRow(ty) { return W0.zoneAt(ty).id; }

  function grass(c, x, y, sx, sy, zid) {
    const p = GRASS[zid] || GRASS.vila;
    R(c, p[0], sx, sy, TS, TS);
    for (let i = 0; i < 10; i++) {
      const a = h3(x, y, i), b = h3(x, y, i + 30);
      R(c, a > 0.5 ? p[1] : p[2], sx + Math.floor(a * 16), sy + Math.floor(b * 16), 2, 1);
    }
    for (let i = 0; i < 4; i++) {                         // tufinhos
      const a = h3(x, y, i + 60), b = h3(x, y, i + 90);
      const gx = sx + 1 + Math.floor(a * 13), gy = sy + 2 + Math.floor(b * 12);
      R(c, p[2], gx, gy + 1, 1, 2); R(c, p[3], gx + 1, gy, 1, 2); R(c, p[2], gx + 2, gy + 1, 1, 2);
    }
    if (zid === 'morro' && h3(x, y, 5) > 0.82) {          // terrão batido
      blob(c, sx + 8, sy + 9, 4, '#8a6a42'); blob(c, sx + 7, sy + 8, 2, '#9a7a4e');
      R(c, '#6a4e30', sx + 9, sy + 11, 2, 1);
    }
    const f = h3(x, y, 7);
    if (f > 0.84) {                                       // florzinha
      const col = FLOWERS[Math.floor(h3(x, y, 8) * FLOWERS.length)];
      const fx = sx + 3 + Math.floor(h3(x, y, 9) * 9), fy = sy + 3 + Math.floor(h3(x, y, 10) * 9);
      R(c, sh(p[2], -0.2), fx, fy + 2, 1, 2);
      R(c, col, fx - 1, fy); R(c, col, fx + 1, fy); R(c, col, fx, fy - 1); R(c, col, fx, fy + 1);
      R(c, '#ffe08a', fx, fy);
      if (f > 0.93) { R(c, col, fx + 4, fy + 3); R(c, col, fx + 6, fy + 3); R(c, col, fx + 5, fy + 2); R(c, '#ffe08a', fx + 5, fy + 3); }
    } else if (f < 0.05) {
      R(c, '#9a9488', sx + 6, sy + 10, 3, 2); R(c, '#c9c2b4', sx + 6, sy + 10, 2, 1);
    }
  }

  function isRoad(m, x, y) { return m[y] && (m[y][x] === 1 || m[y][x] === 9); }

  function road(c, m, x, y, sx, sy) {
    R(c, '#4a4a54', sx, sy, TS, TS);
    for (let i = 0; i < 9; i++) {
      const a = h3(x, y, i + 3), b = h3(x, y, i + 44);
      R(c, a > 0.5 ? '#55555f' : '#3f3f48', sx + Math.floor(a * 16), sy + Math.floor(b * 16));
    }
    if (h3(x, y, 77) > 0.93) { R(c, '#3a3a42', sx + 3, sy + 6, 5, 1); R(c, '#3a3a42', sx + 7, sy + 7, 3, 1); }  // rachadura
    const hR = H_ROADS.includes(y) || H_ROADS.includes(y - 1);
    const vR = V_ROADS.includes(x) || V_ROADS.includes(x - 1);
    const inter = hR && vR;
    // faixa amarela no meio
    if (!inter) {
      if (hR && H_ROADS.includes(y) && x % 2 === 0) R(c, '#e8c94a', sx + 3, sy + 15, 10, 1);
      if (hR && H_ROADS.includes(y - 1) && x % 2 === 0) R(c, '#e8c94a', sx + 3, sy, 10, 1);
      if (vR && V_ROADS.includes(x) && y % 2 === 0) R(c, '#e8c94a', sx + 15, sy + 3, 1, 10);
      if (vR && V_ROADS.includes(x - 1) && y % 2 === 0) R(c, '#e8c94a', sx, sy + 3, 1, 10);
    }
    // faixa de pedestre perto dos cruzamentos
    if (hR && !vR && (V_ROADS.includes(x + 1) || V_ROADS.includes(x - 2))) {
      for (let k = 1; k < 16; k += 4) R(c, '#e8e4da', sx + 4, sy + k, 8, 2);
    }
    if (vR && !hR && (H_ROADS.includes(y + 1) || H_ROADS.includes(y - 2))) {
      for (let k = 1; k < 16; k += 4) R(c, '#e8e4da', sx + k, sy + 4, 2, 8);
    }
    if (h3(x, y, 91) > 0.975 && !inter) {                // bueiro
      blob(c, sx + 8, sy + 8, 3, '#2e2e34'); R(c, '#55555f', sx + 6, sy + 8, 5, 1); R(c, '#55555f', sx + 8, sy + 6, 1, 5);
    }
    // calçada com meio-fio onde a rua acaba
    const edge = (dx, dy) => !isRoad(m, x + dx, y + dy) && m[y + dy] && m[y + dy][x + dx] !== undefined && m[y + dy][x + dx] !== 7;
    const side = (rx, ry, rw, rh, cx, cy, cw, chh) => {
      R(c, '#b9b1a1', rx, ry, rw, rh);
      for (let k = 0; k < Math.max(rw, rh); k += 4) {
        if (rw > rh) R(c, '#a39b8b', rx + k, ry, 1, rh); else R(c, '#a39b8b', rx, ry + k, rw, 1);
      }
      R(c, '#ddd6c6', cx, cy, cw, chh);
    };
    if (edge(0, -1)) { side(sx, sy, 16, 4, sx, sy + 4, 16, 1); R(c, '#2e2e36', sx, sy + 5, 16, 1); }
    if (edge(0, 1)) { side(sx, sy + 12, 16, 4, sx, sy + 11, 16, 1); }
    if (edge(-1, 0)) { side(sx, sy, 4, 16, sx + 4, sy, 1, 16); R(c, '#2e2e36', sx + 5, sy, 1, 16); }
    if (edge(1, 0)) { side(sx + 12, sy, 4, 16, sx + 11, sy, 1, 16); }
  }

  function praca(c, x, y, sx, sy) {
    // calçadão de pedra portuguesa em ondas
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
      const gx = x * TS + px, gy = y * TS + py;
      const wv = (gy + Math.round(3 * Math.sin(gx / 4))) % 10;
      c.fillStyle = wv < 3 ? '#2e2a26' : (h3(gx, gy, 1) > 0.85 ? '#d8d0bc' : '#ebe4d2');
      c.fillRect(sx + px, sy + py, 1, 1);
    }
  }

  function tree(c, x, y, sx, sy, zid) {
    const v = h3(x, y, 21);
    // sombra
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(sx + 2, sy + 13, 12, 2); c.fillRect(sx + 4, sy + 15, 8, 1);
    if (v < 0.5) {                                         // árvore redonda
      R(c, '#5a3a1e', sx + 7, sy + 8, 3, 7); R(c, '#3e2814', sx + 9, sy + 8, 1, 7); R(c, '#7a5230', sx + 7, sy + 9, 1, 4);
      const g = zid === 'morro' ? ['#2e5a26', '#3e7430', '#58923e', '#7ab050'] : ['#1e5c2a', '#2f7a36', '#45a04a', '#6fc260'];
      blob(c, sx + 8, sy + 3, 7, OUT);
      blob(c, sx + 8, sy + 3, 6, g[0]);
      blob(c, sx + 7, sy + 2, 5, g[1]);
      blob(c, sx + 6, sy + 1, 3, g[2]);
      R(c, g[3], sx + 4, sy - 1, 2, 1); R(c, g[3], sx + 5, sy - 2, 2, 1); R(c, g[3], sx + 9, sy + 1, 1, 1);
      R(c, g[0], sx + 10, sy + 5, 2, 1); R(c, g[0], sx + 3, sy + 6, 2, 1);
      if (h3(x, y, 22) > 0.6) { R(c, '#f2a03a', sx + 10, sy + 3, 2, 2); R(c, '#f2a03a', sx + 5, sy + 6, 2, 2); R(c, '#ffd08a', sx + 10, sy + 3); }
    } else if (v < 0.68) {                                 // coqueiro
      const tx = sx + 8;
      for (let k = 0; k < 11; k++) {
        const ox = Math.round(Math.sin(k / 4) * 2);
        R(c, k % 3 === 0 ? '#8a6a3a' : '#a8844a', tx + ox, sy + 14 - k, 2, 1);
      }
      const top = sy + 3, cx = tx + 2;
      const fr = [[-6, 2], [-5, -1], [-2, -3], [2, -3], [5, -1], [6, 2], [0, -4]];
      for (const [dx, dy] of fr) {
        for (let t = 0; t <= 6; t++) {
          const px = Math.round(cx + dx * t / 6), py = Math.round(top + dy * t / 6 + (t * t) / 14);
          R(c, t > 4 ? '#58b04a' : '#2f8a36', px, py, 2, 1);
        }
      }
      R(c, '#6a4a22', cx - 1, top + 1, 2, 2); R(c, '#6a4a22', cx + 1, top + 2, 2, 2);
    } else if (v < 0.86) {                                 // arbusto florido
      blob(c, sx + 8, sy + 10, 5, OUT);
      blob(c, sx + 8, sy + 10, 4, '#2f7a36');
      blob(c, sx + 7, sy + 9, 3, '#45a04a');
      const col = FLOWERS[Math.floor(h3(x, y, 23) * 5)];
      R(c, col, sx + 5, sy + 8); R(c, col, sx + 9, sy + 7); R(c, col, sx + 10, sy + 11); R(c, col, sx + 6, sy + 12); R(c, '#ffffff', sx + 8, sy + 9);
    } else {                                               // ipê florido
      R(c, '#5a3a1e', sx + 7, sy + 8, 3, 7); R(c, '#3e2814', sx + 9, sy + 8, 1, 7);
      const pink = h3(x, y, 24) > 0.5;
      const g = pink ? ['#a8306a', '#d0508a', '#f080b0', '#ffc0dc'] : ['#b58a10', '#e0b020', '#f8d040', '#fff0a0'];
      blob(c, sx + 8, sy + 3, 7, OUT);
      blob(c, sx + 8, sy + 3, 6, g[0]);
      blob(c, sx + 7, sy + 2, 5, g[1]);
      blob(c, sx + 6, sy + 1, 3, g[2]);
      R(c, g[3], sx + 4, sy - 1, 2, 1); R(c, g[3], sx + 9, sy + 1, 1, 1); R(c, g[3], sx + 6, sy + 4, 1, 1);
      R(c, g[1], sx + 2, sy + 14); R(c, g[2], sx + 13, sy + 13); R(c, g[1], sx + 11, sy + 15);   // pétalas caídas
    }
  }

  function wall(c, x, y, sx, sy, top) {
    R(c, '#5e4c3c', sx, sy, TS, TS);
    for (let row = 0; row < 4; row++) {
      const off = (row + y * 4) % 2 ? 4 : 0;
      for (let bx = -off; bx < TS; bx += 8) {
        const k = h3(x * 4 + bx, y * 4 + row, 2);
        const col = k > 0.66 ? '#b0603f' : k > 0.33 ? '#a0523a' : '#8f4632';
        const x0 = Math.max(0, bx), x1 = Math.min(TS, bx + 7);
        if (x1 > x0) { R(c, col, sx + x0, sy + row * 4, x1 - x0, 3); R(c, sh(col, 0.15), sx + x0, sy + row * 4, x1 - x0, 1); }
      }
    }
    if (top) { R(c, '#a8a296', sx, sy, TS, 3); R(c, '#c9c2b4', sx, sy, TS, 1); R(c, '#6e685e', sx, sy + 3, TS, 1); }
    if (h3(x, y, 31) > 0.7) { R(c, '#4f7a2f', sx + 2, sy + 3, 3, 1); R(c, '#5f8f3a', sx + 3, sy + 4, 1, 2); }  // musgo
    if (!top && h3(x, y, 32) > 0.86) {                   // pichação
      const col = ['#ff5aa0', '#5ad0ff', '#f2e14a', '#9aff5a'][Math.floor(h3(x, y, 33) * 4)];
      R(c, col, sx + 3, sy + 5, 1, 4); R(c, col, sx + 4, sy + 5, 3, 1); R(c, col, sx + 6, sy + 6, 1, 2); R(c, col, sx + 4, sy + 8, 3, 1);
      R(c, col, sx + 9, sy + 5, 1, 4); R(c, col, sx + 11, sy + 5, 1, 4); R(c, col, sx + 10, sy + 7);
    }
  }

  /* ---------- prédios ---------- */
  const BSTY = {
    boteco:    { roof: 'clay', sign: 'BOTECO', signC: '#c9412e', signT: '#ffe08a', awning: ['#c9412e', '#f2efe6'], brick: true, chimney: true, crates: true },
    mercado:   { roof: 'clay', sign: 'MERCADO', signC: '#2f7a3a', signT: '#f2efe6', awning: ['#2f8f3e', '#f2efe6'], fruit: true },
    mercado2:  { roof: 'flat', sign: 'MERCADO', signC: '#2f7a3a', signT: '#f2efe6', awning: ['#2f8f3e', '#f2efe6'], fruit: true, tank: true },
    mercado3:  { roof: 'clay', sign: 'MERCADO', signC: '#2f7a3a', signT: '#f2efe6', awning: ['#e8a03a', '#f2efe6'], fruit: true },
    fliperama: { roof: 'flat', neon: 'FLIPER', antenna: true, dark: true },
    oficina:   { roof: 'metal', sign: 'OFICINA', signC: '#2e3a3a', signT: '#f2cf3a', garage: true, tires: true },
    igreja:    { roof: 'clay', church: true, stained: true },
    loterica:  { roof: 'flat', sign: 'LOTERICA', signC: '#1f5aa8', signT: '#f2cf3a', awning: ['#1f5aa8', '#f2cf3a'], tank: true },
    predio:    { roof: 'flat', tank: true, antenna: true, floors: true, laundry: true },
    clube:     { roof: 'clay', sign: 'CLUBE', signC: '#1c3a24', signT: '#e8b93c', columns: true },
    baile:     { roof: 'flat', neon: 'BAILE', lights: true, speakers: true },
    casa:      { roof: 'clay', fence: true, shutters: '#3f7fc9', garden: true, chimney: true },
    arena:     { roof: 'dome', sign: 'ARENA', signC: '#101014', signT: '#e8b93c', spots: true },
  };

  function roofRows(b) { return Math.max(2, b.h - 3); }

  function building(c, b) {
    const st = BSTY[b.name] || { roof: 'clay' };
    const X = b.x * TS, Y = b.y * TS, Wd = b.w * TS, Ht = b.h * TS;
    const rr = roofRows(b) * TS;                        // altura do telhado
    const fy = Y + rr, fh = Ht - rr;                    // fachada
    const fc = b.c, fL = sh(fc, 0.14), fD = sh(fc, -0.22);

    // sombra projetada
    c.fillStyle = 'rgba(0,0,0,0.30)'; c.fillRect(X + 4, Y + 6, Wd, Ht);

    // ---- fachada ----
    R(c, fc, X, fy, Wd, fh);
    if (st.brick) {
      for (let yy = 0; yy < fh - 6; yy += 4) for (let xx = (yy / 4) % 2 ? -4 : 0; xx < Wd; xx += 8) {
        R(c, h3(xx, yy, b.x) > 0.5 ? fL : sh(fc, 0.05), X + Math.max(0, xx), fy + yy, Math.min(7, Wd - xx), 3);
      }
    } else {
      for (let i = 0; i < Wd * fh / 40; i++) R(c, h3(i, b.x, 3) > 0.5 ? fL : sh(fc, -0.06), X + Math.floor(h3(i, b.y, 4) * Wd), fy + Math.floor(h3(i, b.x, 5) * fh));
    }
    R(c, fL, X, fy, 2, fh); R(c, fD, X + Wd - 2, fy, 2, fh);
    R(c, sh(fc, -0.35), X, fy + fh - 4, Wd, 4);          // rodapé
    R(c, sh(fc, -0.5), X, fy + fh - 1, Wd, 1);

    if (st.columns) for (let xx = X + 6; xx < X + Wd - 6; xx += 20) { R(c, '#f2efe6', xx, fy + 2, 4, fh - 6); R(c, '#c9c4b4', xx + 3, fy + 2, 1, fh - 6); R(c, '#ffffff', xx - 1, fy + 2, 6, 2); }

    // ---- janelas ----
    const doorX = b.door.x * TS;
    const winRows = st.floors ? 1 : 1;
    const wy = fy + 8;
    for (let wx = X + 6; wx + 10 <= X + Wd - 4; wx += 16) {
      if (Math.abs(wx + 5 - (doorX + 8)) < 16) continue;
      if (st.columns && (wx - X) % 20 < 6) continue;
      if (st.garage) continue;
      window_(c, wx, wy, st, h3(wx, wy, 1));
    }
    if (st.garage) {                                      // portão de enrolar
      const gx = X + 6, gw = Math.min(28, doorX - X - 10);
      if (gw > 10) {
        R(c, '#6a7a7a', gx, fy + 6, gw, fh - 10);
        for (let k = 0; k < fh - 10; k += 3) R(c, '#55605f', gx, fy + 6 + k, gw, 1);
        R(c, '#f2cf3a', gx, fy + 6, gw, 2); for (let k = 0; k < gw; k += 4) R(c, '#1a1a1a', gx + k, fy + 6, 2, 2);
      }
    }

    // ---- porta ----
    const dx = doorX + 2, dy = fy + fh - 22;
    R(c, sh(fc, -0.45), dx - 1, dy - 1, 14, 22);
    R(c, st.church ? '#6a3a1e' : '#7a4a26', dx, dy, 12, 21);
    R(c, '#8f5a30', dx + 1, dy + 1, 4, 8); R(c, '#8f5a30', dx + 7, dy + 1, 4, 8);
    R(c, '#8f5a30', dx + 1, dy + 11, 4, 8); R(c, '#8f5a30', dx + 7, dy + 11, 4, 8);
    R(c, '#5a3418', dx + 6, dy, 1, 21);
    R(c, '#f2cf3a', dx + 9, dy + 10, 1, 2);
    if (st.church) { R(c, '#6a3a1e', dx + 2, dy - 3, 8, 3); R(c, '#6a3a1e', dx + 4, dy - 5, 4, 2); }
    // degrau
    R(c, '#a8a296', dx - 3, Y + Ht, 18, 3); R(c, '#c9c2b4', dx - 3, Y + Ht, 18, 1);

    // ---- toldo listrado ----
    if (st.awning) {
      const ax = dx - 10, aw = 32, ay = dy - 8;
      for (let k = 0; k < aw; k += 4) R(c, (k / 4) % 2 ? st.awning[1] : st.awning[0], ax + k, ay, 4, 6);
      for (let k = 0; k < aw; k += 4) { R(c, (k / 4) % 2 ? st.awning[1] : st.awning[0], ax + k + 1, ay + 6, 2, 1); }
      R(c, 'rgba(0,0,0,0.25)', ax, ay + 7, aw, 2);
      R(c, sh(st.awning[0], -0.35), ax, ay, aw, 1);
    }

    // ---- telhado ----
    const roofC = b.roof;
    if (st.roof === 'clay' || st.roof === 'dome') {
      R(c, sh(roofC, -0.4), X - 3, Y - 4, Wd + 6, rr + 6);
      for (let ry = 0; ry < rr + 2; ry += 4) {
        R(c, ry % 8 ? roofC : sh(roofC, 0.08), X - 2, Y - 3 + ry, Wd + 4, 4);
        for (let rx = ((ry / 4) % 2) * 3; rx < Wd + 4; rx += 6) {
          R(c, sh(roofC, -0.3), X - 2 + rx, Y - 3 + ry + 3, 5, 1);
          R(c, sh(roofC, 0.25), X - 2 + rx + 1, Y - 3 + ry, 3, 1);
        }
      }
      R(c, sh(roofC, -0.45), X - 2, Y - 3 + Math.floor(rr / 2), Wd + 4, 2);   // cumeeira
      R(c, sh(roofC, 0.3), X - 2, Y - 4 + Math.floor(rr / 2), Wd + 4, 1);
      if (st.roof === 'dome') {
        blob(c, X + Wd / 2, Y + rr / 2, Math.min(Wd, rr) / 2 - 3, '#2a2a3a');
        blob(c, X + Wd / 2 - 3, Y + rr / 2 - 3, Math.min(Wd, rr) / 4, '#4a4a64');
        R(c, '#e8b93c', X + Wd / 2 - 1, Y + 1, 2, rr - 4);
      }
    } else if (st.roof === 'flat') {
      R(c, sh(roofC, -0.4), X - 2, Y - 3, Wd + 4, rr + 4);
      R(c, roofC, X, Y - 1, Wd, rr);
      for (let i = 0; i < Wd * rr / 30; i++) R(c, sh(roofC, h3(i, b.x, 9) > 0.5 ? 0.08 : -0.08), X + Math.floor(h3(i, b.x, 7) * Wd), Y - 1 + Math.floor(h3(i, b.y, 8) * rr), 2, 1);
      R(c, sh(roofC, 0.25), X - 2, Y - 3, Wd + 4, 2);   // platibanda
      R(c, sh(roofC, -0.3), X, Y + rr - 3, Wd, 2);
    } else if (st.roof === 'metal') {
      R(c, sh(roofC, -0.4), X - 2, Y - 3, Wd + 4, rr + 4);
      for (let rx = 0; rx < Wd + 2; rx += 3) { R(c, '#8a9a9a', X - 1 + rx, Y - 2, 2, rr + 1); R(c, '#6a7878', X + 1 + rx, Y - 2, 1, rr + 1); }
      R(c, '#a85a3a', X + 6, Y + 2, 4, 3); R(c, '#a85a3a', X + Wd - 14, Y + rr - 8, 5, 2);   // ferrugem
    }
    R(c, 'rgba(0,0,0,0.35)', X, fy, Wd, 3);             // beiral fazendo sombra

    // extras de telhado
    if (st.tank) {                                        // caixa d'água azul
      const tx = X + Wd - 16, ty = Y + 2;
      R(c, OUT, tx - 1, ty - 1, 12, 12); R(c, '#2f6fb5', tx, ty, 10, 10); R(c, '#4f8fd5', tx, ty, 10, 3); R(c, '#1f4f85', tx + 8, ty, 2, 10);
      R(c, '#9fd3f2', tx + 2, ty + 1, 3, 1);
    }
    if (st.antenna) {
      const ax = X + 8, ay = Y + 2;
      R(c, '#9a9a9a', ax + 3, ay, 1, 9); R(c, '#bdbdbd', ax, ay + 2, 7, 1); R(c, '#bdbdbd', ax + 1, ay + 5, 5, 1);
    }
    if (st.chimney) {
      const cx = X + Wd - 12, cy = Y - 2;
      R(c, OUT, cx - 1, cy - 1, 8, 12); R(c, '#8f4632', cx, cy, 6, 10); R(c, '#b0603f', cx, cy, 6, 2); R(c, '#2a1a10', cx + 1, cy, 4, 1);
    }
    if (st.church) {                                      // torre do sino
      const tw = 16, tx = X + Wd / 2 - tw / 2, ty = Y - 18;
      R(c, OUT, tx - 1, ty - 1, tw + 2, rr + 20);
      R(c, '#e8e2d2', tx, ty, tw, rr + 18); R(c, '#c9c2b0', tx + tw - 2, ty, 2, rr + 18);
      R(c, '#3a2a1a', tx + 4, ty + 6, 8, 8); blob(c, tx + 8, ty + 6, 4, '#3a2a1a');
      R(c, '#e8b93c', tx + 6, ty + 9, 4, 4); R(c, '#fff0a0', tx + 6, ty + 9, 1, 1);
      R(c, '#7a8a9a', tx - 2, ty - 4, tw + 4, 4); R(c, '#9aaaba', tx - 2, ty - 4, tw + 4, 1);
      R(c, '#e8b93c', tx + 7, ty - 14, 2, 10); R(c, '#e8b93c', tx + 4, ty - 11, 8, 2);
    }
    if (st.floors) {                                      // prédio: mais andares
      for (let fl = 0; fl < 2; fl++) for (let wx = X + 5; wx + 9 <= X + Wd - 3; wx += 12) {
        const wy2 = Y + 3 + fl * 12;
        if (wy2 + 9 > fy - 2) continue;
        window_(c, wx, wy2, { small: true }, h3(wx, wy2, 4));
        if (st.laundry && fl === 1 && wx < X + 20) { R(c, '#d0d0d0', wx - 2, wy2 + 9, 14, 1); R(c, '#e83f5a', wx, wy2 + 10, 3, 3); R(c, '#3f9ce8', wx + 5, wy2 + 10, 3, 4); R(c, '#f2cf3a', wx + 9, wy2 + 10, 2, 3); }
      }
    }

    // placa
    if (st.sign) {
      const tw = textW(st.sign) + 6, tx = Math.round(X + Wd / 2 - tw / 2), ty = fy - 4;
      R(c, OUT, tx - 1, ty - 1, tw + 2, 11);
      R(c, st.signC, tx, ty, tw, 9); R(c, sh(st.signC, 0.2), tx, ty, tw, 1); R(c, sh(st.signC, -0.3), tx, ty + 8, tw, 1);
      ptext(c, st.sign, tx + 3, ty + 2, st.signT, sh(st.signC, -0.45));
    }

    // ---- detalhes no chão em frente ----
    const gy = Y + Ht;
    if (st.crates) {                                      // engradados e mesinha de plástico
      const kx = dx + 16;
      for (const [ox, oy] of [[0, 0], [7, 0], [3, -5]]) { R(c, OUT, kx + ox - 1, gy - 7 + oy - 1, 8, 7); R(c, '#f2cf3a', kx + ox, gy - 7 + oy, 6, 5); R(c, '#c9a020', kx + ox, gy - 5 + oy, 6, 1); R(c, '#6a4a1a', kx + ox + 1, gy - 7 + oy, 1, 1); R(c, '#6a4a1a', kx + ox + 4, gy - 7 + oy, 1, 1); }
      const mx = dx - 20;
      R(c, '#c9412e', mx, gy + 4, 10, 2); R(c, '#a8301e', mx + 1, gy + 6, 1, 4); R(c, '#a8301e', mx + 8, gy + 6, 1, 4);
      R(c, '#7a4a1a', mx + 3, gy + 1, 2, 3); R(c, '#e8e0cc', mx + 6, gy + 2, 2, 2);
    }
    if (st.fruit) {
      const kx = dx + 15;
      for (let k = 0; k < 2; k++) {
        const fx = kx + k * 8;
        R(c, OUT, fx - 1, gy - 8, 8, 8); R(c, '#9a6a3a', fx, gy - 7, 6, 6); R(c, '#7a4a22', fx, gy - 4, 6, 1);
        const col = k ? '#f2a03a' : '#d9412e';
        for (let q = 0; q < 3; q++) R(c, col, fx + q * 2, gy - 9, 2, 2);
        R(c, '#ffffff', fx + 1, gy - 9);
      }
      const bx = dx - 16; R(c, OUT, bx - 1, gy - 8, 9, 8); R(c, '#9a6a3a', bx, gy - 7, 7, 6); R(c, '#f2e14a', bx, gy - 9, 7, 2); R(c, '#58b04a', bx + 2, gy - 10, 3, 1);
    }
    if (st.tires) { const tx = X + Wd - 12; for (let k = 0; k < 3; k++) { R(c, OUT, tx - 1, gy - 4 - k * 3, 10, 4); R(c, '#2a2a2e', tx, gy - 3 - k * 3, 8, 2); R(c, '#55555f', tx + 3, gy - 3 - k * 3, 2, 1); } }
    if (st.fence) {
      for (let k = X - 4; k < X + Wd + 4; k += 4) {
        if (Math.abs(k - doorX - 4) < 10) continue;
        R(c, OUT, k - 1, gy + 1, 4, 9); R(c, '#f2efe6', k, gy + 2, 2, 7); R(c, '#c9c4b4', k + 1, gy + 2, 1, 7);
      }
      R(c, '#f2efe6', X - 4, gy + 5, Wd + 8, 1);
    }
    if (st.garden) { for (let k = 0; k < 5; k++) { const col = FLOWERS[k]; R(c, '#2f7a36', X + 4 + k * 5, gy - 3, 3, 3); R(c, col, X + 5 + k * 5, gy - 4); } }
    if (st.speakers) { for (const sx of [X + 2, X + Wd - 10]) { R(c, OUT, sx - 1, gy - 15, 10, 15); R(c, '#1c1c24', sx, gy - 14, 8, 13); blob(c, sx + 4, gy - 10, 2, '#4a4a5a'); blob(c, sx + 4, gy - 4, 2, '#4a4a5a'); R(c, '#9a9aaa', sx + 4, gy - 10); } }
  }

  function window_(c, x, y, st, k) {
    const w = st.small ? 8 : 10, h = st.small ? 8 : 10;
    const lit = k > 0.55;
    R(c, OUT, x - 1, y - 1, w + 2, h + 3);
    R(c, '#e8e0cc', x, y, w, h);
    if (st.stained) {
      const cs = ['#c9412e', '#2f6fb5', '#f2cf3a', '#2f8f3e'];
      for (let i = 0; i < 4; i++) R(c, cs[i], x + 1 + (i % 2) * 4, y + 1 + Math.floor(i / 2) * 4, 4, 4);
      blob(c, x + w / 2, y + 1, w / 2 - 1, '#c9412e');
      R(c, '#3a2a1a', x + w / 2, y, 1, h); R(c, '#3a2a1a', x, y + h / 2, w, 1);
    } else {
      const g = lit ? '#ffd870' : (st.dark ? '#2a1a4a' : '#2b4a6a');
      R(c, g, x + 1, y + 1, w - 2, h - 2);
      if (lit) { R(c, '#fff0b0', x + 1, y + 1, w - 2, 2); R(c, '#e8a840', x + 1, y + h - 3, w - 2, 2); }
      else { R(c, '#5a8ab0', x + 2, y + 2, 1, 1); R(c, '#5a8ab0', x + 3, y + 3, 1, 1); R(c, '#5a8ab0', x + 2, y + 5, 3, 1); }
      R(c, '#e8e0cc', x + w / 2 - 0.5, y + 1, 1, h - 2); R(c, '#e8e0cc', x + 1, y + h / 2 - 0.5, w - 2, 1);
    }
    R(c, '#c9c2b0', x - 1, y + h, w + 2, 2);              // peitoril
    if (st.shutters) { R(c, st.shutters, x - 4, y, 3, h); R(c, st.shutters, x + w + 1, y, 3, h); R(c, sh(st.shutters, -0.3), x - 3, y + 2, 1, h - 4); R(c, sh(st.shutters, -0.3), x + w + 2, y + 2, 1, h - 4); }
    if (!st.small && !st.stained && k > 0.7) {            // floreira
      R(c, '#8a4a2a', x, y + h + 2, w, 2);
      R(c, '#2f8f3e', x, y + h + 1, w, 1);
      R(c, '#ff5a7a', x + 1, y + h); R(c, '#f2e14a', x + 4, y + h); R(c, '#ff5a7a', x + 7, y + h);
    }
  }

  function bench(c, x, y) {
    R(c, OUT, x - 1, y - 1, 16, 8);
    R(c, '#8a5a30', x, y, 14, 2); R(c, '#a8743e', x, y, 14, 1);
    R(c, '#8a5a30', x, y + 3, 14, 2);
    R(c, '#2a2a2e', x + 1, y + 5, 1, 2); R(c, '#2a2a2e', x + 12, y + 5, 1, 2);
  }

  // postes da cidade
  function lampSpots(m) {
    const out = [];
    for (const ry of H_ROADS) {
      for (let x = 3; x < 72; x += 7) {
        if (V_ROADS.some((v) => Math.abs(v - x) < 3)) continue;
        if (m[ry - 1] && m[ry - 1][x] === 0) out.push({ x, y: ry - 1, s: 'n' });
        if (m[ry + 2] && m[ry + 2][x + 3] === 0) out.push({ x: x + 3, y: ry + 2, s: 's' });
      }
    }
    return out;
  }

  function lampPost(c, l) {
    const sx = l.x * TS + 7, sy = l.y * TS + (l.s === 'n' ? 2 : 0);
    R(c, 'rgba(0,0,0,0.25)', sx - 2, sy + 14, 6, 2);
    R(c, OUT, sx - 1, sy - 12, 4, 27);
    R(c, '#3a3a44', sx, sy - 11, 2, 25); R(c, '#5a5a66', sx, sy - 11, 1, 25);
    R(c, '#3a3a44', sx - 1, sy + 12, 4, 3);
    R(c, OUT, sx - 3, sy - 15, 8, 5); R(c, '#2a2a34', sx - 2, sy - 14, 6, 3);
    R(c, '#ffe08a', sx - 1, sy - 12, 4, 2);
  }

  function buildCityBase() {
    const s = W0.city;
    const [cv, c] = mk(s.w * TS, s.h * TS);
    const m = s.map;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = m[y][x], sx = x * TS, sy = y * TS;
      const zid = zoneOfRow(y);
      if (t === 1 || t === 9) road(c, m, x, y, sx, sy);
      else if (t === 2 || t === 8) praca(c, x, y, sx, sy);
      else if (t === 7) wall(c, x, y, sx, sy, m[y - 1] && m[y - 1][x] !== 7);
      else grass(c, x, y, sx, sy, zid);
    }
    // árvores depois do chão (a copa invade o tile de cima)
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (m[y][x] === 5) tree(c, x, y, x * TS, y * TS, zoneOfRow(y));
    // canteiros e bancos nas praças
    const seen = {};
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (m[y][x] !== 2 || seen[x + ',' + y]) continue;
      let w = 0; while (m[y][x + w] === 2 || m[y][x + w] === 8) w++;
      let h = 0; while (m[y + h] && (m[y + h][x] === 2)) h++;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) seen[xx + ',' + yy] = 1;
      // borda de grama florida
      for (let xx = x; xx < x + w; xx++) { R(c, '#3f8f3f', xx * TS, y * TS, TS, 3); R(c, FLOWERS[xx % 6], xx * TS + 4, y * TS + 1); R(c, FLOWERS[(xx + 3) % 6], xx * TS + 11, y * TS + 1); }
      bench(c, x * TS + 4, (y + h - 1) * TS + 6);
      bench(c, (x + w - 1) * TS - 2, (y + h - 1) * TS + 6);
    }
    for (const b of s.buildings) building(c, b);
    W0._lamps = lampSpots(m);
    for (const l of W0._lamps) lampPost(c, l);
    W0._cityBase = cv;
  }

  /* ============================================================
     CIDADE — camada animada
     ============================================================ */
  const fx = { flies: [], smoke: [], sparks: [] };
  function initFx(Wv, Hv) {
    fx.flies = [];
    for (let i = 0; i < 18; i++) fx.flies.push({ x: Math.random() * Wv, y: Math.random() * Hv, p: Math.random() * 6.28, s: 0.2 + Math.random() * 0.3 });
  }

  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const ZTINT = { vila: 'rgba(255,150,70,0.07)', centro: 'rgba(70,120,255,0.07)', morro: 'rgba(110,50,200,0.16)' };

  W0.draw = function () {
    const s = this.scene;
    if (s.kind === 'in') return this.drawInterior();
    if (!this._cityBase || this._cityBaseFor !== s) { buildCityBase(); this._cityBaseFor = s; }
    const ctx = this.ctx, Wv = this.canvas.width, Hv = this.canvas.height;
    if (!fx.flies.length) initFx(Wv, Hv);
    this.updateCam(s.w * TS, s.h * TS, Wv, Hv);
    const ox = Math.floor(this.camX), oy = Math.floor(this.camY);
    const z = this.curZone(), zid = z.id;
    const t = this.t;

    ctx.fillStyle = z.sky; ctx.fillRect(0, 0, Wv, Hv);
    ctx.drawImage(this._cityBase, ox, oy, Wv, Hv, 0, 0, Wv, Hv);

    const vis = (x, y, m) => x > -m && y > -m && x < Wv + m && y < Hv + m;

    // fonte com água mexendo
    for (let y = Math.floor(oy / TS); y <= Math.floor((oy + Hv) / TS); y++) for (let x = Math.floor(ox / TS); x <= Math.floor((ox + Wv) / TS); x++) {
      if (!s.map[y] || s.map[y][x] !== 8 || (s.map[y][x - 1] === 8)) continue;
      const fx0 = x * TS - ox - 4, fy0 = y * TS - oy - 4, fw = 40, fh = 24;
      R(ctx, OUT, fx0 - 1, fy0 - 1, fw + 2, fh + 2);
      R(ctx, '#a8a296', fx0, fy0, fw, fh); R(ctx, '#c9c2b4', fx0, fy0, fw, 2);
      R(ctx, '#2f6fa8', fx0 + 3, fy0 + 3, fw - 6, fh - 6);
      for (let k = 0; k < 6; k++) {
        const rx = fx0 + 5 + ((k * 7 + Math.floor(t / 6)) % (fw - 12)), ry = fy0 + 5 + (k * 5) % (fh - 10);
        R(ctx, '#6fb0e0', rx, ry, 3, 1);
      }
      R(ctx, '#d8d0bc', fx0 + fw / 2 - 2, fy0 + 6, 4, 10);
      const jet = Math.sin(t / 8) * 1.5;
      R(ctx, '#bfe6ff', fx0 + fw / 2 - 1, fy0 - 2 + jet, 2, 8);
      for (let k = 0; k < 5; k++) { const a = (t / 10 + k * 1.3); R(ctx, '#e8f6ff', fx0 + fw / 2 + Math.round(Math.cos(a) * (3 + k)), fy0 + 2 + ((t + k * 7) % 10)); }
    }

    // cancelas
    for (const g of GATES) {
      const open = this.zoneOpen(g.zone);
      const sx = g.pass * TS - ox, sy = g.y * TS - oy;
      if (!vis(sx, sy, 80)) continue;
      for (const px of [sx - 4, sx + 33]) { R(ctx, OUT, px - 1, sy - 9, 5, 34); R(ctx, '#d8d2c0', px, sy - 8, 3, 32); R(ctx, '#c9412e', px, sy - 2, 3, 3); R(ctx, '#c9412e', px, sy + 8, 3, 3); }
      if (open) {
        for (let k = 0; k < 18; k++) R(ctx, (Math.floor(k / 3) % 2) ? '#f2efe6' : '#c9412e', sx - 3 + Math.round(k * 0.3), sy - 6 - k, 3, 1);
        R(ctx, '#58d06a', sx - 4, sy - 12, 3, 3);
      } else {
        R(ctx, OUT, sx - 1, sy + 5, 36, 5);
        for (let k = 0; k < 34; k += 6) { R(ctx, '#c9412e', sx + k, sy + 6, 3, 3); R(ctx, '#f2efe6', sx + k + 3, sy + 6, 3, 3); }
        R(ctx, t % 40 < 20 ? '#ff4a3a' : '#7a1a10', sx - 4, sy - 12, 3, 3);
      }
      const zz = this.zone(g.zone), nm = T.t(zz.nameKey);
      const tw = textW(nm) + 8, tx = Math.round(sx + 16 - tw / 2), ty = sy - 24;
      R(ctx, OUT, tx - 1, ty - 1, tw + 2, 11);
      R(ctx, open ? '#2f6f3f' : '#6a2020', tx, ty, tw, 9);
      R(ctx, open ? '#4f9f5f' : '#9a3a30', tx, ty, tw, 1);
      ptext(ctx, nm, tx + 4, ty + 2, open ? '#e8f6d8' : '#ffd8c8', '#0008');
    }

    // prédios: neon, luzinhas, holofotes, fumaça, avisos
    const bob = Math.round(Math.sin(t / 18));
    for (const b of s.buildings) {
      const st = BSTY[b.name] || {};
      const X = b.x * TS - ox, Y = b.y * TS - oy, Wd = b.w * TS, Ht = b.h * TS;
      if (!vis(X, Y, 60) && !vis(X + Wd, Y + Ht, 60)) continue;
      const fy = Y + roofRows(b) * TS;
      if (st.neon) {
        const on = (t % 160) > 6 && (t % 160) < 150 || (t % 160) % 4 < 2;
        const tw = textW(st.neon) * 2 + 10, tx = Math.round(X + Wd / 2 - tw / 2), ty = fy - 8;
        R(ctx, OUT, tx - 1, ty - 1, tw + 2, 16); R(ctx, '#140c20', tx, ty, tw, 14);
        const col = b.name === 'baile' ? (t % 60 < 30 ? '#ff5ad0' : '#5ae0ff') : (on ? '#ff5ad0' : '#5a2a4a');
        ctx.save(); ctx.translate(tx + 5, ty + 2); ctx.scale(2, 2); ptext(ctx, st.neon, 0, 0, col); ctx.restore();
        if (on) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, tx + tw / 2, ty + 7, tw * 0.7, col === '#5ae0ff' ? 'rgba(90,224,255,A)' : 'rgba(255,90,208,A)', 0.22); ctx.globalCompositeOperation = 'source-over'; }
      }
      if (st.lights) {
        for (let k = 0; k < Wd; k += 5) {
          const yy = fy - 1 + Math.round(Math.sin(k / 6) * 2);
          const col = ['#ff5a5a', '#f2e14a', '#5ae0ff', '#9aff5a', '#ff5ad0'][(Math.floor(k / 5) + Math.floor(t / 15)) % 5];
          R(ctx, '#2a2a2a', X + k, yy - 1, 5, 1); R(ctx, col, X + k + 2, yy, 2, 2);
        }
      }
      if (st.spots) {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 2; k++) {
          const a = Math.sin(t / 50 + k * 2) * 0.5 - Math.PI / 2;
          const bx = X + (k ? Wd - 6 : 6), by = Y + 2;
          ctx.fillStyle = 'rgba(255,240,180,0.10)';
          ctx.beginPath(); ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(a - 0.15) * 90, by + Math.sin(a - 0.15) * 90);
          ctx.lineTo(bx + Math.cos(a + 0.15) * 90, by + Math.sin(a + 0.15) * 90);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      if (st.chimney && t % 18 === 0) fx.smoke.push({ x: b.x * TS + Wd - 9, y: b.y * TS - 4, a: 1, r: 1 });
      // avisos em cima da porta
      const dx = b.door.x * TS - ox, dy = fy + (Ht - roofRows(b) * TS) - 22;
      if (b.shop) {
        const by = Y - 14 + bob;
        R(ctx, OUT, dx - 3, by - 1, 22, 12); R(ctx, '#f2cf3a', dx - 2, by, 20, 10); R(ctx, '#fff0a0', dx - 2, by, 20, 1); R(ctx, '#c9a020', dx - 2, by + 9, 20, 1);
        ptext(ctx, 'R$', dx + 4, by + 3, '#3a2a10');
      } else if (b.interior) {
        const inside = NPCS.filter((n) => n.place === b.interior);
        const openN = inside.filter((n) => !this.npcLocked(n) && !this.defeated[n.id]);
        const boss = inside.find((n) => n.boss && !this.defeated[n.id] && !this.npcLocked(n));
        if (boss) {
          const cy = Y - 18 + bob, cx = dx + 1;
          R(ctx, OUT, cx - 1, cy - 1, 16, 10);
          R(ctx, '#e8b93c', cx, cy + 4, 14, 4); R(ctx, '#e8b93c', cx, cy, 3, 4); R(ctx, '#e8b93c', cx + 5, cy - 1, 4, 5); R(ctx, '#e8b93c', cx + 11, cy, 3, 4);
          R(ctx, '#fff0a0', cx + 1, cy + 4, 12, 1); R(ctx, '#c9412e', cx + 6, cy + 5, 2, 2);
          ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx + 7, cy + 4, 18, 'rgba(232,185,60,A)', 0.25); ctx.globalCompositeOperation = 'source-over';
        } else if (openN.length) {
          bubble(ctx, dx + 2, Y - 16 + bob, '!', '#ffe08a');
        }
      }
    }

    // postes acesos
    ctx.globalCompositeOperation = 'lighter';
    const dk = this.darkness ? this.darkness() : 0.6;
    const lampA = (zid === 'morro' ? 0.34 : zid === 'centro' ? 0.24 : 0.2) * (0.25 + 0.75 * dk);
    for (const l of this._lamps || []) {
      const sx = l.x * TS + 8 - ox, sy = l.y * TS + (l.s === 'n' ? 2 : 0) - oy - 11;
      if (!vis(sx, sy, 50)) continue;
      const fl = 1 + Math.sin(t / 9 + l.x) * 0.05;
      glow(ctx, sx, sy, 26 * fl, 'rgba(255,214,120,A)', lampA);
      glow(ctx, sx, sy + 24, 20, 'rgba(255,214,120,A)', lampA * 0.5);
    }
    ctx.globalCompositeOperation = 'source-over';

    // fumaça das chaminés
    for (let i = fx.smoke.length - 1; i >= 0; i--) {
      const p = fx.smoke[i];
      p.y -= 0.25; p.x += 0.12 + Math.sin((t + i) / 14) * 0.1; p.a -= 0.008; p.r += 0.03;
      if (p.a <= 0) { fx.smoke.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(210,205,200,${p.a * 0.5})`;
      const rr = Math.round(p.r);
      ctx.fillRect(Math.round(p.x - ox) - rr, Math.round(p.y - oy) - rr, rr * 2 + 1, rr * 2 + 1);
    }

    // moedas girando
    for (const p of this.pickups) {
      const sx = p.x * TS - ox, sy = p.y * TS - oy;
      if (!vis(sx, sy, 16)) continue;
      const b2 = Math.round(Math.sin((t + p.x * 7) / 12) * 1.5);
      const ph = Math.floor((t + p.x * 5) / 6) % 4, w = [7, 5, 2, 5][ph];
      R(ctx, 'rgba(0,0,0,0.3)', sx + 5, sy + 13, 7, 2);
      R(ctx, OUT, sx + 8 - Math.ceil(w / 2) - 1, sy + 3 + b2, w + 2, 9);
      R(ctx, '#e8b93c', sx + 8 - Math.ceil(w / 2), sy + 4 + b2, w, 7);
      if (w > 2) { R(ctx, '#fff0a0', sx + 8 - Math.ceil(w / 2), sy + 4 + b2, 1, 6); R(ctx, '#b5861e', sx + 8 - Math.ceil(w / 2) + w - 1, sy + 5 + b2, 1, 6); }
      if ((t + p.x * 11) % 50 < 6) { R(ctx, '#ffffff', sx + 11, sy + 2 + b2); R(ctx, '#ffffff', sx + 10, sy + 3 + b2, 3, 1); R(ctx, '#ffffff', sx + 11, sy + 1 + b2, 1, 3); }
    }

    if (this.scene.kind === 'city') {
      for (const cap of this.caps) {
        if (this.capsFound[cap.id] || !this.zoneOpen(cap.zone)) continue;
        const dx = cap.x * TS + 8 - this.player.x, dy = cap.y * TS + 8 - this.player.y;
        if (dx * dx + dy * dy > (TS * 5) ** 2) continue;
        const sx = cap.x * TS - ox, sy = cap.y * TS - oy;
        if (!vis(sx, sy, 16)) continue;
        R(ctx, 'rgba(0,0,0,0.35)', sx + 4, sy + 12, 9, 2);
        R(ctx, OUT, sx + 3, sy + 5, 10, 7);
        R(ctx, '#c9412e', sx + 4, sy + 6, 8, 5);
        R(ctx, '#f2cf3a', sx + 5, sy + 4, 6, 2);
      }
    }

    // personagens ordenados pela altura (quem está mais embaixo fica na frente)
    this.drawNpcs(ox, oy);

    // vagalumes e polén
    for (const f of fx.flies) {
      f.p += 0.03; f.x += Math.cos(f.p) * f.s; f.y += Math.sin(f.p * 1.3) * f.s * 0.6;
      if (f.x < 0) f.x += Wv; if (f.x > Wv) f.x -= Wv; if (f.y < 0) f.y += Hv; if (f.y > Hv) f.y -= Hv;
      const on = Math.sin(f.p * 3) > 0.2;
      if (zid === 'centro') { R(ctx, 'rgba(255,255,255,0.35)', Math.round(f.x), Math.round(f.y)); continue; }
      if (!on || dk < 0.45) continue;               // vagalume só aparece no escuro
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, Math.round(f.x), Math.round(f.y), 5, 'rgba(210,255,120,A)', 0.4);
      ctx.globalCompositeOperation = 'source-over';
      R(ctx, '#eaffa0', Math.round(f.x), Math.round(f.y));
    }

    if (this.mods().rain) this.drawRain(Wv, Hv);
    else if (this.mods().drizzle) this.drawRain(Wv, Hv, true);

    // hora do dia: amanhecer rosado, pôr do sol laranja, noite azul-escura
    const hr = this.hour;
    if (hr >= 5 && hr < 8) { ctx.fillStyle = `rgba(255,150,110,${0.14 * (1 - Math.abs(hr - 6.5) / 1.5)})`; ctx.fillRect(0, 0, Wv, Hv); }
    if (hr >= 16.5 && hr < 19.5) { ctx.fillStyle = `rgba(255,120,40,${0.2 * (1 - Math.abs(hr - 18) / 1.5)})`; ctx.fillRect(0, 0, Wv, Hv); }
    if (dk > 0) {
      ctx.fillStyle = `rgba(8,12,40,${0.58 * dk})`; ctx.fillRect(0, 0, Wv, Hv);
      // luzes que furam o escuro: postes e portas dos lugares
      ctx.globalCompositeOperation = 'lighter';
      for (const l of this._lamps || []) {
        const sx = l.x * TS + 8 - ox, sy = l.y * TS + (l.s === 'n' ? 2 : 0) - oy - 11;
        if (!vis(sx, sy, 60)) continue;
        glow(ctx, sx, sy + 14, 40, 'rgba(255,200,110,A)', 0.22 * dk);
        R(ctx, `rgba(255,236,170,${0.8 * dk})`, sx - 2, sy - 1, 4, 2);
      }
      for (const b of s.buildings) {
        if (!b.door) continue;
        const dx0 = b.door.x * TS + 8 - ox, dy0 = (b.y + b.h) * TS - oy - 4;
        if (!vis(dx0, dy0, 50)) continue;
        glow(ctx, dx0, dy0, 30, 'rgba(255,190,90,A)', 0.2 * dk);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // tom do bairro + vinheta
    ctx.fillStyle = ZTINT[zid] || ZTINT.vila; ctx.fillRect(0, 0, Wv, Hv);
    const g = ctx.createRadialGradient(Wv / 2, Hv / 2, Hv * 0.3, Wv / 2, Hv / 2, Hv * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wv, Hv);
  };

  function bubble(ctx, x, y, ch, col) {
    R(ctx, OUT, x - 1, y - 1, 11, 11); R(ctx, '#fffaf0', x, y, 9, 9); R(ctx, OUT, x + 3, y + 10, 3, 1); R(ctx, '#fffaf0', x + 3, y + 9, 3, 1); R(ctx, '#fffaf0', x + 4, y + 10, 1, 1);
    R(ctx, '#d8cfb8', x, y + 8, 9, 1);
    if (ch === '!') { R(ctx, col === '#fffaf0' ? '#c9412e' : '#c9412e', x + 4, y + 2, 1, 4); R(ctx, '#c9412e', x + 4, y + 7, 1, 1); }
    if (ch === 'lock') { R(ctx, '#6a6a74', x + 3, y + 1, 3, 1); R(ctx, '#6a6a74', x + 2, y + 2, 1, 2); R(ctx, '#6a6a74', x + 6, y + 2, 1, 2); R(ctx, '#e8b93c', x + 2, y + 4, 5, 4); R(ctx, '#7a5a10', x + 4, y + 5, 1, 2); }
    if (ch === 'ok') { R(ctx, '#2f9f4f', x + 2, y + 4, 1, 2); R(ctx, '#2f9f4f', x + 3, y + 5, 1, 2); R(ctx, '#2f9f4f', x + 4, y + 4, 1, 2); R(ctx, '#2f9f4f', x + 5, y + 3, 1, 2); R(ctx, '#2f9f4f', x + 6, y + 2, 1, 2); }
  }

  /* ---------- personagens ---------- */
  W0.drawNpcs = function (ox, oy) {
    const ctx = this.ctx, Wv = this.canvas.width, Hv = this.canvas.height, t = this.t;
    const list = [];
    for (const n of this.scene.npcs) list.push({ n, y: n.y * TS + 16 });
    list.push({ p: true, y: this.player.y + 8 });
    list.sort((a, b) => a.y - b.y);
    const pl = this.player;
    for (const it of list) {
      if (it.p) { this.drawPlayer(ox, oy); continue; }
      const n = it.n;
      const sx = n.x * TS - ox, sy = n.y * TS - oy;
      if (sx < -24 || sy < -32 || sx > Wv + 24 || sy > Hv + 24) continue;
      // vira de frente pra quem chega perto
      const dxp = pl.x - (n.x * TS + 8), dyp = pl.y - (n.y * TS + 8);
      let dir = 'down';
      if (dxp * dxp + dyp * dyp < 56 * 56) dir = Math.abs(dxp) > Math.abs(dyp) ? (dxp < 0 ? 'left' : 'right') : (dyp < 0 ? 'up' : 'down');
      if (n.pair && dxp * dxp + dyp * dyp >= 56 * 56) {      // a dupla conversa entre si
        const mate = this.scene.npcs.find((m) => m.id === n.pair);
        if (mate) dir = mate.x > n.x ? 'right' : 'left';
      }
      const blink = ((t + n.x * 31) % 180) < 6;
      const bob = ((t + n.x * 9) % 60) < 30 ? 0 : 1;
      if (n.egg) { drawEgg.call(this, ctx, n, sx, sy, dir, blink, bob, dxp, dyp); continue; }
      if (n.boss) {                                    // tapete dourado do chefão
        R(ctx, '#7a1a20', sx - 4, sy + 13, 24, 7); R(ctx, '#e8b93c', sx - 4, sy + 13, 24, 1); R(ctx, '#e8b93c', sx - 4, sy + 19, 24, 1);
        ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx + 8, sy + 10, 20, 'rgba(232,185,60,A)', 0.14 + Math.sin(t / 12) * 0.05); ctx.globalCompositeOperation = 'source-over';
      }
      drawChar(ctx, STY[n.id] ? n.id : 'zeca', sx + 2, sy - 1 + bob, dir, 0, blink);
      const by = sy - 16 + Math.round(Math.sin(t / 14) * 1.5);
      if (this.npcLocked(n)) bubble(ctx, sx + 3, by, 'lock');
      else if (!this.defeated[n.id]) {
        bubble(ctx, sx + 3, by, '!', '#fffaf0');
        if (n.boss) {
          const cx = sx + 1, cy = by - 9;
          R(ctx, OUT, cx - 1, cy - 1, 15, 8);
          R(ctx, '#e8b93c', cx, cy + 3, 13, 3); R(ctx, '#e8b93c', cx, cy, 3, 3); R(ctx, '#e8b93c', cx + 5, cy - 1, 3, 4); R(ctx, '#e8b93c', cx + 10, cy, 3, 3);
          R(ctx, '#fff0a0', cx + 1, cy + 3, 11, 1);
        }
      } else {
        bubble(ctx, sx + 3, by, 'ok');
        const st = this.stateOf(n.id);
        for (let k = 0; k < Math.min(3, st.level); k++) { R(ctx, OUT, sx + 2 + k * 5, by - 5, 4, 4); R(ctx, '#e8b93c', sx + 3 + k * 5, by - 4, 2, 2); }
      }
    }
  };

  /* easter egg: só aparece quando o jogador chega bem perto */
  const eggSeen = {};
  const bursts = [];
  function drawEgg(ctx, n, sx, sy, dir, blink, bob, dxp, dyp) {
    const t = this.t;
    const dist = Math.sqrt(dxp * dxp + dyp * dyp) / TS;          // em tiles
    const found = !!this.eggs[n.id];
    const near = found ? 6 : 4.5, full = found ? 4 : 2.5;
    let a = dist >= near ? 0 : dist <= full ? 1 : 1 - (dist - full) / (near - full);
    if (a <= 0) return;
    if (!found && a > 0.3 && !eggSeen[n.id]) { eggSeen[n.id] = true; if (window.Sound && Sound.shimmer) Sound.shimmer(); }
    ctx.save(); ctx.globalAlpha = a;
    // animação ociosa de cada um
    let ox = 0, oy = bob, step = 0;
    if (n.id === 'prado' && (t % 120) < 20) oy = -[0, 1, 2, 3, 3, 2, 1, 0][Math.floor((t % 120) / 2.5)] || 0;   // pulinho de empolgação
    if (n.id === 'martins') ox = Math.round(Math.sin(t / 20) * 1);                                           // balança sem parar
    if (n.id === 'chihiro' && (t % 90) < 30) step = Math.floor(t / 8) % 2 ? 1 : 3;                          // bate o pé
    drawChar(ctx, n.id, sx + 2 + ox, sy - 1 + oy, dir, step, blink);
    ctx.restore();
    // brilhinho de segredo em volta
    if (!found) {
      for (let k = 0; k < 3; k++) {
        const ph = (t / 30 + k * 2.1);
        const px = sx + 8 + Math.round(Math.cos(ph) * 11), py = sy + 4 + Math.round(Math.sin(ph * 1.3) * 9);
        if ((t + k * 13) % 40 < 26) { ctx.globalAlpha = a; R(ctx, '#fff6b0', px, py); R(ctx, '#fff6b0', px - 1, py); R(ctx, '#fff6b0', px + 1, py); R(ctx, '#fff6b0', px, py - 1); R(ctx, '#fff6b0', px, py + 1); ctx.globalAlpha = 1; }
      }
    } else {
      const by = sy - 18 + Math.round(Math.sin(t / 14) * 1.5);
      ctx.globalAlpha = a;
      R(ctx, OUT, sx + 4, by - 1, 9, 9); R(ctx, '#e8b93c', sx + 5, by + 2, 7, 3); R(ctx, '#e8b93c', sx + 7, by, 3, 7); R(ctx, '#fff6b0', sx + 8, by + 3);
      ctx.globalAlpha = 1;
    }
    // explosão de confete ao ser encontrado
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      if (p.id !== n.id) continue;
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
      if (p.life <= 0) { bursts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life / 20);
      R(ctx, p.c, Math.round(sx + 8 + p.x), Math.round(sy + 4 + p.y), p.s, p.s);
      ctx.globalAlpha = 1;
    }
  }
  W0.eggBurst = function (n) {
    const cs = ['#ff5ad0', '#5ae0ff', '#f2e14a', '#9aff5a', '#ffffff', '#ff8a3a'];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 2.2;
      bursts.push({ id: n.id, x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.6, c: cs[i % cs.length], s: Math.random() > 0.7 ? 2 : 1, life: 50 + Math.floor(Math.random() * 40) });
    }
  };

  /* câmera suave: chega no jogador com atraso curto e olha um pouco
     para onde ele está indo. Troca de cena ou salto grande = corte seco. */
  W0.updateCam = function (mapW, mapH, Wv, Hv) {
    const p = this.player, vx = p.vx || 0, vy = p.vy || 0;
    const tx = p.x + vx * 18 - Wv / 2, ty = p.y + vy * 12 - Hv / 2;
    const jump = this._cx === undefined || Math.abs(tx - this._cx) > Wv || Math.abs(ty - this._cy) > Hv;
    if (jump || this._camFor !== this.scene || this._camW !== Wv || this._camH !== Hv) {
      this._cx = tx; this._cy = ty; this._camFor = this.scene; this._camW = Wv; this._camH = Hv;
    } else {
      this._cx += (tx - this._cx) * 0.1;
      this._cy += (ty - this._cy) * 0.1;
    }
    if (mapW <= Wv) this.camX = -(Wv - mapW) / 2;
    else { this._cx = Math.max(0, Math.min(mapW - Wv, this._cx)); this.camX = this._cx; }
    if (mapH <= Hv) this.camY = -(Hv - mapH) / 2;
    else { this._cy = Math.max(0, Math.min(mapH - Hv, this._cy)); this.camY = this._cy; }
  };

  W0.drawPlayer = function (ox, oy) {
    const p = this.player;
    const moving = this._lpx !== undefined && (Math.abs(p.x - this._lpx) > 0.01 || Math.abs(p.y - this._lpy) > 0.01);
    this._lpx = p.x; this._lpy = p.y;
    const step = moving ? Math.floor(p.frame * 1.3) % 4 : 0;
    const blink = (this.t % 200) < 6;
    const px = Math.floor(p.x) - ox - 6, py = Math.floor(p.y) - oy - 9;
    // amassadinha ao frear (squash) e balanço do passo
    const sq = p.squash || 0;
    const c = this.ctx;
    if (sq > 0.04) {
      c.save();
      c.translate(px + 6, py + 17);
      c.scale(1 + sq * 0.16, 1 - sq * 0.14);
      c.translate(-(px + 6), -(py + 17));
    }
    drawChar(c, 'player', px, py + (step % 2 ? -1 : 0), p.dir || 'down', step, blink);
    if (sq > 0.04) c.restore();
    const sp = Math.hypot(p.vx || 0, p.vy || 0);
    const running = sp > 2.1;
    if (moving && this.scene.kind === 'city' && this.t % (running ? 3 : 8) === 0) {
      fx.sparks.push({ x: p.x + (Math.random() * 6 - 3), y: p.y + 7, a: 1, big: running, vx: -(p.vx || 0) * 0.25 });
    }
    // poeirinha dos passos
    for (let i = fx.sparks.length - 1; i >= 0; i--) {
      const d = fx.sparks[i]; d.a -= d.big ? 0.05 : 0.06; d.y -= d.big ? 0.25 : 0.1; d.x += d.vx || 0;
      if (d.a <= 0) { fx.sparks.splice(i, 1); continue; }
      this.ctx.fillStyle = `rgba(230,220,200,${d.a * (d.big ? 0.7 : 0.5)})`;
      if (d.big) this.ctx.fillRect(Math.round(d.x - ox) - 1, Math.round(d.y - oy) - 1, d.a > 0.5 ? 3 : 2, d.a > 0.5 ? 2 : 1);
      else this.ctx.fillRect(Math.round(d.x - ox) - 1, Math.round(d.y - oy), 2, 1);
    }
  };

  // mantém compatibilidade com quem ainda chama drawPerson
  W0.drawPerson = function (x, y) { drawChar(this.ctx, 'player', x, y, 'down', 0, false); };

  /* ============================================================
     INTERIORES
     ============================================================ */
  function floorTile(c, id, d, x, y, sx, sy, s) {
    const f1 = d.floor, f2 = d.floor2;
    switch (id) {
      case 'boteco': case 'casa': {                     // tábuas de madeira
        for (let k = 0; k < 4; k++) {
          const col = h3(x, y * 4 + k, 1) > 0.5 ? f1 : f2;
          R(c, col, sx, sy + k * 4, TS, 4); R(c, sh(col, 0.1), sx, sy + k * 4, TS, 1); R(c, sh(col, -0.3), sx, sy + k * 4 + 3, TS, 1);
          const j = Math.floor(h3(x, y * 4 + k, 2) * 16); R(c, sh(col, -0.35), sx + j, sy + k * 4, 1, 3);
          if (h3(x, y * 4 + k, 3) > 0.8) R(c, sh(col, -0.2), sx + ((j + 6) % 14), sy + k * 4 + 1, 2, 1);
        }
        break;
      }
      case 'fliperama': {                               // carpete de fliperama
        R(c, f1, sx, sy, TS, TS);
        const cs = ['#ff5ad0', '#5ae0ff', '#f2e14a', '#9aff5a'];
        for (let k = 0; k < 5; k++) { const a = h3(x, y, k), b = h3(x, y, k + 9); R(c, cs[k % 4], sx + Math.floor(a * 14), sy + Math.floor(b * 14), k % 2 ? 2 : 1, 1); }
        if (h3(x, y, 20) > 0.6) { R(c, '#5a4f8a', sx + 4, sy + 9, 3, 1); R(c, '#5a4f8a', sx + 5, sy + 8, 1, 3); }
        break;
      }
      case 'igreja': case 'arena': {                    // pedra
        R(c, (x + y) % 2 ? f1 : f2, sx, sy, TS, TS);
        R(c, sh(f1, -0.25), sx, sy + 15, TS, 1); R(c, sh(f1, -0.25), sx + 15, sy, 1, TS);
        R(c, sh(f1, 0.12), sx, sy, TS, 1);
        if (h3(x, y, 4) > 0.75) R(c, sh(f1, -0.12), sx + 4, sy + 6, 5, 1);
        break;
      }
      case 'loterica': {                                // ladrilho xadrez
        for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) R(c, (k + j) % 2 ? '#e8e0cc' : '#2f5a9a', sx + k * 4, sy + j * 4, 4, 4);
        break;
      }
      case 'predio': {                                  // mármore
        R(c, (x + y) % 2 ? '#d8d2e0' : '#cac2d6', sx, sy, TS, TS);
        for (let k = 0; k < 3; k++) { const a = h3(x, y, k); R(c, '#b0a8c0', sx + Math.floor(a * 10), sy + k * 5 + 2, 5, 1); R(c, '#b0a8c0', sx + Math.floor(a * 10) + 4, sy + k * 5 + 3, 3, 1); }
        R(c, '#a89ebc', sx + 15, sy, 1, TS); R(c, '#a89ebc', sx, sy + 15, TS, 1);
        break;
      }
      case 'clube': {                                   // carpete verde com losango dourado
        R(c, f1, sx, sy, TS, TS);
        R(c, f2, sx + 7, sy + 1, 2, 14); R(c, f2, sx + 1, sy + 7, 14, 2);
        R(c, '#8a7a3a', sx + 7, sy + 7, 2, 2);
        for (let k = 0; k < 6; k++) R(c, '#3a6a48', sx + Math.floor(h3(x, y, k) * 16), sy + Math.floor(h3(x, y, k + 7) * 16));
        break;
      }
      case 'baile': {
        R(c, (x + y) % 2 ? f1 : f2, sx, sy, TS, TS); R(c, '#1c1428', sx + 15, sy, 1, TS); R(c, '#1c1428', sx, sy + 15, TS, 1);
        break;
      }
      case 'oficina': {                                 // cimento manchado de óleo
        R(c, f1, sx, sy, TS, TS);
        for (let k = 0; k < 8; k++) R(c, h3(x, y, k) > 0.5 ? f2 : sh(f1, 0.08), sx + Math.floor(h3(x, y, k + 3) * 16), sy + Math.floor(h3(x, y, k + 5) * 16));
        if (h3(x, y, 40) > 0.85) { blob(c, sx + 8, sy + 8, 3, '#2e3434'); R(c, '#4a5a6a', sx + 7, sy + 7); }
        break;
      }
      default: R(c, (x + y) % 2 ? f1 : f2, sx, sy, TS, TS);
    }
  }

  function wallFace(c, id, d, sx, sy, w) {
    // parede de fundo (2 fileiras de tile)
    const wl = d.wall, wL = sh(wl, 0.15);
    R(c, sh(wl, -0.35), sx, sy, w, 6);                 // topo
    R(c, wl, sx, sy + 6, w, 26);
    if (id === 'boteco' || id === 'casa') { for (let k = 0; k < w; k += 6) R(c, wL, sx + k, sy + 6, 3, 20); }   // papel de parede listrado
    if (id === 'predio' || id === 'loterica') { for (let k = 0; k < w; k += 8) for (let j = 8; j < 26; j += 8) R(c, wL, sx + k + ((j / 8) % 2) * 4, sy + j, 2, 2); }
    if (id === 'igreja' || id === 'arena') { for (let k = 0; k < w; k += 8) R(c, sh(wl, -0.1), sx + k, sy + 6, 1, 26); for (let j = 12; j < 30; j += 6) R(c, sh(wl, -0.1), sx, sy + j, w, 1); }
    if (id === 'oficina') { for (let k = 0; k < w; k += 4) R(c, sh(wl, 0.08), sx + k, sy + 6, 2, 26); }
    R(c, d.trim, sx, sy + 24, w, 2); R(c, sh(d.trim, -0.3), sx, sy + 26, w, 6);   // lambri
    R(c, sh(d.trim, 0.25), sx, sy + 24, w, 1);
    R(c, 'rgba(0,0,0,0.35)', sx, sy + 32, w, 3);         // sombra no chão
  }

  function frame(c, x, y, w, h, inner) {
    R(c, OUT, x - 1, y - 1, w + 2, h + 2); R(c, '#c9a43f', x, y, w, h); R(c, '#8a6a1e', x + w - 1, y, 1, h); R(c, '#8a6a1e', x, y + h - 1, w, 1);
    inner(x + 1, y + 1, w - 2, h - 2);
  }

  function wallDeco(c, id, d, X, Y, w) {
    // X,Y = canto da parede; w = largura total do salão
    const mid = Math.floor(w / 2);
    const spots = [];
    for (let k = 28; k < w - 28; k += 44) spots.push(k);
    spots.forEach((k, i) => {
      const x = X + k, y = Y + 9;
      const kind = (i + id.length) % 4;
      if (id === 'igreja') {                             // vitral
        R(c, OUT, x - 1, y - 2, 12, 15); const cs = ['#c9412e', '#2f6fb5', '#f2cf3a', '#2f8f3e', '#9a3fc9'];
        for (let j = 0; j < 6; j++) R(c, cs[(j + i) % 5], x + (j % 2) * 5, y + Math.floor(j / 2) * 4, 5, 4);
        blob(c, x + 5, y - 1, 4, cs[i % 5]); R(c, '#2a1a10', x + 5, y - 2, 1, 15);
        return;
      }
      if (id === 'fliperama') {                          // pôster neon
        frame(c, x, y, 14, 12, (a, b, ww, hh) => { R(c, '#140c20', a, b, ww, hh); R(c, ['#ff5ad0', '#5ae0ff', '#9aff5a'][i % 3], a + 2, b + 2, ww - 4, 2); blob(c, a + ww / 2, b + 7, 2, '#f2e14a'); });
        return;
      }
      if (kind === 0) {                                  // janela com noite e lua
        R(c, OUT, x - 1, y - 1, 16, 13); R(c, '#e8e0cc', x, y, 14, 11); R(c, '#1a2a4a', x + 1, y + 1, 12, 9);
        R(c, '#f2efd0', x + 9, y + 2, 2, 2); R(c, '#1a2a4a', x + 10, y + 2); R(c, '#ffffff', x + 3, y + 3); R(c, '#ffffff', x + 6, y + 6);
        R(c, '#2a3a2a', x + 1, y + 8, 12, 2); R(c, '#e8e0cc', x + 7, y + 1, 1, 9);
      } else if (kind === 1) {                           // quadro paisagem
        frame(c, x, y, 16, 11, (a, b, ww, hh) => { R(c, '#7ac0e8', a, b, ww, hh); R(c, '#3f8f3f', a, b + hh - 3, ww, 3); blob(c, a + 4, b + 3, 2, '#f2e14a'); R(c, '#2f7a36', a + 9, b + 3, 3, 5); });
      } else if (kind === 2) {                           // relógio
        blob(c, x + 6, y + 5, 5, OUT); blob(c, x + 6, y + 5, 4, '#f2efe6'); R(c, '#2a2a2a', x + 6, y + 2, 1, 4); R(c, '#2a2a2a', x + 6, y + 5, 3, 1); R(c, '#c9412e', x + 6, y + 5);
      } else {                                           // bandeirinha / flâmula
        R(c, OUT, x - 1, y, 16, 1);
        const cs = ['#c9412e', '#f2cf3a', '#2f8f3e', '#2f6fb5'];
        for (let j = 0; j < 4; j++) { R(c, cs[j], x + j * 4, y + 1, 3, 3); R(c, cs[j], x + j * 4 + 1, y + 4, 1, 1); }
      }
    });
    if (id === 'boteco') {                               // bandeira do Brasil e TV de futebol
      const bx = X + mid - 10, by = Y + 8;
      R(c, OUT, bx - 1, by - 1, 22, 14); R(c, '#2f9f4f', bx, by, 20, 12);
      for (let k = 0; k < 5; k++) R(c, '#f2cf3a', bx + 10 - (5 - k) * 1.6, by + 1 + k, (5 - k) * 3.2 + 1, 1);
      for (let k = 0; k < 5; k++) R(c, '#f2cf3a', bx + 10 - k * 1.6 - 1, by + 6 + k, k * 3.2 + 1, 1);
      blob(c, bx + 10, by + 6, 3, '#1f4fa8'); R(c, '#f2efe6', bx + 7, by + 6, 7, 1);
      // bandeirinhas de festa cruzando o teto
      for (let k = 0; k < w; k += 5) { const yy = Y + 2 + Math.round(Math.sin(k / 9) * 2); R(c, ['#c9412e', '#f2cf3a', '#2f8f3e', '#2f6fb5', '#ff7aa8'][(k / 5) % 5], X + k, yy, 3, 3); R(c, '#e8e0cc', X + k, yy - 1, 5, 1); }
    }
  }

  function decoDraw(c, id, f, sx, sy) {
    const w = f.w * TS, h = f.h * TS, col = f.c;
    const box = (x, y, ww, hh, cc) => { R(c, OUT, x - 1, y - 1, ww + 2, hh + 2); R(c, cc, x, y, ww, hh); R(c, sh(cc, 0.18), x, y, ww, 1); R(c, sh(cc, -0.3), x, y + hh - 2, ww, 2); };
    R(c, 'rgba(0,0,0,0.3)', sx + 3, sy + 5, w, h);
    switch (f.t) {
      case 'shelf': {
        box(sx, sy, w, h, '#3e2616');
        for (let r = 0; r < 2; r++) {
          const ry = sy + 2 + r * 14;
          R(c, '#6a4428', sx + 1, ry + 11, w - 2, 2);
          for (let bx = sx + 3; bx < sx + w - 3; bx += 4) {
            const k = h3(bx, ry, 1), bh = 5 + Math.floor(k * 4);
            const bc = ['#2f7a3a', '#7a3a1a', '#c9a43f', '#e8e0cc', '#a8301e', '#3a5a9a'][Math.floor(k * 6)];
            R(c, bc, bx, ry + 11 - bh, 3, bh); R(c, bc, bx + 1, ry + 9 - bh, 1, 2);
            R(c, sh(bc, 0.4), bx, ry + 12 - bh, 1, bh - 2); if (bh > 6) R(c, '#f2efe6', bx, ry + 13 - bh + 2, 3, 2);
          }
        }
        break;
      }
      case 'bar': {
        box(sx, sy - 2, w, h + 2, sh(col, 0.1));
        R(c, '#a8743e', sx, sy - 2, w, 3); R(c, '#c99050', sx, sy - 2, w, 1);
        for (let k = sx + 2; k < sx + w; k += 4) R(c, sh(col, -0.2), k, sy + 2, 1, h - 3);
        for (let k = sx + 10; k < sx + w - 8; k += 36) { R(c, '#c9c9d4', k, sy - 9, 2, 7); R(c, '#e8e8f0', k - 2, sy - 9, 6, 2); R(c, '#2a2a2a', k + 1, sy - 6, 2, 1); }
        for (let k = sx + 18; k < sx + w - 6; k += 22) { R(c, '#d8e8f0', k, sy - 6, 3, 4); R(c, '#e8b93c', k, sy - 4, 3, 2); R(c, '#ffffff', k, sy - 6, 3, 1); }  // copo americano
        for (let k = sx + 8; k < sx + w - 6; k += 20) { R(c, OUT, k - 1, sy + h + 1, 8, 4); R(c, '#c9412e', k, sy + h + 2, 6, 2); R(c, '#2a2a2a', k + 2, sy + h + 4, 2, 4); }  // banquinhos
        break;
      }
      case 'table': {
        const felt = id === 'clube' || id === 'arena';
        const cloth = id === 'boteco';
        // cadeiras
        for (let k = sx + 4; k < sx + w - 8; k += 18) { box(k, sy - 7, 8, 5, '#6a4428'); box(k, sy + h + 2, 8, 5, '#6a4428'); }
        box(sx, sy, w, h, felt ? '#6a4428' : col);
        if (felt) {
          R(c, '#1f6b3a', sx + 3, sy + 3, w - 6, h - 6); R(c, '#2f8a4a', sx + 3, sy + 3, w - 6, 1);
          for (let k = 0; k < 8; k++) R(c, '#26784a', sx + 4 + Math.floor(h3(k, sx, 1) * (w - 8)), sy + 4 + Math.floor(h3(k, sy, 2) * (h - 8)));
          blob(c, sx + w / 2, sy + h / 2, Math.min(w, h) / 4, '#287f46');
        } else if (cloth) {
          for (let yy = 0; yy < h - 2; yy += 3) for (let xx = 0; xx < w; xx += 3) R(c, ((xx + yy) / 3) % 2 ? '#f2efe6' : '#c9412e', sx + xx, sy + yy, 3, 3);
          R(c, '#a8301e', sx, sy + h - 3, w, 3);
        }
        // cartas, fichas, copos
        const cx = sx + w / 2, cy = sy + h / 2;
        const card = (x, y, faceUp) => { R(c, OUT, x - 1, y - 1, 7, 9); R(c, faceUp ? '#f4ead2' : '#a8301e', x, y, 5, 7); if (faceUp) { R(c, h3(x, y, 1) > 0.5 ? '#c9412e' : '#1a1a1a', x + 2, y + 2, 1, 3); } else R(c, '#e8b93c', x + 1, y + 1, 3, 5); };
        card(cx - 9, cy - 4, true); card(cx - 2, cy - 5, false); card(cx + 5, cy - 3, true);
        if (felt) { for (let k = 0; k < 3; k++) { R(c, OUT, sx + 5 + k * 3, sy + h - 9, 4, 4); R(c, ['#c9412e', '#2f6fb5', '#f2cf3a'][k], sx + 6 + k * 3, sy + h - 8, 2, 2); } }
        else { R(c, '#d8e8f0', sx + w - 8, sy + 3, 3, 4); R(c, '#e8b93c', sx + w - 8, sy + 5, 3, 2); R(c, '#5a3a1a', sx + 4, sy + 2, 3, 6); R(c, '#5a3a1a', sx + 5, sy, 1, 2); R(c, '#f2efe6', sx + 4, sy + 4, 3, 2); }
        break;
      }
      case 'arcade': {
        box(sx, sy - 6, w, h + 6, col);
        R(c, sh(col, -0.35), sx + w - 4, sy - 6, 4, h + 6); R(c, sh(col, 0.25), sx, sy - 6, 2, h + 6);
        R(c, '#101018', sx + 4, sy + 2, w - 9, 14);       // tela
        R(c, '#3a3a4a', sx + 3, sy + 20, w - 7, 6);        // painel
        R(c, '#c9412e', sx + 7, sy + 19, 3, 3); R(c, '#2a2a2a', sx + 8, sy + 22, 1, 2);
        R(c, '#f2cf3a', sx + 15, sy + 21, 2, 2); R(c, '#5ae0ff', sx + 19, sy + 21, 2, 2);
        R(c, '#2a2a2a', sx + 6, sy + h - 6, w - 11, 3); R(c, '#e8b93c', sx + 10, sy + h - 5, 3, 1);   // ficha
        break;
      }
      case 'pew': {
        box(sx, sy + 2, w, h - 2, col); R(c, sh(col, -0.25), sx, sy - 6, w, 8); R(c, sh(col, 0.15), sx, sy - 6, w, 1);
        R(c, OUT, sx - 1, sy - 7, 1, h + 7); R(c, OUT, sx + w, sy - 7, 1, h + 7);
        R(c, '#c9412e', sx + 4, sy + 5, 6, 2); R(c, '#f2efe6', sx + w - 10, sy + 5, 5, 3);   // missal
        break;
      }
      case 'altar': {
        box(sx, sy, w, h, '#f2efe6'); R(c, '#e8b93c', sx, sy + 4, w, 2); R(c, '#c9412e', sx + w / 2 - 6, sy + 6, 12, h - 8);
        R(c, '#e8b93c', sx + w / 2 - 1, sy + 8, 2, 10); R(c, '#e8b93c', sx + w / 2 - 4, sy + 11, 8, 2);
        for (const k of [sx + 5, sx + w - 8]) { R(c, '#f2efe6', k, sy - 6, 3, 7); R(c, '#e8b93c', k - 1, sy, 5, 1); }
        for (const k of [sx + 12, sx + w - 16]) { R(c, '#5a8a3a', k + 1, sy - 6, 1, 6); R(c, '#ff7aa8', k, sy - 8, 3, 3); R(c, '#c9c2b0', k - 1, sy - 2, 5, 3); }
        break;
      }
      case 'counter': {
        box(sx, sy - 2, w, h + 2, col);
        R(c, sh(col, 0.3), sx, sy - 2, w, 3);
        for (let k = sx + 4; k < sx + w - 4; k += 12) R(c, sh(col, -0.2), k, sy + 3, 8, h - 6);
        R(c, OUT, sx + w - 22, sy - 11, 14, 10); R(c, '#4a4a54', sx + w - 21, sy - 10, 12, 8); R(c, '#9aff9a', sx + w - 19, sy - 9, 8, 3);   // caixa registradora
        if (id === 'loterica') for (let k = sx + 6; k < sx + w - 30; k += 9) { R(c, '#f2efe6', k, sy - 5, 6, 4); R(c, '#1f5aa8', k + 1, sy - 4, 4, 1); R(c, '#f2cf3a', k + 1, sy - 3, 2, 1); }
        else { for (let k = sx + 6; k < sx + w - 30; k += 8) { R(c, '#d8e8f0', k, sy - 6, 3, 5); R(c, '#e8b93c', k, sy - 3, 3, 2); } }
        break;
      }
      case 'poster': {
        box(sx, sy - 4, w, h + 2, '#e8e0cc');
        R(c, col, sx + 3, sy - 1, w - 6, 6); ptext(c, id === 'loterica' ? (f.x < 5 ? 'MEGA' : 'BICHO') : 'TRUCO', sx + 5, sy, '#ffffff');
        for (let k = 0; k < 5; k++) blob(c, sx + 6 + k * 8, sy + 9, 2, ['#c9412e', '#2f8f3e', '#2f6fb5', '#f2cf3a', '#9a3fc9'][k]);
        break;
      }
      case 'board': {
        box(sx, sy - 3, w, h + 3, col);
        R(c, '#d9bd82', sx + 3, sy, w - 6, 2);
        ptext(c, 'PED.', sx + 6, sy + 5, '#f2efe6');
        ptext(c, 'HOJE', sx + 6, sy + 14, '#f2cf3a');
        break;
      }
      case 'sofa': {
        box(sx, sy, w, h, col);
        R(c, sh(col, -0.25), sx, sy, w, 8); R(c, sh(col, -0.35), sx, sy, 5, h); R(c, sh(col, -0.35), sx + w - 5, sy, 5, h);
        for (let k = sx + 6; k < sx + w - 8; k += (w - 12) / 2) { R(c, sh(col, 0.15), k, sy + 9, (w - 14) / 2, h - 13); R(c, sh(col, 0.3), k, sy + 9, (w - 14) / 2, 1); }
        R(c, '#f2cf3a', sx + 8, sy + 4, 6, 6); R(c, '#e8a020', sx + 8, sy + 9, 6, 1);   // almofada
        break;
      }
      case 'bed': {
        box(sx, sy, w, h, '#6a4a35');
        R(c, '#f2efe6', sx + 3, sy + 3, w - 6, 11);
        R(c, '#6a9ac9', sx + 3, sy + 15, w - 6, h - 18);
        R(c, '#f2efe6', sx + 6, sy + 5, Math.max(12, w / 3), 7);
        R(c, '#c9412e', sx + 5, sy + h - 4, w - 10, 3);
        break;
      }
      case 'fridge': {
        box(sx, sy - 3, w, h + 3, '#b8c2c4');
        R(c, '#dce4e3', sx + 3, sy, w - 6, h - 4);
        R(c, '#68777a', sx + w - 7, sy + 7, 2, h - 16);
        R(c, '#7fc4e0', sx + 3, sy + 3, w - 6, 2);
        R(c, '#c9412e', sx + 5, sy + 5, 4, 3);
        R(c, '#2f8f4e', sx + 11, sy + 6, 4, 2);
        break;
      }
      case 'plant': {
        const px = sx + w / 2;
        R(c, OUT, px - 7, sy + h - 11, 14, 11); R(c, '#b5603a', px - 6, sy + h - 10, 12, 9); R(c, '#d0784a', px - 6, sy + h - 10, 12, 2);
        const g = ['#1e5c2a', '#2f7a36', '#45a04a', '#6fc260'];
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI / 2 + (k - 3) * 0.45;
          for (let r = 0; r < 12; r++) R(c, g[Math.min(3, Math.floor(r / 3))], Math.round(px + Math.cos(a) * r), Math.round(sy + h - 10 + Math.sin(a) * r), 2, 2);
        }
        break;
      }
      case 'stage': {
        box(sx, sy, w, h, '#2a1e30'); R(c, col, sx, sy + h - 6, w, 3);
        for (const k of [sx + 2, sx + w - 12]) { R(c, OUT, k - 1, sy - 13, 12, 17); R(c, '#1c1c24', k, sy - 12, 10, 15); blob(c, k + 5, sy - 7, 3, '#4a4a5a'); blob(c, k + 5, sy - 7, 1, '#9a9aaa'); blob(c, k + 5, sy, 2, '#4a4a5a'); }
        R(c, '#9a9aaa', sx + w / 2, sy - 10, 1, 14); R(c, '#2a2a2a', sx + w / 2 - 1, sy - 12, 3, 3);   // microfone
        break;
      }
      case 'bench': {
        if (id === 'oficina') {
          box(sx, sy, w, h, col);
          R(c, OUT, sx + 4, sy + 3, 12, 7); R(c, '#c9412e', sx + 5, sy + 4, 10, 5); R(c, '#a8301e', sx + 5, sy + 6, 10, 1); R(c, '#e8e0cc', sx + 9, sy + 3, 2, 1);
          R(c, '#c9c9d4', sx + w - 14, sy + 6, 10, 2); R(c, '#c9c9d4', sx + w - 6, sy + 4, 3, 6);   // chave inglesa
          R(c, '#f2cf3a', sx + 20, sy + 8, 6, 3);
        } else {
          box(sx, sy - 6, w, h + 4, sh(col, 0.2));
          for (let k = 0; k < 3; k++) R(c, sh(col, -0.2 + k * 0.15), sx, sy - 6 + k * 5, w, 2);
          for (let k = 0; k < 3; k++) { const pc = ['#c9412e', '#2f6fb5', '#f2cf3a'][k]; R(c, pc, sx + 6 + k * 13, sy - 10, 6, 4); R(c, '#f0c49a', sx + 7 + k * 13, sy - 14, 4, 4); }  // torcida
        }
        break;
      }
      default: box(sx, sy, w, h, col);
    }
  }

  function buildInteriorBase(sc) {
    const d = sc.def, id = sc.id;
    const PAD = 40;
    const [cv, c] = mk(sc.w * TS + PAD * 2, sc.h * TS + PAD * 2);
    const X = PAD, Y = PAD, Wd = sc.w * TS, Ht = sc.h * TS;
    // sombra e paredes externas
    R(c, 'rgba(0,0,0,0.5)', X - 6, Y - 6, Wd + 12, Ht + 14);
    for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) {
      const t = sc.map[y][x];
      if (t === 10 || t === 12 || t === 13) floorTile(c, id, d, x, y, X + x * TS, Y + y * TS, sc);
    }
    // tapete central (casa e prédio)
    if (id === 'casa' || id === 'predio' || id === 'igreja') {
      const ex = sc.exit.x;
      if (id === 'igreja') { R(c, '#8a1a20', X + ex * TS - 4, Y + 2 * TS, 24, (sc.h - 3) * TS); R(c, '#e8b93c', X + ex * TS - 4, Y + 2 * TS, 2, (sc.h - 3) * TS); R(c, '#e8b93c', X + ex * TS + 18, Y + 2 * TS, 2, (sc.h - 3) * TS); }
      else {
        const rx = X + 4 * TS, ry = Y + 4 * TS, rw = (sc.w - 8) * TS, rh = 4 * TS;
        R(c, '#7a2a3a', rx, ry, rw, rh); R(c, '#e8b93c', rx + 2, ry + 2, rw - 4, 1); R(c, '#e8b93c', rx + 2, ry + rh - 3, rw - 4, 1);
        for (let k = rx + 8; k < rx + rw - 8; k += 10) { R(c, '#c9a43f', k, ry + rh / 2 - 1, 3, 3); }
      }
    }
    if (id === 'arena') {                               // ringue pintado
      const cx = X + Wd / 2, cy = Y + Ht / 2 + 4;
      c.strokeStyle = '#e8b93c'; c.lineWidth = 1;
      for (let a = 0; a < 6.28; a += 0.02) R(c, '#c9a43f', Math.round(cx + Math.cos(a) * 92), Math.round(cy + Math.sin(a) * 60));
    }
    if (id === 'oficina') { for (let k = X + TS; k < X + Wd - TS; k += 8) { R(c, '#f2cf3a', k, Y + Ht - 2 * TS - 2, 4, 3); R(c, '#1a1a1a', k + 4, Y + Ht - 2 * TS - 2, 4, 3); } }
    // parede de fundo e laterais
    wallFace(c, id, d, X, Y, Wd);
    wallDeco(c, id, d, X, Y, Wd);
    R(c, sh(d.wall, -0.45), X, Y, TS, Ht); R(c, sh(d.wall, -0.2), X + TS - 3, Y + 2 * TS, 3, Ht - 3 * TS);
    R(c, sh(d.wall, -0.45), X + Wd - TS, Y, TS, Ht); R(c, sh(d.wall, -0.6), X + Wd - TS, Y + 2 * TS, 3, Ht - 3 * TS);
    R(c, sh(d.wall, -0.5), X, Y + Ht - TS, Wd, TS); R(c, d.trim, X, Y + Ht - TS, Wd, 2);
    // tapete de saída
    const ex = X + sc.exit.x * TS, ey = Y + sc.exit.y * TS;
    R(c, '#2a1a10', ex - 2, ey, TS + 4, TS); R(c, '#a8743e', ex - 1, ey + 2, TS + 2, TS - 4); R(c, '#e8b93c', ex + 2, ey + 5, TS - 4, 2); R(c, '#c99050', ex + 2, ey + 9, TS - 4, 1);
    // móveis
    const deco = [...d.deco].sort((a, b) => a.y - b.y);
    for (const f of deco) decoDraw(c, id, f, X + f.x * TS, Y + f.y * TS);
    // luminárias penduradas
    for (const l of (d.lamps || [])) {
      const lx = X + l.x * TS + 8, ly = Y + l.y * TS;
      R(c, '#1a1210', lx, Y + 4, 1, ly - Y - 2);
      R(c, OUT, lx - 6, ly + 1, 13, 6); R(c, d.trim, lx - 5, ly + 2, 11, 4); R(c, sh(d.trim, 0.3), lx - 5, ly + 2, 11, 1);
      R(c, '#fff0b0', lx - 2, ly + 6, 5, 2);
    }
    sc._base = cv; sc._pad = PAD;
  }

  W0.drawInterior = function () {
    const s = this.scene, d = s.def, id = s.id;
    const ctx = this.ctx, Wv = this.canvas.width, Hv = this.canvas.height, t = this.t;
    if (!s._base) buildInteriorBase(s);
    const mapW = s.w * TS, mapH = s.h * TS;
    this.updateCam(mapW, mapH, Wv, Hv);
    const ox = Math.floor(this.camX), oy = Math.floor(this.camY);

    // lado de fora: noite estrelada
    ctx.fillStyle = '#0a0f14'; ctx.fillRect(0, 0, Wv, Hv);
    for (let i = 0; i < 40; i++) {
      const sx = Math.floor(h3(i, 1, 1) * Wv), sy = Math.floor(h3(i, 2, 1) * Hv);
      R(ctx, ((t / 20 + i) % 7) < 1 ? '#ffffff' : '#3a4a5a', sx, sy);
    }
    ctx.drawImage(s._base, -ox - s._pad, -oy - s._pad);

    // animações específicas
    const X = -ox, Y = -oy;
    if (id === 'baile') {                                // pista de dança piscando
      const cs = ['#ff5ad0', '#5ae0ff', '#f2e14a', '#9aff5a', '#9a5aff'];
      for (let y = 5; y < 8; y++) for (let x = 3; x < s.w - 3; x++) {
        const k = (x + y + Math.floor(t / 12)) % 5;
        ctx.fillStyle = cs[k]; ctx.globalAlpha = 0.35 + ((x * y + Math.floor(t / 8)) % 3) * 0.12;
        ctx.fillRect(X + x * TS + 1, Y + y * TS + 1, TS - 2, TS - 2);
      }
      ctx.globalAlpha = 1;
      // globo espelhado
      const gx = X + mapW / 2, gy = Y + 3 * TS;
      R(ctx, '#9a9aaa', gx, Y + 4, 1, gy - Y - 8);
      blob(ctx, gx, gy, 6, OUT); blob(ctx, gx, gy, 5, '#c9c9d4');
      for (let k = 0; k < 8; k++) R(ctx, (k + Math.floor(t / 6)) % 3 ? '#ffffff' : '#8a8a9a', gx - 4 + (k % 4) * 2, gy - 3 + Math.floor(k / 4) * 3, 2, 2);
      for (let k = 0; k < 10; k++) { const a = k * 0.63 + t / 40; R(ctx, cs[k % 5], Math.round(gx + Math.cos(a) * (30 + k * 6)), Math.round(gy + 20 + Math.sin(a) * (16 + k * 4)), 2, 2); }
    }
    if (id === 'fliperama') {
      for (const f of d.deco) if (f.t === 'arcade') {
        const sx = X + f.x * TS + 4, sy = Y + f.y * TS + 2, w = f.w * TS - 9;
        const ph = Math.floor(t / 8 + f.x);
        R(ctx, '#101018', sx, sy, w, 14);
        for (let k = 0; k < 4; k++) R(ctx, ['#ff5ad0', '#5ae0ff', '#f2e14a', '#9aff5a'][(k + ph) % 4], sx + 2 + ((k * 5 + ph * 2) % (w - 4)), sy + 2 + ((k * 3 + ph) % 10), 2, 2);
        R(ctx, '#ffffff', sx + 2 + (ph * 3) % (w - 4), sy + 11, 3, 1);
        R(ctx, f.c, sx - 2, sy - 8, w + 4, 4); R(ctx, ph % 2 ? '#ffffff' : sh(f.c, 0.4), sx, sy - 7, w, 2);
      }
    }
    if (id === 'igreja' || id === 'casa') {              // velas tremendo
      for (const f of d.deco) if (f.t === 'altar') {
        for (const k of [X + f.x * TS + 5, X + (f.x + f.w) * TS - 8]) {
          const fy = Y + f.y * TS - 9 - (t % 10 < 5 ? 1 : 0);
          R(ctx, '#ffb030', k, fy, 3, 3); R(ctx, '#fff0a0', k + 1, fy + 1, 1, 2);
          ctx.globalCompositeOperation = 'lighter'; glow(ctx, k + 1, fy + 1, 12, 'rgba(255,180,60,A)', 0.3); ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
    if (id === 'arena' || id === 'baile') {              // holofotes
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const bx = X + (k ? mapW - 30 : 30), by = Y + 20;
        const a = Math.PI / 2 + Math.sin(t / 45 + k * 3) * 0.6;
        ctx.fillStyle = id === 'baile' ? (k ? 'rgba(255,90,208,0.10)' : 'rgba(90,224,255,0.10)') : 'rgba(255,240,180,0.09)';
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a - 0.2) * 200, by + Math.sin(a - 0.2) * 200);
        ctx.lineTo(bx + Math.cos(a + 0.2) * 200, by + Math.sin(a + 0.2) * 200);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // luz das luminárias + poeirinha no ar
    ctx.globalCompositeOperation = 'lighter';
    for (const l of (d.lamps || [])) {
      const lx = X + l.x * TS + 8, ly = Y + l.y * TS + 8;
      glow(ctx, lx, ly, 44 + Math.sin(t / 11 + l.x) * 2, 'rgba(255,214,140,A)', 0.2);
      for (let k = 0; k < 4; k++) {
        const px = lx - 16 + ((k * 11 + t * 0.2) % 32), py = ly + ((k * 9 + t * 0.15) % 34);
        R(ctx, 'rgba(255,240,200,0.5)', Math.round(px), Math.round(py));
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    this.drawNpcs(ox, oy);

    // placa com o nome do lugar
    if (typeof T !== 'undefined') {
      const nm = T.t(d.nameKey);
      const tw = textW(nm) * 2 + 14;
      const ty = Math.min(Hv - 26, Math.max(56, Y - 22));
      const tx = Math.round(Wv / 2 - tw / 2);
      R(ctx, OUT, tx - 1, ty - 1, tw + 2, 18); R(ctx, '#3a2414', tx, ty, tw, 16); R(ctx, '#6a4428', tx, ty, tw, 1); R(ctx, d.trim, tx + 2, ty + 2, tw - 4, 1);
      R(ctx, '#2a1a10', tx + 6, ty - 6, 1, 5); R(ctx, '#2a1a10', tx + tw - 7, ty - 6, 1, 5);
      ctx.save(); ctx.translate(tx + 7, ty + 4); ctx.scale(2, 2); ptext(ctx, nm, 0, 0, '#f2e0b0', '#00000088'); ctx.restore();
    }

    const g2 = ctx.createRadialGradient(Wv / 2, Hv / 2, Hv * 0.3, Wv / 2, Hv / 2, Hv * 0.8);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, Wv, Hv);
  };

  W0.drawRain = function (Wv, Hv, light) {
    const ctx = this.ctx, t = this.t;
    ctx.fillStyle = light ? 'rgba(60,80,110,0.12)' : 'rgba(30,50,90,0.22)'; ctx.fillRect(0, 0, Wv, Hv);
    if (light) {                                         // garoa: fina, devagar, sem raio
      for (let i = 0; i < 60; i++) {
        const x = Math.floor((h3(i, 3) * Wv * 1.4 - t * 0.6 + i * 9) % (Wv + 40)) - 20;
        const y = Math.floor((h3(i, 9) * Hv + t * 1.6 + i * 13) % (Hv + 30)) - 15;
        R(ctx, 'rgba(200,220,255,0.4)', x, y, 1, 2);
      }
      return;
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.floor((h3(i, 3) * Wv * 1.4 - t * 1.6 + i * 9) % (Wv + 40)) - 20;
      const y = Math.floor((h3(i, 9) * Hv + t * 3.4 + i * 13) % (Hv + 30)) - 15;
      R(ctx, 'rgba(190,215,255,0.55)', x, y, 1, 4); R(ctx, 'rgba(190,215,255,0.3)', x - 1, y + 4, 1, 2);
    }
    for (let i = 0; i < 14; i++) {                       // respingos
      const k = Math.floor(t / 5) + i;
      const x = Math.floor(h3(k, i, 5) * Wv), y = Math.floor(h3(k, i, 6) * Hv);
      R(ctx, 'rgba(210,230,255,0.6)', x - 1, y, 1, 1); R(ctx, 'rgba(210,230,255,0.6)', x + 1, y, 1, 1); R(ctx, 'rgba(210,230,255,0.4)', x, y - 1, 1, 1);
    }
    if (t % 400 < 4) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, Wv, Hv); }   // relâmpago
  };
})();
