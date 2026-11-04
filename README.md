# Pokémon Campus

Monorepo TypeScript para um jogo de exploração no campus, com interface web offline, API e regras compartilhadas.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior
- PostgreSQL para os endpoints que usam dados persistidos

## Começar

    npm install
    npm run dev

O app web abre em http://localhost:5173 e a API em http://localhost:3000. A rota GET /health confirma que a API está ativa. Para usar a conexão com PostgreSQL, defina DATABASE_URL antes de iniciar a API.

## Estrutura

    apps/
      web/                 React, Vite, Leaflet, PWA e armazenamento offline
      api/                 Fastify, rotas, serviços e PostgreSQL
    packages/
      shared/              Contratos TypeScript e schemas Zod
      game-engine/         Regras de jogo puras e determinísticas
    docs/
      CONTRACTS.md         Contratos HTTP, modelos, eventos e sincronização

O contrato compartilhado está em docs/CONTRACTS.md e em packages/shared/src/index.ts. Os quatro integrantes devem combinar mudanças nesses contratos antes de depender deles em seus módulos.

## Decisões da arquitetura

A estrutura atende ao requisito central do Pokémon Campus: explorar e registrar progresso pelo celular mesmo quando a conexão oscila, mantendo o servidor responsável pelo estado oficial quando o dispositivo voltar a ficar online.

- apps/web concentra a experiência móvel e o armazenamento local; apps/api valida as ações e coordena a persistência no PostgreSQL.
- packages/shared mantém schemas e formatos de eventos iguais entre cliente e servidor, reduzindo divergências durante a sincronização.
- packages/game-engine reúne cálculos determinísticos para que uma ação iniciada offline possa ser reproduzida e validada pelo servidor com a mesma semente e versão das regras.

Essa organização descreve o desenho do jogo; as rotas implementadas e as que ainda são especificações estão distinguidas em docs/CONTRACTS.md.

## Módulo de exploração (mapa, GPS e spawns)

Código em `apps/web/src/features/exploration/`; a API pública fica em `index.ts`.

- Mapa com React Leaflet e tiles do OpenStreetMap (atribuição exibida no canto do mapa), centralizado no Campus Luiz Meneghel da UENP.
- **As cinco zonas dos cursos são polígonos de demonstração** (`data/campusZones.ts`, `isDemo: true`). Não representam limites oficiais; substitua as coordenadas por dados verificados ou carregue-as de `GET /api/v1/zones`.
- GPS real com `watchPosition` (`services/location.ts`); distâncias com Haversine e detecção de zona feitas no próprio dispositivo, sem rede.
- Spawns simulados em `data/mockSpawns.ts`, acessados pela interface `SpawnRepository`. O repositório local-first guarda os últimos spawns no IndexedDB para uso offline.
- O botão "Batalhar / Capturar" só é habilitado a até 30 m de um spawn ativo e apenas emite um `EncounterStartRequest`; a validação definitiva é do backend.
- Se os tiles não carregarem, a tela troca para um radar que funciona só com coordenadas.
- **GPS simulado (apenas em `npm run dev`)**: toque em "GPS simulado" e depois no mapa. O código é removido do build de produção e a posição do cliente nunca serve como autorização.

### Telas do jogador

Seguem o design em `docs/design/` (estilo "Aventura colorida": Fredoka + Nunito, creme, contorno escuro e sombra sólida).

| Rota | Tela |
| --- | --- |
| `/boas-vindas`, `/inicial`, `/localizacao` | Onboarding: entrar com Google (simulado), escolher o inicial, permitir GPS |
| `/` | Mapa com as zonas, Pokémon por perto (cartas com distância e direção) e encontro |
| `/batalha`, `/captura`, `/resultado` | Batalha (atacar, capturar, trocar, fugir), captura com 3 chacoalhadas e recompensas |
| `/colecao`, `/equipe` | Álbum por raridade e equipe de até 3 |
| `/perfil`, `/ranking`, `/configuracoes` | Pontuação, mochila, ranking geral/por curso, nome, curso e conta Google |

O que ainda é protótipo local:

- **Login com Google** é simulado; o real vem do módulo de autenticação.
- **Perfil, coleção, equipe, mochila e pontos** ficam no `localStorage` deste navegador (`features/player/`) até existirem as rotas da API. "Sair da conta" apaga esse progresso.
- **Batalha e captura** rodam no cliente com as regras do `game-engine` (`calculateDamage`, `captureChance`, `deterministicRollV1`), mas não enviam eventos de sincronização: o resultado oficial continua sendo do servidor quando o módulo de batalha/sync for integrado.
- **Ranking** usa jogadores de exemplo além do próprio jogador.

### Painel de admin (`/admin`)

Abra `http://localhost:5173/admin` (ou `https://<IP>:5173/admin` com `npm run dev:phone`). O código fica em `apps/web/src/features/admin/`. A tela do jogo não mostra ferramentas de edição.

- **+ Nova zona**: toque no mapa marcando os cantos na ordem do contorno (qualquer formato, mínimo 3 pontos), dê um nome e salve.
- Selecione uma zona (na lista ou no mapa) para editar: arraste os quadrados para mover cantos, toque nos **+** para criar cantos, toque duas vezes (ou segure) num canto para removê-lo e arraste **✥** para mover a zona inteira. Nome e cor também são editáveis.
- "Mostrar Pokémon gerados" exibe uma prévia dos spawns simulados, que nascem dentro de cada zona e acompanham as mudanças de formato.
- As edições são salvas automaticamente no IndexedDB deste navegador e o jogo do mesmo dispositivo passa a usá-las. Use **Exportar JSON** para compartilhar ou levar as zonas para o código/API, **Importar JSON** em outro dispositivo e **Restaurar padrão** para descartar.

O painel abre em desenvolvimento. Num build publicado, só com `VITE_ENABLE_ADMIN=true`. Ainda não há login de administrador nem gravação no servidor: isso depende dos módulos de autenticação e da API (ex.: `PUT /api/v1/zones`, que a API deve proteger).

### Jogar no celular

O GPS do navegador só funciona em HTTPS (ou em `localhost`). Com o celular na mesma rede Wi-Fi do computador:

    npm run dev:phone

Abra no celular o endereço `https://<IP-do-computador>:5173` mostrado em "Network". O certificado é autoassinado: aceite o aviso ("Avançado → Continuar") e permita a localização. Se o celular não conectar, libere a porta 5173 no firewall do Windows para redes privadas. Também é possível usar o link de preview/staging do Firebase Hosting, que já é HTTPS.

### Área de spawn pessoal (ex.: sua casa)

Para jogar fora do campus, crie `apps/web/.env.local` a partir de `apps/web/.env.example` com a latitude e a longitude do local. O jogo cria uma zona circular com três Pokémon simulados (um perto do centro, dentro do raio de captura). O arquivo é ignorado pelo git, então as coordenadas não vão para o repositório. Não use essas variáveis em builds públicos: o valor fica embutido no JavaScript publicado.

## Hospedagem

O app web (PWA estático em `apps/web/dist`) é publicado no Firebase Hosting pelo workflow `.github/workflows/ci.yml`:

- todo PR e push na main: lint, typecheck, testes e build;
- PR → link de preview temporário (7 dias) no projeto dev;
- merge na main → staging em `https://pokemon-campus-dev.web.app`;
- staging → produção (`https://pokemon-campus-prod.web.app`) após aprovação manual no environment `producao`.

Para ativar:

1. Crie os projetos Firebase `pokemon-campus-dev` e `pokemon-campus-prod` (ou ajuste os IDs em `.firebaserc` e no workflow).
2. Rode `npx firebase-tools init hosting:github` em cada projeto para gerar as contas de serviço e salve-as como secrets `FIREBASE_SA_DEV` e `FIREBASE_SA_PROD` no GitHub.
3. Crie os environments `staging` e `producao` no repositório e exija aprovação em `producao`.

Enquanto os secrets não existirem, os jobs de deploy são pulados sem falhar. Deploy manual: `npm run build` e `npx firebase-tools deploy --only hosting --project dev`.

O Firebase Hosting serve apenas o front-end. A API Fastify/PostgreSQL precisa de outra hospedagem (ex.: Cloud Run, Render ou Railway) quando o módulo de sincronização for integrado.

## Scripts

- npm run dev inicia web e API juntos.
- npm run build compila os pacotes compartilhados, a API e o app web.
- npm run typecheck verifica os quatro workspaces.
- npm run lint executa ESLint.
- npm run test:unit executa os testes Vitest que forem adicionados.
