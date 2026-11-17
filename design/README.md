# Estúdio de design MARTT

Peças visuais (posts, carrosséis, stories, capas) geradas a partir de um JSON, com a marca de cada cliente. O passo a passo que o Claude segue está em `.claude/skills/design/SKILL.md`.

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

Em todas: `tema` = `escuro`, `claro` ou `destaque` (padrão: capa e cta escuros, o resto claro) e `rodape: false` para esconder o rodapé.
No texto, `*palavra*` sai na cor de destaque e `\n` quebra a linha.

## Marca do cliente (`marca.json`)

`nome`, `arroba`, `logo_fundo_escuro` (caminho a partir da pasta do cliente), `cores` (`escuro`, `claro`, `texto_escuro`, `texto_claro`, `destaque`, `destaque_forte`, `apoio`, `suave`), `fontes` (`titulo`, `titulo_peso`, `texto`, `texto_peso`; nomes do Google Fonts), `tom` e `evitar`.
Modelo: `clientes/martt/marca.json`.
