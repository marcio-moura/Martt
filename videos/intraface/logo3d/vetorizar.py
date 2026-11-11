"""Vetoriza a logo (fotos/originais/logo-limpa.png) em camadas SVG para o 3D."""
import sys, numpy as np, potrace
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
K = 6
im = Image.open(src).convert("RGB")
im = im.resize((im.width * K, im.height * K), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mx, mn = a.max(2), a.min(2)
H, W = mn.shape
yy, xx = np.mgrid[0:H, 0:W]
cx, cy, rad = 142.0 * K, 82.5 * K, 59.5 * K
dentro = (xx - cx) ** 2 + (yy - cy) ** 2 <= (rad - 1) ** 2
dist2 = (xx - cx) ** 2 + (yy - cy) ** 2
tra = (r - b > 85) & (dist2 > (rad + 10) ** 2) & (xx > cx)
branco = (dist2 <= (rad - 7) ** 2) & (mn > 200)
escuro = (mx - mn < 45) & (mn < 160) & ~dentro
sub = escuro & (yy > 117 * K)
face = escuro & ~(yy > 117 * K)
def svgpath(mask):
    bm = potrace.Bitmap(~mask)
    pl = bm.trace(turdsize=20, alphamax=1.0, opticurve=True, opttolerance=0.2)
    d = []
    for c in pl:
        s = c.start_point; d.append(f"M{s.x:.1f},{s.y:.1f}")
        for seg in c.segments:
            if seg.is_corner: d.append(f"L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}")
            else: d.append(f"C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}")
        d.append("Z")
    return "".join(d)
camadas = {"tra": ("#f39a1e", tra), "branco": ("#ffffff", branco), "face": ("#f6efe3", face), "sub": ("#f6efe3", sub)}
with open(out, "w") as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">\n')
    for nome, (cor, m) in camadas.items():
        f.write(f'<path id="{nome}" fill="{cor}" fill-rule="evenodd" d="{svgpath(m)}"/>\n')
    f.write(f'<circle id="disco" cx="{cx}" cy="{cy}" r="{rad}" fill="#f39a1e"/>\n')
    f.write("</svg>\n")
print("ok", W, H)
