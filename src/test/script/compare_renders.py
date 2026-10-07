#!/usr/bin/env python3
"""
Render Directory Comparison Tool

Compares the PNG files of two IMSC render directories (e.g. renders-imsc1 and
renders-old-1):
  1. PNG file tree & count validation (other file types are ignored)
  2. Pixel-by-pixel image verification using PIL, reporting a pair as
     different only if its mean squared error (MSE) exceeds a threshold
     (default 500)
  3. Markdown comparison report generation, with per-file side-by-side PNG
     images (dir 1 on the left, dir 2 on the right) written alongside the
     report
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:
    print("Warning: PIL not found. Pixel-level PNG comparison will be skipped.")
    Image = None
    ImageChops = None


def _flatten_name(rel: Path) -> str:
    """Turns a relative path into a filesystem-safe flat name, e.g.
    'a/b/c.png' -> 'a__b__c.png'."""
    return str(rel).replace('/', '__').replace('\\', '__')


def _mse(diff):
    """Returns the mean squared error over all channels, given the absolute
    difference image of two RGB images."""
    hist = diff.histogram()
    sq_sum = sum(count * (i % 256) ** 2 for i, count in enumerate(hist))
    return sq_sum / (diff.width * diff.height * len(diff.getbands()))


def _side_by_side(im1, im2, gap=8):
    """Returns an image with im1 on the left and im2 on the right, separated by a
    gap, top-aligned."""
    out = Image.new('RGB', (im1.width + gap + im2.width, max(im1.height, im2.height)), (255, 0, 255))
    out.paste(im1, (0, 0))
    out.paste(im2, (im1.width + gap, 0))
    return out


def compare_directories(dir1: Path, dir2: Path, report_dir: Path, mse_threshold: float = 500.0):
    print(f"Comparing:")
    print(f"  Directory 1: {dir1}")
    print(f"  Directory 2: {dir2}")
    print(f"  MSE threshold: {mse_threshold}\n")

    if not dir1.exists() or not dir2.exists():
        print(f"Error: One or both directories do not exist.")
        sys.exit(1)

    if Image is None:
        print("Error: PIL is required to compare PNG files.")
        sys.exit(1)

    def find_pngs(d: Path):
        return {p.relative_to(d) for p in d.rglob('*') if p.is_file() and p.suffix.lower() == '.png'}

    files1 = find_pngs(dir1)
    files2 = find_pngs(dir2)

    only_in_1 = sorted(files1 - files2)
    only_in_2 = sorted(files2 - files1)
    png_files = sorted(files1 & files2)

    print(f"=== PNG File Summary ===")
    print(f"PNG files in Dir 1: {len(files1)}")
    print(f"PNG files in Dir 2: {len(files2)}")
    print(f"Common PNG files:   {len(png_files)}")
    if only_in_1:
        print(f"Only in Dir 1 ({len(only_in_1)}): {only_in_1[:5]}...")
    if only_in_2:
        print(f"Only in Dir 2 ({len(only_in_2)}): {only_in_2[:5]}...")

    report_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n=== PNG Pixel Comparison ({len(png_files)} files) ===")
    pixel_identical = 0
    # files that differ, but with an MSE no greater than the threshold
    within_threshold = 0
    # Each entry: (rel_path, reason, side_by_side_image_relpath)
    pixel_different = []

    for p in png_files:
        # the alpha channel is ignored: for RGBA images, getbbox() only considers alpha, which
        # would report fully opaque images as identical regardless of their colors
        im1 = Image.open(dir1 / p).convert('RGB')
        im2 = Image.open(dir2 / p).convert('RGB')

        if im1.size != im2.size:
            reason = f"Dimension mismatch: {im1.size} vs {im2.size}"
        else:
            diff = ImageChops.difference(im1, im2)
            bbox = diff.getbbox()
            if bbox is None:
                pixel_identical += 1
                continue
            mse = _mse(diff)
            if mse <= mse_threshold:
                within_threshold += 1
                continue
            reason = f"MSE {mse:.4f}; non-zero bounding box diff: {bbox}"

        image_filename = f"{_flatten_name(p)}.side-by-side.png"
        _side_by_side(im1, im2).save(report_dir / image_filename)
        pixel_different.append((p, reason, image_filename))

    if png_files:
        print(f"Pixel Identical: {pixel_identical} / {len(png_files)} ({pixel_identical/len(png_files)*100:.1f}%)")
    if mse_threshold > 0:
        print(f"Different but within MSE threshold: {within_threshold}")
    print(f"Pixel Different: {len(pixel_different)}")
    for p, reason, _ in pixel_different[:10]:
        print(f"  - {p}: {reason}")

    report_path = generate_markdown_report(
        dir1=dir1,
        dir2=dir2,
        report_dir=report_dir,
        png_total=len(png_files),
        pixel_identical=pixel_identical,
        within_threshold=within_threshold,
        mse_threshold=mse_threshold,
        pixel_different=pixel_different,
        only_in_1=only_in_1,
        only_in_2=only_in_2,
    )
    print(f"\nMarkdown report successfully written to: {report_path}")


def generate_markdown_report(dir1, dir2, report_dir, png_total, pixel_identical, within_threshold,
                              mse_threshold, pixel_different, only_in_1, only_in_2):
    """Generates a Markdown comparison report reflecting the PNG differences
    found between dir1 and dir2, writing it to report_dir / 'report.md'. side-by-side
    PNG images are written as separate files into report_dir and linked to
    from the report. Returns the path to the written report."""

    output_path = report_dir / "report.md"
    pixel_pct = (pixel_identical / png_total * 100) if png_total else 100.0

    if not pixel_different and not only_in_1 and not only_in_2:
        summary = (
            f"The PNG renders in `{dir1.name}` and `{dir2.name}` match "
            f"(MSE <= {mse_threshold}) across all {png_total} compared files."
        )
    else:
        summary = (
            f"**{len(pixel_different)}** of **{png_total}** compared PNGs exceed an MSE of {mse_threshold} between "
            f"`{dir1.name}` and `{dir2.name}`"
            + (f"; **{len(only_in_1) + len(only_in_2)}** PNG(s) exist in only one directory" if only_in_1 or only_in_2 else "")
            + ". See the sections below for details."
        )

    lines = []
    lines.append(f"# Render Comparison Report: {dir1.name} vs {dir2.name}")
    lines.append("")
    lines.append(f"Comparing PNG files in `{dir1}` against `{dir2}`.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- PNG files compared: **{png_total}**")
    lines.append(f"- PNG pixel-identical: **{pixel_identical} / {png_total}** ({pixel_pct:.1f}%)")
    lines.append(f"- MSE threshold: **{mse_threshold}**")
    lines.append(f"- PNG different but within MSE threshold: **{within_threshold}**")
    lines.append(f"- PNG exceeding MSE threshold: **{len(pixel_different)}**")
    lines.append(f"- PNG only in `{dir1.name}`: **{len(only_in_1)}**")
    lines.append(f"- PNG only in `{dir2.name}`: **{len(only_in_2)}**")
    lines.append("")

    lines.append(f"## 1. Rendered Images Pixel Analysis (PNG) — {len(pixel_different)} / {png_total} exceed MSE threshold {mse_threshold}")
    lines.append("")
    if not pixel_different:
        lines.append("No differences exceeding the MSE threshold found.")
    else:
        lines.append(f"| File | Side by Side (left: `{dir1.name}`, right: `{dir2.name}`) | Notes |")
        lines.append("|---|---|---|")
        for rel, reason, image_relpath in pixel_different:
            lines.append(f"| `{rel}` | ![{rel}]({image_relpath}) | {reason} |")
    lines.append("")

    for title, files in ((f"Only in `{dir1.name}`", only_in_1), (f"Only in `{dir2.name}`", only_in_2)):
        if files:
            lines.append(f"## {title} ({len(files)} files)")
            lines.append("")
            lines.extend(f"- `{rel}`" for rel in files)
            lines.append("")

    lines.append("## Conclusion")
    lines.append("")
    lines.append(summary)
    lines.append("")

    output_path.write_text("\n".join(lines), encoding='utf-8')
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Compare the PNG files of two render directories.")
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
             "along with the side-by-side PNG images it links to. "
             "Created if it does not already exist."
    )

    parser.add_argument(
        "--mse-threshold",
        type=float,
        default=500.0,
        help="Mean squared error (averaged over RGB channels, 0-65025) above which a PNG pair "
             "is reported as different. Default: 500. Use 0 to report any pixel difference."
    )

    args = parser.parse_args()
    compare_directories(args.dir1, args.dir2, args.report_dir, args.mse_threshold)


if __name__ == "__main__":
    main()
