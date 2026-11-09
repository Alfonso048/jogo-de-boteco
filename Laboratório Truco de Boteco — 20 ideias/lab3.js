/* Laboratório 3 — 20 ideias com exemplos mexíveis */
(() => {
const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const card = (r, s, cls = '') => `<div class="mc ${cls}"><i>${r}</i>${(window.SUIT_SVG || {})[s] || s}</div>`;

/* boneco pixelado no canvas */
function person(ctx, x, y, shirt, hat) {
  const R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
  R('rgba(0,0,0,.25)', 1, 15, 10, 3);
  R('#2a2a34', 2, 11, 3, 5); R('#2a2a34', 7, 11, 3, 5);
  R(shirt, 1, 5, 10, 7);
  R('#f0c49a', 3, 0, 6, 6);
  R(hat || '#3a2a1a', 2, -1, 8, 2);
  R('#1b1109', 4, 2, 1, 1); R('#1b1109', 7, 2, 1, 1);
}
function grass(ctx, w, h) {
  ctx.fillStyle = '#3f8a3a'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { ctx.fillStyle = i % 3 ? '#4f9a44' : '#357a32'; ctx.fillRect((i * 37) % w, (i * 53) % h, 2, 2); }
}
function bush(ctx, x, y) { ctx.fillStyle = '#1f5a2a'; ctx.fillRect(x, y + 4, 16, 10); ctx.fillStyle = '#2e7a38'; ctx.fillRect(x + 2, y, 12, 10); ctx.fillStyle = '#4f9a44'; ctx.fillRect(x + 4, y + 2, 4, 3); }
function house(ctx, x, y, w, h, c, roof) {
  ctx.fillStyle = roof; ctx.fillRect(x - 2, y, w + 4, 10);
  ctx.fillStyle = c; ctx.fillRect(x, y + 10, w, h - 10);
  ctx.fillStyle = '#5a3b1a'; ctx.fillRect(x + w / 2 - 4, y + h - 12, 8, 12);
  ctx.fillStyle = '#9ad6ff'; ctx.fillRect(x + 6, y + 16, 8, 6); ctx.fillRect(x + w - 14, y + 16, 8, 6);
}
function loop(fn) { let on = true; const f = (t) => { if (!on) return; fn(t); requestAnimationFrame(f); }; requestAnimationFrame(f); return () => { on = false; }; }

const IDEAS = [
/* 1 */ {
  id: 'Fofocas do bairro (histórias paralelas)', title: 'Fofocas do bairro',
  ref: ['as substories de Yakuza', 'https://www.ign.com/wikis/yakuza-6/Sub_Stories'],
  why: 'Cada pessoa da cidade solta uma fofoca diferente por dia. Algumas viram uma pequena história paralela na caderneta, com começo, meio e fim: descobrir quem rouba no baralho do clube, ajudar a Vó Cotinha a recuperar o baralho do falecido marido. Isso dá motivo para andar pela cidade além de jogar.',
  how: 'No jogo: fofoca nova a cada dia; 6 a 10 histórias curtas; recompensa em fama, dinheiro ou item da coleção.',
  demo(box) {
    const F = [
      ['Dona Cida', '#c94f8a', 'Dizem que o Dimas esconde um ás no chapéu. Quem pegar ele no flagra ganha a mesa.', 'O ás do chapéu'],
      ['Seu Zeca', '#c9a83a', 'A Vó Cotinha perdeu o baralho do marido. Tava no fliperama, aposto.', 'O baralho do Seu Tonico'],
      ['Bereba', '#b5523a', 'Tem um caminhoneiro que só joga quando chove. Fica lá na beira da estrada.', 'O homem da chuva'],
      ['Dudu', '#4a3f8a', 'O fliperama vai fechar se ninguém bater o recorde da máquina roxa.', 'Salvem o Galáxia'],
    ];
    let i = 0;
    const el = $(`<div class="ex"><div class="who"><div class="ava"></div><div><b class="nm"></b><br><span class="bub"></span></div></div>
      <div class="row"><button class="btn">Ouvir outra fofoca</button><button class="btn btn--ok">Anotar na caderneta</button></div><p class="msg"></p></div>`);
    const show = () => { const f = F[i]; el.querySelector('.ava').style.background = f[1]; el.querySelector('.ava').textContent = f[0][0]; el.querySelector('.nm').textContent = f[0]; el.querySelector('.bub').textContent = f[2]; };
    const [b1, b2] = el.querySelectorAll('button');
    b1.onclick = () => { i = (i + 1) % F.length; show(); el.querySelector('.msg').textContent = ''; };
    b2.onclick = () => { el.querySelector('.msg').innerHTML = `Nova história na caderneta: <b>${F[i][3]}</b> (0 de 3 passos)`; };
    show(); box.appendChild(el);
  },
},
/* 2 */ {
  id: 'Amizade com corações', title: 'Amizade com corações',
  ref: ['a amizade de Stardew Valley', 'https://stardewvalleywiki.com/Friendship'],
  why: 'Cada personagem tem corações de amizade. Sobem quando você joga com ele, paga uma rodada ou ajuda numa fofoca. Com mais corações, a pessoa conta segredos, libera uma cena curta e passa a te dar dicas na mesa.',
  how: 'No jogo: 0 a 5 corações por personagem; cenas em 2 e 4 corações; a amizade cai devagar se você sumir.',
  demo(box) {
    let h = 1;
    const R = ['1 ♥: te cumprimenta pelo nome', '2 ♥: cena curta: a história do apelido', '3 ♥: avisa quando o adversário blefa muito', '4 ♥: cena: o jogo que ele perdeu para a Lenda', '5 ♥: te dá o verso de carta dele'];
    const el = $(`<div class="ex"><div class="who"><div class="ava" style="background:#c9a83a">Z</div><div><b>Seu Zeca</b><div class="hearts"></div></div></div>
      <div class="row"><button class="btn">Jogar uma partida</button><button class="btn">Pagar uma rodada (R$ 5)</button><button class="btn btn--no">Sumir 7 dias</button></div><ul class="list"></ul></div>`);
    const draw = () => {
      el.querySelector('.hearts').innerHTML = [0, 1, 2, 3, 4].map((k) => `<span class="${k < h ? 'on' : ''}">♥</span>`).join('');
      el.querySelector('.list').innerHTML = R.map((r, k) => `<li class="${k < h ? 'on' : ''}">${r}</li>`).join('');
    };
    const b = el.querySelectorAll('button');
    b[0].onclick = () => { h = Math.min(5, h + 0.5); draw(); };
    b[1].onclick = () => { h = Math.min(5, h + 1); draw(); };
    b[2].onclick = () => { h = Math.max(0, h - 1); draw(); };
    draw(); box.appendChild(el);
  },
},
/* 3 */ {
  id: 'Parceiro de dupla com elo', title: 'Parceiro fixo de dupla',
  ref: ['os Confidentes de Persona 5', 'https://www.polygon.com/persona-5-guide-walkthrough/2017/5/8/15540658/confidants-ohya-iwai-kawakami-sojiro/'],
  why: 'No truco de 4 você escolhe um parceiro fixo da cidade. Quanto mais jogam juntos, mais o elo sobe, e cada nível libera uma habilidade de dupla. Cada parceiro tem um jeito: um é agressivo, outro é seguro.',
  how: 'No jogo: 3 ou 4 parceiros possíveis; elo de 1 a 5; uma habilidade por nível, usada uma vez por partida.',
  demo(box) {
    const P = {
      cida: ['Dona Cida', '#c94f8a', ['Avisa se tem manilha na mão (sim ou não)', 'Aceita truco sozinha quando você está no fiado', 'Uma vez por partida, mostra uma carta dela', 'Pede seis quando sente o blefe', 'Combo: carta dela + sua vale dobrado na mão de 11']],
      bereba: ['Bereba', '#b5523a', ['Pede truco mais cedo (pressão)', 'Adversário erra mais o tempo de resposta', 'Uma vez por partida, corre no seu lugar sem perder ponto', 'Blefe dele engana bots fáceis sempre', 'Combo: truco dele vale 4 de cara']],
    };
    let who = 'cida', lv = 1;
    const el = $(`<div class="ex"><div class="seg"><button data-w="cida" class="on">Dona Cida (segura)</button><button data-w="bereba">Bereba (agressivo)</button></div>
      <div class="row"><span class="small">Elo:</span><div class="bar" style="flex:1"><i></i></div><button class="btn">Jogar junto</button></div><ul class="list"></ul></div>`);
    const draw = () => {
      el.querySelector('.bar i').style.width = (lv / 5 * 100) + '%';
      el.querySelector('.list').innerHTML = P[who][2].map((r, k) => `<li class="${k < lv ? 'on' : ''}">Nível ${k + 1}: ${r}</li>`).join('');
    };
    el.querySelectorAll('.seg button').forEach((b) => b.onclick = () => { el.querySelectorAll('.seg button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); who = b.dataset.w; lv = 1; draw(); });
    el.querySelector('.row .btn').onclick = () => { lv = Math.min(5, lv + 1); draw(); };
    draw(); box.appendChild(el);
  },
},
/* 4 */ {
  id: 'Manias do boteco (curingas que mudam a partida)', title: 'Manias do boteco',
  ref: ['os Coringas de Balatro', 'https://balatrowiki.org/w/Jokers'],
  why: 'Antes de uma partida grande você escolhe 1 de 3 "manias", que são superstições de boteco que mudam uma regra pequena. Você pode levar até 3 ativas. Isso deixa cada partida do modo história diferente e cria combinações.',
  how: 'No jogo: umas 25 manias com raridade; compradas com dinheiro ou ganhas de chefes; só no modo história.',
  demo(box) {
    const M = [
      ['Pé-quente', 'A primeira mão da partida vale 2.', 'comum'], ['Fiado', 'Perder uma mão por 1 ponto não conta, 1 vez.', 'comum'],
      ['Copo meio cheio', 'Ganhar com o 4 de paus dá +1 ponto.', 'rara'], ['Olho de gato', 'Na mão de 11, vê uma carta do adversário.', 'rara'],
      ['Fala mansa', 'Seu truco faz o bot fácil correr mais.', 'comum'], ['Saideira', 'Se estiver perdendo de 10, sua próxima mão vale 3.', 'lendária'],
      ['Baralho viciado', 'A vira é sorteada 2 vezes e você escolhe.', 'lendária'], ['Cerveja gelada', '+5 segundos por turno.', 'comum'],
    ];
    const act = [];
    const el = $(`<div class="ex"><div class="jk"></div><div class="row"><button class="btn">Trocar opções (R$ 3)</button></div><div class="slots"></div></div>`);
    const deal = () => {
      const opts = [...M].sort(() => Math.random() - 0.5).slice(0, 3);
      const jk = el.querySelector('.jk'); jk.innerHTML = '';
      opts.forEach((m) => { const b = $(`<button><b>${m[0]}</b>${m[1]}<span class="rar">${m[2]}</span></button>`); b.onclick = () => { if (act.length >= 3) act.shift(); act.push(m[0]); slots(); deal(); }; jk.appendChild(b); });
    };
    const slots = () => { el.querySelector('.slots').innerHTML = [0, 1, 2].map((k) => `<span class="${act[k] ? 'on' : ''}">${act[k] || 'vazio'}</span>`).join(''); };
    el.querySelector('.row .btn').onclick = deal;
    deal(); slots(); box.appendChild(el);
  },
},
/* 5 */ {
  id: 'Chefes com regra própria e virada no meio', title: 'Chefes com regra própria',
  ref: ['os chefes de Inscryption', 'https://www.ign.com/wikis/inscryption/Boss_Guide'],
  why: 'Cada chefe muda uma regra da mesa e, quando chega na metade da partida, entra numa "segunda fase" com outra regra, com aviso, música nova e falas. Fica parecendo uma luta de verdade, e não só um bot mais difícil.',
  how: 'No jogo: um chefe por bairro + a Lenda; cada um com 2 fases; derrotar libera uma mania ou um verso de carta.',
  demo(box) {
    const B = [
      ['Seu Bigode', 'Fase 1: a vira fica escondida até a 2ª rodada.', 'Fase 2 (6 pontos): ele pode trocar uma carta com o morto uma vez.'],
      ['Síndico Valdir', 'Fase 1: cada turno tem só 10 segundos.', 'Fase 2: quem pedir truco e perder, perde 2 pontos a mais.'],
      ['A Lenda do Norte', 'Fase 1: ela joga com uma carta aberta.', 'Fase 2: a manilha muda no meio da mão.'],
    ];
    let i = 2, ph = 1;
    const el = $(`<div class="ex"><div class="who"><div class="ava" style="background:#e8b93c">♛</div><div><b class="nm"></b><br><span class="small ph"></span></div></div>
      <p class="bub rule" style="margin-top:10px"></p><div class="row"><button class="btn">Outro chefe</button><button class="btn btn--truco">Chegar a 6 pontos</button></div></div>`);
    const draw = () => { el.querySelector('.nm').textContent = B[i][0]; el.querySelector('.ph').textContent = ph === 1 ? 'Fase 1' : 'FASE 2: a música muda e a mesa treme'; el.querySelector('.rule').textContent = ph === 1 ? B[i][1] : B[i][2]; el.querySelector('.rule').style.background = ph === 1 ? '' : '#ffcf7a'; };
    const b = el.querySelectorAll('.btn');
    b[0].onclick = () => { i = (i + 1) % B.length; ph = 1; draw(); };
    b[1].onclick = () => { ph = 2; draw(); el.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 }); };
    draw(); box.appendChild(el);
  },
},
/* 6 */ {
  id: 'Olhar de desafiante (te chamam quando te veem)', title: 'Olhar de desafiante',
  ref: ['os treinadores de Pokémon', 'https://pokemonworkshop.com/en/help/pokemon-sdk/create-a-trainer-battle'],
  why: 'Alguns jogadores ficam andando de um lado para o outro e olhando para frente. Se você passar na frente, aparece o "!", ele vem até você e te chama para uma partida. Dá para desviar por trás. A cidade fica mais viva e com um pouco de tensão.',
  how: 'No jogo: 1 ou 2 por bairro; só desafiam até você vencer; aposta pequena.',
  demo(box) {
    const el = $(`<div class="ex"><canvas width="240" height="120"></canvas><div class="row"><button class="btn" data-d="-1">◀</button><button class="btn" data-d="1">▶</button><span class="small">Passe pela frente do jogador.</span></div><p class="msg"></p></div>`);
    const c = el.querySelector('canvas'), ctx = c.getContext('2d');
    let px = 10, nx = 150, face = -1, seen = false, t = 0, walk = 0;
    el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { if (!seen) px = Math.max(4, Math.min(220, px + b.dataset.d * 14)); });
    loop(() => {
      t++; grass(ctx, 240, 120);
      ctx.fillStyle = '#555'; ctx.fillRect(0, 74, 240, 24); ctx.fillStyle = '#e8b93c'; for (let k = 0; k < 240; k += 24) ctx.fillRect(k, 85, 12, 2);
      if (!seen && t % 120 === 0) face *= -1;
      const cone = face < 0 ? [nx - 90, nx] : [nx + 12, nx + 100];
      ctx.fillStyle = seen ? 'rgba(255,90,90,.25)' : 'rgba(255,240,150,.18)'; ctx.fillRect(cone[0], 70, cone[1] - cone[0], 30);
      if (!seen && px + 12 > cone[0] && px < cone[1]) { seen = true; walk = 0; el.querySelector('.msg').innerHTML = '<b>Ei, você aí!</b> Senta aqui que eu te ensino truco.'; }
      if (seen && walk < 40) { nx += (px + 16 < nx ? -1 : 1) * 1.2; walk++; }
      person(ctx, px, 74, '#3f7fc9');
      person(ctx, nx, 74, '#8a3f6f', '#c0392b');
      if (seen) { ctx.fillStyle = '#fff'; ctx.fillRect(nx + 3, 56, 7, 12); ctx.fillStyle = '#c0392b'; ctx.fillRect(nx + 5, 58, 3, 5); ctx.fillRect(nx + 5, 64, 3, 2); }
      if (seen && walk >= 40 && t % 240 === 0) { seen = false; nx = 150; px = 10; el.querySelector('.msg').textContent = ''; }
    });
    box.appendChild(el);
  },
},
/* 7 */ {
  id: 'Rotina dos personagens (cada um num lugar por hora)', title: 'Rotina dos personagens',
  ref: ['as rotinas dos moradores de Stardew Valley', 'https://stardewvalleywiki.com/Modding:Schedule_data'],
  why: 'Com o relógio novo, cada pessoa pode ter uma rotina: de manhã na feira, à tarde na praça, à noite no boteco. Alguns só aparecem num horário, como o caminhoneiro que só joga de madrugada. A cidade passa a parecer habitada.',
  how: 'No jogo: 3 a 4 horários por personagem; a caderneta mostra onde cada um costuma estar.',
  demo(box) {
    const S = { 'Seu Zeca': ['Feira', 'Praça', 'Boteco', 'Casa'], 'Dona Cida': ['Mercado', 'Igreja', 'Praça', 'Boteco'], 'Dudu': ['Casa', 'Fliperama', 'Fliperama', 'Baile'], 'Caminhoneiro': ['-', '-', '-', 'Posto (só de madrugada)'] };
    const H = ['Manhã 8h', 'Tarde 14h', 'Noite 20h', 'Madrugada 2h'];
    const el = $(`<div class="ex"><div class="tl"></div><ul class="list"></ul></div>`);
    let h = 0;
    const draw = () => {
      el.querySelector('.tl').innerHTML = H.map((x, k) => `<button class="${k === h ? 'on' : ''}" data-k="${k}">${x}</button>`).join('');
      el.querySelectorAll('.tl button').forEach((b) => b.onclick = () => { h = +b.dataset.k; draw(); });
      el.querySelector('.list').innerHTML = Object.entries(S).map(([n, l]) => `<li class="${l[h] !== '-' ? 'on' : ''}">${n}: ${l[h] === '-' ? 'sumido' : l[h]}</li>`).join('');
    };
    draw(); box.appendChild(el);
  },
},
/* 8 */ {
  id: 'Quadro de pedidos no boteco', title: 'Quadro de pedidos',
  ref: ['o quadro de Help Wanted de Stardew Valley', 'https://www.ign.com/wikis/stardew-valley/Help_Wanted_Quests'],
  why: 'Um quadro de cortiça na parede do boteco com pedidos que mudam todo dia: "ganhe do Dudu sem pedir truco", "traga um guaraná pro Bigode", "vença uma mão de 11 às cegas". Paga dinheiro e amizade. É o que faz a pessoa abrir o jogo só para fazer "uma coisinha".',
  how: 'No jogo: 3 pedidos por dia, com prazo de 2 dias; alguns são desafios de jogo, outros de andar pela cidade.',
  demo(box) {
    const P = [['Bigode', 'Ganhe do Dudu sem pedir truco.', 'R$ 15 + 1 ♥'], ['Vó Cotinha', 'Traga um guaraná do mercado.', 'R$ 5 + 1 ♥'], ['Padre', 'Vença uma mão de 11 às cegas.', 'R$ 25'], ['Dona Cida', 'Ganhe 2 partidas antes das 18h.', 'R$ 20'], ['Dete', 'Encontre 1 tampinha escondida.', 'Raspadinha grátis']];
    const el = $(`<div class="ex"><div class="board"></div><div class="row"><button class="btn">Passar o dia</button></div><p class="msg"></p></div>`);
    const draw = () => {
      const b = el.querySelector('.board'); b.innerHTML = '';
      [...P].sort(() => Math.random() - 0.5).slice(0, 3).forEach((p) => {
        const n = $(`<div class="note"><b>${p[0]}</b>${p[1]}<br><span class="small" style="color:#6a5a3a">${p[2]}</span><button>Aceitar</button></div>`);
        n.querySelector('button').onclick = (e) => { e.target.disabled = true; e.target.textContent = 'Na caderneta'; el.querySelector('.msg').innerHTML = `Pedido aceito: <b>${p[1]}</b>`; };
        b.appendChild(n);
      });
    };
    el.querySelector('.row .btn').onclick = () => { draw(); el.querySelector('.msg').textContent = 'Novos pedidos no quadro.'; };
    draw(); box.appendChild(el);
  },
},
/* 9 */ {
  id: 'Mini-jogo de porrinha (palitinho)', title: 'Mini-jogo: porrinha',
  ref: ['os mini-jogos de Yakuza e a porrinha de boteco', 'https://pt.wikipedia.org/wiki/Porrinha'],
  why: 'Yakuza é famoso pelos mini-jogos nos bares. O boteco brasileiro tem o dele: a porrinha. Cada um esconde de 0 a 3 palitos na mão e chuta o total. Serve como aposta rápida entre partidas, para decidir quem paga a rodada ou quem começa dando as cartas.',
  how: 'No jogo: mesa de porrinha no boteco e no baile; bots com jeito próprio de chutar (o Bereba sempre chuta alto). Outros possíveis depois: dominó e sinuca.',
  demo(box) {
    let mine = 0;
    const el = $(`<div class="ex"><p class="small">1) Quantos palitos você esconde?</p><div class="seg s1"></div><p class="small" style="margin-top:10px">2) Chute o total (você + Bereba):</p><div class="seg s2"></div><p class="msg"></p></div>`);
    const s1 = el.querySelector('.s1'), s2 = el.querySelector('.s2');
    [0, 1, 2, 3].forEach((n) => { const b = $(`<button>${n}</button>`); b.onclick = () => { s1.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); mine = n; }; s1.appendChild(b); });
    s1.firstChild.classList.add('on');
    [0, 1, 2, 3, 4, 5, 6].forEach((n) => { const b = $(`<button>${n}</button>`); b.onclick = () => {
      const his = Math.floor(Math.random() * 4), tot = mine + his;
      let hisGuess = Math.min(6, his + 2 + (Math.random() < 0.5 ? 1 : 0)); if (hisGuess === n) hisGuess = Math.max(0, n - 1);
      const res = n === tot ? '<b>Você acertou</b>, o Bereba paga a rodada.' : hisGuess === tot ? 'O Bereba acertou. "Desce uma pra mim, marreco!"' : 'Ninguém acertou, outra rodada.';
      el.querySelector('.msg').innerHTML = `Bereba escondeu <b>${his}</b> e chutou ${hisGuess}. Total: <b>${tot}</b>. ${res}`;
    }; s2.appendChild(b); });
    box.appendChild(el);
  },
},
/* 10 */ {
  id: 'Revisão da mão (onde errei)', title: 'Revisão da mão',
  ref: ['a Revisão de Partida do Chess.com', 'https://www.chess.com/terms/game-review'],
  why: 'Depois de uma mão perdida (ou no fim da partida) você pode rever cada jogada com uma nota: "Boa", "Arriscada", "Erro". O jogo mostra o que seria melhor e por quê. Ensina truco de verdade e é algo que quase nenhum jogo de truco tem.',
  how: 'No jogo: botão "Rever mão" no fim; nota por jogada usando a mesma lógica dos bots difíceis; sem custo nenhum.',
  demo(box) {
    const R = [
      { cards: [['3', 'ouros', 'hl'], ['K', 'espadas'], ['7', 'copas']], tag: ['ok', 'Boa'], txt: 'Abriu com o 3 para garantir a primeira rodada.' },
      { cards: [['K', 'espadas', 'bad'], ['7', 'copas']], tag: ['bad', 'Erro'], txt: 'Pediu truco com K e 7 sem manilha. O Bereba tinha o zap. Melhor: esperar a terceira rodada.' },
      { cards: [['7', 'copas', 'hl']], tag: ['mid', 'Arriscada'], txt: 'Aceitou o seis com uma carta só. Deu certo, mas era 30% de chance.' },
    ];
    const el = $(`<div class="ex"><div class="tl"></div><div class="cards"></div><p class="msg"></p></div>`);
    let k = 0;
    const draw = () => {
      el.querySelector('.tl').innerHTML = R.map((r, i) => `<button class="${i === k ? 'on' : ''}" data-i="${i}">Rodada ${i + 1}</button>`).join('');
      el.querySelectorAll('.tl button').forEach((b) => b.onclick = () => { k = +b.dataset.i; draw(); });
      el.querySelector('.cards').innerHTML = R[k].cards.map((c) => card(c[0], c[1], c[2] || '')).join('');
      el.querySelector('.msg').innerHTML = `<span class="tag tag--${R[k].tag[0]}">${R[k].tag[1]}</span>${R[k].txt}`;
    };
    draw(); box.appendChild(el);
  },
},
/* 11 */ {
  id: 'Rival que lembra de você (apelidos e revanche)', title: 'Rival que lembra de você',
  ref: ['o sistema Nemesis de Shadow of Mordor', 'https://www.ign.com/wikis/middle-earth-shadow-of-mordor/The_Nemesis_System'],
  why: 'Quem te vence ganha apelido, fica mais confiante e passa a te provocar pela cidade. Quem perde de você fica com raiva e pede revanche com uma mania nova. Cada jogador acaba tendo uma rivalidade só sua, contada pelos próprios personagens.',
  how: 'No jogo: só para 4 ou 5 jogadores comuns; apelidos e traços sorteados; aparece na caderneta.',
  demo(box) {
    let st = { nome: 'Bereba', ap: '', traco: 'blefa às vezes', nv: 1, fala: 'Bora uma partidinha?' };
    const el = $(`<div class="ex"><div class="who"><div class="ava" style="background:#b5523a">B</div><div><b class="nm"></b><br><span class="small tr"></span></div></div><p class="bub fl" style="margin-top:10px"></p>
      <div class="row"><button class="btn btn--no">Perder para ele</button><button class="btn btn--ok">Ganhar dele</button></div></div>`);
    const draw = () => { el.querySelector('.nm').textContent = st.nome + (st.ap ? ', ' + st.ap : '') + ' · nível ' + st.nv; el.querySelector('.tr').textContent = 'Jeito: ' + st.traco; el.querySelector('.fl').textContent = st.fala; };
    const b = el.querySelectorAll('.btn');
    b[0].onclick = () => { st.nv++; st.ap = pick(['o Carrasco', 'Mão de Ferro', 'o Dono da Mesa']); st.traco = pick(['pede truco cedo', 'nunca corre', 'blefa na mão de 11']); st.fala = pick(['Voltou para apanhar de novo?', 'Ó o freguês chegando!', 'Já contei para o bairro todo.']); draw(); };
    b[1].onclick = () => { st.ap = pick(['o Humilhado', 'Sem Moral']); st.traco = 'com raiva: aposta alto'; st.fala = pick(['Isso foi sorte. Quero revanche amanhã.', 'Você me paga. Vou treinar com a Lenda.']); draw(); };
    draw(); box.appendChild(el);
  },
},
/* 12 */ {
  id: 'Noite de Truco (corrida com mapa de caminhos)', title: 'Noite de Truco',
  ref: ['o mapa de caminhos de Slay the Spire', 'https://spire-codex.com/guides/new-players-guide'],
  why: 'Um modo novo: uma noite inteira de boteco em boteco. Você escolhe o caminho num mapa com mesas normais, eventos, descanso, loja de manias e um chefe no fim. Perdeu, acabou a noite. Cada noite é diferente e dura uns 15 minutos.',
  how: 'No jogo: modo separado do modo história; usa as manias (ideia 4); recompensa em versos de carta e títulos.',
  demo(box) {
    const N = { mesa: ['♠', 'Mesa: partida de 6 pontos'], ev: ['?', 'Evento: uma fofoca, um bêbado, uma aposta'], desc: ['☕', 'Descanso: +10 s de turno na próxima'], loja: ['$', 'Loja: compre uma mania'], chefe: ['♛', 'Chefe: a Lenda do Norte'] };
    const map = [['mesa', 'ev', 'mesa'], ['loja', 'mesa', 'desc'], ['ev', 'mesa', 'mesa'], ['chefe']];
    let row = 0, col = 1, path = [];
    const el = $(`<div class="ex"><canvas width="300" height="200"></canvas><p class="msg">Toque num ponto da linha de baixo para começar.</p></div>`);
    const c = el.querySelector('canvas'), ctx = c.getContext('2d');
    const pos = (r, k) => { const n = map[r].length; return [300 / (n + 1) * (k + 1), 170 - r * 48]; };
    const draw = () => {
      ctx.fillStyle = '#14291d'; ctx.fillRect(0, 0, 300, 200);
      ctx.strokeStyle = '#3b5a46'; ctx.lineWidth = 2;
      for (let r = 0; r < map.length - 1; r++) map[r].forEach((_, k) => map[r + 1].forEach((__, j) => { if (Math.abs(j - k) <= 1 || map[r + 1].length === 1) { const a = pos(r, k), b = pos(r + 1, j); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }));
      ctx.strokeStyle = '#e8b93c'; ctx.lineWidth = 4;
      for (let i = 1; i < path.length; i++) { const a = pos(...path[i - 1]), b = pos(...path[i]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      map.forEach((r, ri) => r.forEach((t, k) => {
        const [x, y] = pos(ri, k), done = path.some((p) => p[0] === ri && p[1] === k);
        const can = ri === path.length && (path.length === 0 || Math.abs(path[path.length - 1][1] - k) <= 1 || r.length === 1);
        ctx.fillStyle = done ? '#e8b93c' : can ? '#f4ead2' : '#6f8f78'; ctx.fillRect(x - 14, y - 14, 28, 28);
        ctx.fillStyle = '#1b1109'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText(N[t][0], x, y + 6);
      }));
    };
    c.onclick = (e) => {
      const b = c.getBoundingClientRect(), x = (e.clientX - b.left) * 300 / b.width, y = (e.clientY - b.top) * 200 / b.height;
      const ri = path.length; if (ri >= map.length) { path = []; draw(); el.querySelector('.msg').textContent = 'Nova noite. Toque na linha de baixo.'; return; }
      map[ri].forEach((t, k) => { const [px, py] = pos(ri, k); const ok = path.length === 0 || Math.abs(path[path.length - 1][1] - k) <= 1 || map[ri].length === 1;
        if (ok && Math.abs(x - px) < 18 && Math.abs(y - py) < 18) { path.push([ri, k]); el.querySelector('.msg').innerHTML = `<b>${N[t][1]}</b>${ri === map.length - 1 ? ' · fim da noite, toque para recomeçar' : ''}`; draw(); } });
    };
    draw(); box.appendChild(el);
  },
},
/* 13 */ {
  id: 'Tampinhas escondidas pela cidade', title: 'Tampinhas escondidas',
  ref: ['as sementes Korok de Zelda: Breath of the Wild', 'https://www.zeldadungeon.net/wiki/Korok_Seed'],
  why: 'Uma tampinha de garrafa brilhando escondida atrás de um arbusto, embaixo de um banco, no telhado de uma casa que dá para subir pela escada. São umas 30 pela cidade, e juntando você troca no mercado por coisas boas. Recompensa quem explora, e combina com os esconderijos que o mapa já tem.',
  how: 'No jogo: 30 tampinhas; brilho de leve a cada poucos segundos; troca de 5, 15 e 30 por itens da coleção.',
  demo(box) {
    const spots = [[40, 46], [150, 26], [210, 80], [96, 92]]; const got = new Set();
    const el = $(`<div class="ex"><canvas width="260" height="120"></canvas><p class="msg">Procure o brilho e toque nele. 0 de 4.</p></div>`);
    const c = el.querySelector('canvas'), ctx = c.getContext('2d'); let t = 0;
    loop(() => {
      t++; grass(ctx, 260, 120); house(ctx, 120, 4, 60, 52, '#b5523a', '#7a2e1e');
      [[30, 40], [200, 74], [88, 86], [60, 10]].forEach(([x, y]) => bush(ctx, x, y));
      spots.forEach(([x, y], i) => { if (got.has(i)) return; if ((t + i * 40) % 160 < 14) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(x, y - 3, 2, 8); ctx.fillRect(x - 3, y, 8, 2); } });
    });
    c.onclick = (e) => {
      const b = c.getBoundingClientRect(), x = (e.clientX - b.left) * 260 / b.width, y = (e.clientY - b.top) * 120 / b.height;
      spots.forEach(([sx, sy], i) => { if (!got.has(i) && Math.abs(x - sx) < 14 && Math.abs(y - sy) < 14) got.add(i); });
      el.querySelector('.msg').innerHTML = got.size === 4 ? '<b>4 de 4.</b> Troque no mercado por um verso de carta.' : `Achou. ${got.size} de 4.`;
    };
    box.appendChild(el);
  },
},
/* 14 */ {
  id: 'Álbum de figurinhas dos personagens', title: 'Álbum de figurinhas',
  ref: ['os álbuns de figurinhas da Copa', 'https://pt.wikipedia.org/wiki/%C3%81lbuns_de_figurinhas_da_Copa_do_Mundo_FIFA'],
  why: 'Cada vitória dá um pacotinho com 3 figurinhas dos personagens, lugares e jogadas famosas. Tem figurinha brilhante rara, e as repetidas você troca com os próprios personagens. Completar uma página libera uma surpresa. Bem brasileiro e muito viciante.',
  how: 'No jogo: 36 figurinhas em 6 páginas; 1 pacotinho por vitória; repetidas viram moeda de troca.',
  demo(box) {
    const N = ['Zeca', 'Cida', 'Bereba', 'Bigode', 'Dudu', 'Dete', 'Padre', 'Valdir', 'Cotinha', 'DJ', 'Lenda', 'Zap'];
    const own = {}; let rep = 0;
    const el = $(`<div class="ex"><div class="album"></div><div class="pack"></div><div class="row"><button class="btn btn--truco">Abrir pacotinho</button><span class="small rp"></span></div></div>`);
    const draw = () => {
      el.querySelector('.album').innerHTML = N.map((n, i) => `<div class="stk ${own[i] ? 'got' : ''} ${own[i] === 'f' ? 'foil' : ''}">${own[i] ? n : i + 1}</div>`).join('');
      el.querySelector('.rp').textContent = `${Object.keys(own).length} de ${N.length} · repetidas: ${rep}`;
    };
    el.querySelector('.btn').onclick = () => {
      const p = el.querySelector('.pack'); p.innerHTML = '';
      for (let k = 0; k < 3; k++) { const i = Math.floor(Math.random() * N.length), f = Math.random() < 0.12; if (own[i]) rep++; else own[i] = f ? 'f' : 1;
        p.appendChild($(`<div class="stk got ${f ? 'foil' : ''}" style="animation-delay:${k * 120}ms">${N[i]}${f ? '<br>RARA' : ''}</div>`)); }
      draw();
    };
    draw(); box.appendChild(el);
  },
},
/* 15 */ {
  id: 'Rádio do bairro que comenta suas partidas', title: 'Rádio do bairro',
  ref: ['o narrador de Hades e as rádios de GTA', 'https://storiesinplay.com/2022/11/24/hades/'],
  why: 'Um radinho no boteco e na oficina com um locutor local que comenta o que você fez: "E o novato ganhou do Bigode com um 4 de paus, minha gente". Muda a música (sertanejo raiz, pagode, forró em 8 bits) e dá notícias das fofocas e do clima. Faz o mundo reagir a você.',
  how: 'No jogo: 3 estações de música 8 bits; falas do locutor geradas pelos seus resultados; dá para desligar.',
  demo(box) {
    const ST = [['98.1', 'Raiz FM', ['Bom dia, Vila do Fundo! Previsão de garoa à tarde, leva o guarda-chuva pro boteco.', 'O novato ganhou do Bigode com um 4 de paus. Tô até agora sem acreditar.']],
      ['102.5', 'Pagodão', ['Ontem a Dete gritou SEIS tão alto que acordou a igreja inteira.', 'Recado pro Bereba: o povo tá dizendo que você tá fugindo do novato.']],
      ['89.9', 'Forró do Morro', ['Hoje tem baile e a mesa do DJ tá liberada pra quem tiver coragem.', 'Dizem que a Lenda do Norte nunca correu de um truco. Nunca.']]];
    let s = 0, k = 0;
    const el = $(`<div class="ex"><div class="radio"><div class="radio__dial"></div><div class="radio__say"></div></div><div class="row"><button class="btn">Trocar estação</button><button class="btn">Próxima fala</button></div></div>`);
    const draw = () => { el.querySelector('.radio__dial').innerHTML = ST[s][0] + '<br><span class="small">' + ST[s][1] + '</span>'; el.querySelector('.radio__say').textContent = '"' + ST[s][2][k % 2] + '"'; };
    const b = el.querySelectorAll('.btn'); b[0].onclick = () => { s = (s + 1) % 3; k = 0; draw(); }; b[1].onclick = () => { k++; draw(); };
    draw(); box.appendChild(el);
  },
},
/* 16 */ {
  id: 'Festas do calendário brasileiro', title: 'Festas do calendário',
  ref: ['os eventos de época de Animal Crossing', 'https://www.ign.com/wikis/animal-crossing-new-horizons/Events'],
  why: 'O jogo usa a data real do celular: em junho a cidade ganha bandeirinhas, fogueira e uma mesa de truco na quermesse; no Carnaval, confete e bloquinho; no Natal, pisca-pisca e amigo secreto de cartas. Cada festa tem um personagem visitante e um verso de carta que só sai naquela época.',
  how: 'No jogo: 4 festas por ano (Carnaval, Festa Junina, Copa ou Primavera, Natal); dura 1 a 2 semanas cada.',
  demo(box) {
    const F = { 'Festa Junina': ['#e8b93c', 'Bandeirinhas, fogueira e quentão. Visitante: Seu Lunga, que joga dobrado na quermesse.'], 'Carnaval': ['#ff5ad0', 'Confete caindo e bloquinho passando. Mesa especial: truco fantasiado (cartas com máscara).'], 'Natal': ['#3fae63', 'Pisca-pisca nas casas e neve de mentira. Amigo secreto: cada personagem te dá uma carta.'] };
    const el = $(`<div class="ex"><canvas width="260" height="110"></canvas><div class="row"><div class="seg"></div></div><p class="msg"></p></div>`);
    const c = el.querySelector('canvas'), ctx = c.getContext('2d'); let f = 'Festa Junina', t = 0;
    const seg = el.querySelector('.seg');
    Object.keys(F).forEach((k) => { const b = $(`<button class="${k === f ? 'on' : ''}">${k}</button>`); b.onclick = () => { seg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); f = k; el.querySelector('.msg').textContent = F[k][1]; }; seg.appendChild(b); });
    el.querySelector('.msg').textContent = F[f][1];
    loop(() => {
      t++; grass(ctx, 260, 110); house(ctx, 20, 30, 70, 60, '#b5523a', '#7a2e1e'); house(ctx, 170, 30, 70, 60, '#4f8a7a', '#2e5a4e');
      if (f === 'Festa Junina') { for (let x = 0; x < 260; x += 10) { ctx.fillStyle = ['#c0392b', '#e8b93c', '#3f7fc9', '#3fae63'][(x / 10) % 4]; ctx.fillRect(x, 14 + Math.sin(x / 20) * 4, 6, 6); }
        ctx.fillStyle = '#7a4f2a'; ctx.fillRect(120, 90, 20, 6); ctx.fillStyle = t % 10 < 5 ? '#ff8a2a' : '#ffd23a'; ctx.fillRect(124, 76, 12, 14); }
      if (f === 'Carnaval') for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#ff5ad0', '#5ae0ff', '#f2e14a', '#9aff5a'][i % 4]; ctx.fillRect((i * 47 + t) % 260, (i * 29 + t * 1.5) % 110, 3, 3); }
      if (f === 'Natal') { for (let x = 20; x < 240; x += 8) if (x < 90 || x > 170) { ctx.fillStyle = ((x / 8 + Math.floor(t / 15)) % 2) ? '#ff5a5a' : '#f2e14a'; ctx.fillRect(x, 30, 3, 3); }
        for (let i = 0; i < 30; i++) { ctx.fillStyle = '#fff'; ctx.fillRect((i * 53) % 260, (i * 31 + t * 0.6) % 110, 2, 2); } }
    });
    box.appendChild(el);
  },
},
/* 17 */ {
  id: 'Seu próprio boteco (gerenciar à noite)', title: 'Seu próprio boteco',
  ref: ['o restaurante de sushi de Dave the Diver', 'https://shapes.inc/fandom/dave-the-diver/restaurant-management'],
  why: 'Com o dinheiro das apostas você compra um boteco abandonado e vai reformando: mesa nova, TV, geladeira, jukebox. Cada melhoria traz clientes e jogadores mais fortes para a sua mesa, e o boteco rende um pouco por dia. Dá um objetivo de longo prazo para o dinheiro.',
  how: 'No jogo: 8 a 10 melhorias; renda diária pequena; personagens novos só aparecem no seu boteco.',
  demo(box) {
    const U = [['Mesa de feltro', 30, 2], ['TV de tubo', 45, 3], ['Geladeira de vidro', 60, 3], ['Jukebox', 80, 4], ['Toldo listrado', 25, 1], ['Placa em neon', 70, 4]];
    let money = 120; const own = new Set();
    const el = $(`<div class="ex"><canvas width="260" height="90"></canvas><div class="row"><b class="mn"></b><span class="small cl"></span></div><div class="stall"></div></div>`);
    const c = el.querySelector('canvas'), ctx = c.getContext('2d');
    const paint = () => {
      ctx.fillStyle = '#5a3b1a'; ctx.fillRect(0, 0, 260, 90); ctx.fillStyle = '#7a4f2a'; ctx.fillRect(0, 60, 260, 30);
      ctx.fillStyle = '#3d2110'; ctx.fillRect(10, 40, 90, 20);
      if (own.has(0)) { ctx.fillStyle = '#16482f'; ctx.fillRect(120, 54, 60, 18); ctx.fillStyle = '#6b3f1e'; ctx.fillRect(118, 52, 64, 3); }
      if (own.has(1)) { ctx.fillStyle = '#222'; ctx.fillRect(200, 10, 34, 26); ctx.fillStyle = '#5ae0ff'; ctx.fillRect(204, 14, 26, 18); }
      if (own.has(2)) { ctx.fillStyle = '#cfe6ff'; ctx.fillRect(20, 6, 26, 34); ctx.fillStyle = '#c0392b'; for (let y = 10; y < 36; y += 8) ctx.fillRect(24, y, 18, 4); }
      if (own.has(3)) { ctx.fillStyle = '#c94f8a'; ctx.fillRect(70, 14, 22, 26); ctx.fillStyle = '#f2e14a'; ctx.fillRect(74, 18, 14, 6); }
      if (own.has(4)) for (let x = 0; x < 260; x += 20) { ctx.fillStyle = (x / 20) % 2 ? '#f4ead2' : '#c0392b'; ctx.fillRect(x, 0, 20, 6); }
      if (own.has(5)) { ctx.fillStyle = '#ff5ad0'; ctx.font = 'bold 12px monospace'; ctx.fillText('BOTECO DO NOVATO', 100, 26); }
      const cl = 1 + [...own].reduce((a, i) => a + U[i][2], 0);
      for (let i = 0; i < Math.min(cl, 9); i++) person(ctx, 110 + (i % 5) * 28, 62 - Math.floor(i / 5) * 14, ['#3f7fc9', '#c9a83a', '#8a3f6f', '#3fae63'][i % 4]);
      el.querySelector('.mn').textContent = 'R$ ' + money; el.querySelector('.cl').textContent = `${cl} clientes por noite · rende R$ ${cl * 2}/dia`;
    };
    const st = el.querySelector('.stall');
    U.forEach((u, i) => { const b = $(`<button>${u[0]}<br><span class="small">R$ ${u[1]}</span></button>`); b.onclick = () => { if (own.has(i) || money < u[1]) return; money -= u[1]; own.add(i); b.classList.add('own'); b.disabled = true; paint(); }; st.appendChild(b); });
    paint(); box.appendChild(el);
  },
},
/* 18 */ {
  id: 'Truco com amigos por código de sala', title: 'Truco com amigos (código de sala)',
  ref: ['as salas privadas de Among Us', 'https://www.ludo.guide/guide/among-us/the-ultimate-party-guide/creating-and-joining-lobbies'],
  why: 'O que mais falta num jogo de truco: jogar com os amigos de verdade. Um cria a sala, recebe um código curto tipo TRUCO-4KQ e manda no grupo; os outros entram pelo código. Lugar vazio vira bot. As falas de boteco já funcionam aqui.',
  how: 'No jogo: precisa de um servidor pequeno (custo mensal baixo) e de um tempo maior de desenvolvimento. É a ideia mais trabalhosa da lista, mas a que mais ajuda a divulgar.',
  demo(box) {
    const el = $(`<div class="ex"><div class="code">------</div><div class="lobby"></div><div class="row"><button class="btn btn--truco">Criar sala</button><button class="btn">Simular amigo entrando</button><button class="btn">Completar com bot</button></div></div>`);
    let seats = [];
    const draw = () => { el.querySelector('.lobby').innerHTML = [0, 1, 2, 3].map((k) => `<div class="seatx ${seats[k] ? 'on' : ''}">${seats[k] || 'Vago'}${k % 2 === 0 && seats[k] ? '<br><span class="small">dupla A</span>' : seats[k] ? '<br><span class="small">dupla B</span>' : ''}</div>`).join(''); };
    const b = el.querySelectorAll('.btn');
    b[0].onclick = () => { const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; el.querySelector('.code').textContent = 'TRUCO-' + [0, 1, 2].map(() => L[Math.floor(Math.random() * L.length)]).join(''); seats = ['Você']; draw(); };
    b[1].onclick = () => { if (!seats.length || seats.length >= 4) return; seats.push(pick(['Juninho', 'Carla', 'Tio Beto', 'Mari'])); draw(); };
    b[2].onclick = () => { if (!seats.length) return; while (seats.length < 4) seats.push('Bot ' + pick(['Zeca', 'Cida', 'Dudu'])); draw(); };
    draw(); box.appendChild(el);
  },
},
/* 19 */ {
  id: 'Mesa maluca da semana (regra diferente toda semana)', title: 'Mesa maluca da semana',
  ref: ['o Tavern Brawl de Hearthstone', 'https://hearthstone.wiki.gg/wiki/Tavern_Brawl'],
  why: 'Toda semana o boteco abre uma mesa com uma regra doida: "todas as cartas viradas para baixo", "a manilha muda a cada rodada", "truco já começa valendo 3", "só dá para falar 1 vez". A primeira vitória da semana dá um pacotinho ou um verso de carta. Diferente do Desafio do dia (que é a mesma mão para todos), aqui é uma regra nova.',
  how: 'No jogo: 10 a 12 regras em rodízio pelo número da semana; funciona sem internet.',
  demo(box) {
    const W = [['Às cegas', 'Todo mundo joga a primeira rodada sem olhar a carta.'], ['Manilha maluca', 'A vira muda a cada rodada da mão.'], ['Truco caro', 'Toda mão já começa valendo 3.'], ['Boca fechada', 'Ninguém pode usar as falas. Nem os bots.'], ['Mineiro na marra', 'Manilhas fixas do truco mineiro, mesmo no paulista.'], ['Rodada relâmpago', 'Turno de 6 segundos.']];
    let i = 0;
    const el = $(`<div class="ex"><p class="small wk"></p><p class="bub ru"></p><div class="row"><button class="btn">Próxima semana</button></div></div>`);
    const draw = () => { el.querySelector('.wk').textContent = `Semana ${41 + i} · prêmio da 1ª vitória: pacotinho de figurinhas`; el.querySelector('.ru').innerHTML = `<b>${W[i][0]}:</b> ${W[i][1]}`; };
    el.querySelector('.btn').onclick = () => { i = (i + 1) % W.length; draw(); };
    draw(); box.appendChild(el);
  },
},
/* 20 */ {
  id: 'Foto da mão histórica (para compartilhar)', title: 'Foto da mão histórica',
  ref: ['as fotos com nota de New Pokémon Snap', 'https://www.pokemon.com/us/features/top-tips-to-begin-your-new-pokemon-snap-journey'],
  why: 'Quando acontece uma mão especial (virada de 10 a 12, zap no seis, ganhar da Lenda), o jogo tira uma "foto" da mesa com nota de 1 a 5 estrelas, o nome dos jogadores e a data. Fica numa galeria e dá para compartilhar no WhatsApp com um toque. É propaganda grátis e o jogador se orgulha.',
  how: 'No jogo: a imagem sai do próprio canvas da mesa; galeria de até 30 fotos; botão de compartilhar do Android.',
  demo(box) {
    const el = $(`<div class="ex"><canvas width="280" height="160"></canvas><div class="row"><button class="btn btn--truco">Tirar outra foto</button></div></div>`);
    const c = el.querySelector('canvas'), ctx = c.getContext('2d');
    const M = [['VIRADA HISTÓRICA', 'De 10 a 12 contra o Bigode', 5], ['ZAP NO SEIS', 'Aceitou o seis com o zap escondido', 4], ['A LENDA CAIU', 'Primeira vitória contra a Lenda do Norte', 5], ['BLEFE PERFEITO', 'Truco com 4 de copas, o Bereba correu', 3]];
    const shot = () => {
      const m = pick(M);
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, 280, 160);
      ctx.fillStyle = '#16482f'; ctx.fillRect(10, 10, 260, 104);
      ctx.fillStyle = '#6b3f1e'; ctx.fillRect(10, 10, 260, 6); ctx.fillRect(10, 108, 260, 6);
      const cs = [['4', '#1b1109', 'paus'], ['7', '#c0392b', 'copas'], ['A', '#1b1109', 'espadas']];
      cs.forEach((k, i) => { const x = 90 + i * 36, y = 38 + (i === 1 ? -6 : 0); ctx.fillStyle = '#071009'; ctx.fillRect(x - 1, y - 1, 30, 44); ctx.fillStyle = '#f4ead2'; ctx.fillRect(x, y, 28, 42); ctx.fillStyle = k[1]; ctx.font = 'bold 16px monospace'; ctx.fillText(k[0], x + 8, y + 26); });
      ctx.fillStyle = '#e8b93c'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.fillText(m[0], 140, 32); ctx.textAlign = 'left';
      ctx.fillStyle = '#1b1109'; ctx.font = '11px monospace'; ctx.fillText(m[1], 12, 132);
      ctx.fillText('Boteco do Bereba · 06/10/2026', 12, 148);
      ctx.fillStyle = '#e8b93c'; for (let s = 0; s < 5; s++) { ctx.fillStyle = s < m[2] ? '#e8b93c' : '#c9bfa5'; ctx.fillRect(210 + s * 13, 138, 10, 10); }
    };
    el.querySelector('.btn').onclick = shot; shot(); box.appendChild(el);
  },
},
];

/* monta a página */
const main = document.getElementById('ideas'), toc = document.getElementById('toc');
IDEAS.forEach((it, i) => {
  const s = $(`<section class="demo" id="i${i + 1}" data-id="${it.id}">
    <div class="demo__head"><span class="num">${i + 1}</span><div><h2>${it.title}</h2><p class="ref">Inspirado em <a href="${it.ref[1]}" target="_blank" rel="noopener">${it.ref[0]}</a></p></div></div>
    <p class="why">${it.why}</p><div class="box"></div><p class="how">${it.how.replace(/^No jogo:/, '<b>No jogo:</b>')}</p><div class="vote"></div></section>`);
  main.appendChild(s);
  try { it.demo(s.querySelector('.box')); } catch (e) { s.querySelector('.box').textContent = 'Erro no exemplo: ' + e.message; }
  const a = document.createElement('a'); a.href = '#i' + (i + 1); a.textContent = (i + 1) + ' · ' + it.title; toc.appendChild(a);
});

/* votos */
const state = {}, sum = document.getElementById('summary');
const render = () => {
  const lines = IDEAS.filter((it) => state[it.id]).map((it) => `- ${it.id}: ${state[it.id]}`);
  sum.textContent = lines.length ? 'Escolhas do Laboratório 20 ideias:\n' + lines.join('\n') : 'Nenhuma escolha ainda.';
};
document.querySelectorAll('.demo[data-id]').forEach((d) => {
  const v = d.querySelector('.vote'), id = d.dataset.id;
  ['Quero', 'Talvez', 'Não'].forEach((opt) => {
    const b = document.createElement('button'); b.textContent = opt; b.dataset.v = opt;
    b.addEventListener('click', () => { v.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); state[id] = opt; render(); });
    v.appendChild(b);
  });
});
document.getElementById('copy').addEventListener('click', async (e) => {
  const txt = sum.textContent;
  try { await navigator.clipboard.writeText(txt); e.target.textContent = 'Copiado'; }
  catch (_) { const r = document.createRange(); r.selectNodeContents(sum); const s = getSelection(); s.removeAllRanges(); s.addRange(r); e.target.textContent = 'Selecionado, copie com Ctrl+C'; }
  setTimeout(() => { e.target.textContent = 'Copiar escolhas'; }, 1800);
});
})();
