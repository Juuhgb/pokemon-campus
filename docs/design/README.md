# Design das telas do jogador

Protótipo navegável feito no Claude Design. As telas são referência visual: os dados (nomes, pontos, dano, XP) são de exemplo.

- **Canvas:** https://claude.ai/artifact/2KtLT5iXakHJsHw33RsM5x (privado: peça para compartilharem com você).
- **Fontes do canvas:** `player-screens/`, um arquivo `.dc.html` por tela e `canvas.json` com o layout. Esses arquivos dependem do runtime do Claude Design e não abrem sozinhos no navegador; servem como cópia de segurança e referência de markup, cores e textos.

## Guia de estilo: "Aventura colorida"

| Token | Valor | Uso |
| --- | --- | --- |
| Fundo | `#fff6e5` | Creme de todas as telas |
| Superfície | `#ffffff` | Cartões |
| Tinta | `#1d1b3a` | Texto, contornos (2,5 px) e sombras sólidas (`4px 4px 0`) |
| Texto secundário | `#5b587a` | Legendas |
| Coral | `#ff5a4e` | Ação principal, Pokébola |
| Amarelo | `#ffc23d` | Seleção, destaque, "no alcance" |
| Azul | `#6aa8ff` / `#3b82f6` | Informação, Grande bola |
| Verde | `#7ad88f` | Sucesso, sincronizado |
| Lilás | `#ece9f5` | Desabilitado, vazio |

- **Tipografia:** Fredoka (títulos e números) e Nunito (texto), Google Fonts.
- **Formas:** cantos de 14–22 px, contorno escuro e sombra sólida deslocada (visual de figurinha).
- **Toque:** alvos de pelo menos 44 px.
- **Criaturas:** ícone original por tipo (folha, raio, gota, chama, pedra, asa, estrela) num círculo colorido. Não usam arte dos jogos oficiais.
- **Bolas:** Pokébola (topo coral) e Grande bola (topo azul com dois riscos vermelhos). O visual da Pokébola é marca registrada; avaliar antes de publicar o jogo abertamente.

## Telas

| Fluxo | Arquivos | Observações |
| --- | --- | --- |
| Onboarding | `Welcome`, `Starter`, `Location` | Entrar com Google, escolher o inicial (Brotinho, Gotinha, Brasinha), permitir localização |
| Exploração | `Main`, `Encounter` | Mapa claro, carrossel "Por perto" com distância e direção, encontro liberado a até 30 m |
| Coleção | `Collection`, `Team` | Álbum de figurinhas com filtro por raridade; equipe de até 3 com aviso de "aguardando envio" |
| Perfil | `Profile`, `Ranking`, `Settings` | Pontuação, mochila, sincronização; ranking geral/por curso; vincular Google, nome (até 40 caracteres) e curso |
| Batalha | `Battle`, `Capture`, `CaptureThrow`, `BattleResult` | Atacar, Capturar, Trocar, Fugir; a bola precisa chacoalhar 3 vezes para capturar; resultado confirmado pelo servidor ao sincronizar |
| Componentes | `Nav`, `Creature`, `Ball` | Barra inferior, ícone de criatura, ícone de bola |

## Dependências de outros módulos

- Login com Google e vínculo de conta: módulo de autenticação.
- Escolha do inicial e alteração de nome/curso: precisam de rotas na API (hoje só existe leitura do perfil).
- Dano, captura, XP e pontos: regras do `game-engine`, validadas pelo servidor.
