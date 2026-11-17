# Padrão MARTT — vídeos "Esquenta Black" Natura

Padrão aprovado no vídeo da **Natura Trindade** (`clientes/natura/trindade/`). Os próximos vídeos seguem o mesmo estilo.
Fluxo: preparar → revisar → teste curto → render completo → conferir quadros → entregar.

## Estilo (fixo)

| Elemento | Regra |
|---|---|
| Cores | creme `#FBF6EE`, marrom `#452C13`, laranja `#EB6619` (único destaque), branco |
| Fonte | Montserrat (Black 900 nos títulos, ExtraBold 800 na legenda) |
| Títulos | Atrás da pessoa, no topo (y 0.03), brancos, 1–2 linhas, a 2ª alinhada à direita da linha mais larga. Letras sobem uma a uma. Ex.: "Esquenta / Black", "Até / 60% OFF", "Dias / 13 e 14", "Acima de / R$ 250", "Presente / especial", "Corram!" |
| Legenda | Uma palavra por vez, branca, a 79% da altura (abaixo da estampa da camisa). Palavras de destaque: laranja, maiores, pop + tremida curta |
| Etiqueta do produto | Presa ao produto (rastreado). Entra quando ela começa a falar o nome, já com o **nome fixo** em caixa alta fina e espaçada (sem palavra por palavra). Depois: "de R$ X" no "de", riscado em laranja no "por", "R$ Y" laranja com pop + zoom 1.08–1.1. Preço único: "por apenas" + valor |
| Etiqueta sem espaço ao lado | Vai para baixo do produto (nunca sobre o rosto) |
| Sombra | `clientes/natura/sombra.png` (preto 0→69% da metade para baixo) |
| Som | Voz com redutor de ruído (afftdn) e passa-alta 80 Hz; efeitos a 50% (whoosh nos títulos e cortes, ding no preço, pop nos destaques); final −14 LUFS |
| Música | Só se o cliente mandar; abaixa sozinha quando ela fala |

## Lições do vídeo de Trindade (checar sempre)

1. **Cortar a fala de quem filma** ("foi") e as pausas do início e do fim. O `preparar.py` corta pela energia da voz; confira o 1º segundo.
2. **Cortar trechos repetidos ou desnecessários** (ex.: "Limitado, tá, limitado" + pausa). O cliente pode pedir para tirar.
3. **O ponto tem que estar no produto que ela está falando.** Quando ela segura dois produtos, conferir qual é qual (ex.: Ilía era o potinho quadrado, não o frasco escuro).
4. **Rastreamento**: produto de cor forte (roxo, vermelho) → rastrear por cor (`"rastrear": {"cor": [[hmin,smin,vmin],[hmax,smax,vmax]]}`). Os outros → caixa inicial + CSRT (`{"t": s, "caixa": [x,y,w,h]}`).
5. **Nomes e preços**: confirmar com a lista da loja (papel/foto). A transcrição erra nomes (Crisca→Kriska, Elia→Ilía, Noite→Nuit, Delpharfam→Deo Parfum).
6. Nomes longos: a etiqueta diminui a letra sozinha. Mesmo assim, conferir se nada sai da tela.
7. **A transcrição pode pular trechos inteiros** (Portal: Ekos Frescor e Óleo Sève sumiram). O `preparar.py` agora só corta pausa com áudio baixo e avisa "ATENÇÃO" quando há som sem palavras — transcrever esse trecho de novo à parte.
8. Fundo claro: os títulos têm halo escuro; conferir legibilidade mesmo assim.
9. **Nunca cortar a última palavra** de um trecho; terminar o vídeo logo depois da última fala e **antes de ela sair do quadro**, com o som diminuindo no fim (`"fade_final": 0.3`).
10. Não presumir que a 1ª palavra é de quem filma: no Canedo, o "Canedo" do início era dela. Na dúvida, manter.
11. Produto que ela mexe muito: usar várias marcas manuais (`"rastrear": {"chaves": [{"t":..,"caixa":[..]}, ...]}`) e conferir com a folha `conferir/rastreio.jpg`.

## Passo a passo

```bash
cd edicao-video/clientes/natura
# 1. preparar (baixa do Drive, transcreve, acha cortes e preços, gera rascunho)
python3 -I ../../ferramentas/preparar.py senador-canedo "<link do Drive>" "Natura Senador Canedo"
# 2. revisar senador-canedo/roteiro.txt, conferir/geral.jpg e conferir/precos-grade.jpg
#    e ajustar plano.json: nomes, preços, caixas de rastreamento (_REVISAR), títulos, trechos
# 3. teste curto: copie o plano, deixe poucos "segmentos" e uma "saida" de teste
# 4. render completo
cd senador-canedo && python3 -I ../../../ferramentas/editor.py plano.json
```

Saída em `<loja>/saida/` (não vai para o git). O vídeo bruto também não vai (`*.mov`).

## Lojas

| Pasta | Loja | Situação |
|---|---|---|
| `trindade/` | Natura Trindade | entregue (v2) |
| `senador-canedo/` | Natura Senador Canedo ("Canedo") | entregue |
| `portal-shopping/` | Natura Portal Shopping | entregue (rev. 2: trecho dos perfumes) |
| `goianira/` | Natura Goianira | entregue |
