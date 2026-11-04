# Pokémon Campus — contratos v1

Este documento é a referência comum para os quatro módulos. A proposta está alinhada com o projeto atual: React/PWA e Dexie no cliente, Fastify/PostgreSQL no servidor, e regras puras em game-engine. Revisem os nomes e as regras juntos antes de implementarem funcionalidades que ainda não existem.

## Regras compartilhadas

- A API usa JSON, nomes de propriedades em camelCase e prefixo /api/v1. A rota /health permanece sem versão.
- IDs de entidades e dispositivos são UUID. Datas são UTC em ISO 8601, terminando em Z.
- O servidor é a autoridade para dano, captura, experiência, pontuação e estado final. O cliente envia ações pretendidas; não envia resultados calculados. Progresso local fica pendente até o servidor confirmar.
- Todo erro HTTP usa o formato ApiErrorSchema de packages/shared. Rejeições de eventos durante sync são respostas por item, não falhas HTTP da requisição inteira.
- Endpoints de leitura do mapa, espécies, ranking e perfil público podem ser usados sem login. Perfil pessoal (`/players/me`), coleção, equipe, encontros e sync exigem `Authorization: Bearer <token>`.

## Requisitos distribuídos do Pokémon Campus

| Conceito | Como aparece no contrato |
| --- | --- |
| Sistemas distribuídos | Cada celular é um nó com estado local e comunicação com a API central. |
| Offline-first | Mapa e progresso confirmado ficam em cache; ações offline entram no outbox. |
| Consistência eventual | O cliente mostra ações pendentes e converge após a resposta canônica do servidor. |
| Replicação de dados | Spawns, coleção, equipe e inventário têm cópia no PostgreSQL e snapshots no Dexie. |
| Sincronização | Eventos são enviados em lote e mudanças aceitas chegam por pull com cursor. |
| Concorrência | Dois dispositivos podem agir no mesmo Encounter ou gastar itens do mesmo inventário. |
| Resolução de conflitos | A primeira transação válida que confirma a versão vence; as outras recebem snapshot atual. |
| Idempotência | Reenvio da mesma idempotencyKey não repete captura, consumo ou recompensa. |
| Tolerância a falhas | Outbox durável, reconexão e backoff exponencial com jitter recuperam falhas de rede. |
| Ordenação de eventos | clientSequence ordena por dispositivo; turnNumber e serverSequence ordenam as mudanças aceitas. |
| Determinismo | Cliente e servidor compartilham game-engine, battleSeed e rulesVersion. |
| Transações atômicas | Encontro, item, criatura, XP, score e recibo confirmam juntos ou revertem juntos. |
| Recuperação de estado | Snapshot canônico e cursor restauram o app e retomam o pull após perda local. |
| Autoridade central | O servidor valida ações e decide o estado oficial do jogo. |

### Estado da implementação

Este arquivo fixa o contrato-alvo para o grupo. Neste momento, a API implementa `GET /health` e `GET /api/v1/players/:playerId`; as outras rotas da tabela são especificações para os módulos desenvolverem. Não assumam que uma rota já está disponível só porque aparece no contrato.

## Contratos HTTP

| Método e rota | Acesso | Entrada | Resposta de sucesso |
| --- | --- | --- | --- |
| GET /health | Público | — | { status: "ok", service: "pokemon-campus-api" } |
| POST /api/v1/auth/register | Público | RegisterPlayerRequest | AuthSession; 201 |
| POST /api/v1/auth/login | Público | LoginPlayerRequest | AuthSession; 200 |
| GET /api/v1/players/me | Login | — | PlayerProfile |
| GET /api/v1/players/me/state | Login | — | PlayerStateSnapshot |
| GET /api/v1/players/:playerId | Público | UUID no caminho | PlayerProfile |
| GET /api/v1/zones | Público | — | Zone[] |
| GET /api/v1/spawns?zoneId=<uuid>&at=<data> | Público | Zona e instante opcionais | Spawn[] |
| GET /api/v1/species?cursor=<cursor>&limit=50 | Público | Paginação | { items: CreatureSpecies[], nextCursor } |
| GET /api/v1/players/me/creatures | Login | — | PlayerCreature[] |
| GET /api/v1/players/me/party | Login | — | Party |
| GET /api/v1/players/me/inventory | Login | — | PlayerInventory |
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
| Spawn | id UUID, zoneId, speciesId, position, level, activeFrom, activeUntil, battleSeed, rulesVersion, spawnToken | Mapa/API |
| PlayerCreature | id UUID, playerId, speciesId, nickname, level, experience, currentHp, maxHp, caughtAt, sourceEncounterId, version | Gameplay/API |
| Party | playerId, creatureIds ordenados (0–3), version, updatedAt | Gameplay/API |
| PlayerInventory | playerId, items com quantidades, version, updatedAt | Gameplay/API |
| Encounter | id UUID gerado no cliente, playerId, spawnId, opponent, partyCreatureIds, battleSeed, rulesVersion, status, turnNumber, version, startedAt, expiresAt | Gameplay/API |
| PlayerStateSnapshot | player, creatures, party, inventory, activeEncounters, cursor e generatedAt | API/Sync |
| SyncEvent | idempotencyKey, playerId, deviceId, clientSequence, schemaVersion, type, payload, occurredAt, acceptedAt e serverSequence | Sync/API |
| BattleTurn | idempotencyKey, encounterId, turnNumber, actor, action, result, acceptedAt | Gameplay/API |

A equipe pode consultar os campos completos em schemas executáveis no arquivo packages/shared/src/index.ts e as tabelas PostgreSQL em apps/api/src/database/migrations/002_contracts.sql e 003_deterministic_battle.sql. A Pokédex é derivada de PlayerCreature agrupando por speciesId; não precisa de tabela separada no MVP. O ranking é derivado de Player.score.

### Regras dos modelos

- Uma Party contém no máximo três criaturas; a ordem de creatureIds corresponde aos slots 1, 2 e 3.
- Cada criatura capturada pertence a um único jogador. O servidor valida posse antes de permitir equipe ou ação.
- Zone.boundary é uma lista ordenada de vértices latitude/longitude; o servidor fecha o polígono ao calcular a área.
- O servidor gera uma battleSeed por spawn e a inclui no snapshot de spawns baixado antes de ficar offline. O spawnToken assinado vincula spawn, semente, validade e rulesVersion. Na sincronização, o servidor carrega a semente canônica do banco; nunca aceita semente ou resultado enviados pelo cliente.
- Encounter.version aumenta em cada alteração aceita. turnNumber aumenta depois de cada ação aceita.
- O Encounter congela battleSeed e rulesVersion ao começar. A versão 1 usa deterministicRollV1(seed, turnNumber, purpose) do game-engine; cliente e servidor compartilham o mesmo pacote puro, sem React, Dexie, Fastify ou PostgreSQL dentro das regras.
- Uma mudança no algoritmo de combate gera uma nova rulesVersion. O servidor mantém as versões necessárias para resolver encontros já iniciados.

## Decisões de arquitetura orientadas aos requisitos do Pokémon Campus

- Zod valida modelos e dados nas fronteiras da aplicação; @pokemon-campus/shared infere os tipos desses schemas para manter requests, respostas e eventos compatíveis entre web e API.
- @pokemon-campus/game-engine concentra regras de gameplay e cálculos determinísticos sem dependência de interface, rede ou banco. Assim, cliente e servidor podem reproduzir uma batalha offline usando a mesma battleSeed e rulesVersion.
- A web separa interface, mapa e sincronização. A porta RemotePort permite conectar a API HTTP ou um mock sem alterar as telas. Na API, rotas, serviços e acesso ao banco têm responsabilidades distintas.
- O Dexie guarda snapshots e eventos de saída para que ações feitas sem conexão permaneçam no dispositivo até a sincronização. Cada evento pode estar pendente, sendo enviado ou rejeitado; erros transitórios usam backoff exponencial com jitter. Metadados locais não fazem parte do DTO enviado.
- Explorar o campus depende de localização e pode usar sensores disponíveis no celular, mas esses recursos são opcionais. A interface oferece alternativas acessíveis quando o jogador não concede permissões ou o dispositivo não tem esses recursos.
- Coordenadas ajudam a encontrar spawns no campus, mas não comprovam uma captura. Para proteger o estado compartilhado, a API valida o spawnToken e as regras do jogo sem tratar localização ou horário informados pelo cliente como autoridade.
- Quando a suíte for ampliada, Vitest deve cobrir as regras determinísticas e a sincronização com IndexedDB simulado; Playwright deve percorrer no navegador os fluxos de exploração, batalha, uso offline e reconexão. Essa cobertura ainda não faz parte do projeto atual.

Fastify e PostgreSQL atendem à necessidade de validar ações e persistir o progresso oficial do jogador. Transações atômicas mantêm encontro, consumo de item, captura, experiência e pontuação consistentes quando uma ação é aceita.

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

Para uma ação `CAPTURE`, o payload também inclui `expectedInventoryVersion`. O servidor valida a quantidade e consome a Pokébola na mesma transação que resolve a tentativa.

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
4. clientSequence é crescente por par playerId/deviceId e sua última posição é persistida no servidor. Reutilizar uma sequência com outra idempotencyKey retorna SEQUENCE_REPLAY. O dispositivo mantém seu UUID e contador no Dexie.
5. Party, inventário e Encounter usam expectedVersion. O servidor aplica atualização sob transação/lock e compara versão; somente uma alteração concorrente pode vencer. A outra recebe VERSION_CONFLICT, INVENTORY_CONFLICT ou STALE_TURN e o snapshot canônico atual.
6. occurredAt é dado de auditoria e pode estar errado. Para ordenar ações de um mesmo dispositivo usa-se clientSequence; para concorrência entre dispositivos usa-se version/turnNumber. A hora do servidor acceptedAt é autoritativa.
7. Evento rejeitado não deve ser reenviado indefinidamente. Corrija a intenção com o estado canônico e crie um novo evento, nova idempotencyKey e novo clientSequence.
8. Após aceitar, o servidor devolve serverSequence e snapshot/result. O cliente remove o item da fila e pode buscar alterações posteriores por GET /api/v1/sync/changes?after=<nextCursor>. Cada alteração baixada contém evento original e resultado canônico aceito.
9. Cada evento é uma transação PostgreSQL independente. Validação, atualização do encontro, consumo de item, criatura capturada, XP, pontuação, linha de batalha e recibo idempotente são confirmados juntos ou revertidos juntos. Um lote pode ter sucessos parciais, mas nunca efeitos pela metade em um evento.
10. serverSequence é um cursor decimal opaco e crescente por jogador. O servidor bloqueia a linha de player_sync_cursors e incrementa o cursor dentro da transação aceita, serializando commits para esse jogador. Lacunas de migrações podem existir; clientes não incrementam o cursor por conta própria.
11. Após perder os dados locais, o cliente chama GET /api/v1/players/me/state. A API lê jogador, coleção, equipe, inventário, encontros ativos e cursor em um snapshot consistente; o cliente substitui seus snapshots no Dexie e continua com GET /api/v1/sync/changes?after=<cursor>.

Para preservar ações feitas sem internet e reconciliá-las sem repetir efeitos, o cliente grava eventos no outbox local, usa backoff para retentativas transitórias e consulta as mudanças do servidor pelo cursor. A interface marca a ação como confirmada somente após receber a resposta canônica.

SyncResponse retorna results[] com status accepted, duplicate ou rejected. Eventos accepted e duplicate têm acceptedAt e serverSequence; accepted também pode trazer aggregateVersion e snapshot. Uma ação de batalha retorna aggregateType `battle` com encontro e inventário canônicos; em captura bem-sucedida, inclui também jogador e criatura criada. Eventos rejected trazem code, message e, quando aplicável, currentVersion e snapshot.

## Papéis do grupo

1. Mapa/exploração: Zone, Spawn, GeoPoint, GPS, GET zones/spawns e cache local do mapa.
2. Batalha/captura/progressão: CreatureSpecies, PlayerCreature, Party, PlayerInventory, Encounter, GameAction e regras determinísticas puras em game-engine.
3. Backend/banco/spawns: rotas Fastify, autenticação, PostgreSQL, validações de autoridade, geração de seed e transações atômicas.
4. Offline/sincronização: outbox Dexie, geração de idempotencyKey/clientSequence, backoff, lote de eventos, cursor, restauração de snapshot e apresentação de conflitos.

Todos usam o pacote @pokemon-campus/shared. Alterações em nomes, enums ou versões de contrato são combinadas pela equipe e versionadas em schemaVersion.
