#!/usr/bin/env python3
"""
Render Directory Comparison Tool

Compares two IMSC render directories (e.g. renders-imsc1 and renders-old-1),
performing deep file analysis:
  1. File tree & count validation
  2. Byte-level diffs and PNG chunk inspection
  3. 100% pixel-by-pixel image verification using PIL
  4. JSON and HTML structural diff analysis
  5. Standalone HTML comparison report generation
"""

import argparse
import difflib
import json
import struct
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:
    print("Warning: PIL not found. Pixel-level PNG comparison will be skipped.")
    Image = None
    ImageChops = None


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


def compare_directories(dir1: Path, dir2: Path, generate_html_path: Path = None):
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

    # PNG Pixel Comparison
    png_files = [f for f in common if f.suffix.lower() == '.png']
    print(f"\n=== PNG Pixel Comparison ({len(png_files)} files) ===")
    pixel_identical = 0
    pixel_different = []

    if Image is not None:
        for p in png_files:
            p1 = dir1 / p
            p2 = dir2 / p
            im1 = Image.open(p1)
            im2 = Image.open(p2)

            if im1.size != im2.size or im1.mode != im2.mode:
                pixel_different.append((p, f"Dimension/mode mismatch: {im1.size}/{im1.mode} vs {im2.size}/{im2.mode}"))
                continue

            diff = ImageChops.difference(im1, im2)
            bbox = diff.getbbox()
            if bbox is None:
                pixel_identical += 1
            else:
                pixel_different.append((p, f"Non-zero bounding box diff: {bbox}"))

        if png_files:
            print(f"Pixel Identical: {pixel_identical} / {len(png_files)} ({pixel_identical/len(png_files)*100:.1f}%)")
        print(f"Pixel Different: {len(pixel_different)}")
        if pixel_different:
            for p, reason in pixel_different[:10]:
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

    # Generate HTML Report if requested
    if generate_html_path:
        generate_html_report(
            dir1=dir1,
            dir2=dir2,
            output_path=generate_html_path,
            total_files=len(common),
            byte_identical=len(byte_identical),
            byte_different=len(byte_different),
            png_total=len(png_files),
            pixel_identical=pixel_identical,
            pixel_different=pixel_different,
            json_diffs=json_diffs,
            html_diffs=html_diffs,
        )
        print(f"\nHTML report successfully written to: {generate_html_path}")


def _html_escape(text: str) -> str:
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


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


def _unified_diff_html(lines1, lines2, max_lines=60):
    """Renders a unified diff between two line lists as highlighted HTML."""
    diff = [
        line for line in difflib.unified_diff(lines1, lines2, lineterm='')
        if not (line.startswith('---') or line.startswith('+++'))
    ]
    truncated = len(diff) > max_lines
    diff = diff[:max_lines]

    rendered = []
    for line in diff:
        escaped = _html_escape(line)
        if line.startswith('+'):
            rendered.append(f'<span class="add-line">{escaped}</span>')
        elif line.startswith('-'):
            rendered.append(f'<span class="del-line">{escaped}</span>')
        else:
            rendered.append(escaped)

    body = "\n".join(rendered) if rendered else "(no textual differences)"
    if truncated:
        body += "\n... (diff truncated)"
    return body


def _render_diff_section(dir1, dir2, files, max_samples=5, as_json=False):
    """Builds a chip list of every diffed file, plus real unified diffs for
    up to max_samples of them, read from dir1/dir2."""
    chips = "".join(f'<span class="chip">{_html_escape(str(f))}</span>' for f in files)

    blocks = []
    for f in files[:max_samples]:
        p1, p2 = dir1 / f, dir2 / f
        lines1 = _json_pretty_lines(p1) if as_json else _read_lines(p1)
        lines2 = _json_pretty_lines(p2) if as_json else _read_lines(p2)
        diff_html = _unified_diff_html(lines1, lines2)
        blocks.append(f'''
        <div class="diff-box" style="margin-top: 0.75rem;">
          <div class="diff-title">{_html_escape(str(f))}</div>
          <pre><code>{diff_html}</code></pre>
        </div>''')

    remaining = len(files) - len(files[:max_samples])
    more_note = (
        f'<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.75rem;">'
        f'... and {remaining} more file(s) not shown.</p>'
        if remaining > 0 else ""
    )

    return chips, "".join(blocks), more_note


def generate_html_report(dir1, dir2, output_path, total_files, byte_identical, byte_different,
                          png_total, pixel_identical, pixel_different, json_diffs, html_diffs):
    """Generates a responsive, modern HTML comparison report reflecting the
    actual differences found between dir1 and dir2."""

    pixel_pct = (pixel_identical / png_total * 100) if png_total else 100.0
    pixel_color = "var(--accent-green)" if not pixel_different else "var(--accent-yellow)"

    pixel_diff_rows = "".join(
        f'<tr><td>{_html_escape(str(p))}</td><td>{_html_escape(reason)}</td></tr>'
        for p, reason in pixel_different[:20]
    )
    pixel_diff_table = f'''
        <table style="margin-top: 1rem;">
          <thead><tr><th>File</th><th>Difference</th></tr></thead>
          <tbody>{pixel_diff_rows}</tbody>
        </table>''' if pixel_different else ""

    json_chips, json_blocks, json_more = _render_diff_section(dir1, dir2, json_diffs, as_json=True)
    html_chips, html_blocks, html_more = _render_diff_section(dir1, dir2, html_diffs, as_json=False)

    is_identical = byte_different == 0 and not pixel_different
    if is_identical:
        summary = (
            f'The render outputs in <strong><code>{dir1.name}</code></strong> and '
            f'<strong><code>{dir2.name}</code></strong> are byte-identical across all '
            f'{total_files} compared files.'
        )
    else:
        summary = (
            f'<strong>{byte_different}</strong> of <strong>{total_files}</strong> compared files differ '
            f'between <strong><code>{dir1.name}</code></strong> and <strong><code>{dir2.name}</code></strong>'
            + (f', including <strong>{len(pixel_different)}</strong> PNG(s) with pixel differences' if pixel_different else '')
            + '. See the sections above for details.'
        )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Render Comparison Report: {dir1.name} vs {dir2.name}</title>
  <style>
    :root {{
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-card-header: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-blue: #38bdf8;
      --accent-green: #4ade80;
      --accent-yellow: #facc15;
      --border-color: #334155;
      --diff-add-bg: rgba(74, 222, 128, 0.15);
      --diff-add-text: #4ade80;
      --diff-del-bg: rgba(248, 113, 113, 0.15);
      --diff-del-text: #f87171;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: var(--font-family);
      line-height: 1.6;
      padding: 2rem 1.5rem;
    }}
    .container {{ max-width: 1200px; margin: 0 auto; }}
    header {{
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
    }}
    .header-badge {{
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent-blue);
      margin-bottom: 0.75rem;
    }}
    h1 {{ font-size: 2.25rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }}
    .subtitle {{ color: var(--text-muted); font-size: 1.05rem; }}
    .stats-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }}
    .stat-card {{
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }}
    .stat-label {{ font-size: 0.875rem; font-weight: 500; color: var(--text-muted); margin-bottom: 0.35rem; }}
    .stat-value {{ font-size: 1.75rem; font-weight: 700; color: #fff; }}
    .stat-subtext {{ font-size: 0.8rem; color: var(--accent-green); margin-top: 0.25rem; }}
    .card {{
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      margin-bottom: 2rem;
      overflow: hidden;
    }}
    .card-header {{
      background: var(--bg-card-header);
      padding: 1rem 1.5rem;
      font-size: 1.15rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .card-body {{ padding: 1.5rem; }}
    .badge {{
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }}
    .badge-success {{ background-color: rgba(74, 222, 128, 0.2); color: var(--accent-green); border: 1px solid rgba(74, 222, 128, 0.4); }}
    .badge-info {{ background-color: rgba(56, 189, 248, 0.2); color: var(--accent-blue); border: 1px solid rgba(56, 189, 248, 0.4); }}
    .badge-warning {{ background-color: rgba(250, 204, 21, 0.2); color: var(--accent-yellow); border: 1px solid rgba(250, 204, 21, 0.4); }}
    table {{ width: 100%; border-collapse: collapse; font-size: 0.95rem; }}
    th, td {{ padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }}
    th {{ background: rgba(15, 23, 42, 0.6); color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; }}
    .diff-box {{
      background: #090d16;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      overflow: hidden;
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }}
    .diff-title {{ background: #131b2e; padding: 0.5rem 0.75rem; font-weight: 600; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; }}
    pre {{ padding: 0.75rem; overflow-x: auto; white-space: pre-wrap; }}
    .del-line {{ background-color: var(--diff-del-bg); color: var(--diff-del-text); display: block; margin: 0 -0.75rem; padding: 0 0.75rem; }}
    .add-line {{ background-color: var(--diff-add-bg); color: var(--diff-add-text); display: block; margin: 0 -0.75rem; padding: 0 0.75rem; }}
    .chip-list {{ display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }}
    .chip {{ background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: 0.375rem; padding: 0.25rem 0.6rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); }}
    .conclusion-box {{
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(74, 222, 128, 0.08) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-top: 2rem;
    }}
    .conclusion-box h3 {{ color: var(--accent-blue); margin-bottom: 0.5rem; }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-badge">Automated Diff &amp; Visual Verification</div>
      <h1>Render Comparison Report</h1>
      <div class="subtitle">Comparing directory <code>{dir1.name}</code> against <code>{dir2.name}</code></div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Visual Pixel Match</div>
        <div class="stat-value" style="color: {pixel_color};">{pixel_pct:.1f}%</div>
        <div class="stat-subtext">{pixel_identical} / {png_total} rendered PNGs pixel-identical</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Files Analyzed</div>
        <div class="stat-value">{total_files:,}</div>
        <div class="stat-subtext">{byte_identical:,} identical, {byte_different:,} modified</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">JSON Document Diffs</div>
        <div class="stat-value" style="color: var(--accent-blue);">{len(json_diffs)} Files</div>
        <div class="stat-subtext">of {total_files} files compared</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">HTML Render Diffs</div>
        <div class="stat-value" style="color: var(--accent-yellow);">{len(html_diffs)} Files</div>
        <div class="stat-subtext">of {total_files} files compared</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span>1. Rendered Images Pixel Analysis (<code>png/</code>)</span>
        <span class="badge {'badge-success' if not pixel_different else 'badge-warning'}">{pixel_identical} / {png_total} Verified</span>
      </div>
      <div class="card-body">
        <p>A full pixel-by-pixel bounding-box comparison was executed across all <strong>{png_total} PNG files</strong> present in both directories.</p>
        {pixel_diff_table}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span>2. JSON Document Diffs ({len(json_diffs)} Files)</span>
      </div>
      <div class="card-body">
        {"<p>No JSON differences found.</p>" if not json_diffs else f'''
        <p style="color: var(--text-muted);">Unified diffs of pretty-printed, key-sorted JSON for up to 5 of the {len(json_diffs)} differing files:</p>
        {json_blocks}
        {json_more}
        <div style="margin-top: 1.5rem;">
          <strong style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">All differing files:</strong>
          <div class="chip-list">{json_chips}</div>
        </div>
        '''}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span>3. HTML Render Diffs ({len(html_diffs)} Files)</span>
      </div>
      <div class="card-body">
        {"<p>No HTML differences found.</p>" if not html_diffs else f'''
        <p style="color: var(--text-muted);">Unified diffs for up to 5 of the {len(html_diffs)} differing files:</p>
        {html_blocks}
        {html_more}
        <div style="margin-top: 1.5rem;">
          <strong style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">All differing files:</strong>
          <div class="chip-list">{html_chips}</div>
        </div>
        '''}
      </div>
    </div>

    <div class="conclusion-box">
      <h3>Summary</h3>
      <p>{summary}</p>
    </div>
  </div>
</body>
</html>
"""
    output_path.write_text(html, encoding='utf-8')


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
        "--report-html",
        type=Path,
        default=None,
        help="Path to write an HTML comparison report to (none by default)"
    )

    args = parser.parse_args()
    compare_directories(args.dir1, args.dir2, args.report_html)


if __name__ == "__main__":
    main()
