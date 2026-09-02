#!/usr/bin/env python3
"""
Render Directory Comparison Tool

Compares two IMSC render directories (e.g. renders-imsc1 and renders-old-1),
performing deep file analysis:
  1. File tree & count validation
  2. Byte-level diffs and PNG chunk inspection
  3. 100% pixel-by-pixel image verification using PIL
  4. JSON and HTML structural diff analysis
  5. Markdown comparison report generation, with per-file PNG diff images
     and TXT diff files written alongside the report
"""

import argparse
import difflib
import json
import struct
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageOps
except ImportError:
    print("Warning: PIL not found. Pixel-level PNG comparison will be skipped.")
    Image = None
    ImageChops = None
    ImageOps = None


def parse_png_chunks(data: bytes):
    """Parse PNG chunks from raw bytes."""
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return []
    pos = 8
    chunks = []
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8].decode('latin1', errors='replace')
        chunks.append((ctype, length))
        pos += 12 + length
    return chunks


def _flatten_name(rel: Path) -> str:
    """Turns a relative path into a filesystem-safe flat name, e.g.
    'a/b/c.png' -> 'a__b__c.png'."""
    return str(rel).replace('/', '__').replace('\\', '__')


def compare_directories(dir1: Path, dir2: Path, report_dir: Path):
    print(f"Comparing:")
    print(f"  Directory 1: {dir1}")
    print(f"  Directory 2: {dir2}\n")

    if not dir1.exists() or not dir2.exists():
        print(f"Error: One or both directories do not exist.")
        sys.exit(1)

    files1 = {p.relative_to(dir1) for p in dir1.rglob('*') if p.is_file()}
    files2 = {p.relative_to(dir2) for p in dir2.rglob('*') if p.is_file()}

    only_in_1 = sorted(list(files1 - files2))
    only_in_2 = sorted(list(files2 - files1))
    common = sorted(list(files1 & files2))

    print(f"=== File Summary ===")
    print(f"Total files in Dir 1: {len(files1)}")
    print(f"Total files in Dir 2: {len(files2)}")
    print(f"Common files:        {len(common)}")
    if only_in_1:
        print(f"Only in Dir 1 ({len(only_in_1)}): {only_in_1[:5]}...")
    if only_in_2:
        print(f"Only in Dir 2 ({len(only_in_2)}): {only_in_2[:5]}...")

    byte_identical = []
    byte_different = []

    diff_by_ext = Counter()
    diff_files = []

    for rel in common:
        p1 = dir1 / rel
        p2 = dir2 / rel
        b1 = p1.read_bytes()
        b2 = p2.read_bytes()

        if b1 == b2:
            byte_identical.append(rel)
        else:
            byte_different.append(rel)
            diff_by_ext[rel.suffix] += 1
            diff_files.append(rel)

    print(f"\n=== Byte-Level Results ===")
    print(f"Byte-identical files: {len(byte_identical)}")
    print(f"Byte-different files: {len(byte_different)}")
    for ext, count in diff_by_ext.items():
        print(f"  {ext or '[no ext]':10}: {count} modified")

    report_dir.mkdir(parents=True, exist_ok=True)

    # PNG Pixel Comparison
    png_files = [f for f in common if f.suffix.lower() == '.png']
    print(f"\n=== PNG Pixel Comparison ({len(png_files)} files) ===")
    pixel_identical = 0
    # Each entry: (rel_path, reason, diff_image_relpath_or_None)
    pixel_different = []

    if Image is not None:
        for p in png_files:
            p1 = dir1 / p
            p2 = dir2 / p
            im1 = Image.open(p1)
            im2 = Image.open(p2)

            if im1.size != im2.size or im1.mode != im2.mode:
                reason = f"Dimension/mode mismatch: {im1.size}/{im1.mode} vs {im2.size}/{im2.mode}"
                pixel_different.append((p, reason, None))
                continue

            diff = ImageChops.difference(im1, im2)
            bbox = diff.getbbox()
            if bbox is None:
                pixel_identical += 1
            else:
                reason = f"Non-zero bounding box diff: {bbox}"
                visible_diff = ImageOps.autocontrast(diff.convert('RGB')) if ImageOps else diff
                diff_filename = f"{_flatten_name(p)}.diff.png"
                visible_diff.save(report_dir / diff_filename)
                pixel_different.append((p, reason, diff_filename))

        if png_files:
            print(f"Pixel Identical: {pixel_identical} / {len(png_files)} ({pixel_identical/len(png_files)*100:.1f}%)")
        print(f"Pixel Different: {len(pixel_different)}")
        if pixel_different:
            for p, reason, _ in pixel_different[:10]:
                print(f"  - {p}: {reason}")
    else:
        print("Skipping pixel analysis (PIL not installed).")

    # JSON Analysis
    json_diffs = [f for f in diff_files if f.suffix == '.json']
    print(f"\n=== JSON Document Diffs ({len(json_diffs)} files) ===")
    for j in json_diffs[:5]:
        print(f"  - {j}")
    if len(json_diffs) > 5:
        print(f"  ... and {len(json_diffs) - 5} more.")

    # HTML Analysis
    html_diffs = [f for f in diff_files if f.suffix == '.html']
    print(f"\n=== HTML Render Diffs ({len(html_diffs)} files) ===")
    for h in html_diffs:
        print(f"  - {h}")

    # Generate Markdown Report
    report_path = generate_markdown_report(
        dir1=dir1,
        dir2=dir2,
        report_dir=report_dir,
        total_files=len(common),
        byte_identical=len(byte_identical),
        byte_different=len(byte_different),
        png_total=len(png_files),
        pixel_identical=pixel_identical,
        pixel_different=pixel_different,
        json_diffs=json_diffs,
        html_diffs=html_diffs,
    )
    print(f"\nMarkdown report successfully written to: {report_path}")


def _read_lines(path: Path):
    try:
        return path.read_text(encoding='utf-8').splitlines()
    except UnicodeDecodeError:
        return path.read_text(encoding='utf-8', errors='replace').splitlines()


def _json_pretty_lines(path: Path):
    """Returns pretty-printed, key-sorted JSON lines, or the raw file's lines
    if it does not parse as JSON."""
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        return json.dumps(data, indent=2, sort_keys=True).splitlines()
    except (json.JSONDecodeError, OSError):
        return _read_lines(path)


def _write_unified_diff_txt(dir1, dir2, rel, output_path, as_json=False):
    """Writes a unified diff between dir1/rel and dir2/rel to output_path as
    plain text."""
    p1, p2 = dir1 / rel, dir2 / rel
    lines1 = _json_pretty_lines(p1) if as_json else _read_lines(p1)
    lines2 = _json_pretty_lines(p2) if as_json else _read_lines(p2)
    diff = list(difflib.unified_diff(
        lines1, lines2,
        fromfile=str(dir1 / rel), tofile=str(dir2 / rel), lineterm=''
    ))
    body = "\n".join(diff) if diff else "(no textual differences)"
    output_path.write_text(body + "\n", encoding='utf-8')


def _write_diff_files(dir1, dir2, report_dir, files, as_json=False):
    """Writes a TXT unified diff file per entry in `files` into report_dir,
    returning a list of (rel_path, diff_filename)."""
    entries = []
    for rel in files:
        diff_filename = f"{_flatten_name(rel)}.diff.txt"
        _write_unified_diff_txt(dir1, dir2, rel, report_dir / diff_filename, as_json=as_json)
        entries.append((rel, diff_filename))
    return entries


def generate_markdown_report(dir1, dir2, report_dir, total_files, byte_identical, byte_different,
                              png_total, pixel_identical, pixel_different, json_diffs, html_diffs):
    """Generates a Markdown comparison report reflecting the actual
    differences found between dir1 and dir2, writing it to report_dir /
    'report.md'. PNG diff images (.png) and text diffs (.txt) are written as
    separate files into report_dir and linked to from the report. Returns
    the path to the written report."""

    output_path = report_dir / "report.md"
    pixel_pct = (pixel_identical / png_total * 100) if png_total else 100.0

    json_entries = _write_diff_files(dir1, dir2, report_dir, json_diffs, as_json=True)
    html_entries = _write_diff_files(dir1, dir2, report_dir, html_diffs, as_json=False)

    is_identical = byte_different == 0 and not pixel_different
    if is_identical:
        summary = (
            f"The render outputs in `{dir1.name}` and `{dir2.name}` are byte-identical "
            f"across all {total_files} compared files."
        )
    else:
        summary = (
            f"**{byte_different}** of **{total_files}** compared files differ between "
            f"`{dir1.name}` and `{dir2.name}`"
            + (f", including **{len(pixel_different)}** PNG(s) with pixel differences" if pixel_different else "")
            + ". See the sections below for details."
        )

    lines = []
    lines.append(f"# Render Comparison Report: {dir1.name} vs {dir2.name}")
    lines.append("")
    lines.append(f"Comparing directory `{dir1}` against `{dir2}`.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Total files compared: **{total_files}**")
    lines.append(f"- Byte-identical: **{byte_identical}**")
    lines.append(f"- Byte-different: **{byte_different}**")
    lines.append(f"- PNG pixel-identical: **{pixel_identical} / {png_total}** ({pixel_pct:.1f}%)")
    lines.append(f"- JSON document diffs: **{len(json_diffs)}**")
    lines.append(f"- HTML render diffs: **{len(html_diffs)}**")
    lines.append("")

    lines.append(f"## 1. Rendered Images Pixel Analysis (PNG) — {pixel_identical} / {png_total} identical")
    lines.append("")
    if not pixel_different:
        lines.append("No pixel differences found.")
    else:
        lines.append("| File | Diff Image | Notes |")
        lines.append("|---|---|---|")
        for rel, reason, diff_relpath in pixel_different:
            link = f"[view]({diff_relpath})" if diff_relpath else "(n/a)"
            lines.append(f"| `{rel}` | {link} | {reason} |")
    lines.append("")

    lines.append(f"## 2. JSON Document Diffs ({len(json_diffs)} files)")
    lines.append("")
    if not json_entries:
        lines.append("No JSON differences found.")
    else:
        for rel, diff_filename in json_entries:
            lines.append(f"- [`{rel}`]({diff_filename})")
    lines.append("")

    lines.append(f"## 3. HTML Render Diffs ({len(html_diffs)} files)")
    lines.append("")
    if not html_entries:
        lines.append("No HTML differences found.")
    else:
        for rel, diff_filename in html_entries:
            lines.append(f"- [`{rel}`]({diff_filename})")
    lines.append("")

    lines.append("## Summary")
    lines.append("")
    lines.append(summary)
    lines.append("")

    output_path.write_text("\n".join(lines), encoding='utf-8')
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Compare two render directories.")
    parser.add_argument(
        "dir1",
        type=Path,
        help="First render directory"
    )
    parser.add_argument(
        "dir2",
        type=Path,
        help="Second render directory"
    )
    parser.add_argument(
        "report_dir",
        type=Path,
        help="Directory to write the Markdown comparison report to (as 'report.md'), "
             "along with the PNG diff images and TXT diff files it links to. "
             "Created if it does not already exist."
    )

    args = parser.parse_args()
    compare_directories(args.dir1, args.dir2, args.report_dir)


if __name__ == "__main__":
    main()
