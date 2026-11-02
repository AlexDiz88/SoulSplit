#!/usr/bin/env python3
"""Normalize item icon filenames under assets/art/items to {prefix}_{NN}.ext."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ITEMS_ROOT = Path("assets/art/items")
IMAGE_EXTS = {".png", ".webp", ".jpg", ".jpeg"}

RARITY_TOKENS = frozenset(
    {
        "common",
        "uncommon",
        "magic",
        "magical",
        "rare",
        "epic",
        "legendary",
        "white",
        "green",
        "blue",
        "yellow",
        "purple",
    }
)

# Windows copy/rename: "legs_uncommon (2)" or "legs_uncommon(2)"
WIN_SUFFIX_RE = re.compile(r"\s*\((\d+)\)\s*$")
# Canonical (and already-numbered): prefix_NN
NUMBERED_RE = re.compile(r"^(.+)_(\d+)$", re.I)


@dataclass(frozen=True)
class ValidFile:
    path: Path
    prefix: str
    index: int


@dataclass(frozen=True)
class Candidate:
    path: Path
    prefix: str
    """Sort key: bare name first (0), then Windows (N), then name."""
    sort_key: tuple


def is_service_path(path: Path, root: Path) -> bool:
    """Skip _inbox, _starters, _crop_*, and any other _-prefixed folder."""
    try:
        rel = path.relative_to(root)
    except ValueError:
        return True
    return any(part.startswith("_") for part in rel.parts[:-1])


def prefix_ends_with_rarity(prefix: str) -> bool:
    parts = prefix.lower().split("_")
    return len(parts) >= 2 and parts[-1] in RARITY_TOKENS


def strip_win_suffix(stem: str) -> tuple[str, int | None]:
    m = WIN_SUFFIX_RE.search(stem)
    if not m:
        return stem, None
    return stem[: m.start()].rstrip(), int(m.group(1))


def classify(path: Path) -> tuple[str, ValidFile | Candidate | None, str | None]:
    """
    Returns (kind, payload, warn).
    kind: "valid" | "candidate" | "skip"
    """
    stem = path.stem
    cleaned, win_n = strip_win_suffix(stem)
    has_space = " " in stem

    numbered = NUMBERED_RE.match(cleaned)
    if (
        numbered
        and prefix_ends_with_rarity(numbered.group(1))
        and not has_space
        and win_n is None
    ):
        return (
            "valid",
            ValidFile(path=path, prefix=numbered.group(1), index=int(numbered.group(2))),
            None,
        )

    # Bare type_rarity, or Windows-style type_rarity (N)
    if prefix_ends_with_rarity(cleaned) and not NUMBERED_RE.match(cleaned):
        if " " in cleaned:
            return "skip", None, f"unrecognized spaces: {path.name}"
        sort_win = win_n if win_n is not None else -1
        # bare first, then (1), (2), ...
        return (
            "candidate",
            Candidate(
                path=path,
                prefix=cleaned,
                sort_key=(0 if win_n is None else 1, sort_win, stem.lower(), str(path)),
            ),
            None,
        )

    # Numbered but has space / win suffix leftover weirdness, or rarity not last
    if has_space or win_n is not None:
        return "skip", None, f"cannot parse prefix/rarity: {path.name}"

    return "skip", None, None


def iter_item_images(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    out: list[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        if is_service_path(p, root):
            continue
        out.append(p)
    return out


def free_indices(occupied: set[int], count: int) -> list[int]:
    """Fill gaps from 1, then continue after max."""
    free: list[int] = []
    n = 1
    while len(free) < count:
        if n not in occupied:
            free.append(n)
        n += 1
    return free


def plan_renames(
    root: Path,
) -> tuple[list[tuple[Path, Path]], list[str]]:
    """Build (src, dst) renames and warning lines."""
    valids: list[ValidFile] = []
    candidates: list[Candidate] = []
    warnings: list[str] = []

    for path in iter_item_images(root):
        kind, payload, warn = classify(path)
        if warn:
            warnings.append(warn)
        if kind == "valid" and isinstance(payload, ValidFile):
            valids.append(payload)
        elif kind == "candidate" and isinstance(payload, Candidate):
            candidates.append(payload)

    occupied_by_prefix: dict[str, set[int]] = {}
    for v in valids:
        key = v.prefix.lower()
        occupied_by_prefix.setdefault(key, set()).add(v.index)

    # Preserve display casing from first seen candidate/valid of that prefix
    display_prefix: dict[str, str] = {}
    for v in valids:
        display_prefix.setdefault(v.prefix.lower(), v.prefix)
    for c in candidates:
        display_prefix.setdefault(c.prefix.lower(), c.prefix)

    by_prefix: dict[str, list[Candidate]] = {}
    for c in candidates:
        by_prefix.setdefault(c.prefix.lower(), []).append(c)

    renames: list[tuple[Path, Path]] = []
    for key, group in sorted(by_prefix.items()):
        group_sorted = sorted(group, key=lambda c: c.sort_key)
        occupied = set(occupied_by_prefix.get(key, set()))
        indices = free_indices(occupied, len(group_sorted))
        prefix = display_prefix[key]
        for cand, idx in zip(group_sorted, indices):
            new_name = f"{prefix}_{idx:02d}{cand.path.suffix.lower()}"
            dst = cand.path.with_name(new_name)
            if dst.exists() and dst.resolve() != cand.path.resolve():
                warnings.append(f"target exists, skip: {cand.path.name} -> {new_name}")
                continue
            if dst.resolve() == cand.path.resolve():
                continue
            renames.append((cand.path, dst))
            occupied.add(idx)
        occupied_by_prefix[key] = occupied

    return renames, warnings


def apply_renames(renames: list[tuple[Path, Path]], dry_run: bool) -> int:
    for src, dst in renames:
        rel_src = src.as_posix()
        rel_dst = dst.name
        print(f"{rel_src} -> {rel_dst}")
        if not dry_run:
            src.rename(dst)
    return len(renames)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Rename malformed item icons to {prefix}_{NN}.ext "
            "(fill gaps, skip _inbox/_starters)."
        )
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=ITEMS_ROOT,
        help=f"items root (default: {ITEMS_ROOT})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print planned renames only, do not rename",
    )
    args = parser.parse_args()
    root = args.root

    if not root.is_dir():
        print(f"missing items root: {root}", file=sys.stderr)
        return 1

    renames, warnings = plan_renames(root)
    for w in warnings:
        print(f"warn: {w}", file=sys.stderr)

    if not renames:
        print("ok: nothing to rename")
        return 0

    mode = "dry-run" if args.dry_run else "apply"
    print(f"mode={mode} count={len(renames)} root={root.as_posix()}")
    apply_renames(renames, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
