# Estúdio de design MARTT

Peças visuais (posts, carrosséis, stories, capas) e calendário de conteúdo de todos os clientes. Cada cliente tem ficha, marca, calendário e peças na própria pasta; o painel fica em `clientes/README.md`. Cliente novo: `bash design/novo-cliente.sh <pasta> "Nome"`. O passo a passo que o Claude segue está em `.claude/skills/design/SKILL.md`.

```bash
node design/gerar.mjs design/clientes/<cliente>/pecas/<AAAA-MM-DD-nome>/peca.json
```

Saída na pasta da peça: `previa.html` (todas as telas lado a lado) e `01.png`, `02.png`... no tamanho final.

## Pastas

```
design/
  gerar.mjs                      motor
  clientes/<cliente>/
    marca.json                   kit de marca do cliente
    logo...                      arquivos de marca (opcional)
    pecas/<AAAA-MM-DD-nome>/
      peca.json  previa.html  01.png ...
```

## Formatos

| `formato`  | Tamanho     | Uso                              |
|------------|-------------|----------------------------------|
| `feed`     | 1080 × 1350 | post e carrossel do Instagram    |
| `quadrado` | 1080 × 1080 | post quadrado, anúncio           |
| `stories`  | 1080 × 1920 | stories, capa de reels           |
| `paisagem` | 1920 × 1080 | capa de YouTube, apresentação    |

## Layouts (`telas[].layout`)

| Layout    | Campos                                   |
|-----------|------------------------------------------|
| `capa`    | `rotulo`, `titulo`, `texto`, `logo` (false esconde) |
| `texto`   | `rotulo`, `titulo`, `texto`              |
| `lista`   | `rotulo`, `titulo`, `itens` (lista)      |
| `numero`  | `rotulo`, `numero`, `titulo`, `texto`    |
| `citacao` | `titulo` (a frase), `autor`              |
| `foto`    | `imagem` (caminho a partir da pasta da peça), `rotulo`, `titulo`, `texto` |
| `cta`     | `rotulo`, `titulo`, `texto`, `botao`     |

**Menos é mais** (preferidos da casa; sem @ e numeração no rodapé, salvo `rodape: true`):

| Layout       | Campos | Referência |
|--------------|--------|------------|
| `foto-frase` | `imagem`, `titulo` (`**negrito**`), `assinatura`, `posicao` (`topo`/`meio`/`base`), `alinhar` (`esquerda`/`centro`/`direita`), `estilo` (`caixa-alta`/`fino`/`espacado`), `arraste` (texto da seta), `fio` (false esconde), `foco`, `logo` | Golfinho, Skinlab, Garetti, Romana |
| `bloco`      | `titulo` (frase curta, em serifa), `assinatura`, `tema` | "YOU CAN" |
| `horario`    | `imagem`, `titulo` (ex.: `8:00`), `texto`, `foco` | um dia real |
| `atos`       | `atos`: lista de `{imagem, texto, foco}` (2 a 4) | chegada, experiência, resultado |

`foco` ajusta o enquadramento da foto (ex.: `center 20%` sobe o corte).

Em todas: `tema` = `escuro`, `claro` ou `destaque` (padrão: capa e cta escuros, o resto claro) e `rodape: false` para esconder o rodapé.
No texto, `*palavra*` sai na cor de destaque, `**palavra**` sai em negrito na mesma cor e `\n` quebra a linha.

## Marca do cliente (`marca.json`)

`nome`, `arroba`, `pendente` (texto; enquanto existir, a peça é só prévia), `logo_fundo_escuro` e `logo_fundo_claro` (caminhos a partir da pasta do cliente), `cores` (`escuro`, `claro`, `texto_escuro`, `texto_claro`, `destaque`, `destaque_forte`, `apoio`, `suave`), `fontes` (`titulo`, `titulo_peso`, `texto`, `texto_peso`, `serifa` opcional, padrão Cormorant Garamond; nomes do Google Fonts), `tom` e `evitar`.
Modelo: `clientes/martt/marca.json`.
