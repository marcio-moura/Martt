---
name: editar-video
description: Edita vídeos enviados pelo usuário de forma profissional - corta pausas, suspiros, hesitações e retakes, legenda, aplica fade-in nas palavras-chave e adiciona elementos visuais. Use sempre que o usuário enviar um arquivo de vídeo ou pedir para editar, legendar ou cortar um vídeo.
---

# Editar vídeo

Ferramenta: `video/editar.py` (detalhes dos campos no cabeçalho do arquivo). Saída em `video/projetos/<nome>/`.

## Passos

1. **Preparar.** `pip install faster-whisper` se faltar. Se o download do modelo falhar com 403 em `huggingface.co`, avise o usuário que o domínio precisa ser liberado na rede do ambiente; não invente transcrição.
2. **Transcrever.** `python video/editar.py transcrever <video> --nome <slug> --contexto "<nomes e termos>"`. Use `--modelo medium` em vídeos curtos (até ~3 min) para mais precisão; `small` nos longos.
3. **Ler `transcricao.txt` inteiro e editar `edicao.json`** como um editor faria:
   - `correcoes`: conserte nomes, marcas e erros de transcrição pelo índice. Pontuação no fim da palavra ajuda a quebrar as legendas no lugar certo.
   - `remover`: corte retakes (quando a pessoa repete a frase, fique com a última versão completa), frases abandonadas, repetições ("isso isso"), muletas sem sentido ("né", "tipo", "então" soltos) e despedidas ou aberturas confusas. O vídeo precisa contar uma ideia clara do início ao fim.
   - `palavras_chave`: 1 a 2 por frase no máximo - números, resultados, a promessa central, nomes de produto. Se tudo é destaque, nada é.
   - `elementos`: só quando reforçam a mensagem. `titulo` na abertura com o tema; `destaque` para números ou frases de impacto (curto, até 3 palavras); `nome` com nome e cargo de quem fala, nos primeiros segundos.
   - `estilo.maiusculas: true` combina com vídeos curtos e enérgicos; `cor_destaque` pode seguir a marca do cliente.
4. **Renderizar.** `python video/editar.py renderizar <slug>`.
5. **Conferir.** Extraia 3 ou 4 quadros com `ffmpeg -ss <t> -i final.mp4 -frames:v 1` e olhe: legenda legível, sem cobrir o rosto, elementos no lugar. Confira a duração antes e depois. Ajuste e renderize de novo se preciso.
6. **Entregar** `final.mp4` e `legendas.srt` com SendUserFile, e diga em poucas linhas o que foi cortado (tempo antes → depois, retakes removidos) e quais destaques entraram.
