/* ============================================================
   cards.js — baralho de 40 cartas, força e renderização pixel
   ============================================================ */

// Ordem de força natural (sem manilha)
const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
// Naipes: ouros < espadas < copas < paus
const SUITS = ['ouros', 'espadas', 'copas', 'paus'];
const SUIT_POWER = { ouros: 1, espadas: 2, copas: 3, paus: 4 };
const SUIT_COLOR = { ouros: '#8a6410', espadas: '#2c5a85', copas: '#a6281c', paus: '#1f6b3a' };

// Manilhas fixas do Truco Mineiro
const MINEIRO_MANILHAS = { '4paus': 104, '7copas': 103, 'Aespadas': 102, '7ouros': 101 };

function makeDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s, id: r + s });
  return deck;
}

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Define a manilha da rodada (Paulista: corrida pela vira)
function manilhaRankFromVira(vira) {
  const i = RANKS.indexOf(vira.rank);
  return RANKS[(i + 1) % RANKS.length];
}

/**
 * Força da carta.
 * variant: 'paulista' (usa vira) | 'mineiro' (manilhas fixas)
 */
function cardPower(card, ctx) {
  if (ctx.variant === 'mineiro') {
    const fixed = MINEIRO_MANILHAS[card.id];
    if (fixed) return fixed;
    return RANKS.indexOf(card.rank);
  }
  if (ctx.manilhaRank && card.rank === ctx.manilhaRank) {
    return 100 + SUIT_POWER[card.suit];
  }
  return RANKS.indexOf(card.rank);
}

function isManilha(card, ctx) {
  return cardPower(card, ctx) >= 100;
}

/* ---------- Renderização (SVG pixelado dos naipes espanhóis) ---------- */

const SUIT_SVG = {
  ouros: `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">
    <path fill="#7a5c07" d="M3 7h1V5h1V4h2V3h2v1h2v1h1v2h1v2h-1v2h-1v1h-2v1H7v-1H5v-1H4V9H3z"/>
    <path fill="#f2c230" d="M4 7h1V5h2V4h2v1h2v2h1v2h-1v2H9v1H7v-1H5V9H4z"/>
    <path fill="#fff3c4" d="M6 7h1V6h2v1h1v2H9v1H7V9H6z"/></svg>`,
  espadas: `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">
    <path fill="#243b52" d="M7 0h3v9H7z"/>
    <path fill="#8fbde6" d="M8 1h1v8H8z"/>
    <path fill="#cfe6ff" d="M7 1h1v8H7z"/>
    <path fill="#5a3b12" d="M3 9h11v3H3z"/>
    <path fill="#e0b64d" d="M3 9h11v2H3z"/>
    <path fill="#fff0b8" d="M4 9h9v1H4z"/>
    <path fill="#3b2609" d="M7 12h3v4H7z"/>
    <path fill="#6b4a1a" d="M7 12h1v4H7z"/>
    <path fill="#e0b64d" d="M6 15h5v1H6z"/></svg>`,
  copas: `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">
    <path fill="#7a1f13" d="M3 2h10v4h-1v2h-1v1H9v2h1v1h1v2H5v-2h1v-1h1V9H5V8H4V6H3z"/>
    <path fill="#e0503a" d="M4 3h8v3h-1v2h-1v1H9v3h1v1H6v-1h1V9H6V8H5V6H4z"/>
    <path fill="#ffb3a0" d="M5 4h3v2H7v2H6V6H5z"/></svg>`,
  paus: `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">
    <path fill="#2e1a08" d="M4 0h8v4h-1v12H5V4H4z"/>
    <path fill="#2e1a08" d="M2 6h4v3H2z M10 10h4v3h-4z"/>
    <path fill="#8a5a2a" d="M5 1h6v3h-1v11H6V4H5z"/>
    <path fill="#8a5a2a" d="M3 7h3v1H3z M10 11h3v1h-3z"/>
    <path fill="#c08a4a" d="M6 1h2v3H6z M6 5h1v10H6z"/>
    <path fill="#2e1a08" d="M6 7h4v1H6z M6 11h4v1H6z"/>
    <path fill="#2f8f4e" d="M11 2h3v2h-3z M12 0h2v2h-2z"/></svg>`,
};

const FIGURE_LABEL = { Q: 'Q', J: 'J', K: 'K' };

/** Cria o elemento DOM de uma carta */
function renderCard(card, opts = {}) {
  const el = document.createElement('div');
  el.className = 'card' + (opts.small ? ' card--sm' : '');
  if (!card) { el.classList.add('card--back'); return el; }
  if (opts.faceDown) {
    el.classList.add('card--back');
    el.dataset.id = card.id;
    return el;
  }
  el.dataset.id = card.id;
  el.style.setProperty('--suit', SUIT_COLOR[card.suit]);
  const label = FIGURE_LABEL[card.rank] || card.rank;
  el.innerHTML = `
    <span class="card__corner card__corner--tl">${label}</span>
    <span class="card__pip">${SUIT_SVG[card.suit]}</span>
    <span class="card__corner card__corner--br">${label}</span>`;
  if (opts.manilha) el.classList.add('card--manilha');
  return el;
}
