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
