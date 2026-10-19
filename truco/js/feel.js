/* ============================================================
   feel.js — tato dos botões: vibração, feedback de pressão
   e repetição de toque. Vale para mouse e dedo.
   ============================================================ */

const Haptic = {
  on: true,
  can: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',

  buzz(pattern) {
    if (!this.on || !this.can) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  },

  tap() { this.buzz(12); },          // toque em botão
  card() { this.buzz(18); },         // carta jogada
  truco() { this.buzz([0, 40, 50, 40]); },
  win() { this.buzz([0, 60, 60, 60, 60, 120]); },
  lose() { this.buzz(180); },
  coin() { this.buzz([0, 15, 40, 15]); },
};

/* Seletores que ganham o feedback de pressão */
const PRESSABLE = '.btn, .chip, .talk, .dpad button, .card--playable, .item-btn, .nb-row--act';

const Feel = {
  init() {
    const root = document.getElementById('app') || document.body;

    // classe .is-press enquanto o dedo está em cima
    const press = (e) => {
      const el = e.target.closest(PRESSABLE);
      if (!el || el.disabled) return;
      el.classList.add('is-press');
    };
    const release = () => {
      document.querySelectorAll('.is-press').forEach((el) => el.classList.remove('is-press'));
    };

    root.addEventListener('pointerdown', press, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });

    // vibração em qualquer botão de interface
    root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.btn, .chip, .item-btn, .talk--on');
      if (el && !el.disabled) Haptic.tap();
    }, { passive: true });

    // evita o zoom por duplo toque e o realce azul do Android
    document.addEventListener('dblclick', (e) => e.preventDefault());
  },
};

window.Haptic = Haptic;
window.Feel = Feel;

/* ============================================================
   ICONS — ícones em SVG pixelado. Emoji depende da fonte do
   aparelho; isso aqui desenha igual em qualquer celular.
   ============================================================ */
const ICONS = {
  wrap(inner, size) {
    return `<svg class="ico" viewBox="0 0 16 16" width="${size || 20}" height="${size || 20}" aria-hidden="true" shape-rendering="crispEdges">${inner}</svg>`;
  },
  notebook(size) {
    return this.wrap(`
      <rect x="3" y="1" width="10" height="14" fill="#c0392b"/>
      <rect x="5" y="1" width="8" height="14" fill="#f4ead2"/>
      <rect x="6" y="4" width="6" height="1" fill="#6b3f1e"/>
      <rect x="6" y="7" width="6" height="1" fill="#6b3f1e"/>
      <rect x="6" y="10" width="4" height="1" fill="#6b3f1e"/>
      <rect x="2" y="3" width="3" height="1" fill="#e8b93c"/>
      <rect x="2" y="8" width="3" height="1" fill="#e8b93c"/>
      <rect x="2" y="12" width="3" height="1" fill="#e8b93c"/>`, size);
  },
  coffee(size) {
    return this.wrap(`
      <rect x="3" y="6" width="8" height="7" fill="#f4ead2"/>
      <rect x="4" y="7" width="6" height="3" fill="#6b3f1e"/>
      <rect x="11" y="7" width="2" height="1" fill="#f4ead2"/>
      <rect x="12" y="8" width="1" height="2" fill="#f4ead2"/>
      <rect x="11" y="10" width="2" height="1" fill="#f4ead2"/>
      <rect x="5" y="3" width="1" height="2" fill="#a99f86"/>
      <rect x="8" y="2" width="1" height="3" fill="#a99f86"/>
      <rect x="2" y="13" width="10" height="1" fill="#1b1109"/>`, size);
  },
  beer(size) {
    return this.wrap(`
      <rect x="3" y="4" width="7" height="10" fill="#e8b93c"/>
      <rect x="3" y="2" width="7" height="2" fill="#fff4d8"/>
      <rect x="4" y="6" width="2" height="2" fill="#fff0b0"/>
      <rect x="10" y="6" width="3" height="1" fill="#f4ead2"/>
      <rect x="12" y="7" width="1" height="3" fill="#f4ead2"/>
      <rect x="10" y="10" width="3" height="1" fill="#f4ead2"/>
      <rect x="3" y="14" width="7" height="1" fill="#1b1109"/>`, size);
  },
  mirror(size) {
    return this.wrap(`
      <rect x="4" y="1" width="8" height="9" fill="#6b3f1e"/>
      <rect x="5" y="2" width="6" height="7" fill="#9fd3e8"/>
      <rect x="6" y="3" width="2" height="3" fill="#f4ead2"/>
      <rect x="7" y="10" width="2" height="5" fill="#6b3f1e"/>
      <rect x="6" y="14" width="4" height="1" fill="#3d2110"/>`, size);
  },
  eye(size) {
    return this.wrap(`
      <rect x="2" y="7" width="12" height="3" fill="#f4ead2"/>
      <rect x="4" y="5" width="8" height="2" fill="#f4ead2"/>
      <rect x="4" y="10" width="8" height="2" fill="#f4ead2"/>
      <rect x="6" y="6" width="4" height="5" fill="#16482f"/>
      <rect x="7" y="7" width="2" height="3" fill="#0d2c1d"/>`, size);
  },
  door(size) {
    return this.wrap(`
      <rect x="2" y="1" width="12" height="14" fill="#6b3f1e"/>
      <rect x="3" y="2" width="10" height="13" fill="#8a5a2e"/>
      <rect x="4" y="3" width="8" height="5" fill="#5a3a1e"/>
      <rect x="4" y="9" width="8" height="5" fill="#5a3a1e"/>
      <rect x="11" y="8" width="2" height="2" fill="#e8b93c"/>`, size);
  },
  map(size) {
    return this.wrap(`
      <rect x="1" y="3" width="14" height="10" fill="#f4ead2"/>
      <rect x="1" y="3" width="4" height="10" fill="#e2d6b8"/>
      <rect x="10" y="3" width="5" height="10" fill="#e2d6b8"/>
      <rect x="3" y="6" width="10" height="1" fill="#6b3f1e"/>
      <rect x="7" y="4" width="1" height="8" fill="#6b3f1e"/>
      <rect x="4" y="9" width="2" height="2" fill="#c0392b"/>`, size);
  },
  cart(size) {
    return this.wrap(`
      <rect x="1" y="3" width="3" height="1" fill="#f4ead2"/>
      <rect x="4" y="4" width="9" height="1" fill="#f4ead2"/>
      <rect x="4" y="5" width="1" height="4" fill="#f4ead2"/>
      <rect x="12" y="5" width="1" height="4" fill="#f4ead2"/>
      <rect x="5" y="9" width="7" height="1" fill="#f4ead2"/>
      <rect x="6" y="6" width="5" height="3" fill="#e8b93c"/>
      <rect x="5" y="12" width="2" height="2" fill="#f4ead2"/>
      <rect x="10" y="12" width="2" height="2" fill="#f4ead2"/>`, size);
  },
};

window.ICONS = ICONS;
