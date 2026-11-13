import sys, numpy as np, mediapipe as mp
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
src, seg_model, fontdir, out = sys.argv[1:5]
img = Image.open(src).convert("RGB")
W,H = img.size
# recorta a área de vídeo (tira a barra de status do print) e leva para 1080x1920
top = int(H*0.07); crop = img.crop((0, top, W, top + int(W*16/9)))
crop = crop.resize((1080,1920), Image.LANCZOS)
# grade natural e quente
crop = ImageEnhance.Color(crop).enhance(0.95)
a = np.asarray(crop).astype(np.float32); a[...,0]*=1.04; a[...,2]*=0.96
crop = Image.fromarray(np.clip(a,0,255).astype(np.uint8))
# segmentação da pessoa
opts = mp.tasks.vision.ImageSegmenterOptions(base_options=mp.tasks.BaseOptions(model_asset_path=seg_model), output_category_mask=True)
with mp.tasks.vision.ImageSegmenter.create_from_options(opts) as seg:
    r = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(crop)))
    cat = np.squeeze(r.category_mask.numpy_view()).copy()
mask = Image.fromarray(((cat>0)*255).astype(np.uint8)).resize(crop.size).filter(ImageFilter.GaussianBlur(2))
C=dict(creme=(251,246,238),marrom=(69,44,19),laranja=(235,102,25),branco=(255,255,255))
def font(name,size,w=None):
    f=ImageFont.truetype(f"{fontdir}/{name}",size)
    if w:
        try: f.set_variation_by_axes([14,w] if 'DMSans' in name else [w])
        except Exception: pass
    return f
# 1) título atrás da pessoa
layer = Image.new("RGBA", crop.size, (0,0,0,0)); d = ImageDraw.Draw(layer)
t = font("DMSans.ttf", 300, 800)
for i,(word,y) in enumerate([("CUIDAR",250),("DE SI",530)]):
    w = d.textlength(word, font=t); d.text(((1080-w)/2, y), word, font=t, fill=C["creme"]+(235,))
comp = Image.alpha_composite(crop.convert("RGBA"), layer)
comp = Image.composite(crop.convert("RGBA"), comp, mask)  # pessoa por cima do texto
d = ImageDraw.Draw(comp)
# 2) etiqueta de produto
tag = font("DMSans.ttf", 34, 600); label = "H I D R A T A Ç Ã O   7 2 H"
tw = d.textlength(label, font=tag)
d.rounded_rectangle((90,1080,90+tw+56,1150), 35, fill=C["marrom"]+(200,))
d.text((118,1093), label, font=tag, fill=C["creme"])
d.line((90+tw+56,1115,90+tw+150,1115), fill=C["creme"], width=3); d.ellipse((90+tw+142,1107,90+tw+158,1123), fill=C["creme"])
# 3) legenda com palavra falada em laranja
cap = font("DMSans.ttf", 72, 700); words = [("um","branco"),("ritual","laranja"),("pra","branco"),("você","branco")]
total = sum(d.textlength(w+" ", font=cap) for w,_ in words); x=(1080-total)/2; y=1480
sh = Image.new("RGBA", comp.size,(0,0,0,0)); ds=ImageDraw.Draw(sh); xx=x
for w,_ in words: ds.text((xx+3,y+5), w, font=cap, fill=C["marrom"]+(110,)); xx+=d.textlength(w+" ", font=cap)
comp = Image.alpha_composite(comp, sh.filter(ImageFilter.GaussianBlur(6))); d=ImageDraw.Draw(comp)
for w,c in words: d.text((x,y), w, font=cap, fill=C[c]); x+=d.textlength(w+" ", font=cap)
comp.convert("RGB").save(out, quality=92)
