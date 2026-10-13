# Padrão de edição

Definido a partir do vídeo de referência enviado pelo cliente (46 s, vertical 1080x1920, 60 fps). Os números abaixo foram medidos quadro a quadro e no espectrograma do áudio. A implementação está em `padrao.py`.

## Legenda

| Elemento | Referência | Implementação |
|---|---|---|
| Fonte | Poppins (SemiBold nas palavras soltas e linhas pequenas, Bold nas grandes) | `fontes/Poppins-*.ttf` (licença OFL) |
| Palavra solta | Uma palavra por vez, no instante da fala, em minúsculas como foi dita e com a pontuação | `palavra_em` 0,051 da largura (55 px em 1080), **logo abaixo do queixo** (decisão do cliente: embaixo, o Instagram corta ou cobre). O editor detecta o rosto em cada plano e acompanha o zoom (`queixo_palavra`, `queixo_bloco`) |
| Cor | Branco puro | **Sem sombra e sem contorno**, por decisão do cliente. A sombra (`padrao.sombra`: auto, suave ou forte) só entra se for pedida |
| Destaque | Amarelo `#F5D968` | `cor_destaque` |

## Frases de impacto (blocos)

Cerca de 1 a cada 8 s, nas frases que carregam a mensagem: o gancho, a virada e a conclusão.

- **Composição em escada**, com até três linhas e entrelinha apertada:
  1. linha **grande** em Bold branco, até 0,11 da largura;
  2. linha **pequena** em SemiBold, 0,051 da largura, encostada na de cima e levemente recuada;
  3. palavra final em **destaque amarelo**, Bold, até 0,11 da largura, alinhada à direita da primeira linha.
- **Animação**: cada palavra branca entra com desfoque e fade (160 ms) no instante em que é dita. O destaque surge **letra por letra, a cada 45 ms**, com o espaçamento entre letras se fechando.
- **Aspas** quando a fala reproduz o que outra pessoa diz (ex.: "Doutora, eu quero colocar aparelho…").
- O bloco começa logo abaixo do queixo, e some com um fade de 120 ms quando a fala seguinte começa.

## Câmera

- **Punch-in**: alterna plano aberto (1,0x) e fechado (1,22x a 1,33x; o rosto passa de ~425 px para ~510-575 px de largura). A troca acontece nos cortes e nos fins de frase, a cada 3 a 8 s.
- O zoom é centrado no rosto, mantendo a mesma posição vertical dele no quadro.
- O vídeo abre fechado no gancho e corta seco para o aberto logo depois dele.
- Na referência também há **B-roll** (cenas de atendimento, de 20,5 s a 29 s) cobrindo a fala. O editor aceita isso pelo elemento `broll`, quando o cliente envia as cenas.

## Som

- **Sem trilha de fundo**: os silêncios entre as falas ficam em -50 dB.
- **"Tic" a cada letra** do destaque amarelo: clique curto e agudo (2,5-8 kHz), discreto.
- **Impacto grave** (whoosh curto e um grave descendo de 110 para 42 Hz) na virada do gancho para o plano aberto.
- A referência está em -23,8 LUFS. Entregamos em -14 LUFS, o volume que Reels, TikTok e Shorts esperam.

## Ritmo

- Pausas e respirações cortadas, mantendo 0,1 a 0,3 s entre frases.
- Cor natural, levemente mais quente e contrastada (`cor`: contraste 1,04, saturação 1,08).
