# Vídeo — Intraface Radiologia, 20 anos

Documentário curto (~2min40s), texto na tela, 16:9 para telão.

- `roteiro.js`: textos, ordem e qual foto ou cena 3D entra em cada momento.
- `cena3d.js`: logo em 3D (three.js), feita a partir de `logo3d/logo.svg`.
- `logo3d/vetorizar.py`: gera o SVG em camadas a partir da logo original.
- `preparar-fotos.py`: recorta e enquadra as fotos de `fotos/originais/` (fotos não vão para o git).
- `index.html`: o player. `gerar-video.js`: gera o MP4 (`node gerar-video.js intraface-20-anos.mp4`).
