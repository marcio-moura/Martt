# Vídeo — Intraface Radiologia, 20 anos

Documentário com texto na tela, 16:9, para telão. Duração atual: ~4min54s.

- `roteiro.js`: os textos, a ordem e quais fotos entram em cada trecho (`FOTOS`), a logo (`LOGO`) e a trilha (`TRILHA`).
- `fotos/`: fotos da cliente e logomarca. `trilha/`: música em MP3.
- `index.html`: o player (abre no navegador; espaço toca/pausa, F tela cheia).
- `gerar-video.js`: gera o MP4. `node gerar-video.js intraface-20-anos.mp4` (1080p, 30 fps).
  Para conferir alguns segundos: `node gerar-video.js --quadros 10,60,120`.
