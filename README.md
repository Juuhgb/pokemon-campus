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

## Scripts

- npm run dev inicia web e API juntos.
- npm run build compila os pacotes compartilhados, a API e o app web.
- npm run typecheck verifica os quatro workspaces.
- npm run lint executa ESLint.
- npm run test:unit executa os testes Vitest que forem adicionados.
