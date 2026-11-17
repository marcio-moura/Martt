# Edição de vídeo — padrão MARTT

Edição no estilo "legendas dinâmicas": título atrás da pessoa, legenda palavra por palavra, nome e preço presos ao produto (rastreamento), cortes, redução de ruído e efeitos sonoros.

**Comece pelo [PADRAO.md](PADRAO.md)**: o estilo aprovado e o passo a passo.

- `ferramentas/preparar.py`: baixa do Drive, transcreve, detecta cortes e preços, gera o rascunho `plano.json`
- `ferramentas/editor.py`: renderiza o vídeo a partir do `plano.json`
- `ferramentas/gerar_sfx.py`: gera os efeitos sonoros (`sfx/`)
- `clientes/natura/`: `estilo.json`, `modelo-plano.json`, `sombra.png` e uma pasta por loja
- `fontes/` (Montserrat, DM Sans, Caveat; OFL) e `modelos/` (MediaPipe)

Instalação: `bash ferramentas/instalar.sh`
