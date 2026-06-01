#!/usr/bin/env python3
"""Remove background from sync runner art and build a 4-frame spritesheet (nearest-neighbor only)."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = (
    Path.home()
    / ".cursor/projects/Users-zhaoyiwen-Documents-tiktok/assets/__-dfa42f55-1f9b-48fb-acf7-363bf99cb70f.png"
)
OUT_DIR = ROOT / "public" / "sync"
TARGET_H = 36


def is_background(rgba: tuple[int, int, int, int]) -> bool:
    if rgba[3] < 12:
        return True
    r, g, b, a = rgba
    if r < 40 and g < 40 and b < 40 and a > 200:
        return True
    if b > 130 and r < 130 and g < 200 and a > 180:
        return True
    if g > 90 and r < 100 and b < 120 and a > 180:
        return True
    if r > 130 and 60 < g < 160 and b < 120 and a > 180:
        return True
    if r > 170 and g > 130 and b > 100 and a > 180 and g < 200:
        return True
    return False


def main(src: Path = DEFAULT_SRC) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
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

    pad = 2
    minx = max(minx - pad, 0)
    miny = max(miny - pad, 0)
    maxx = min(maxx + pad, w - 1)
    maxy = min(maxy + pad, h - 1)

    cropped = Image.new("RGBA", (maxx - minx + 1, maxy - miny + 1), (0, 0, 0, 0))
    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            if not bg_mask[y][x] and not is_background(px[x, y]):
                cropped.putpixel((x - minx, y - miny), px[x, y])

    fw, fh = cropped.size
    fw_s = max(1, int(fw * (TARGET_H / fh)))
    base = cropped.resize((fw_s, TARGET_H), Image.NEAREST)

    offsets = [(0, 2), (1, 0), (0, 2), (-1, 1)]
    frame_h = TARGET_H + 4
    fw2 = fw_s + 2
    frames: list[Image.Image] = []
    for ox, oy in offsets:
        frame = Image.new("RGBA", (fw2, frame_h), (0, 0, 0, 0))
        frame.paste(base, (1 + ox, oy), base)
        frames.append(frame)

    sheet = Image.new("RGBA", (fw2 * 4, frame_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * fw2, 0), frame)

    sheet.save(OUT_DIR / "runner-spritesheet.png", optimize=True)
    base.save(OUT_DIR / "runner.png", optimize=True)
    (OUT_DIR / "spritesheet.meta.txt").write_text(f"{fw2},{frame_h},4\n")
    print(f"wrote {OUT_DIR} ({fw2}x{frame_h} x4)")


if __name__ == "__main__":
    main()
