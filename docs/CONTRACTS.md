# Pokémon Campus — contratos v1

Este documento é a referência comum para os quatro módulos. A proposta está alinhada com o projeto atual: React/PWA e Dexie no cliente, Fastify/PostgreSQL no servidor, e regras puras em game-engine. Revisem os nomes e as regras juntos antes de implementarem funcionalidades que ainda não existem.

## Regras compartilhadas

- A API usa JSON, nomes de propriedades em camelCase e prefixo /api/v1. A rota /health permanece sem versão.
- IDs de entidades e dispositivos são UUID. Datas são UTC em ISO 8601, terminando em Z.
- O servidor é a autoridade para dano, captura, experiência, pontuação e estado final. O cliente envia ações pretendidas; não envia resultados calculados.
- Todo erro HTTP usa o formato ApiErrorSchema de packages/shared. Rejeições de eventos durante sync são respostas por item, não falhas HTTP da requisição inteira.
- Endpoints de leitura do mapa, espécies, ranking e perfil público podem ser usados sem login. Perfil pessoal (`/players/me`), coleção, equipe, encontros e sync exigem `Authorization: Bearer <token>`.

### Estado da implementação

Este arquivo fixa o contrato-alvo para o grupo. Neste momento, a API implementa `GET /health` e `GET /api/v1/players/:playerId`; as outras rotas da tabela são especificações para os módulos desenvolverem. Não assumam que uma rota já está disponível só porque aparece no contrato.

## Contratos HTTP

| Método e rota | Acesso | Entrada | Resposta de sucesso |
| --- | --- | --- | --- |
| GET /health | Público | — | { status: "ok", service: "pokemon-campus-api" } |
| POST /api/v1/auth/register | Público | RegisterPlayerRequest | AuthSession; 201 |
| POST /api/v1/auth/login | Público | LoginPlayerRequest | AuthSession; 200 |
| GET /api/v1/players/me | Login | — | PlayerProfile |
| GET /api/v1/players/:playerId | Público | UUID no caminho | PlayerProfile |
| GET /api/v1/zones | Público | — | Zone[] |
| GET /api/v1/spawns?zoneId=<uuid>&at=<data> | Público | Zona e instante opcionais | Spawn[] |
| GET /api/v1/species?cursor=<cursor>&limit=50 | Público | Paginação | { items: CreatureSpecies[], nextCursor } |
| GET /api/v1/players/me/creatures | Login | — | PlayerCreature[] |
| GET /api/v1/players/me/party | Login | — | Party |
| PUT /api/v1/players/me/party | Login | PartyUpdateRequest | Party |
| GET /api/v1/encounters/:encounterId | Login | UUID no caminho | EncounterSnapshot |
| POST /api/v1/sync/events | Login | SyncRequest | SyncResponse |
| GET /api/v1/sync/changes?after=<cursor>&limit=100 | Login | Cursor do servidor | SyncChangesResponse |
| GET /api/v1/leaderboard?cursor=<cursor>&limit=50 | Público | Paginação | { items: LeaderboardEntry[], nextCursor } |

Paginação aceita limites de 1 a 100. `GET /api/v1/players/:playerId` retorna somente id, nome de exibição, pontuação e data de criação; e-mail e credenciais nunca aparecem no DTO público. `GET /api/v1/players/me` retorna o mesmo DTO e exige sessão.

### Erros HTTP

Todos os erros usam:

    {
      "error": {
        "code": "INVALID_REQUEST",
        "message": "Descrição legível",
        "requestId": "id da requisição",
        "details": {}
      }
    }

Códigos HTTP: 400 entrada inválida, 401 sem sessão válida, 403 ação não permitida, 404 recurso ausente, 409 versão em conflito, 422 regra do jogo recusou a ação, 503 banco ou serviço indisponível.

## Modelos de dados

| Modelo | Chave e campos principais | Responsável |
| --- | --- | --- |
| Player | id UUID, email, displayName, passwordHash, score, createdAt | API |
| CreatureSpecies | id slug estável, displayName, types, baseStats, baseCaptureRate | Conteúdo/API |
| Zone | id UUID, slug, name, boundary de pontos latitude/longitude, active | Mapa/API |
| Spawn | id UUID, zoneId, speciesId, position, level, activeFrom, activeUntil, spawnToken | Mapa/API |
| PlayerCreature | id UUID, playerId, speciesId, nickname, level, experience, currentHp, maxHp, caughtAt, sourceEncounterId, version | Gameplay/API |
| Party | playerId, creatureIds ordenados (0–3), version, updatedAt | Gameplay/API |
| Encounter | id UUID gerado no cliente, playerId, spawnId, opponent, partyCreatureIds, status, turnNumber, version, startedAt, expiresAt | Gameplay/API |
| SyncEvent | idempotencyKey, playerId, deviceId, clientSequence, schemaVersion, type, payload, occurredAt, acceptedAt e serverSequence | Sync/API |
| BattleTurn | idempotencyKey, encounterId, turnNumber, actor, action, result, acceptedAt | Gameplay/API |

A equipe pode consultar os campos completos em schemas executáveis no arquivo packages/shared/src/index.ts e as tabelas PostgreSQL em apps/api/src/database/migrations/002_contracts.sql. A Pokédex é derivada de PlayerCreature agrupando por speciesId; não precisa de tabela separada no MVP. O ranking é derivado de Player.score.

### Regras dos modelos

- Uma Party contém no máximo três criaturas; a ordem de creatureIds corresponde aos slots 1, 2 e 3.
- Cada criatura capturada pertence a um único jogador. O servidor valida posse antes de permitir equipe ou ação.
- Zone.boundary é uma lista ordenada de vértices latitude/longitude; o servidor fecha o polígono ao calcular a área.
- Spawn.spawnToken é opaco e assinado pelo servidor. Ele permite validar um spawn baixado para uso offline; o cliente nunca escolhe nem altera a semente do spawn.
- Encounter.version aumenta em cada alteração aceita. turnNumber aumenta depois de cada ação aceita.

## Formato de evento

Todos os eventos enviados ao servidor seguem PendingSyncEventSchema. idempotencyKey é criado uma vez por ação e deve ser reutilizado em todas as tentativas da mesma ação.

### Exemplo: início de encontro

    {
      "schemaVersion": 1,
      "idempotencyKey": "11111111-1111-4111-8111-111111111111",
      "playerId": "22222222-2222-4222-8222-222222222222",
      "deviceId": "33333333-3333-4333-8333-333333333333",
      "clientSequence": 14,
      "occurredAt": "2026-11-03T18:20:00.000Z",
      "type": "encounter.started",
      "payload": {
        "encounterId": "44444444-4444-4444-8444-444444444444",
        "spawnId": "55555555-5555-4555-8555-555555555555",
        "spawnToken": "token-assinado-pelo-servidor",
        "expectedPartyVersion": 2,
        "partyCreatureIds": ["66666666-6666-4666-8666-666666666666"]
      }
    }

### Exemplo: ação de batalha

    {
      "schemaVersion": 1,
      "idempotencyKey": "77777777-7777-4777-8777-777777777777",
      "playerId": "22222222-2222-4222-8222-222222222222",
      "deviceId": "33333333-3333-4333-8333-333333333333",
      "clientSequence": 15,
      "occurredAt": "2026-11-03T18:20:08.000Z",
      "type": "battle.action",
      "payload": {
        "encounterId": "44444444-4444-4444-8444-444444444444",
        "expectedVersion": 0,
        "expectedTurnNumber": 1,
        "action": {
          "type": "ATTACK",
          "actorCreatureId": "66666666-6666-4666-8666-666666666666",
          "moveId": "tackle"
        }
      }
    }

### Exemplo: troca de equipe

    {
      "schemaVersion": 1,
      "idempotencyKey": "88888888-8888-4888-8888-888888888888",
      "playerId": "22222222-2222-4222-8222-222222222222",
      "deviceId": "33333333-3333-4333-8333-333333333333",
      "clientSequence": 16,
      "occurredAt": "2026-11-03T18:21:00.000Z",
      "type": "party.updated",
      "payload": {
        "expectedVersion": 2,
        "creatureIds": ["66666666-6666-4666-8666-666666666666"]
      }
    }

## Sincronização e conflitos

1. O cliente grava o evento no outbox do Dexie antes de mostrar a ação como concluída. Na UI, a ação fica marcada como pendente. O `PUT /api/v1/players/me/party` online e o evento `party.updated` offline aplicam a mesma regra de `expectedVersion`.
2. Ao reconectar, envia até 100 eventos em ordem de clientSequence por dispositivo. O servidor valida cada evento e devolve `results` na mesma ordem; um conflito não desfaz os outros eventos aceitos do mesmo lote.
3. O servidor deduplica por idempotencyKey. Reenviar uma ação já aceita retorna status duplicate com o recibo original; ela nunca é executada duas vezes. A rejeição anterior é repetida com o mesmo resultado rejected.
4. clientSequence é crescente por deviceId. Reutilizar uma sequência com outra idempotencyKey retorna SEQUENCE_REPLAY.
5. Party e Encounter usam expectedVersion. O servidor aplica atualização sob transação/lock e compara versão; somente uma alteração concorrente pode vencer. A outra recebe VERSION_CONFLICT ou STALE_TURN e o snapshot canônico atual.
6. occurredAt é dado de auditoria e pode estar errado. Para ordenar ações de um mesmo dispositivo usa-se clientSequence; para concorrência entre dispositivos usa-se version/turnNumber. A hora do servidor acceptedAt é autoritativa.
7. Evento rejeitado não deve ser reenviado indefinidamente. Corrija a intenção com o estado canônico e crie um novo evento, nova idempotencyKey e novo clientSequence.
8. Após aceitar, o servidor devolve serverSequence e snapshot/result. O cliente remove o item da fila e pode buscar alterações posteriores por GET /api/v1/sync/changes?after=<nextCursor>.

SyncResponse retorna results[] com status accepted, duplicate ou rejected. Eventos accepted e duplicate têm acceptedAt e serverSequence; accepted também pode trazer aggregateVersion e snapshot. Eventos rejected trazem code, message e, quando aplicável, currentVersion e snapshot.

## Papéis do grupo

1. Mapa/exploração: Zone, Spawn, GeoPoint, GET zones/spawns e armazenamento do mapa.
2. Batalha/captura/progressão: CreatureSpecies, PlayerCreature, Party, Encounter, GameAction e regras puras em game-engine.
3. Backend/banco/spawns: rotas Fastify, autenticação, PostgreSQL, validações de autoridade e conteúdo de zones/spawns/species.
4. Offline/sincronização: outbox Dexie, geração de idempotencyKey/clientSequence, lote de eventos, cursores, reconexão e apresentação de conflitos.

Todos usam o pacote @pokemon-campus/shared. Alterações em nomes, enums ou versões de contrato são combinadas pela equipe e versionadas em schemaVersion.
