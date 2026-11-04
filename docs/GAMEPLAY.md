# Gameplay — módulo da pessoa 2

Base: `feat/map-exploration`. Os contratos públicos de `docs/CONTRACTS.md` e os schemas de `shared` permanecem inalterados.

## Implementado no cliente

- Combate por turnos: ataques, dano, contra-ataque, desmaio, troca voluntária (consome turno), troca obrigatória (não consome outro turno), vitória, derrota e fuga.
- Captura determinística: chance aumenta com a redução de PV; Grande Bola tem bônus; falhas permitem contra-ataque; bolas são descontadas do inventário local.
- Coleção/Pokédex: agrupamento por espécie, contagem, filtros, busca, descrição, tipo, golpes e exemplares com nível, PV e XP.
- Equipe de até três criaturas, sem duplicar slots ou adicionar criaturas não possuídas.
- XP, subida de múltiplos níveis com excedente, limite de nível 100 e pontuação por vitória/captura.
- Liquidação local atômica de captura, XP e pontos, deduplicada por ID de batalha persistido no jogador. Reabrir o resultado não repete as recompensas.

## Regras reutilizáveis

`packages/game-engine/src/encounter.ts` exporta `createBattleRulesV1(getSpecies)`. A API pode injetar seu catálogo canônico; a web usa um adaptador em `features/battle/battleState.ts`. O resolvedor não acessa React, rede, relógio, armazenamento nem gera IDs. Para reprodução, fornecer o mesmo catálogo, encounterId, equipe, battleSeed, versão e sequência de ações.

`progression.ts` contém atributos por nível, XP e recompensas v1. A fórmula de captura e a PRNG existentes foram preservadas. Spawns reais agora transportam battleSeed e rulesVersion até a batalha; o token assinado não é usado como semente. Versões de regras desconhecidas são recusadas. Spawns simulados sem semente mantêm fallback exclusivo do protótipo.

## Integração com as outras pessoas

O protótipo continua local, identificado assim na tela de resultado. Não apresenta progresso como confirmado pelo servidor. A batalha em andamento permanece em memória, como na branch base; recarregar durante o combate perde esse encontro local. As imagens e os componentes que as exibem não foram alterados.

Backend e sync ainda devem conectar as intenções `encounter.started`, `battle.action` e `party.updated` ao outbox durável antes de exibir conclusão pendente, usando UUIDs, expectedVersion/expectedTurnNumber e expectedInventoryVersion para captura. O backend deve validar posse, catálogo de golpes, spawnToken, validade, estoque e versões, resolver as regras com seed canônica e confirmar os efeitos em transação idempotente. Não enviar XP, dano ou captura calculados no cliente como autoridade.

`BattleState` é modelo interno de apresentação, não `EncounterSnapshot`. Seus estados `won`/`lost` não adicionam enums ao contrato público. O adaptador do servidor deve produzir os snapshots canônicos já acordados; o módulo de sync deve reconciliar o estado local com esses snapshots. Ainda não há autenticação real nem chamadas às rotas de gameplay na web.

## Validação

Executar `npm ci`, `npm run typecheck`, `npm run test:unit`, `npm run lint` e `npm run build`.

Fluxo manual: escolher inicial → explorar → entrar em encontro próximo → atacar/trocar → capturar ou vencer → consultar resultado → abrir álbum/Pokédex e equipe. Reabrir a rota do resultado durante a mesma batalha não pode repetir captura, XP ou pontos.
