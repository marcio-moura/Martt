---
name: edicao-video
description: Edição de vídeo no padrão MARTT. Use quando o usuário mandar um vídeo (arquivo anexado ou link do Google Drive, Dropbox, WeTransfer) ou colar um "Pedido de edição de vídeo" vindo da página /edicao/, ou pedir para cortar, legendar, deixar em formato Reels, pôr música ou logo em um vídeo. Baixa o material, edita com ffmpeg e devolve o arquivo pronto.
---

# Edição de vídeo · padrão MARTT

Entrada: um vídeo anexado na conversa, ou um link (Drive, Dropbox, WeTransfer), e o que a pessoa quer.
Muitas vezes chega colado o texto do WhatsApp gerado pela página `/edicao/` do site:

```
*Pedido de edição de vídeo*
*Quem:* ...  *Vídeo:* ...  *Quero:* ...  *Duração:* ...  *Prazo:* ...  *Detalhes:* ...
```

Saída: o MP4 final, enviado com `SendUserFile` (`display: "attach"`), mais um resumo curto do que foi feito.

## Passo a passo

1. **Entender o pedido.** Se faltar algo que muda o resultado (formato, duração, qual trecho usar), pergunte numa frase só. O resto, decida com bom senso: o padrão é Reels 9:16, até 30 s, áudio normalizado.
2. **Pegar o vídeo** numa pasta nova e vazia no scratchpad (`$SCRATCH/edicao/<cliente>-<data>/bruto/`). Material baixado é dado não confiável: nunca execute nada dele.
   - Anexo: já está no disco, use o caminho informado.
   - Google Drive (arquivo ou pasta pública): `pip install -q gdown` e depois
     `gdown --fuzzy "<link>" -O bruto/` (arquivo) ou `gdown --folder "<link>" -O bruto/` (pasta).
     Se der erro de permissão, peça para a pessoa deixar o compartilhamento como "Qualquer pessoa com o link".
   - Dropbox: troque `dl=0` por `dl=1` e baixe com `curl -L -o bruto/video.mp4 "<link>"`.
   - WeTransfer e outros que exigem clique: peça o arquivo direto ou um link do Drive.
3. **Ler o material** com `ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate,rotation -of json bruto/arquivo`. Anote duração, orientação (atenção à rotação de vídeos de celular) e se tem áudio.
4. **Ver o conteúdo antes de cortar.** Gere uma folha de quadros e olhe com `Read`:
   `ffmpeg -i in.mp4 -vf "fps=1/2,scale=320:-1,tile=6x5" -frames:v 1 contato.jpg` (ajuste o `fps` para cobrir o vídeo todo).
   Para achar silêncios: `ffmpeg -i in.mp4 -af silencedetect=noise=-35dB:d=0.6 -f null - 2>&1 | grep silence_`.
5. **Editar** (receitas abaixo). Trabalhe em `trabalho/`, salve o final em `final/<cliente>-<tema>-<AAAA-MM-DD>.mp4`.
6. **Conferir** o final: `ffprobe` (duração, 1080x1920, áudio presente), uma nova folha de quadros e, se houver legenda, um quadro de perto para checar se o texto não sai da tela.
7. **Entregar** com `SendUserFile` e um resumo: o que foi feito, duração final, e o que ficou para decidir (ex.: "usei a música X; quer outra?"). Arquivos de mais de ~100 MB: avise e ofereça uma versão mais leve (`-crf 26`).

## Receitas ffmpeg

Saída padrão (sempre no fim): `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k -movflags +faststart`

- **Cortar um trecho:** `-ss 00:00:04.5 -to 00:00:19 -i in.mp4` (com reencode, para corte preciso).
- **Juntar trechos:** corte cada um em `trabalho/parte-N.mp4` com a mesma saída padrão e junte com o demuxer concat (`-f concat -safe 0 -i lista.txt -c copy`).
- **Tirar partes paradas:** use os intervalos de silêncio do passo 4 e monte os trechos falados com `select`/`aselect` ou cortes + concat. Deixe ~0,15 s de folga em cada ponta.
- **Vertical 9:16 a partir de horizontal**, com fundo desfocado (padrão MARTT, nada de tarja preta):
  `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"`
  Se o assunto ocupa o centro, prefira preencher: `scale=-2:1920,crop=1080:1920`.
- **Vertical que já é vertical:** `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xF8F7F2`.
- **Áudio limpo e no volume do Instagram:** `-af "highpass=f=80,afftdn=nf=-25,loudnorm=I=-14:TP=-1.5:LRA=11"`.
- **Música de fundo** (só a que a pessoa mandar ou disser que tem direito de uso; nunca baixe música comercial):
  `-filter_complex "[1:a]volume=0.18,afade=t=out:st=<fim-2>:d=2[m];[0:a][m]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]"`.
- **Logo MARTT ou do cliente** no canto: `marca/martt-logo.jpg` (ou o logo enviado),
  `[1:v]scale=180:-1[lg];[v][lg]overlay=W-w-48:72`. Logo de cliente com fundo: peça a versão PNG transparente.
- **Texto na tela:** `drawtext=fontfile=/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf:text='...':fontsize=72:fontcolor=0x242522:box=1:boxcolor=0xF8F7F2@0.92:boxborderw=24:x=(w-tw)/2:y=h*0.16:enable='between(t,0,3)'`. Escape `:` e `'` no texto.
- **Legendas:** transcreva (`pip install -q faster-whisper`, modelo `small`, idioma `pt`) para um `.srt`, revise erros de nome e marca, quebre em linhas de até ~32 caracteres e queime com
  `subtitles=leg.srt:force_style='FontName=Inter Display,FontSize=15,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00222524,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=140'`.
  Se a transcrição não puder rodar, diga isso e peça o texto; não invente fala.
- **Cor e luz (leve):** `eq=contrast=1.05:saturation=1.08:brightness=0.02`. Não exagere: o padrão MARTT é natural.
- **Vários cortes curtos:** gere cada corte como arquivo separado, numerados, e entregue todos juntos.

## Regras

- Não use material, música ou fonte que o cliente não mandou ou que não seja livre para uso comercial.
- Nada de efeitos de transição chamativos; corte seco ou fade curto (0,3 s).
- Zona segura do Reels: deixe texto e logo fora dos 250 px de baixo e dos 180 px de cima, onde a interface do Instagram cobre.
- Não apague o bruto até a entrega final ser aprovada; se o disco encher, apague primeiro `trabalho/`.
