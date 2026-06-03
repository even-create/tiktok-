#!/usr/bin/env python3
"""Build a crisp 4-frame run spritesheet (nearest-neighbor downscale, lossless PNG)."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = (
    Path.home()
    / ".cursor/projects/Users-zhaoyiwen-Documents-tiktok/assets/__-0278c23f-fdce-4d09-8f31-8ddd9b911552.png"
)
OUT_DIR = ROOT / "public" / "sync"
# Native sprite height — 2× display in CSS for sharp pixels
TARGET_H = 40  # native sprite height before 1:1 display
DISPLAY_SCALE = 2


def is_background(rgba: tuple[int, int, int, int]) -> bool:
    if rgba[3] < 12:
        return True
    r, g, b, a = rgba
    if r < 48 and g < 48 and b < 48 and a > 180:
        return True
    return False


def downscale_nearest(img: Image.Image, target_h: int) -> Image.Image:
    """Halve repeatedly with NEAREST, then one final NEAREST resize."""
    w, h = img.size
    current = img
    while h > target_h * 2:
        w, h = max(1, w // 2), max(1, h // 2)
        current = current.resize((w, h), Image.Resampling.NEAREST)
    target_w = max(1, int(round(w * (target_h / h))))
    return current.resize((target_w, target_h), Image.Resampling.NEAREST)


def extract_character(src: Path) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size

    visited = [[False] * w for _ in range(h)]
    bg_mask = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_background(px[x, y]) and not visited[y][x]:
                visited[y][x] = True
                bg_mask[y][x] = True
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_background(px[x, y]) and not visited[y][x]:
                visited[y][x] = True
                bg_mask[y][x] = True
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_background(px[nx, ny]):
                visited[ny][nx] = True
                bg_mask[ny][nx] = True
                queue.append((nx, ny))

    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if not bg_mask[y][x] and px[x, y][3] > 30:
                minx, miny = min(minx, x), min(miny, y)
                maxx, maxy = max(maxx, x), max(maxy, y)

    pad = 4
    minx = max(minx - pad, 0)
    miny = max(miny - pad, 0)
    maxx = min(maxx + pad, w - 1)
    maxy = min(maxy + pad, h - 1)

    cropped = Image.new("RGBA", (maxx - minx + 1, maxy - miny + 1), (0, 0, 0, 0))
    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            if not bg_mask[y][x]:
                cropped.putpixel((x - minx, y - miny), px[x, y])

    return downscale_nearest(cropped, TARGET_H)


def make_run_frame(
    base: Image.Image,
    *,
    dx: int = 0,
    dy: int = 0,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
) -> Image.Image:
    w, h = base.size
    nw = max(1, int(round(w * scale_x)))
    nh = max(1, int(round(h * scale_y)))
    scaled = base.resize((nw, nh), Image.Resampling.NEAREST)
    cell_w = w + 8
    cell_h = h + 6
    frame = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
    paste_x = 4 + dx + (w - nw) // 2
    paste_y = cell_h - nh - 2 + dy
    frame.paste(scaled, (paste_x, paste_y), scaled)
    return frame


def save_png_lossless(img: Image.Image, path: Path) -> None:
    img.save(path, format="PNG", compress_level=0, optimize=False)


def main(src: Path = DEFAULT_SRC) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base = extract_character(src)

    variants = [
        make_run_frame(base, dy=2, scale_x=1.04, scale_y=0.94),
        make_run_frame(base, dx=2, dy=0, scale_x=0.98, scale_y=1.03),
        make_run_frame(base, dx=3, dy=-2, scale_x=1.0, scale_y=1.0),
        make_run_frame(base, dx=1, dy=1, scale_x=1.02, scale_y=0.97),
    ]

    cell_w = max(f.size[0] for f in variants)
    cell_h = max(f.size[1] for f in variants)
    frames: list[Image.Image] = []
    for variant in variants:
        cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        cell.paste(variant, ((cell_w - variant.size[0]) // 2, cell_h - variant.size[1]), variant)
        frames.append(cell)

    sheet = Image.new("RGBA", (cell_w * 4, cell_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * cell_w, 0), frame)

    save_png_lossless(sheet, OUT_DIR / "runner-spritesheet.png")
    save_png_lossless(frames[0], OUT_DIR / "runner.png")
    (OUT_DIR / "spritesheet.meta.txt").write_text(
        f"{cell_w},{cell_h},4,{DISPLAY_SCALE}\n",
    )
    print(f"native {cell_w}x{cell_h} x4, display {cell_w * DISPLAY_SCALE}x{cell_h * DISPLAY_SCALE}")


if __name__ == "__main__":
    main()
