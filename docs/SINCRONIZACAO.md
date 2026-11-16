# Online, offline e sincronização

Este documento cobre os itens pedidos na entrega do trabalho de Sistemas Distribuídos.

## 1. O jogo

Pokémon Campus é um PWA de exploração para celular. O jogador:

- caminha pelo campus com o GPS;
- encontra Pokémon nas áreas dos cursos;
- batalha e captura com Pokébolas;
- ganha XP e pontos;
- monta a equipe e sobe no ranking.

O jogo funciona inteiro sem internet. Quando há conexão, o progresso vai para um servidor remoto e pode ser recuperado em outro aparelho.

## 2. Arquitetura e tecnologias

| Componente | Onde | O que faz |
| --- | --- | --- |
| **Cliente** | `apps/web` (React 19, Vite, Tailwind, React Leaflet, PWA com `vite-plugin-pwa`) | Telas, regras de jogo e armazenamento local (IndexedDB com Dexie). Funciona sem rede: o service worker guarda o app e os tiles já vistos. |
| **Módulo de sincronização** | `apps/web/src/sync/` | Monitor de conexão (`connection.ts`), fila de saída com idempotência e backoff (`synchronizer.ts`), armazenamento dos eventos (`eventStore.ts`). Fala com o servidor só pela interface `PlayerRemote` (`playerRemote.ts`). |
| **Servidor** | Firebase (projeto `pokecampus-uenp`) | Authentication (login Google = identificação do jogador), Cloud Firestore (eventos e ranking), regras em `firestore.rules`, e Hosting. |

Protocolos:

- HTTPS para o app e o login;
- Firestore SDK (gRPC-Web/WebChannel sobre HTTPS) para leitura, escrita e escuta em tempo real.

O SDK do Firestore roda com **cache só em memória**: a persistência offline e o envio são implementados pelo próprio jogo. Assim dá para inspecionar tudo no DevTools e demonstrar.

## 3. Modelo de dados: registro de eventos

O progresso não é salvo como "estado final". Cada jogada vira um **evento imutável** (`features/player/playerEvents.ts`):

    { id: <uuid>, deviceId, at: <horário do aparelho>, action: { type, ... }, basis? }

Tipos de evento:

- `onboard` — escolha do inicial;
- `settleBattle` — resultado de uma batalha: XP, pontos e captura;
- `useBall` — bola usada;
- `addToTeam` e `removeFromTeam` — mudanças na equipe;
- `updateProfile` — nome e curso;
- `importLegacy` — progresso salvo antes da sincronização existir.

O estado do jogador é **sempre recalculado** a partir dos eventos, em ordem determinística: horário e, no empate, o id. Por isso:

- dois aparelhos com o mesmo conjunto de eventos chegam ao mesmo estado, sem coordenação;
- juntar o progresso de dois aparelhos é unir os conjuntos;
- o mesmo evento recebido duas vezes conta uma vez só, porque o id é a chave.

No servidor:

    jogadores/{uid}/eventos/{id}   eventos (só criação; as regras proíbem alterar ou apagar)
    ranking/{uid}                  pontuação atual (valor derivado, sobrescrito pelo dono)
    config/jogo                    documento lido pelo heartbeat
    mundo/zonas, mundo/pokemon     zonas de spawn e Pokémon publicados pelo admin (leitura pública)
    admins/{uid}                   quem pode publicar o mundo

Os eventos cobrem o que o enunciado pede:

- identificação do jogador: o `uid` da conta Google;
- estado e progresso: os eventos;
- pontuações e resultados: `settleBattle` e `ranking`;
- histórico de partidas: os eventos `settleBattle`, ordenados.

## 4. Armazenamento local

IndexedDB `pokemon-campus` (Dexie, `sync/database.ts`):

| Store | Conteúdo |
| --- | --- |
| `playerEvents` | Todos os eventos conhecidos, com `status`: `pending` (só no aparelho), `sending`, `confirmed` (o servidor tem cópia) ou `rejected`. Também guarda `attempts`, `nextAttemptAt` e `error`. |
| `snapshots` | Zonas editadas, cache de spawns e Pokémon colocados pelo admin. |

O `localStorage` guarda:

- uma cópia do último estado calculado, só para abrir a tela na hora;
- a identidade (e-mail e `uid` do Google);
- o `deviceId`;
- o último ranking baixado.

Quando uma jogada acontece, o evento é gravado no IndexedDB **antes** de qualquer envio. Fechar e reabrir o app, inclusive offline, recalcula o estado a partir desses eventos e nada se perde.

## 5. Sincronização

**Estado de conexão** (`sync/connection.ts`), mostrado no selo do mapa, no painel do Perfil e num aviso em todas as telas:

- **Offline** — `navigator.onLine` é falso;
- **Servidor fora** — há rede, mas o heartbeat (leitura de `config/jogo`, timeout de 5 s) ou um envio falhou;
- **Online** — o servidor respondeu.

O heartbeat roda:

- a cada 60 s, com o app visível;
- a cada 10 s quando o servidor está fora, para perceber logo a volta;
- logo depois do evento `online` e ao voltar ao primeiro plano.

**Envio** (`sync/synchronizer.ts`):

1. Os eventos `pending` saem um a um, em ordem.
2. Cada envio é uma criação atômica do documento `jogadores/{uid}/eventos/{id}`, com timeout de 8 s.
3. O evento só vira `confirmed` depois da resposta do servidor.
4. Se houver falha de rede ou timeout, o evento volta a `pending`, com espera exponencial de 2 s até 60 s e jitter de ±20%. O monitor passa para "Servidor fora".
5. Quando o servidor volta, a espera é zerada e tudo é enviado na hora.

O envio é disparado automaticamente, sem reiniciar a partida, nestes momentos:

- quando há uma nova jogada;
- quando a conexão volta;
- quando o app volta ao primeiro plano;
- quando um heartbeat dá certo;
- no timer do backoff.

**Recebimento**:

- Com a conta logada, um listener em `jogadores/{uid}/eventos` traz os eventos de outros aparelhos, que entram como `confirmed`.
- Ao entrar com o Google num aparelho novo, o jogo baixa todos os eventos antes de pedir o inicial. Se a conta já tem progresso, o jogador vai direto para o mapa com tudo recuperado.

## 6. Política de conflitos

Os conflitos são resolvidos no cálculo do estado (`foldPlayerEvents`). A resolução é determinística: todos os aparelhos chegam ao mesmo resultado sem conversar entre si. Os conflitos resolvidos aparecem em Perfil → Sincronização.

| Situação | Política | Por quê |
| --- | --- | --- |
| Mesmo evento recebido de novo (reenvio, resposta perdida) | O id é a chave: conta uma vez. No servidor, a regra recusa regravar e o cliente confere que o evento já está lá. | Idempotência sem estado extra. |
| Duas jogadas diferentes em dois aparelhos offline (capturas, batalhas, equipe) | Não é conflito: os eventos se somam, ordenados por horário. | O progresso dos dois aparelhos é real. |
| Mesmo Pokémon selvagem (mesmo spawn) enfrentado nos dois aparelhos | Vale a **primeira batalha** (menor horário). A outra é descartada inteira, sem captura, XP ou pontos em dobro. | Um Pokémon do mapa só pode ser resolvido uma vez. |
| Inicial escolhido em dois aparelhos | Vale o primeiro. | O jogador tem um único inicial. |
| Bolas gastas além do estoque somando os dois aparelhos | O uso excedente é descartado. | O estoque nunca fica negativo. |
| Nome ou curso alterados nos dois aparelhos sem um saber do outro | **Vale a alteração mais recente** (last-writer-wins). O conflito é detectado pelo campo `basis`, que guarda o último evento de perfil que o aparelho conhecia, e fica registrado. | É uma preferência, não progresso: o último valor escolhido é o mais provável de ser o desejado. |
| Evento recusado pelo servidor (não está lá e a regra não aceita) | `rejected`: não conta e não é reenviado. | Evita loop de reenvio. |

Empate de horário: decide o id do evento, uma ordem total e fixa.

Risco aceito: o horário vem do relógio do aparelho. Um relógio errado muda a ordem entre aparelhos, mas o resultado continua igual em todos eles.

## 7. Falhas tratadas

| Falha | Comportamento |
| --- | --- |
| Perda de conexão durante a partida | Aviso "jogando offline". Mapa, batalha, captura e coleção seguem pelo armazenamento local; as jogadas ficam `pending`. |
| Servidor indisponível | "Servidor fora". As jogadas continuam sendo tentadas no ritmo do backoff, e o jogo segue como offline. |
| Falha no meio da sincronização | Cada evento é independente e atômico. Um timeout volta o evento a `pending`. Se o app fechou no meio, o que estava `sending` volta a `pending` ao abrir. |
| Reenvio do que já foi transmitido | Idempotente pela chave do evento: o servidor mantém o original e o progresso não muda. |
| Recusa definitiva | O evento vira `rejected`, sem novas tentativas, com aviso no painel. |

## 8. Como demonstrar os testes obrigatórios

1. **Online:** entre com o Google, jogue uma batalha e mostre o evento em Firebase Console → Firestore → `jogadores/{uid}/eventos`.
2. **Offline:** ative o modo avião. O aviso aparece e o jogo continua; o selo do mapa mostra quantas jogadas estão pendentes.
3. **Fechar e reabrir offline:** o progresso continua lá, porque está no IndexedDB.
4. **Voltar a conexão:** as pendentes são enviadas sozinhas e aparecem no Console.
5. **Outro aparelho:** entre com a mesma conta Google. O progresso é baixado.
6. **Falhas** (Perfil → Sincronização → *Testes de falha*):
   - *Simular servidor fora do ar*: o estado vira "Servidor fora" e as jogadas ficam pendentes; ao desligar, elas são enviadas.
   - *Reenviar a última jogada*: o servidor recusa a duplicata e o progresso não muda.
   - *Conflito*: deixe dois aparelhos offline com a mesma conta, mude o nome nos dois e batalhe com o mesmo Pokémon, depois reconecte. Os dois ficam com o mesmo estado, e o painel lista os conflitos resolvidos.

Testes automáticos:

- `sync/synchronizer.test.ts`: envio, backoff, timeout, reenvio, recusa e recuperação ao abrir;
- `sync/connection.test.ts`: estados de conexão;
- `features/player/playerEvents.test.ts`: ordem determinística, duplicatas e cada política de conflito.
