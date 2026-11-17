#!/usr/bin/env bash
# dependências do editor de vídeo
set -e
pip install -q faster-whisper mediapipe opencv-python-headless
(apt-get install -y -q libegl1 libgles2 >/dev/null 2>&1 || (apt-get update -q >/dev/null && apt-get install -y -q libegl1 libgles2 >/dev/null))
command -v ffmpeg >/dev/null || apt-get install -y -q ffmpeg >/dev/null
echo "pronto"
