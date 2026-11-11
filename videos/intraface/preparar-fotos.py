"""Prepara as fotos de fotos/originais/ para o vídeo (16:9, 1920x1080).

- Prints de celular: recorta só a foto (tira as barras pretas e a interface).
- Fotos deitadas: preenchem a tela.
- Fotos em pé ou quadradas: entram inteiras, sobre um fundo desfocado da própria foto.

Uso: python3 preparar-fotos.py
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw, ImageOps

RAIZ = Path(__file__).parent
ORIG, SAIDA = RAIZ / "fotos" / "originais", RAIZ / "fotos"
W, H = 1920, 1080

# recortes (esquerda, topo, direita, base) para prints de celular
RECORTES = {
    "10.jpg": (0, 414, 739, 1186),
    "11.jpg": (0, 523, 739, 1077),
    "12.jpg": (0, 523, 739, 1077),
    "14.jpg": (0, 399, 720, 880),
}
# onde fica o rosto na vertical (0 = topo, 1 = base), para o corte das deitadas
FOCO_V = {"02.jpg": 0.45, "07.jpg": 0.35, "13.jpg": 0.4, "16.jpg": 0.4, "11.jpg": 0.35, "12.jpg": 0.4, "14.jpg": 0.35}


def cobre(im, w, h, fv=0.5):
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = round((im.height - h) * fv)
    return im.crop((x, y, x + w, y + h))


def contem(im):
    fundo = cobre(im, W, H).filter(ImageFilter.GaussianBlur(60))
    fundo = Image.blend(fundo, Image.new("RGB", (W, H), (12, 9, 7)), 0.55)
    alt = H - 80
    r = alt / im.height
    fg = im.resize((round(im.width * r), alt), Image.LANCZOS)
    x, y = (W - fg.width) // 2, 40
    sombra = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sombra).rectangle((x + 10, y + 24, x + fg.width + 10, y + alt + 24), fill=150)
    sombra = sombra.filter(ImageFilter.GaussianBlur(30))
    fundo.paste((0, 0, 0), (0, 0), sombra)
    fundo.paste(fg, (x, y))
    return fundo


for f in sorted(ORIG.glob("*.jpg")):
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    if f.name in RECORTES:
        im = im.crop(RECORTES[f.name])
    ratio = im.width / im.height
    out = cobre(im, W, H, FOCO_V.get(f.name, 0.4)) if ratio >= 1.3 else contem(im)
    out.save(SAIDA / f.name, quality=92)
    print(f.name, im.size, "deitada" if ratio >= 1.3 else "em pé")
