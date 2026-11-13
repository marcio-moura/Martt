# Edição de vídeo — padrão MARTT

Edição no estilo "legendas dinâmicas": título atrás da pessoa, legenda palavra por palavra, etiquetas presas ao produto, cortes de silêncio, música com ducking e efeitos sonoros.

- `clientes/<cliente>/estilo.json`: cores, fontes, tom e regras de cada cliente
- `ferramentas/transcrever.py`: transcrição (faster-whisper)
- `ferramentas/previa_estilo.py`: gera um quadro de prévia do estilo (recorte da pessoa via MediaPipe)
- `fontes/`: DM Sans e Caveat (licença OFL)

Dependências: `pip install faster-whisper mediapipe opencv-python-headless` + `apt-get install libegl1 libgles2` + ffmpeg.
