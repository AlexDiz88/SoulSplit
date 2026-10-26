#!/usr/bin/env python3
"""Crop a 3x3 (or NxM) item icon sheet into square PNG tiles using named profiles."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Need Pillow: pip install Pillow", file=sys.stderr)
    sys.exit(1)

SKILL_DIR = Path(__file__).resolve().parents[1]
PROFILES_PATH = SKILL_DIR / "profiles.json"
ITEMS_ROOT = Path("assets/art/items")
DEFAULT_PREFIX = "image"

RARITY_TOKENS = frozenset(
    {
        "common",
        "uncommon",
        "magic",
        "magical",
        "rare",
        "epic",
        "white",
        "green",
        "blue",
        "yellow",
        "purple",
    }
)

WEAPON_TYPES = frozenset(
    {
        "dagger",
        "sword",
        "mace",
        "axe",
        "wand",
        "bow",
        "crossbow",
        "2h_sword",
        "2h_mace",
        "2h_axe",
        "staff",
        "spear",
    }
)

OFFHAND_TYPES = frozenset({"shield", "tome", "orb", "relic", "quiver"})

# File stem alias -> folder under assets/art/items/
SLOT_FOLDERS: dict[str, str] = {
    "head": "head",
    "helmet": "head",
    "chest": "chest",
    "body": "chest",
    "armor": "chest",
    "neck": "neck",
    "amulet": "neck",
    "necklace": "neck",
    "shoulders": "shoulders",
    "pauldrons": "shoulders",
    "hands": "hands",
    "gloves": "hands",
    "gauntlets": "hands",
    "ring": "ring",
    "ring1": "ring",
    "ring2": "ring",
    "waist": "waist",
    "belt": "waist",
    "legs": "legs",
    "greaves": "legs",
    "pants": "legs",
    "feet": "feet",
    "boots": "feet",
    "trinket": "trinket",
    "accessory": "trinket",
}


def load_profiles() -> dict:
    data = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
    if "profiles" not in data:
        raise SystemExit(f"Bad profiles file: {PROFILES_PATH}")
    return data


def save_profiles(data: dict) -> None:
    PROFILES_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def normalize_prefix(raw: str) -> str:
    prefix = raw.strip()
    if not prefix:
        raise SystemExit("prefix must be non-empty")
    if not re.fullmatch(r"[A-Za-z0-9_]+", prefix):
        raise SystemExit(
            f"bad prefix {raw!r}: use letters, digits, underscore "
            "(e.g. boots_uncommon, dagger_common, 2H_axe_magic)"
        )
    return prefix


def art_key_from_prefix(prefix: str) -> str:
    """`dagger_common` / `2H_axe_magic` / `boots_uncommon` -> art key before rarity."""
    parts = prefix.lower().split("_")
    for i in range(1, len(parts)):
        if parts[i] in RARITY_TOKENS:
            return "_".join(parts[:i])
    return "_".join(parts)


def resolve_out_dir(prefix: str) -> Path:
    """
    Map filename prefix to folder:
      image*              -> _inbox/
      starter_*           -> _starters/
      dagger_common       -> weapons/dagger/
      2H_axe_magic        -> weapons/2h_axe/
      shield_rare         -> offhand/shield/
      boots_uncommon      -> feet/
      ring_common         -> ring/
    """
    if prefix == DEFAULT_PREFIX:
        return ITEMS_ROOT / "_inbox"
    if prefix.lower().startswith("starter"):
        return ITEMS_ROOT / "_starters"

    key = art_key_from_prefix(prefix)
    if key in WEAPON_TYPES:
        return ITEMS_ROOT / "weapons" / key
    if key in OFFHAND_TYPES:
        return ITEMS_ROOT / "offhand" / key
    slot = SLOT_FOLDERS.get(key)
    if slot:
        return ITEMS_ROOT / slot

    raise SystemExit(
        f"cannot resolve folder for prefix {prefix!r} (art key {key!r}). "
        "Use type_rarity (dagger_common, boots_uncommon, 2H_axe_magic) "
        "or --out PATH."
    )


def file_stem(prefix: str, index: int) -> str:
    """Default image uses hyphen; custom prefixes use underscore (boots_uncommon_01)."""
    if prefix == DEFAULT_PREFIX:
        return f"image-{index:02d}"
    return f"{prefix}_{index:02d}"


def name_re(prefix: str) -> re.Pattern[str]:
    if prefix == DEFAULT_PREFIX:
        return re.compile(r"^image-(\d+)\.(?:png|webp|jpg|jpeg)$", re.I)
    return re.compile(
        rf"^{re.escape(prefix)}_(\d+)\.(?:png|webp|jpg|jpeg)$",
        re.I,
    )


def next_image_index(search_root: Path, prefix: str = DEFAULT_PREFIX) -> int:
    """Next free NN for this prefix anywhere under search_root (usually items/)."""
    highest = 0
    pattern = name_re(prefix)
    if search_root.is_dir():
        for p in search_root.rglob("*"):
            if not p.is_file():
                continue
            # Skip probe / temp trees
            if any(part.startswith("_crop") for part in p.parts):
                continue
            m = pattern.match(p.name)
            if m:
                highest = max(highest, int(m.group(1)))
    return highest + 1


def resolve_profile(data: dict, name: str | None) -> tuple[str, dict]:
    key = name or data.get("default")
    if not key or key not in data["profiles"]:
        known = ", ".join(sorted(data["profiles"]))
        raise SystemExit(f"Unknown profile {key!r}. Known: {known}")
    return key, data["profiles"][key]


def crop_with_profile(
    src: Path,
    out_dir: Path,
    profile: dict,
    start: int,
    prefix: str = DEFAULT_PREFIX,
) -> list[Path]:
    im = Image.open(src).convert("RGB")
    expect = profile.get("source_size")
    if expect and list(im.size) != list(expect):
        print(
            f"warn: source size {im.size} != profile source_size {tuple(expect)}",
            file=sys.stderr,
        )

    cells = profile["cells"]
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    for i, cell in enumerate(cells):
        left = int(cell["left"])
        top = int(cell["top"])
        side = int(cell["side"])
        if left < 0 or top < 0 or left + side > im.width or top + side > im.height:
            raise SystemExit(
                f"cell {i} out of bounds: left={left} top={top} side={side} "
                f"image={im.size}"
            )
        crop = im.crop((left, top, left + side, top + side))
        path = out_dir / f"{file_stem(prefix, start + i)}.png"
        crop.save(path)
        saved.append(path)
        print(f"{path.as_posix()} {crop.size} @ ({left},{top})")
    return saved


def bands(score: list[float], thr: float) -> list[tuple[int, int]]:
    inside = False
    start = 0
    out: list[tuple[int, int]] = []
    for i, v in enumerate(score):
        if v >= thr and not inside:
            inside = True
            start = i
        elif v < thr and inside:
            inside = False
            out.append((start, i - 1))
    if inside:
        out.append((start, len(score) - 1))
    return out


def calibrate(src: Path, cols: int, rows: int, inset_frac: float) -> dict:
    """Detect content bands (non-grey gutters) and build square cells."""
    im = Image.open(src).convert("RGB")
    w, h = im.size
    px = im.load()

    def is_content(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        # grey gutter: near-equal channels in mid range, or very dark line
        if r + g + b < 90:
            return False
        if abs(r - g) < 18 and abs(g - b) < 18 and 40 < r < 130:
            return False
        return True

    row_score = [sum(1 for x in range(w) if is_content(x, y)) / w for y in range(h)]
    col_score = [sum(1 for y in range(h) if is_content(x, y)) / h for x in range(w)]

    rb = bands(row_score, 0.06)
    cb = bands(col_score, 0.06)

    def top_n(bs: list[tuple[int, int]], n: int) -> list[tuple[int, int]]:
        ranked = sorted(bs, key=lambda t: t[1] - t[0], reverse=True)[:n]
        return sorted(ranked, key=lambda t: t[0])

    if len(rb) != rows:
        rb = top_n(bands(row_score, 0.03), rows)
    if len(cb) != cols:
        cb = top_n(bands(col_score, 0.03), cols)

    if len(rb) != rows or len(cb) != cols:
        raise SystemExit(
            f"calibrate failed: found {len(cb)}x{len(rb)} bands, want {cols}x{rows}. "
            "Tighten borders manually or pass a known profile."
        )

    cells = []
    for y0, y1 in rb:
        for x0, x1 in cb:
            bw = x1 - x0 + 1
            bh = y1 - y0 + 1
            inset = max(2, int(min(bw, bh) * inset_frac))
            side = max(8, min(bw, bh) - 2 * inset)
            left = x0 + (bw - side) // 2
            top = y0 + (bh - side) // 2
            left = max(0, min(left, w - side))
            top = max(0, min(top, h - side))
            cells.append({"left": left, "top": top, "side": side})

    return {
        "description": f"Auto-calibrated from {src.name} ({w}x{h}), inset_frac={inset_frac}",
        "source_size": [w, h],
        "grid": [cols, rows],
        "cells": cells,
    }


def cmd_list(data: dict) -> None:
    default = data.get("default")
    for name, prof in sorted(data["profiles"].items()):
        mark = " (default)" if name == default else ""
        grid = prof.get("grid", "?")
        n = len(prof.get("cells", []))
        desc = prof.get("description", "")
        print(f"{name}{mark}: grid={grid} cells={n} - {desc}")


def main() -> None:
    ap = argparse.ArgumentParser(
        description=(
            "Crop item icon sheets into assets/art/items/{slot|weapons/type}/"
            "{prefix}_NN.png"
        ),
    )
    ap.add_argument("src", nargs="?", type=Path, help="Source sheet image")
    ap.add_argument(
        "--profile",
        "-p",
        help="Profile name (default from profiles.json)",
    )
    ap.add_argument(
        "--prefix",
        default=DEFAULT_PREFIX,
        help=(
            "Filename stem prefix (default: image -> _inbox/image-NN.png; "
            "e.g. dagger_common -> weapons/dagger/dagger_common_NN.png)"
        ),
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=None,
        help=(
            "Override output directory. Default: resolved from --prefix "
            f"(under {ITEMS_ROOT.as_posix()}/)"
        ),
    )
    ap.add_argument(
        "--start",
        type=int,
        help="First NN index for this prefix (default: next free under items/)",
    )
    ap.add_argument(
        "--list-profiles",
        action="store_true",
        help="List profiles and exit",
    )
    ap.add_argument(
        "--calibrate",
        action="store_true",
        help="Detect cell bounds from gutters (does not save files unless --save-profile)",
    )
    ap.add_argument("--cols", type=int, default=3, help="Grid columns for --calibrate")
    ap.add_argument("--rows", type=int, default=3, help="Grid rows for --calibrate")
    ap.add_argument(
        "--inset",
        type=float,
        default=0.035,
        help="Inset fraction inside detected band for --calibrate (default 0.035)",
    )
    ap.add_argument(
        "--save-profile",
        metavar="NAME",
        help="Save calibrated (or current) profile under NAME",
    )
    ap.add_argument(
        "--set-default",
        action="store_true",
        help="With --save-profile, also set it as default",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Print targets without writing PNGs",
    )
    args = ap.parse_args()

    data = load_profiles()

    if args.list_profiles:
        cmd_list(data)
        return

    if args.calibrate:
        if not args.src:
            raise SystemExit("--calibrate needs src")
        prof = calibrate(args.src, args.cols, args.rows, args.inset)
        print(json.dumps(prof, ensure_ascii=False, indent=2))
        if args.save_profile:
            data["profiles"][args.save_profile] = prof
            if args.set_default:
                data["default"] = args.save_profile
            save_profiles(data)
            print(f"saved profile {args.save_profile!r} -> {PROFILES_PATH}")
        if args.dry_run or not args.save_profile:
            # calibrate alone does not crop unless user also wants crop after save
            if not args.save_profile:
                return
        # fall through to crop with the new profile name
        args.profile = args.save_profile

    if not args.src:
        ap.print_help()
        raise SystemExit(1)

    prefix = normalize_prefix(args.prefix)
    out_dir = args.out if args.out is not None else resolve_out_dir(prefix)
    name, profile = resolve_profile(data, args.profile)
    start = (
        args.start
        if args.start is not None
        else next_image_index(ITEMS_ROOT, prefix)
    )
    first = file_stem(prefix, start)
    print(f"profile={name} prefix={prefix} start={first} out={out_dir.as_posix()}")

    if args.dry_run:
        for i, cell in enumerate(profile["cells"]):
            stem = file_stem(prefix, start + i)
            print(
                f"{(out_dir / f'{stem}.png').as_posix()} "
                f"({cell['side']}x{cell['side']}) @ ({cell['left']},{cell['top']})"
            )
        return

    crop_with_profile(args.src, out_dir, profile, start, prefix)


if __name__ == "__main__":
    main()
