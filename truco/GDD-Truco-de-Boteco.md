# Truco de Boteco — Documento de Design (GDD)

Versão 0.9 · protótipo jogável · setembro de 2026
Autor do projeto: você · Protótipo de código: esta sessão

---

## 1. Visão geral

| Item | Definição |
|---|---|
| Nome de trabalho | Truco de Boteco |
| Gênero | Jogo de cartas (truco) com camada de RPG leve / mundo aberto |
| Plataforma alvo | Mobile (obrigatório) → depois desktop |
| Tecnologia do protótipo | HTML5 + Canvas 2D + JS puro (sem framework, sem build) |
| Empacotamento futuro | Capacitor (Android/iOS) e Electron/Tauri (desktop) a partir do mesmo código |
| Idiomas | Português, Inglês, Espanhol (trocáveis em tempo real) |
| Estética | Pixel art cartunesca, paleta de boteco brasileiro (verde feltro, madeira, dourado) |
| Referência de "entrada na mesa" | Balatro — mesa em destaque, carta grande, feedback exagerado, pontuação sempre visível |
| Contexto | Trabalho de faculdade, prazo de 2 semanas |

### Pilar de design

> **O truco não é só carta boa, é cara de pau.** Tudo no jogo — timer curto, blefe do bot, animação exagerada, apelido único — existe para reforçar a tensão do blefe.

---

## 2. Regras implementadas

### 2.1 Baralho e ordem

40 cartas (sem 8, 9, 10). Força crescente:

`4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3`

Naipes (só valem para desempate entre manilhas): **ouros < espadas < copas < paus**.

### 2.2 Variantes (escolhíveis no menu)

| Variante | Manilha |
|---|---|
| **Paulista** | A carta virada (*vira*) define a manilha: a manilha é a carta **seguinte** na ordem. Vira 7 → manilha Q; vira 3 → manilha 4 (circular). |
| **Mineiro** | Manilhas fixas: **4♣ (zap) > 7♥ > A♠ > 7♦**. |

### 2.3 Pontuação

- **Padrão único: toda partida vai até 12 pontos**, em qualquer dificuldade (fácil, médio e difícil), na partida rápida e no modo história. A partida de 24 pontos foi removida.
- **Mão de 10** (implementada como **Mão de Ferro**): quando um time chega a 10 pontos, a mão vale 3 e **o jogador vê as cartas do parceiro** antes de decidir entre *jogar valendo 3* ou *entregar 1 ponto*.

### 2.4 Cadeia de truco

`1 → 3 → 6 → 9 → 12`

Quem pede pode ser aumentado pelo adversário; quem corre entrega **o valor anterior** da cadeia (correr do truco = 1 ponto para o adversário; correr do seis = 3; e assim por diante).

### 2.5 Empacho (rodada empatada) — casa própria

Rodada empatada não "congela": vira **Duelo às Cegas**. Cada lado tira uma carta do baralho no escuro, a maior leva a rodada. É a sua regra "truco às cegas para decidir quem ganha".

### 2.6 Formatos

1x1, 2x2 e 3x3. Os assentos alternam times automaticamente na mesa (você, adversário, parceiro, adversário…), e a mesa se reorganiza para 2, 4 ou 6 jogadores.

### 2.7 Timer

**20 segundos por turno.** Barra visível encolhendo. Se estourar, a **maior carta da mão é jogada automaticamente** — exatamente como você pediu.

---

## 3. A lacuna que ficou: envido e flor (Pergunta 4 explicada)

Você respondeu *"n entendi a pergunta, deixe uma lacuna vaga para essa e me explique depois"*. Aqui está a explicação.

**Envido e flor são apostas paralelas que existem no truco argentino/uruguaio (e em algumas mesas do Sul do Brasil), mas não no truco paulista ou mineiro.** Enquanto o truco aposta em *quem ganha as rodadas*, o envido aposta em *quem tem a melhor soma de pontos na mão*.

- **Envido**: antes da primeira carta, alguém canta "envido". Compara-se a soma das duas cartas do **mesmo naipe** na mão (figuras valem 0, as numéricas valem o número, e soma-se 20 de bônus). Maior soma ganha **2 pontos**. Pode escalar: *envido → real envido (3) → falta envido (o que falta para o adversário fechar a partida)*.
- **Flor**: quando o jogador tem **três cartas do mesmo naipe**. Vale **3 pontos** e, em muitas mesas, cancela o envido.

**Por que ficou de fora do protótipo:** as duas variantes que você escolheu (paulista e mineiro) não usam envido nem flor. Colocá-las agora mudaria o ritmo do jogo e o balanceamento do bot sem necessidade.

**Como está preparado:** o motor guarda a configuração de variante num único objeto (`cfg.variant`), e a fase de aposta é separada da fase de rodada no `engine.js`. Para ligar envido/flor no futuro basta:

1. adicionar `variant: 'argentino'` na tela de configuração;
2. criar uma função `envidoPhase()` entre o embaralhar e a primeira rodada;
3. dar ao bot um avaliador de soma de naipe (o `ai.js` já separa "força de carta" de "decisão de aposta").

**Decisão recomendada para o trabalho da faculdade:** manter fora. É escopo extra que não aparece nas duas variantes que você escolheu como principais.

---

## 4. O que está no protótipo (jogável agora)

- Tela de título com arte pixel gerada, logo SVG próprio e "toque para jogar"
- Menu: Partida Rápida, Modo História, Como Jogar, Ranking, Ajustes
- Configuração de partida: variante (paulista/mineiro), formato (1x1/2x2/3x3), dificuldade (fácil/médio/difícil) com o alvo de pontos exibido
- Mesa de truco completa: vira, manilhas, assentos por time (borda verde = nós, vermelha = eles), carta grande na mão, cartas viradas dos outros, valor da mão sempre visível, marcador de rodadas
- Pedido de truco pelos dois lados, com aumento, aceite e corrida
- Duelo às cegas no empacho
- Mão de Ferro com revelação das cartas do parceiro
- Timer de 20s com jogada automática
- Bots com três perfis: **fácil** (joga quase aleatório, aceita pouco), **médio** (avalia mão + **blefa**), **difícil** (avalia mão, blefa e aumenta)
- Tutorial de 8 passos ilustrado com cartas de verdade, **com botão de pular**
- Ranking de sessão (vitórias, derrotas, pontos)
- Trilha sonora e efeitos sonoros sintetizados (Web Audio, sem arquivos externos), com liga/desliga
- Animações obrigatórias: distribuição das cartas, jogada, carta saindo da mesa, toasts de anúncio, piscar do timer
- **Mundo aberto**: cidade em pixel art gerada proceduralmente (ruas, praça com fonte, 6 prédios, árvores), personagem com d-pad na tela e WASD/setas no teclado, 6 NPCs com diálogo próprio em 3 idiomas, aposta em dinheiro, reputação, e desafios que exigem reputação mínima — cada NPC define formato, dificuldade e aposta da partida
- 3 idiomas completos (pt/en/es), incluindo tutorial e diálogos do mundo

### 4.1 Expansão do modo história (cidade em 3 fases)

A cidade virou um mapa único de 72x96 tiles dividido em **três bairros** separados por muro e cancela:

| Bairro | Fama para entrar | Chefão | Clima |
| --- | --- | --- | --- |
| Vila do Fundo | 0 | Bigode, o Dono | verde, sol baixo |
| Centro | 9 (+ vencer o Bigode) | Doutor Nogueira | cinza azulado |
| Morro do Ás | 24 (+ vencer o Nogueira) | A Lenda | roxo noturno |

- **15 desafiantes** (era 6), cada um com fala própria nos 3 idiomas, formato (1x1/2x2/3x3), dificuldade, aposta e fama mínima
- **3 chefões**: partida obrigatoriamente a **12 pontos**, bot com bônus de leitura, e a vitória **libera o bairro seguinte**
- **10 interiores visitáveis** (boteco, fliperama, capela, lotérica, edifício, clube, baile, casa, arena, oficina): mapa próprio, móveis, lâmpadas e tapete de saída — o botão de ação troca para "Entrar"/"Sair" perto das portas
- **13 prédios** no mapa, sendo **3 mercados** (um por bairro)
- **8 eventos do dia**, sorteados a cada partida concluída, que mexem de verdade nas regras: feira (itens 30% mais baratos), chuva (turno 5s mais curto + chuva desenhada na tela), boteco cheio (fama 1,5x), aposta dobrada (prêmio 2x), bicho premiado (+R$ 20), batida policial (mercado fechado), festa junina (turno 5s mais longo + moedas espalhadas)
- **Moedas no chão** para catar andando pela cidade
- **Caderneta reorganizada por bairro**, com placar de progresso (ex.: 3/5), marca de chefão e motivo do bloqueio
- Nova patente no topo: **Rei do Truco** (45 de fama)

### 4.2 Visual em pixel art detalhado

O arquivo `js/pixels.js` redesenha todo o mundo aberto. A cidade é pré-desenhada uma vez numa imagem fora da tela (grama com flores, asfalto com faixa e calçada, calçadão em ondas, árvores variadas, muros de tijolo, prédios com telhado, janelas, toldos e placas). Por cima entra uma camada animada com postes acesos, neon, fumaça, vagalumes, fonte, moedas e chuva. Os personagens têm contorno, 4 direções, passo animado, piscada e roupa própria. Os 10 interiores ganharam piso, parede e móveis próprios.

### 4.3 Easter eggs: a turma dos devs

São cinco personagens secretos. Eles não aparecem na caderneta nem têm aviso na porta. Cada um fica num esconderijo cercado de árvores com uma única passagem e só fica visível quando o jogador chega bem perto, com um brilho e um som discreto.

| Personagem | Onde | Aparência | Fala | Dificuldade |
|---|---|---|---|---|
| Alfonso (o criador) | Vila, atrás das casas na beirada direita | alto, óculos, cabelo preto | "Olá, muito obrigado por jogar meu jogo!" | Fácil |
| Martins | Vila, beirada esquerda | baixinho, boné verde | frases aleatórias e bobas ("Eu amo sorvete de cassis.") | Fácil |
| Prado | Centro, fundo à direita | gordinho, cabelo cacheado preto | uma curiosidade do mundo geek a cada conversa | Difícil |
| Dimas | Morro, fundo à direita, junto com o Chihiro | alto, óculos, cabelo preto (o mais parecido com o Alfonso) | frases de filosofia | Difícil |
| Chihiro | Morro, sempre ao lado do Dimas | um pouco menor que o Dimas, gordinho, sem óculos | frases icônicas e bobas | Médio |

Achar um segredo dá R$ 25, com fanfarra, confete e uma janela dourada animada. Achar os cinco dá mais R$ 100. Todos aceitam uma partida 1x1 de 12 pontos. Cada um tem uma "voz" própria (bipes com timbre diferente) enquanto o texto aparece letra por letra. A caderneta ganhou a seção **Segredos (n/5)**, que só mostra quem já foi encontrado.

### Limitação técnica do ambiente de preview

O ambiente de hospedagem do preview bloqueia `localStorage`. Por isso o protótipo **não salva progresso entre sessões**. No empacotamento mobile (Capacitor) isso deixa de ser um problema: o save entra com `Preferences`/SQLite. Ponto já mapeado no roadmap.

---

## 5. Arquitetura do código

```
truco/
├── index.html         telas (title, menu, config, tutorial, ranking, settings, game, world) + overlay global
├── css/style.css      design system pixel: tokens, cartas, mesa, mundo, animações
├── assets/            title.png, table.png, cardback.png (pixel art gerada)
└── js/
    ├── i18n.js        dicionários pt/en/es + tutorial por idioma
    ├── cards.js       baralho, manilhas (paulista/mineiro), força, SVG dos naipes
    ├── audio.js       Web Audio: trilha e efeitos sintetizados
    ├── ai.js          perfis de bot, decisão de jogada e de aposta (blefe)
    ├── engine.js      TrucoGame: mão, rodadas, apostas, empacho, mão de ferro
    ├── ui.js          TableUI: assentos, mão, modais, toasts, timer, animações
    ├── world.js       mundo aberto: mapa procedural, colisão, câmera, NPCs
    └── main.js        App: rotas de tela, configuração, história, ranking
```

**Separação importante:** `engine.js` não sabe desenhar e `ui.js` não sabe as regras. O motor pede decisões pela interface (`ui.humanTurn`, `ui.humanBetResponse`, `ui.ironHandChoice`), o que permite trocar a UI (ou plugar rede) sem reescrever regra nenhuma.

**Gancho de teste:** `window.render_game_to_text()` devolve o estado da partida em JSON, e `window.testPlay(i)` / `window.testBet()` disparam ações — foi assim que a partida completa foi testada automaticamente (3 partidas seguidas, 0 erros de console).

---

## 6. Roadmap (o que falta para o jogo completo)

### Fase 1 — Persistência e mobile (1 semana)
- Save local (perfil, progresso do mundo, estatísticas)
- Empacotar com **Capacitor**: Android primeiro, iOS depois
- Haptics no pedido de truco, safe-area de notch, orientação travada em retrato
- Ajuste de toque: alvo mínimo 44px, carta com "arrastar para jogar"

### Fase 2 — Contas e online (2–3 semanas)
- Contas com **apelido único** (nick), avatar e nível
- Backend: Node + WebSocket com estado autoritativo (o cliente nunca decide regra)
- **Partida rápida** (matchmaking por formato + variante) e **sala com amigos** (código de convite)
- **Sinais entre parceiros**: gestos discretos no multiplayer (toque longo no avatar do parceiro → sinal animado, com cooldown), como no truco de mesa
- **Chat** no online: frases rápidas pré-definidas + chat livre com filtro
- Reconexão e anti-abandono

### Fase 3 — Competitivo
- **Ranking** por MMR, **ligas** (bronze → lenda), **temporadas** com recompensas cosméticas, **torneios** eliminatórios
- Histórico de partidas e replay de mão

### Fase 4 — Mundo aberto expandido
- Mapa maior com bairros (boteco, feira, quadra, rodoviária), clima e ciclo dia/noite
- Bots que **evoluem**: cada NPC derrotado volta mais forte e com blefe mais agressivo
- Baralhos e mesas cosméticas compradas com o dinheiro ganho nas apostas
- Missões de história com narrativa própria

### Fase 5 — Extras
- Variante argentina com **envido e flor** (seção 3)
- Modo offline contra bots já pronto — estender com desafios diários
- Acessibilidade: daltonismo (naipes com forma além de cor), tamanho de fonte, redução de movimento

---

## 7. Balanceamento dos bots

| Nível | Avaliação de mão | Blefe | Aumenta | Aceita truco |
|---|---|---|---|---|
| Fácil | 25% | não | não | 42% |
| Médio | 65% | 15% | às vezes | pela mão |
| Difícil | 100% | 26% | 18% | pela mão |

O blefe entra **a partir do médio**, como você pediu. O bot difícil também lê o valor atual da mão antes de aumentar — ele blefa mais quando a mão vale pouco e ele tem cartas ruins, que é o comportamento humano.

---

## 8. Próximos passos sugeridos (para vocês codarem juntos)

1. Escolher e travar a variante do trabalho (recomendo paulista + mineiro, sem envido)
2. Ligar o save local antes de qualquer coisa — sem isso o mundo aberto perde sentido
3. Empacotar em Android e testar em celular real (toque, performance, bateria)
4. Só então partir para o online: é a parte mais caras de manter e a que menos aparece num trabalho de faculdade
5. Documentar as regras da casa (empacho → duelo às cegas, mão de ferro) no próprio jogo, porque banca de faculdade sempre pergunta

---

## 9. Créditos e referências de regra

- Regras de truco paulista e mineiro conforme praticadas em mesa e descritas na [Wikipédia — Truco](https://pt.wikipedia.org/wiki/Truco)
- Regras de envido e flor conforme o truco argentino descrito na [Wikipédia — Truco (jogo argentino)](https://es.wikipedia.org/wiki/Truco_argentino)
- Referência de apresentação de mesa e feedback: [Balatro](https://www.playbalatro.com/)
- Empacotamento mobile a partir de web: [Capacitor](https://capacitorjs.com/docs)

---

## 12. Build Android (APK)

O jogo foi empacotado como aplicativo Android nativo usando [Capacitor 6](https://capacitorjs.com/docs/android), que roda o jogo dentro de um WebView nativo — a mesma abordagem de jogos HTML5 publicados nas lojas.

### Configuração do app

| Item | Valor |
| --- | --- |
| Package / applicationId | `br.com.trucodeboteco.game` |
| Nome exibido | Truco de Boteco |
| versionName / versionCode | 1.1 / 2 |
| compileSdk / targetSdk | 34 |
| minSdk | 22 (Android 5.1+) |
| Orientação | retrato travado (`screenOrientation="portrait"`) |
| Assinatura | chave de debug (para release, gerar keystore própria) |
| Tamanho | ~12 MB |
| Internet | **não precisa** — roda 100% offline |

### Ajustes feitos para a versão mobile

1. **Fontes embutidas** — Silkscreen e Azeret Mono passaram de Google Fonts para arquivos `.woff2` locais em `fonts/`, com `@font-face` em `css/fonts.css`. Sem isso o app perderia a tipografia pixel quando estivesse sem internet.
2. **Progresso salvo** (`js/save.js`) — grava em `localStorage` (chave `truco_boteco_save_v1`): idioma, música/efeitos, configuração da última partida, estatísticas de vitórias/derrotas/pontos e o estado do mundo aberto (dinheiro, reputação, NPCs derrotados, posição do jogador). Salva ao fim de cada partida, ao mudar ajustes, ao sair do mundo e quando o app vai para segundo plano (`pause` / `visibilitychange`). No preview web o armazenamento é bloqueado; o código detecta e segue sem salvar.
3. **Botão voltar do Android** — via `@capacitor/app`: na mesa abandona a partida e volta ao menu (ou ao mundo, se for modo história), no mundo salva e volta ao menu, no menu volta ao título, no título fecha o app. `Escape` faz o mesmo no desktop.
4. **Ícone adaptativo** — pixel art 1:1 em todas as densidades (mdpi → xxxhdpi), com foreground na zona segura de 72dp e fundo `#123125`.
5. **Splash screen** — arte do título recortada em retrato e paisagem para as cinco densidades.

### Como recompilar

```bash
cd truco-app
./build-apk.sh          # gera TrucoDeBoteco.apk
```

Dependências: JDK 21, Android SDK (platform 35 + build-tools 35.0.0), Node 20+. O script copia `truco/` para `www/`, roda `npx cap sync android` e `./gradlew assembleDebug`.

### Instalação no celular

O APK é assinado com a chave de debug, então o Android pede permissão para instalar de fonte desconhecida: abrir o arquivo → "Permitir desta fonte" → Instalar. Para publicar na Play Store é necessário gerar uma keystore própria e um Android App Bundle (`./gradlew bundleRelease`), conforme comentado no fim do `build-apk.sh`.

---

## 13. Versão 1.1 — itens aprovados no Laboratório (Dia 1)

Entraram no jogo só os itens marcados como "Quero". "Sinais do parceiro" ficou como "Talvez" e não foi implementado.

### Movimento com aceleração, corrida e câmera suave
- `js/world.js`: velocidade com aceleração (0.22) e atrito (0.3) em vez de passo fixo; ao parar o personagem dá um leve "achatamento" (squash).
- Corrida: botão **CORRER** (`#run-btn`) no celular ou **Shift** no teclado, 1,75x a velocidade, com mais poeira nos pés.
- `js/pixels.js`: câmera única `updateCam` com suavização (lerp 0.1), olha um pouco à frente na direção do movimento, centraliza mapas pequenos e corta direto ao trocar de cena.

### Mesa com impacto (estilo Balatro)
- Cartas entram voando da mão/assento com mola e giro de ±3°, partículas e tremida leve da mesa; manilha brilha e treme mais.
- Cada carta da vaza toca uma nota que sobe (dó, ré, mi, fá, sol, lá).
- TRUCO/SEIS/NOVE/DOZE: carimbo gigante na mesa, pancada grave, música abaixa na hora (ducking) e o "Vale" sobe contando.
- Cartas da mão inclinam e ganham reflexo ao passar o dedo. Respeita "reduzir movimento" do sistema.

### Ler o blefe: bots com tiques
- `js/faces.js` (novo): rostos pixel 32x32 animados para cada personagem nos assentos da mesa (substituem os emojis).
- Quando um bot pede truco, pode deixar escapar um tique na janela de resposta: suando frio, olhar desviando, dedo batucando, sorriso de canto ou assobio.
- A IA marca se o pedido é blefe (`bluff` em `ai.js`). No fácil o tique quase sempre aparece e é sincero; no médio às vezes; no difícil e com Mão de Ferro/feras ele pode ser fingido.

### Trilha dinâmica em camadas
- `js/audio.js`: música agendada no relógio do Web Audio (sem atrasos no celular).
- Clima 0 (calmo): choro original + chimbal leve. Clima 1 (truco na mesa, vale 3+): mais rápida, pandeiro, cavaquinho no contratempo e surdo. Clima 2 (Mão de Ferro): baixo uma oitava abaixo, melodia some, batida de coração e filtro abafado.

### Correções
- `Sound` e `App` agora ficam visíveis globalmente: o som da moeda, o brilho dos segredos e o salvamento ao pegar dinheiro no mundo, que antes eram ignorados, voltaram a funcionar.

### Observação sobre instalação
O APK v1.1 foi assinado com uma nova chave de debug. Se a v1.0 estiver instalada, o Android pode recusar a atualização: desinstale a v1.0 antes (o progresso salvo da v1.0 é perdido).

### v1.1.1 — ajuste de velocidade
- Caminhada mais lenta: `speed` de 1.6 para 1.15 (cerca de 70 px/s; correr fica em cerca de 120 px/s).
- Loop do mundo com passo fixo de 60 por segundo: antes, em celulares com tela de 90/120 Hz o personagem andava até 2x mais rápido.
- `World.start()` não abre um segundo loop se já estiver rodando.

---

## 14. Versão 1.2 — itens aprovados no Laboratório Extra

Entraram os itens marcados "Quero". "Câmera lenta na carta decisiva" (Não) ficou de fora e "Desafio do dia" (Talvez) ficou guardado para depois.

### Falas de boteco
- `js/talk.js` (novo): botão de balão no canto da mesa abre seis falas ("Truco, marreco!", "Cai dentro!", "Tá com medo?", "Boa jogada", "Foi mal", "Desce a próxima"). Limite de 3 falas a cada 10 s.
- Cada bot tem um jeito fixo (calmo, marrento ou brincalhão), com respostas, voz de bipes e carinha reagindo. Os bots também falam sozinhos ao trucar, aceitar, correr e ganhar mão.
- Opção "Silenciar adversários" no próprio menu de falas (fica salva). Textos em pt/en/es.

### Clima e hora do dia
- Relógio do mundo (`World.hour`): 1 hora a cada 15 s andando, dia inteiro em 6 minutos; cada desafio no modo história passa 1h30. A hora aparece no topo.
- Amanhecer rosado, pôr do sol laranja e noite azul-escura; à noite os postes e as portas dos lugares acendem e os vagalumes só aparecem no escuro.
- Novo clima "Garoa" (chuva fina, turno 2 s mais curto, +20% de fama), além da chuva forte que já existia.
- Previsão do dia seguinte: o aviso de dia novo mostra a hora e a previsão de amanhã, e o dia seguinte segue a previsão.

### Coleção de baralhos e mesas
- `js/collection.js` (novo) + botão "Coleção" no menu. Só visual, sem vantagem.
- 7 versos de carta (Clássico, Toalha xadrez, Parede de tijolo, Azulejo, Rótulo de guaraná, Noite na cidade, Lenda) e 5 panos de mesa (Feltro verde, Mesa de bar, Lona azul, Pano vinho, Veludo roxo), cada um com condição clara (ex.: ganhar mão de 12, vencer em dia de chuva, vencer à noite, derrotar um chefe, 3 vitórias seguidas, 30 falas).
- Ao liberar, aparece a tela "Novo visual liberado" com opção de usar na hora.

### Correção importante: progresso salvo
- `js/save.js` agora grava de verdade no aparelho (`localStorage`, chave `truco_boteco_save_v1`). Antes o arquivo só guardava na memória, então o APK perdia o progresso ao fechar. No preview web, se o navegador bloquear, ele continua só em memória.

---

## 15. Versão 1.3 — aba de Ajustes ampliada

`js/settings.js` (novo). Tudo fica salvo junto com o progresso.

| Grupo | Ajuste | Opções |
| --- | --- | --- |
| Geral | Idioma, Música, Efeitos | (já existiam) |
| Som | Volume da música / dos efeitos | 0–100% (barra) |
| Som | Vozes dos personagens | ligado / desligado (bipes das falas) |
| Jogo | Velocidade dos bots | Normal, Rápida, Lenta (tempo de pensar e dos avisos) |
| Jogo | Tempo para jogar | 20, 30, 45, 15 s ou sem limite |
| Jogo | Falas dos adversários | ligado / desligado (sincroniza com o menu de falas) |
| Jogo | Tiques dos bots | ligado / desligado |
| Jogo | Confirmar ao sair da partida | ligado / desligado |
| Tela | Efeitos na mesa | Completo, Leve, Desligado (tremor e partículas) |
| Tela | Texto grande, Vibração, Dicas na tela | ligado / desligado |
| Tela | Modo canhoto | direcional na direita, botões na esquerda |
| Dados | Resumo do progresso e Apagar progresso | com confirmação |

---

## 16. Versão 1.4 — Ajustes dentro do jogo

- Botão de engrenagem no modo história (embaixo da caderneta) e na barra de cima da partida (ao lado do ✕).
- Os Ajustes abrem por cima da tela atual; o ◀ volta exatamente para onde você estava.
- No mundo, o boneco e o relógio param enquanto os Ajustes estão abertos.
- Na partida, a mesa pausa: os bots não jogam e o tempo do turno congela até você fechar.

---

## 17. Versão 1.5 — revisão do mapa (pessoas fora do lugar)

Varredura automática de todas as pessoas da cidade e dos interiores (tipo de bloco embaixo de cada uma e se dá para chegar perto andando).

- Pilantra do Ponto (`taxi`): estava em cima do telhado do Baile, sem acesso. Agora fica na calçada, em frente ao Baile (19,75).
- Seu Valdir (Edifício), Vó Cotinha (Casa) e Dudu (Fliperama) estavam em cima da mesa. Agora ficam na cabeceira, embaixo da mesa.
- A Lenda do Norte estava no meio da mesa da Arena, sem como chegar perto. Agora fica na cabeceira (10,8).
- Dete (atrás do balcão) e Bigode (atrás do bar) seguem atrás do balcão de propósito (`behind: true`).
- Nova proteção `World.fixSpots`: se alguém cair num bloco sólido (telhado, árvore, móvel, muro), vai para o chão livre mais perto.
- Os segredos (Alfonso, Martins, Prado, Dimas, Chihiro) continuam escondidos atrás de casas e árvores, todos com passagem.
