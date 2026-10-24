from PIL import Image
import os

src = r"c:\Users\Diz\Desktop\SoulSplit\tools\realesrgan\out_4x.png"
out_jpg = r"c:\Users\Diz\Desktop\SoulSplit\public\art\backgrounds\main_menu.jpg"
out_assets = r"c:\Users\Diz\Desktop\SoulSplit\assets\art\backgrounds\main_menu.jpg"
out_png = r"c:\Users\Diz\Desktop\SoulSplit\public\art\backgrounds\main_menu_2580x1440.png"
TW, TH = 2580, 1440

im = Image.open(src).convert("RGB")
sw, sh = im.size
scale = max(TW / sw, TH / sh)
nw, nh = int(round(sw * scale)), int(round(sh * scale))
im2 = im.resize((nw, nh), Image.Resampling.LANCZOS)
left = max(0, (nw - TW) // 2)
top = max(0, (nh - TH) // 2)
im2 = im2.crop((left, top, left + TW, top + TH))
assert im2.size == (TW, TH), im2.size

im2.save(out_png, format="PNG", optimize=True)
im2.save(out_jpg, format="JPEG", quality=97, subsampling=0, optimize=True)
im2.save(out_assets, format="JPEG", quality=97, subsampling=0, optimize=True)

print("saved", im2.size)
print("jpg", os.path.getsize(out_jpg), "bytes")
print("png", os.path.getsize(out_png), "bytes")
