# Edição de vídeo

Envie um vídeo na conversa com o Claude e peça a edição. O resultado é um `final.mp4` com:

- **Cortes de pausas, suspiros e hesitações** ("ahn", "hum", "éh..."), mantendo o ritmo natural da fala.
- **Retakes e trechos confusos removidos**, para que cada vídeo tenha uma mensagem clara do início ao fim.
- **Legendas** em blocos curtos, posicionadas para formato vertical (Reels, TikTok, Shorts) ou horizontal.
- **Palavras-chave com fade-in** na cor de destaque, aparecendo no instante em que são ditas.
- **Elementos visuais** quando ajudam: título de abertura, número ou frase em destaque no centro e nome com cargo (lower third).
- **Áudio tratado**: redução de ruído leve e volume normalizado para redes sociais (-14 LUFS).

Também sai um `legendas.srt` para subir como legenda separada nas plataformas.

## Dicas ao enviar

- Diga para onde vai o vídeo (Reels, YouTube, anúncio) e qual é a mensagem principal.
- Informe nomes próprios, marcas e termos técnicos citados, para a transcrição acertar.
- Se quiser elementos específicos (nome e cargo de quem fala, um título), já diga o texto.

## Como funciona

`editar.py` roda em duas etapas, com a revisão editorial no meio:

```bash
pip install faster-whisper   # uma vez; o ffmpeg precisa estar instalado

python video/editar.py transcrever caminho/do/video.mp4 --nome meu-video --contexto "Martt, Marcio"
# revisar video/projetos/meu-video/transcricao.txt e ajustar edicao.json
python video/editar.py renderizar meu-video
```

O `edicao.json` guarda as decisões: correções de transcrição, faixas de palavras a cortar, palavras-chave, elementos visuais, cores e fonte. O cabeçalho de `editar.py` descreve cada campo.

A transcrição baixa o modelo de fala do `huggingface.co` na primeira execução. Em ambientes na nuvem com rede limitada, esse domínio precisa estar liberado nas configurações de rede do ambiente.

Os arquivos de cada projeto ficam em `video/projetos/<nome>/` e não vão para o git.
