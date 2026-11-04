# Pokémon Campus

Monorepo TypeScript para um jogo de exploração no campus, com interface web offline, API e regras compartilhadas.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior
- PostgreSQL para os endpoints que usam dados persistidos

## Começar

```bash
npm install
npm run dev
```

O app web abre em `http://localhost:5173` e a API em `http://localhost:3000`. A rota `GET /health` confirma que a API está ativa. Para usar a conexão com PostgreSQL, defina `DATABASE_URL` antes de iniciar a API.

Também é possível iniciar cada app separadamente com `npm run dev:web` e `npm run dev:api`.

## Workspaces

```text
apps/
  web/                 React, Vite, Leaflet, PWA e armazenamento offline
  api/                 Fastify, rotas, serviços e acesso a PostgreSQL
packages/
  shared/              Contratos TypeScript e schemas de validação
  game-engine/         Regras de jogo puras e determinísticas
```

Os pacotes internos são ligados pelo npm workspaces. O motor de jogo permanece independente de React, banco de dados e rede, seguindo a separação de domínio usada pelo projeto de referência. A camada web mantém sincronização e IndexedDB em `apps/web/src/sync/`; a API concentra rotas, serviços e banco em `apps/api/src/`.

## Scripts

- `npm run dev` inicia web e API juntos.
- `npm run build` compila os pacotes compartilhados, a API e o app web.
- `npm run typecheck` verifica os quatro workspaces.
- `npm run lint` executa ESLint.
- `npm run test:unit` executa os testes Vitest que forem adicionados.

O setup segue os padrões observados em `segura-e-balanca`: Vite, TypeScript estrito, ESLint flat config, Vitest, PWA com atualização controlada e Dexie para dados offline. A configuração Firebase e os emuladores específicos daquele projeto não foram trazidos para esta arquitetura Fastify/PostgreSQL.

