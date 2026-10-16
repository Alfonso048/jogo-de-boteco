/* ============================================================
   collection.js — coleção de versos de carta e panos de mesa.
   Tudo visual: nada aqui muda as regras ou dá vantagem.
   Cada item tem uma condição clara para liberar, conferida no
   fim de cada partida (App.afterMatch → Collection.check).
   ============================================================ */

const Collection = {
  BACKS: [
    { id: 'classico', img: 'assets/cardback.png', key: 'cb_classico', cond: () => true },
    { id: 'xadrez', img: 'assets/back-xadrez.png', key: 'cb_xadrez', cond: (s) => s.wins >= 5 },
    { id: 'tijolo', img: 'assets/back-tijolo.png', key: 'cb_tijolo', cond: (s) => s.storyWins >= 3 },
    { id: 'azulejo', img: 'assets/back-azulejo.png', key: 'cb_azulejo', cond: (s) => s.bestStreak >= 3 },
    { id: 'guarana', img: 'assets/back-guarana.png', key: 'cb_guarana', cond: (s) => s.talks >= 30 },
    { id: 'noite', img: 'assets/back-noite.png', key: 'cb_noite', cond: (s) => s.nightWins >= 1 },
    { id: 'lenda', img: 'assets/back-lenda.png', key: 'cb_lenda', cond: (s) => s.bosses >= 1 },
  ],
  FELTS: [
    { id: 'verde', img: 'assets/table.png', key: 'ft_verde', cond: () => true },
    { id: 'bar', img: 'assets/table-bar.png', key: 'ft_bar', cond: (s) => s.won12 >= 1 },
    { id: 'azul', img: 'assets/table-azul.png', key: 'ft_azul', cond: (s) => s.rainWins >= 1 },
    { id: 'vinho', img: 'assets/table-vinho.png', key: 'ft_vinho', cond: (s) => s.trucoWins >= 10 },
    { id: 'roxo', img: 'assets/table-roxo.png', key: 'ft_roxo', cond: (s) => s.wins >= 25 },
  ],

  owned: { classico: true, verde: true },
  back: 'classico',
  felt: 'verde',

  load(d) {
    if (!d) return;
    this.owned = { classico: true, verde: true, ...(d.owned || {}) };
    if (d.back && this.owned[d.back]) this.back = d.back;
    if (d.felt && this.owned[d.felt]) this.felt = d.felt;
  },
  data() { return { owned: this.owned, back: this.back, felt: this.felt }; },

  find(id) { return this.BACKS.find((b) => b.id === id) || this.FELTS.find((f) => f.id === id); },

  apply() {
    const b = this.find(this.back) || this.BACKS[0];
    const f = this.find(this.felt) || this.FELTS[0];
    const root = document.documentElement.style;
    root.setProperty('--card-back', `url('${new URL(b.img, document.baseURI).href}')`);
    root.setProperty('--table-img', `url('${new URL(f.img, document.baseURI).href}')`);
  },

  /* devolve os itens recém-liberados */
  check(stats) {
    const fresh = [];
    [...this.BACKS, ...this.FELTS].forEach((it) => {
      if (!this.owned[it.id] && it.cond(stats)) { this.owned[it.id] = true; fresh.push(it); }
    });
    return fresh;
  },

  equip(id) {
    if (!this.owned[id]) return false;
    if (this.BACKS.some((b) => b.id === id)) this.back = id; else this.felt = id;
    this.apply();
    return true;
  },

  /* tela da coleção (modal) */
  open(app) {
    const ui = app.ui;
    const box = ui.openModal(T.t('collection'), T.t('collection_d'));
    box.classList.add('coll-modal');
    const info = document.createElement('p');
    info.className = 'coll-info';
    info.textContent = T.t('collection_tip');
    const grid = (title, list) => {
      const h = document.createElement('h4'); h.className = 'coll-h'; h.textContent = title; box.appendChild(h);
      const g = document.createElement('div'); g.className = 'coll-grid'; box.appendChild(g);
      const draw = () => {
        g.innerHTML = '';
        list.forEach((it) => {
          const b = document.createElement('button');
          const isFelt = this.FELTS.includes(it);
          b.className = 'coll-item' + (isFelt ? ' coll-item--felt' : '') + (this.owned[it.id] ? '' : ' coll-item--locked') +
            ((this.back === it.id || this.felt === it.id) ? ' coll-item--on' : '');
          b.style.backgroundImage = `url('${it.img}')`;
          b.setAttribute('aria-label', T.t(it.key));
          b.onclick = () => {
            if (!this.owned[it.id]) { Sound.tone(196, 0.08, 'square', 0.1); info.innerHTML = `<b>${T.t(it.key)}</b> · ${T.t('locked')}: ${T.t(it.key + '_how')}`; return; }
            this.equip(it.id); Sound.tone(784, 0.06, 'triangle', 0.12);
            info.innerHTML = `<b>${T.t(it.key)}</b> · ${T.t('equipped')}`;
            app.persist(); draw();
          };
          g.appendChild(b);
        });
      };
      draw();
    };
    grid(T.t('card_backs'), this.BACKS);
    grid(T.t('table_felts'), this.FELTS);
    box.appendChild(info);
    app.mkBtn(box, T.t('ok_go'), 'btn--accept', () => ui.closeModal());
  },
};

window.Collection = Collection;
