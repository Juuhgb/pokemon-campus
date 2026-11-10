# Imagens dos Pokémon

Coloque aqui um PNG (de preferência com fundo transparente) para cada espécie, com estes nomes exatos:

| Arquivo          | Pokémon    |
| ---------------- | ---------- |
| `bulbasaur.png`  | Bulbasaur  |
| `squirtle.png`   | Squirtle   |
| `charmander.png` | Charmander |
| `pikachu.png`    | Pikachu    |
| `geodude.png`    | Geodude    |
| `chikorita.png`  | Chikorita  |
| `vaporeon.png`   | Vaporeon   |
| `jigglypuff.png` | Jigglypuff |
| `espurr.png`     | Espurr     |
| `tandemaus.png`  | Tandemaus  |
| `clefable.png`   | Clefable   |
| `charizard.png`  | Charizard  |
| `gyarados.png`   | Gyarados   |
| `lucario.png`    | Lucario    |
| `mew.png`        | Mew        |
| `mewtwo.png`     | Mewtwo     |

Enquanto um arquivo não existir, o jogo mostra o ícone redondo antigo daquela espécie.
Os caminhos ficam em `apps/web/src/features/catalog/species.ts` (campo `image`). Para um Pokémon novo, adicione o PNG aqui e uma entrada em `SPECIES`: ele passa a aparecer nas zonas conforme a raridade.
