# Pokémon Campus

Jogo para celular (PWA) de exploração no Campus Luiz Meneghel da UENP: o jogador caminha com o GPS, encontra Pokémon nas zonas dos cursos, batalha, captura e sobe no ranking. Funciona online e offline: o progresso fica salvo no aparelho e é sincronizado com o servidor (Firebase) quando há conexão.

Site publicado: **https://pokecampus-uenp.web.app**

## Tecnologias

| Parte | Tecnologia |
| --- | --- |
| Cliente (PWA) | React 19, TypeScript, Vite, Tailwind CSS, React Leaflet + OpenStreetMap, `vite-plugin-pwa` (service worker) |
| Armazenamento local | IndexedDB (Dexie) e localStorage |
| Servidor remoto | Firebase: **Cloud Firestore** (dados), **Authentication** (login Google) e **Hosting** (site) |
| Regras do jogo | `packages/game-engine` (batalha, captura, XP e sorteios determinísticos) |
| Testes | Vitest e Testing Library |

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

Não é preciso banco de dados local: o servidor é o projeto Firebase `pokecampus-uenp`.

## Começar

    npm install
    npm run build:packages
    npm run dev -w apps/web

O jogo abre em http://localhost:5173 (use `localhost`, que é o endereço liberado para o login Google). O painel de admin fica em http://localhost:5173/admin.

## Estrutura

    apps/
      web/                 O jogo: React, Vite, Leaflet, PWA, armazenamento local e sincronização com o Firebase
      api/                 API Fastify/PostgreSQL do começo do projeto (não é usada pelo jogo)
    packages/
      shared/              Contratos TypeScript e schemas Zod
      game-engine/         Regras de jogo puras e determinísticas
    docs/
      SINCRONIZACAO.md     Online/offline: armazenamento local, sincronização, conflitos e falhas
      CONTRACTS.md         Contratos HTTP planejados para a API (referência)
    firestore.rules        Regras de segurança do banco (Firestore)

## Decisões da arquitetura

- **Cliente:** `apps/web` roda o jogo, guarda tudo no aparelho e funciona sem internet.
- **Módulo de sincronização:** `apps/web/src/sync/` envia as jogadas para o servidor (fila de saída, idempotência, backoff) e acompanha o estado da conexão.
- **Servidor:** Firebase. O Firestore guarda as jogadas de cada jogador, o ranking e as zonas publicadas pelo admin; as regras em `firestore.rules` validam quem pode escrever o quê.
- `packages/game-engine` reúne cálculos determinísticos (dano, captura, crítico, recompensas), então a mesma batalha dá o mesmo resultado em qualquer aparelho.

## Online, offline e sincronização

O progresso do jogador é um registro de eventos guardado no IndexedDB e enviado ao Cloud Firestore quando há conexão, com fila de saída, idempotência, backoff, detecção de "sem rede" e de "servidor fora" e uma política de conflitos determinística. Detalhes, política de conflitos e roteiro dos testes da apresentação: [docs/SINCRONIZACAO.md](docs/SINCRONIZACAO.md).

## Módulo de exploração (mapa, GPS e spawns)

Código em `apps/web/src/features/exploration/`; a API pública fica em `index.ts`.

- Mapa com React Leaflet e tiles do OpenStreetMap (atribuição exibida no canto do mapa), centralizado no Campus Luiz Meneghel da UENP.
- **Zonas dos cursos** em `data/campusZones.ts`, posicionadas pelo painel de admin. O admin publica as zonas no Firestore (`mundo/zonas`) e todos os jogadores recebem sozinhos.
- **Cada Pokémon aparece na zona do curso que combina com ele** (`HABITATS` em `features/catalog/species.ts`).
- GPS real com `watchPosition` (`services/location.ts`); distâncias com Haversine e detecção de zona feitas no próprio dispositivo, sem rede.
- Spawns gerados em `data/mockSpawns.ts` a partir de uma semente (zona + janela de 30 min): todos os jogadores veem os mesmos Pokémon sem trocar mensagens. Os últimos spawns ficam no IndexedDB para uso offline.
- O botão "Batalhar / Capturar" só é habilitado a até 30 m de um spawn ativo.
- Se os tiles não carregarem, a tela troca para um radar que funciona só com coordenadas.
- **GPS simulado (apenas em `npm run dev`)**: toque em "GPS simulado" e depois no mapa. O código é removido do build de produção e a posição do cliente nunca serve como autorização.

### Telas do jogador

Seguem o design em `docs/design/` (estilo "Aventura colorida": Fredoka + Nunito, creme, contorno escuro e sombra sólida).

| Rota | Tela |
| --- | --- |
| `/boas-vindas`, `/curso`, `/inicial`, `/localizacao` | Primeiro acesso: entrar com Google, escolher o curso, escolher o inicial, permitir GPS |
| `/` | Mapa com as zonas, Pokémon por perto (cartas com distância e direção) e encontro |
| `/batalha`, `/captura`, `/resultado` | Batalha (atacar, capturar, trocar, fugir), captura com 3 chacoalhadas e recompensas |
| `/colecao`, `/equipe` | Álbum por raridade e equipe de até 3 |
| `/perfil`, `/ranking`, `/historico`, `/configuracoes` | Pontuação, mochila, sincronização, ranking (geral, meu curso, por curso), histórico de batalhas, nome, curso, músicas e conta Google |

Como os dados são guardados:

- **Login com Google** de verdade (Firebase Authentication).
- **Progresso** (curso, Pokémon, equipe, mochila, pontos, batalhas) é um registro de jogadas no IndexedDB, sincronizado com o Firestore. Outro aparelho com a mesma conta recupera tudo. Veja [docs/SINCRONIZACAO.md](docs/SINCRONIZACAO.md).
- **Batalha em andamento** fica salva no aparelho e continua se o app fechar no meio.
- **Ranking** vem do servidor (`ranking/{uid}` no Firestore).

### Painel de admin (`/admin`)

Abra `http://localhost:5173/admin` (ou `https://<IP>:5173/admin` com `npm run dev:phone`). O código fica em `apps/web/src/features/admin/`. A tela do jogo não mostra ferramentas de edição.

- **+ Nova zona**: toque no mapa marcando os cantos na ordem do contorno (qualquer formato, mínimo 3 pontos), dê um nome e salve.
- Selecione uma zona (na lista ou no mapa) para editar: arraste os quadrados para mover cantos, toque nos **+** para criar cantos, toque duas vezes (ou segure) num canto para removê-lo e arraste **✥** para mover a zona inteira. Nome e cor também são editáveis.
- "Mostrar Pokémon gerados" exibe uma prévia dos spawns simulados, que nascem dentro de cada zona e acompanham as mudanças de formato.
- **Cada mudança é publicada para todos os jogadores**: zonas vão para o Firestore em `mundo/zonas` e Pokémon colocados em `mundo/pokemon`. O jogo escuta esses documentos e aplica a versão nova sozinho, sem o jogador fazer nada. Cada aparelho guarda a última versão recebida, então ela continua valendo offline. Os Pokémon das zonas são gerados de forma determinística, então todos os jogadores veem os mesmos.
- **Exportar JSON** e **Importar JSON** continuam disponíveis para backup. **Restaurar padrão** publica as zonas padrão para todos.

Quem pode publicar: o painel abre para qualquer um, mas só grava no servidor quem entrar com uma conta Google que tenha o documento `admins/{uid}` no Firestore. Para virar admin:

1. Abra `/admin` e toque em **Entrar com Google**. O painel mostra o seu UID.
2. Em Firebase Console → Firestore Database → **Iniciar coleção** `admins`, crie um documento com o ID igual a esse UID. Pode ficar sem campos; se o Console exigir um, use `nome` = seu nome.
3. Recarregue o painel. Ele passa a mostrar "admin" e a publicar.

As regras (`firestore.rules`) garantem que só admins escrevem em `mundo/` e que ninguém consegue se tornar admin pelo app. `VITE_ENABLE_ADMIN=false` esconde o painel num build.

### Jogar no celular

O jeito mais simples é abrir o site publicado no celular: **https://pokecampus-uenp.web.app** (o jogo ensina a colocá-lo na tela inicial).

Para testar uma versão que ainda não foi publicada, o GPS do navegador precisa de HTTPS. Com o celular na mesma rede Wi-Fi do computador:

    npm run dev:phone

Abra no celular o endereço `https://<IP-do-computador>:5173` mostrado em "Network". O certificado é autoassinado: aceite o aviso ("Avançado → Continuar") e permita a localização. Se o celular não conectar, libere a porta 5173 no firewall do Windows para redes privadas. Nesse endereço o login com Google não funciona (o Firebase só libera `localhost` e o site publicado).

### Área de spawn pessoal (ex.: sua casa)

Para jogar fora do campus, crie `apps/web/.env.local` a partir de `apps/web/.env.example` com a latitude e a longitude do local. O jogo cria uma zona circular com três Pokémon simulados (um perto do centro, dentro do raio de captura). O arquivo é ignorado pelo git, então as coordenadas não vão para o repositório. Não use essas variáveis em builds públicos: o valor fica embutido no JavaScript publicado.

## Hospedagem

O app web (PWA estático em `apps/web/dist`) é publicado no Firebase Hosting, projeto **`pokecampus-uenp`**: **https://pokecampus-uenp.web.app**.

Publicar manualmente (do computador):

    npx firebase-tools login
    npm run build:packages
    npm run build -w apps/web
    npx firebase-tools deploy --only hosting,firestore

`--only firestore` publica as regras (`firestore.rules`). Antes do primeiro deploy, crie o banco uma vez em Firebase Console → Firestore Database → Criar banco de dados (modo produção, região `southamerica-east1`).

Publicação automática pelo workflow `.github/workflows/ci.yml`:

- todo PR e push na main: lint, typecheck, testes e build;
- PR → link de preview temporário (7 dias);
- push/merge na main → publica em `https://pokecampus-uenp.web.app`.

Para ativar a automática, rode uma vez `npx firebase-tools init hosting:github`, informe o repositório `Juuhgb/pokemon-campus` e **não** sobrescreva `firebase.json` nem os workflows. Ele cria o secret `FIREBASE_SERVICE_ACCOUNT_POKECAMPUS_UENP` no GitHub. Enquanto o secret não existir, os deploys são pulados sem falhar.

O servidor remoto do jogo é o próprio Firebase (Authentication + Cloud Firestore + Hosting, plano gratuito). A API Fastify/PostgreSQL em `apps/api` ficou do começo do projeto e não é usada pelo jogo.

## Scripts

- `npm run dev -w apps/web` inicia o jogo (rode `npm run build:packages` antes, na primeira vez).
- `npm run build:packages` compila os pacotes compartilhados (`shared` e `game-engine`).
- `npm run build -w apps/web` gera o site em `apps/web/dist` (rode `npm run build:packages` antes).
- `npm run build` compila tudo, inclusive a API antiga.
- `npm run typecheck` verifica os quatro workspaces.
- `npm run lint` executa o ESLint.
- `npm run test:unit` executa os testes (Vitest).
