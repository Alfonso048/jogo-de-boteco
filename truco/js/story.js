/* ============================================================
   story.js — conteúdo do modo história
   Zonas (fases), desafiantes, chefões, interiores e eventos.
   Carregado ANTES de world.js.
   ============================================================ */

/* ---------- zonas / fases ----------
   cada zona é uma faixa do mapa. Só abre depois de derrubar o
   chefão da zona anterior. */
const ZONES = [
  { id: 'vila', nameKey: 'z_vila', y0: 1, y1: 29, rep: 0, boss: 'bigode', needs: null, sky: '#1d3b24' },
  { id: 'centro', nameKey: 'z_centro', y0: 33, y1: 61, rep: 9, boss: 'nogueira', needs: 'bigode', sky: '#22303c' },
  { id: 'morro', nameKey: 'z_morro', y0: 65, y1: 94, rep: 24, boss: 'lenda', needs: 'nogueira', sky: '#2a2233' },
];

/* linhas de muro entre as zonas; a passagem fica na rua x=22 */
const GATES = [
  { y: 30, zone: 'centro', pass: 22 },
  { y: 62, zone: 'morro', pass: 22 },
];

/* ---------- desafiantes ----------
   place: 'city' (na rua) ou o id de um interior
   boss: true  -> chefão da zona, sempre 12 pontos e joga mais duro */
const NPCS = [
  /* ===== Zona 1 — Vila do Boteco ===== */
  { id: 'zeca', name: 'Zeca da Esquina', emoji: '🧢', zone: 'vila', place: 'city', x: 10, y: 17,
    diff: 'easy', format: 2, bet: 10, rep: 0, color: '#e05a3a',
    line: { pt: 'Ô mano, cê joga truco ou só olha? Aposta baixa, R$ 10.', en: 'Hey pal, do you play truco or just watch? Small bet, R$ 10.', es: 'Eh amigo, ¿juegas truco o solo mirás? Apuesta chica, R$ 10.' } },

  { id: 'dona', name: 'Dona Ivete', emoji: '👵', zone: 'vila', place: 'city', x: 34, y: 18,
    diff: 'easy', format: 4, bet: 15, rep: 2, color: '#c94f9c',
    line: { pt: 'Eu e meu neto contra você e o Tião. Vale R$ 15 e respeito.', en: 'Me and my grandson against you and Tião. R$ 15 and respect.', es: 'Mi nieto y yo contra vos y Tião. R$ 15 y respeto.' } },

  { id: 'bereba', name: 'Nego Bereba', emoji: '🍺', zone: 'vila', place: 'boteco', x: 5, y: 8,
    diff: 'easy', format: 2, bet: 20, rep: 4, color: '#c98f3a',
    line: { pt: 'Enquanto a cerveja gela, a gente joga. Mão a mão aqui no balcão.', en: 'While the beer chills, we play. One on one right here at the bar.', es: 'Mientras la cerveza se enfría, jugamos. Mano a mano en la barra.' } },

  { id: 'dudu', name: 'Dudu do Fliperama', emoji: '🕹', zone: 'vila', place: 'fliperama', x: 6, y: 10,
    diff: 'medium', format: 2, bet: 25, rep: 6, color: '#3fa8c9',
    line: { pt: 'Zerei tudo aqui, truco é só mais um fliperama. Bora.', en: 'I beat every machine here. Truco is just another arcade. Come on.', es: 'Me pasé todas las máquinas. El truco es otro arcade más. Dale.' } },

  { id: 'bigode', name: 'Bigode, o Dono', emoji: '🥃', zone: 'vila', place: 'boteco', x: 16, y: 6, behind: true,
    diff: 'medium', format: 4, bet: 45, rep: 8, color: '#8a3f2a', boss: true,
    line: { pt: 'Este boteco é meu desde 1987. Ganha de mim e a Vila fala seu nome.', en: 'This bar has been mine since 1987. Beat me and the Vila says your name.', es: 'Este bar es mío desde 1987. Ganame y la Vila dirá tu nombre.' } },

  /* ===== Zona 2 — Centro ===== */
  { id: 'padre', name: 'Padre Anselmo', emoji: '⛪', zone: 'centro', place: 'igreja', x: 8, y: 6,
    diff: 'medium', format: 4, bet: 30, rep: 10, color: '#4a7fb5',
    line: { pt: 'Deus perdoa blefe, meu filho. Mineiro, e o dízimo é a aposta.', en: 'God forgives a bluff, my child. Mineiro rules, and the tithe is the bet.', es: 'Dios perdona el blef, hijo. Reglas Mineiro, y el diezmo es la apuesta.' } },

  { id: 'kombi', name: 'Tião da Kombi', emoji: '🚐', zone: 'centro', place: 'city', x: 16, y: 48,
    diff: 'medium', format: 2, bet: 35, rep: 12, color: '#d9a418',
    line: { pt: 'Já rodei o Paraná todo trucando. Mão a mão, sem choro.', en: 'I have trucoed all over Paraná. One on one, no crying.', es: 'Truqué por todo Paraná. Mano a mano, sin llorar.' } },

  { id: 'dete', name: 'Dete da Lotérica', emoji: '🎰', zone: 'centro', place: 'loterica', x: 6, y: 7, behind: true,
    diff: 'medium', format: 2, bet: 45, rep: 14, color: '#c94f4f',
    line: { pt: 'Vivo de sorte alheia. Na minha mesa, a sorte trabalha pra mim.', en: 'I live off other people\u2019s luck. At my table, luck works for me.', es: 'Vivo de la suerte ajena. En mi mesa, la suerte trabaja para mí.' } },

  { id: 'sindico', name: 'Seu Valdir', emoji: '🎩', zone: 'centro', place: 'predio', x: 8, y: 7,
    diff: 'hard', format: 4, bet: 70, rep: 17, color: '#7b4fd9',
    line: { pt: 'Sou síndico há vinte anos. Não perco votação nem partida.', en: 'Twenty years as the building manager. I lose neither votes nor games.', es: 'Veinte años de administrador. No pierdo votaciones ni partidas.' } },

  { id: 'feira', name: 'Irmãos Feira', emoji: '🐓', zone: 'centro', place: 'city', x: 44, y: 56,
    diff: 'hard', format: 6, bet: 90, rep: 19, color: '#3f8a4f',
    line: { pt: 'Nós três desde as quatro da manhã na banca. Trio contra trio.', en: 'The three of us since four in the morning at the stall. Trio against trio.', es: 'Los tres desde las cuatro de la mañana en el puesto. Trío contra trío.' } },

  { id: 'nogueira', name: 'Doutor Nogueira', emoji: '🏆', zone: 'centro', place: 'clube', x: 15, y: 6,
    diff: 'hard', format: 6, bet: 150, rep: 22, color: '#b58a2a', boss: true,
    line: { pt: 'Tricampeão do Clube Social. Você sequer é sócio, mas eu permito.', en: 'Three-time Social Club champion. You are not even a member, but I allow it.', es: 'Tricampeón del Club Social. Ni sos socio, pero te lo permito.' } },

  /* ===== Zona 3 — Morro do Truco ===== */
  { id: 'taxi', name: 'Pilantra do Ponto', emoji: '🚕', zone: 'morro', place: 'city', x: 19, y: 75,
    diff: 'hard', format: 2, bet: 80, rep: 25, color: '#d9c418',
    line: { pt: 'Corrida longa e mão curta: é assim que eu vivo. Mão a mão.', en: 'Long rides and a short hand: that is how I live. One on one.', es: 'Viaje largo y mano corta: así vivo. Mano a mano.' } },

  { id: 'dj', name: 'DJ Naipe', emoji: '🎸', zone: 'morro', place: 'baile', x: 6, y: 8,
    diff: 'hard', format: 4, bet: 110, rep: 28, color: '#c93f9c',
    line: { pt: 'No meu baile o grave dita o ritmo da mão. Segura o truco.', en: 'At my party the bass sets the rhythm of the hand. Hold the truco.', es: 'En mi baile el bajo marca el ritmo de la mano. Aguantá el truco.' } },

  { id: 'cotinha', name: 'Vó Cotinha', emoji: '📿', zone: 'morro', place: 'casa', x: 7, y: 8,
    diff: 'hard', format: 4, bet: 140, rep: 32, color: '#8a8ab5',
    line: { pt: 'Oitenta e dois anos, nenhuma derrota em casa. Senta, filho.', en: 'Eighty-two years old, no defeats at home. Sit down, son.', es: 'Ochenta y dos años, ninguna derrota en casa. Sentate, hijo.' } },

  { id: 'lenda', name: 'A Lenda do Norte', emoji: '🐆', zone: 'morro', place: 'arena', x: 10, y: 8,
    diff: 'hard', format: 6, bet: 300, rep: 36, color: '#2f8f4e', boss: true,
    line: { pt: 'Trio contra trio, 12 pontos. Se ganhar, a cidade inteira é tua.', en: 'Three on three, 12 points. Win and the whole town is yours.', es: 'Trío contra trío, 12 puntos. Si ganás, el pueblo entero es tuyo.' } },
];

/* ---------- interiores ----------
   w/h em tiles. deco: móveis (bloqueiam). mat: tapete de saída. */
const INTERIORS = {
  boteco: {
    nameKey: 'in_boteco', floor: '#6b4a2e', floor2: '#5e4128', wall: '#3a2418', trim: '#8a5a2e',
    w: 22, h: 14, from: 'boteco',
    deco: [
      { x: 2, y: 2, w: 18, h: 2, c: '#4a2f1c', t: 'shelf' },
      { x: 2, y: 9, w: 5, h: 2, c: '#7a4f2a', t: 'table' },
      { x: 15, y: 9, w: 5, h: 2, c: '#7a4f2a', t: 'table' },
      { x: 9, y: 4, w: 4, h: 2, c: '#7a4f2a', t: 'table' },
      { x: 3, y: 6, w: 16, h: 1, c: '#5a3a1e', t: 'bar' },
    ],
    lamps: [{ x: 6, y: 5 }, { x: 16, y: 5 }],
  },
  fliperama: {
    nameKey: 'in_fliperama', floor: '#2d2b3f', floor2: '#262437', wall: '#171528', trim: '#4a3f7a',
    w: 18, h: 12, from: 'fliperama',
    deco: [
      { x: 2, y: 2, w: 2, h: 3, c: '#c93f5a', t: 'arcade' },
      { x: 5, y: 2, w: 2, h: 3, c: '#3f7fc9', t: 'arcade' },
      { x: 8, y: 2, w: 2, h: 3, c: '#c9a43f', t: 'arcade' },
      { x: 11, y: 2, w: 2, h: 3, c: '#3fc97f', t: 'arcade' },
      { x: 14, y: 2, w: 2, h: 3, c: '#9a3fc9', t: 'arcade' },
      { x: 4, y: 8, w: 5, h: 2, c: '#5a4f7a', t: 'table' },
    ],
    lamps: [{ x: 9, y: 6 }],
  },
  igreja: {
    nameKey: 'in_igreja', floor: '#a89d86', floor2: '#9a8f78', wall: '#6f6a5a', trim: '#d8d2c0',
    w: 16, h: 14, from: 'igreja',
    deco: [
      { x: 2, y: 4, w: 4, h: 1, c: '#7a5a3a', t: 'pew' },
      { x: 10, y: 4, w: 4, h: 1, c: '#7a5a3a', t: 'pew' },
      { x: 2, y: 7, w: 4, h: 1, c: '#7a5a3a', t: 'pew' },
      { x: 10, y: 7, w: 4, h: 1, c: '#7a5a3a', t: 'pew' },
      { x: 6, y: 2, w: 4, h: 2, c: '#c9b47a', t: 'altar' },
    ],
    lamps: [{ x: 4, y: 2 }, { x: 11, y: 2 }],
  },
  loterica: {
    nameKey: 'in_loterica', floor: '#b5a88c', floor2: '#a89b80', wall: '#5a5348', trim: '#c93f4f',
    w: 14, h: 11, from: 'loterica',
    deco: [
      { x: 2, y: 4, w: 10, h: 1, c: '#8a7a5a', t: 'counter' },
      { x: 2, y: 2, w: 3, h: 1, c: '#c93f4f', t: 'poster' },
      { x: 9, y: 2, w: 3, h: 1, c: '#3f7fc9', t: 'poster' },
      { x: 4, y: 7, w: 5, h: 2, c: '#7a6f5a', t: 'table' },
    ],
    lamps: [{ x: 7, y: 3 }],
  },
  predio: {
    nameKey: 'in_predio', floor: '#8a7f9a', floor2: '#7d738c', wall: '#4e3a7a', trim: '#b5a8c9',
    w: 16, h: 12, from: 'predio',
    deco: [
      { x: 2, y: 2, w: 3, h: 2, c: '#6a5f8a', t: 'sofa' },
      { x: 11, y: 2, w: 3, h: 2, c: '#6a5f8a', t: 'sofa' },
      { x: 6, y: 5, w: 5, h: 2, c: '#5a4f7a', t: 'table' },
      { x: 2, y: 8, w: 2, h: 2, c: '#3f7f5a', t: 'plant' },
    ],
    lamps: [{ x: 8, y: 2 }],
  },
  clube: {
    nameKey: 'in_clube', floor: '#2e5a3a', floor2: '#28502f', wall: '#1c3a24', trim: '#c9a43f',
    w: 20, h: 14, from: 'clube',
    deco: [
      { x: 3, y: 3, w: 6, h: 3, c: '#1f6b3a', t: 'table' },
      { x: 12, y: 3, w: 6, h: 3, c: '#1f6b3a', t: 'table' },
      { x: 3, y: 9, w: 6, h: 3, c: '#1f6b3a', t: 'table' },
      { x: 12, y: 9, w: 5, h: 2, c: '#8a6f3a', t: 'counter' },
    ],
    lamps: [{ x: 6, y: 2 }, { x: 15, y: 2 }],
  },
  baile: {
    nameKey: 'in_baile', floor: '#3a2a4a', floor2: '#33253f', wall: '#1c1428', trim: '#c93f9c',
    w: 18, h: 13, from: 'baile',
    deco: [
      { x: 2, y: 2, w: 5, h: 2, c: '#c93f9c', t: 'stage' },
      { x: 11, y: 2, w: 5, h: 2, c: '#3f9cc9', t: 'stage' },
      { x: 7, y: 9, w: 5, h: 2, c: '#5a3a6a', t: 'table' },
    ],
    lamps: [{ x: 5, y: 6 }, { x: 13, y: 6 }],
  },
  casa: {
    nameKey: 'in_casa', floor: '#9a7a5a', floor2: '#8c6e50', wall: '#5a3f2a', trim: '#c9b47a',
    w: 14, h: 11, from: 'casa',
    deco: [
      { x: 2, y: 2, w: 3, h: 2, c: '#7a5a3a', t: 'sofa' },
      { x: 9, y: 2, w: 3, h: 2, c: '#7a5a3a', t: 'sofa' },
      { x: 5, y: 6, w: 5, h: 2, c: '#8a6a4a', t: 'table' },
      { x: 11, y: 7, w: 2, h: 2, c: '#3f7f5a', t: 'plant' },
    ],
    lamps: [{ x: 7, y: 2 }],
  },
  arena: {
    nameKey: 'in_arena', floor: '#243a2a', floor2: '#1f3325', wall: '#101c14', trim: '#e8b93c',
    w: 20, h: 14, from: 'arena',
    deco: [
      { x: 7, y: 4, w: 7, h: 4, c: '#1f6b3a', t: 'table' },
      { x: 2, y: 2, w: 3, h: 1, c: '#3a2a1a', t: 'bench' },
      { x: 16, y: 2, w: 3, h: 1, c: '#3a2a1a', t: 'bench' },
      { x: 2, y: 11, w: 3, h: 1, c: '#3a2a1a', t: 'bench' },
      { x: 16, y: 11, w: 3, h: 1, c: '#3a2a1a', t: 'bench' },
    ],
    lamps: [{ x: 6, y: 2 }, { x: 14, y: 2 }],
  },
  oficina: {
    nameKey: 'in_oficina', floor: '#5a6a6a', floor2: '#4e5d5d', wall: '#2e3a3a', trim: '#8a9a9a',
    w: 14, h: 11, from: 'oficina',
    deco: [
      { x: 2, y: 2, w: 4, h: 2, c: '#3a4a4a', t: 'bench' },
      { x: 9, y: 2, w: 3, h: 2, c: '#6a4a2a', t: 'bench' },
      { x: 5, y: 7, w: 4, h: 2, c: '#4a5a5a', t: 'table' },
    ],
    lamps: [{ x: 7, y: 3 }],
  },
};

/* ---------- eventos da cidade ----------
   um por dia. O dia vira ao fim de cada partida do modo história. */
const EVENTS = [
  { id: 'calmo', ico: '🔔', mods: {} },
  { id: 'feira', ico: '🐓', mods: { shop: 0.7 } },
  { id: 'chuva', ico: '☔', mods: { turn: -5, edge: -0.05, rain: true } },
  { id: 'garoa', ico: '🌦', mods: { turn: -2, drizzle: true, repMult: 1.2 } },
  { id: 'quente', ico: '🥃', mods: { repMult: 1.5, edge: 0.08 } },
  { id: 'dobro', ico: '💰', mods: { payMult: 2, edge: 0.12 } },
  { id: 'pago', ico: '🎰', mods: { cash: 20 } },
  { id: 'batida', ico: '🚨', mods: { noShop: true, edge: -0.08 } },
  { id: 'festa', ico: '🎸', mods: { turn: 5, coins: 6 } },
];

window.ZONES = ZONES;
window.GATES = GATES;
window.NPCS = NPCS;
window.INTERIORS = INTERIORS;
window.EVENTS = EVENTS;

/* ============================================================
   EASTER EGGS — a turma dos devs, escondida pelo mapa.
   Não aparecem na caderneta nem têm aviso na porta: só ficam
   visíveis quando o jogador chega bem perto. Cada um fica num
   "esconderijo" cercado de árvores com uma única passagem.
   ============================================================ */
const EGGS = [
  { id: 'alfonso', name: 'Alfonso', emoji: '👓', zone: 'vila', place: 'city', x: 69, y: 12,
    diff: 'easy', format: 2, bet: 20, rep: 0, egg: true, color: '#2a2a34',
    lines: [
      { pt: 'Olá, muito obrigado por jogar meu jogo!', en: 'Hi, thank you so much for playing my game!', es: '¡Hola, muchas gracias por jugar mi juego!' },
    ] },

  { id: 'martins', name: 'Martins', emoji: '🍨', zone: 'vila', place: 'city', x: 1, y: 25,
    diff: 'easy', format: 2, bet: 20, rep: 0, egg: true, color: '#3fae6a',
    lines: [
      { pt: 'Eu amo sorvete de cassis.', en: 'I love blackcurrant ice cream.', es: 'Amo el helado de casis.' },
      { pt: 'Você sabia que eu já contei todas as pedrinhas dessa praça? Deu 3.412. Ou 3.413.', en: 'Did you know I counted every pebble in this square? 3,412. Or 3,413.', es: '¿Sabías que conté todas las piedritas de esta plaza? 3.412. O 3.413.' },
      { pt: 'Meu sonho é ter um pato de estimação chamado Roberto.', en: 'My dream is to have a pet duck named Roberto.', es: 'Mi sueño es tener un pato de mascota llamado Roberto.' },
      { pt: 'Hoje eu comi pão com pão. Ficou meio seco.', en: 'Today I ate bread with bread. It was a bit dry.', es: 'Hoy comí pan con pan. Quedó medio seco.' },
      { pt: 'Se a meia some na máquina, pra onde ela vai? Eu acho que vira cueca.', en: 'When a sock disappears in the washer, where does it go? I think it becomes underwear.', es: 'Si la media desaparece en el lavarropas, ¿adónde va? Creo que se vuelve calzón.' },
      { pt: 'Eu cumprimento os postes. Vai que eles têm sentimentos.', en: 'I say hi to lamp posts. Just in case they have feelings.', es: 'Saludo a los postes. Por si tienen sentimientos.' },
      { pt: 'Já tentei espirrar de olho aberto. Não recomendo.', en: 'I tried sneezing with my eyes open. Do not recommend.', es: 'Intenté estornudar con los ojos abiertos. No lo recomiendo.' },
      { pt: 'Minha comida favorita é a segunda bolacha do pacote. A primeira sempre quebra.', en: 'My favorite food is the second cookie in the pack. The first one always breaks.', es: 'Mi comida favorita es la segunda galleta del paquete. La primera siempre se rompe.' },
    ] },

  { id: 'prado', name: 'Prado', emoji: '🎮', zone: 'centro', place: 'city', x: 69, y: 55,
    diff: 'hard', format: 2, bet: 60, rep: 0, egg: true, color: '#c9412e',
    lines: [
      { pt: 'Sabia que o nome Pac-Man veio de "paku-paku", o som de comer em japonês?', en: 'Did you know Pac-Man comes from "paku-paku", Japanese for the sound of munching?', es: '¿Sabías que Pac-Man viene de "paku-paku", el sonido de comer en japonés?' },
      { pt: 'O Mario se chamava "Jumpman" no primeiro Donkey Kong, de 1981.', en: 'Mario was called "Jumpman" in the first Donkey Kong, back in 1981.', es: 'Mario se llamaba "Jumpman" en el primer Donkey Kong, de 1981.' },
      { pt: 'O Konami Code é ↑↑↓↓←→←→BA. Foi criado porque o dev achava Gradius difícil demais.', en: 'The Konami Code is ↑↑↓↓←→←→BA. The dev made it because Gradius was too hard for him.', es: 'El Konami Code es ↑↑↓↓←→←→BA. El dev lo creó porque Gradius le parecía muy difícil.' },
      { pt: 'O primeiro easter egg famoso de videogame foi no Adventure, do Atari 2600: o nome do criador escondido numa sala secreta.', en: 'The first famous video game easter egg was in Atari 2600 Adventure: the creator\u2019s name hidden in a secret room.', es: 'El primer easter egg famoso fue en Adventure de Atari 2600: el nombre del creador oculto en una sala secreta.' },
      { pt: 'O Sonic era pra ser um coelho. Ainda bem que mudaram.', en: 'Sonic was almost a rabbit. Good thing they changed it.', es: 'Sonic casi fue un conejo. Menos mal que lo cambiaron.' },
      { pt: 'Em Star Wars, o som do sabre de luz mistura o zumbido de um projetor com a interferência de uma TV.', en: 'In Star Wars, the lightsaber hum mixes a film projector buzz with TV interference.', es: 'En Star Wars, el sonido del sable mezcla el zumbido de un proyector con la interferencia de una TV.' },
      { pt: 'Tetris foi criado em 1984 por um engenheiro soviético num computador sem tela gráfica.', en: 'Tetris was made in 1984 by a Soviet engineer on a computer with no graphics screen.', es: 'Tetris fue creado en 1984 por un ingeniero soviético en una computadora sin pantalla gráfica.' },
      { pt: 'O Link de Zelda não é a Zelda. Eu repito isso todo santo dia.', en: 'Link is not Zelda. I repeat this every single day.', es: 'Link no es Zelda. Lo repito todos los santos días.' },
      { pt: 'Minecraft começou como projeto de uma pessoa só e virou o jogo mais vendido da história.', en: 'Minecraft started as a one-person project and became the best-selling game ever.', es: 'Minecraft empezó como proyecto de una sola persona y se volvió el juego más vendido de la historia.' },
      { pt: 'O "bug do milênio" era só ano com dois dígitos. Dois dígitos, mano.', en: 'The Y2K bug was just years stored with two digits. Two digits, man.', es: 'El "error del milenio" era solo el año con dos dígitos. Dos dígitos, hermano.' },
      { pt: 'O Pikachu é inspirado num daifuku, um doce japonês redondinho. Por isso ele é gordinho igual eu.', en: 'Some say Pikachu was inspired by daifuku, a round Japanese sweet. That is why he is chubby like me.', es: 'Dicen que Pikachu se inspiró en un daifuku, un dulce japonés redondo. Por eso es gordito como yo.' },
      { pt: 'O primeiro "bug" de computador foi uma mariposa de verdade presa num relé, em 1947.', en: 'The first computer "bug" was a real moth stuck in a relay, in 1947.', es: 'El primer "bug" fue una polilla real atrapada en un relé, en 1947.' },
    ] },

  { id: 'dimas', name: 'Dimas', emoji: '📚', zone: 'morro', place: 'city', x: 68, y: 85,
    diff: 'hard', format: 2, bet: 80, rep: 0, egg: true, color: '#7a2a3a', pair: 'chihiro',
    lines: [
      { pt: 'Sócrates dizia: "Só sei que nada sei". No truco, eu sei que você tá blefando.', en: 'Socrates said: "I know that I know nothing". In truco, I know you are bluffing.', es: 'Sócrates decía: "Solo sé que no sé nada". En el truco, sé que estás blefeando.' },
      { pt: 'Heráclito: ninguém entra duas vezes no mesmo rio. Nem joga duas vezes a mesma mão.', en: 'Heraclitus: no one steps in the same river twice. Nor plays the same hand twice.', es: 'Heráclito: nadie se baña dos veces en el mismo río. Ni juega dos veces la misma mano.' },
      { pt: 'Para Sartre, estamos condenados a ser livres. Inclusive livres pra correr do truco.', en: 'For Sartre, we are condemned to be free. Free even to fold on a truco.', es: 'Para Sartre, estamos condenados a ser libres. Incluso libres de rajar del truco.' },
      { pt: 'Camus via Sísifo feliz empurrando a pedra. Eu vejo o Chihiro feliz empurrando o carrinho de lanche.', en: 'Camus imagined Sisyphus happy pushing his rock. I see Chihiro happy pushing the snack cart.', es: 'Camus imaginaba a Sísifo feliz con su piedra. Yo veo a Chihiro feliz con el carrito de comida.' },
      { pt: 'Nietzsche: quem tem um porquê enfrenta qualquer como. Quem tem a manilha enfrenta qualquer truco.', en: 'Nietzsche: whoever has a why can bear almost any how. Whoever holds the manilha can bear any truco.', es: 'Nietzsche: quien tiene un porqué soporta casi cualquier cómo. Quien tiene la manilla soporta cualquier truco.' },
      { pt: 'Platão diria que este baralho é só a sombra de um baralho perfeito na caverna.', en: 'Plato would say this deck is only the shadow of a perfect deck in the cave.', es: 'Platón diría que este mazo es solo la sombra de un mazo perfecto en la caverna.' },
      { pt: 'Descartes: penso, logo existo. Eu: penso, logo peço seis.', en: 'Descartes: I think, therefore I am. Me: I think, therefore I raise to six.', es: 'Descartes: pienso, luego existo. Yo: pienso, luego pido seis.' },
      { pt: 'Epicuro ensinava que o prazer está nas coisas simples. Tipo um zap na hora certa.', en: 'Epicurus taught that pleasure lies in simple things. Like a zap at the right moment.', es: 'Epicuro enseñaba que el placer está en lo simple. Como un zap en el momento justo.' },
      { pt: 'Kant dizia para agir como se a sua ação virasse lei universal. Então nunca roube no truco.', en: 'Kant said act as if your action were a universal law. So never cheat at truco.', es: 'Kant decía actuar como si tu acción fuera ley universal. Así que nunca hagas trampa.' },
      { pt: 'Aristóteles: a virtude está no meio-termo. Nem corre sempre, nem pede doze sempre.', en: 'Aristotle: virtue lies in the mean. Do not always fold, do not always call twelve.', es: 'Aristóteles: la virtud está en el término medio. Ni rajar siempre, ni pedir doce siempre.' },
    ] },

  { id: 'chihiro', name: 'Chihiro', emoji: '🍙', zone: 'morro', place: 'city', x: 69, y: 85,
    diff: 'medium', format: 2, bet: 50, rep: 0, egg: true, color: '#e8803a', pair: 'dimas',
    lines: [
      { pt: 'Ô Dimas, filosofia é bom, mas já pensou em pastel de vento? É só vento, mano. E custa cinco reais.', en: 'Hey Dimas, philosophy is nice, but have you thought about the "wind pastry"? It is just air, man. And it costs five bucks.', es: 'Ey Dimas, la filosofía está bien, pero ¿pensaste en la empanada de viento? Es puro aire, hermano. Y cuesta cinco.' },
      { pt: 'Se o zap é a carta mais forte, por que ele não vai pra academia? Ele já é forte. Pensa nisso.', en: 'If the zap is the strongest card, why does it not go to the gym? It is already strong. Think about it.', es: 'Si el zap es la carta más fuerte, ¿por qué no va al gimnasio? Ya es fuerte. Pensalo.' },
      { pt: 'Eu tentei fazer miojo em dois minutos. Levou três. O pacote mentiu pra mim.', en: 'I tried making instant noodles in two minutes. It took three. The package lied to me.', es: 'Intenté hacer fideos instantáneos en dos minutos. Tardó tres. El paquete me mintió.' },
      { pt: 'TRUUUUCO! ...ah, não é minha vez? Foi mal, foi mal.', en: 'TRUUUUCO! ...oh, it is not my turn? My bad, my bad.', es: '¡TRUUUUCO! ...ah, ¿no es mi turno? Perdón, perdón.' },
      { pt: 'O Dimas fala de Platão, eu falo de prato. Os dois têm caverna: a minha é a geladeira.', en: 'Dimas talks about Plato, I talk about plates. We both have a cave: mine is the fridge.', es: 'Dimas habla de Platón, yo de platos. Los dos tenemos caverna: la mía es la heladera.' },
      { pt: 'Já viu um pombo filhote? Nem eu. Acho que eles já nascem adultos.', en: 'Ever seen a baby pigeon? Me neither. I think they are born adults.', es: '¿Viste alguna vez un pichón de paloma? Yo tampoco. Creo que nacen adultas.' },
      { pt: 'Meu superpoder é dormir em qualquer lugar. Uma vez dormi em pé na fila do pão.', en: 'My superpower is sleeping anywhere. Once I fell asleep standing in the bread line.', es: 'Mi superpoder es dormir en cualquier lado. Una vez me dormí parado en la fila del pan.' },
      { pt: 'Hoje é dia de quê? Dia de lasanha. Todo dia é dia de lasanha se você acreditar.', en: 'What day is it today? Lasagna day. Every day is lasagna day if you believe.', es: '¿Qué día es hoy? Día de lasaña. Todo día es día de lasaña si creés.' },
    ] },
];

/* esconderijos: retângulos cercados de árvores, com uma passagem.
   gap: tiles que ficam livres na cerca para dar acesso. */
const HIDEOUTS = [
  { x0: 66, y0: 10, x1: 71, y1: 15, gap: [[66, 14]] },            // Alfonso: atrás das casas, beirada direita
  { x0: 0, y0: 22, x1: 4, y1: 27, gap: [[2, 22]] },                // Martins: beirada esquerda da Vila
  { x0: 66, y0: 51, x1: 71, y1: 57, gap: [[67, 51]] },             // Prado: fundo do Centro
  { x0: 66, y0: 83, x1: 71, y1: 88, gap: [[67, 88]] },             // Dimas e Chihiro: fundo do Morro
];
window.EGGS = EGGS;
window.HIDEOUTS = HIDEOUTS;
