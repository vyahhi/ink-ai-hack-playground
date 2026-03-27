#!/usr/bin/env python3
"""Generate a visualization for the InkSight slide.

Shows the offline-to-online concept: a rasterized word on top,
extracted stroke points on the bottom, with an arrow between.
"""

import sys
import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch

sys.path.insert(0, '/Users/dok/src/master6/ink-ai-multi-user-cursive-transformer')

from bezier_tokenization.convert_dataset import load_raw_dataset, preprocess_entry

DATASET = '/Users/dok/src/master6/ink-ai-multi-user-cursive-transformer/jiwon_combined_data_fixed_1_dash_v3_2_dist_spacing.json.zip'
TARGET_WORD = 'hello'
OUTPUT = os.path.join(os.path.dirname(__file__), 'assets', 'inksight-viz.png')
SEED = 42

STROKE_COLOR = '#1a2744'
POINT_COLOR = '#3366cc'
BG_COLOR = '#fafaf7'
RASTER_COLOR = '#1a2744'


def get_strokes(points):
    strokes = []
    i = 0
    while i < len(points):
        if points[i, 2] == 1:
            j = i
            while j < len(points) and points[j, 2] == 1:
                j += 1
            strokes.append(points[i:j])
            i = j
        else:
            i += 1
    return strokes


def main():
    print('Loading dataset...')
    data = load_raw_dataset(DATASET, max_entries=5000, seed=SEED)

    candidates = [
        item for item in data
        if item.get('metadata', {}).get('asciiSequence', '').lower() == TARGET_WORD
    ]
    if not candidates:
        print(f'Word "{TARGET_WORD}" not found')
        sys.exit(1)

    item = candidates[0]
    points = preprocess_entry(item)
    strokes = get_strokes(points)

    all_x = points[points[:, 2] == 1, 0]
    all_y = -points[points[:, 2] == 1, 1]
    x_margin = (all_x.max() - all_x.min()) * 0.08
    y_margin = (all_y.max() - all_y.min()) * 0.25
    xlim = (all_x.min() - x_margin, all_x.max() + x_margin)
    ylim = (all_y.min() - y_margin, all_y.max() + y_margin)

    # Create figure with 3 rows: raster, arrow, strokes
    fig, (ax1, ax2, ax3) = plt.subplots(
        3, 1,
        figsize=(6, 7.5),
        dpi=200,
        facecolor=BG_COLOR,
        gridspec_kw={'height_ratios': [3, 1, 3]},
    )

    for ax in (ax1, ax3):
        ax.set_facecolor(BG_COLOR)
        ax.set_xlim(xlim)
        ax.set_ylim(ylim)
        ax.set_aspect('equal')
        ax.axis('off')

    # --- Row 1: Rasterized (thick strokes simulating a bitmap look) ---
    ax1.set_title('Offline (image)', fontsize=11, fontweight='bold', color=STROKE_COLOR, pad=8)
    for stroke in strokes:
        ax1.plot(stroke[:, 0], -stroke[:, 1], color=RASTER_COLOR, linewidth=4.0,
                 solid_capstyle='round', solid_joinstyle='round')

    # --- Row 2: Arrow ---
    ax2.set_facecolor(BG_COLOR)
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.axis('off')
    ax2.annotate(
        '', xy=(0.5, 0.1), xytext=(0.5, 0.9),
        arrowprops=dict(
            arrowstyle='->', color='#888888',
            lw=2.0, mutation_scale=20,
        ),
    )
    ax2.text(0.5, 0.55, 'InkSight', ha='center', va='center',
             fontsize=10, fontstyle='italic', color='#888888')

    # --- Row 3: Extracted strokes with points ---
    ax3.set_title('Online (strokes)', fontsize=11, fontweight='bold', color=STROKE_COLOR, pad=8)
    for stroke in strokes:
        ax3.plot(stroke[:, 0], -stroke[:, 1], color=POINT_COLOR, linewidth=1.5)
        # Show sample points
        sparse = stroke[::3]
        ax3.plot(sparse[:, 0], -sparse[:, 1], 'o', color=POINT_COLOR,
                 markersize=2, markeredgewidth=0)

    plt.subplots_adjust(hspace=0.05, top=0.95, bottom=0.02, left=0.02, right=0.98)

    # Save and add transparent gaps
    from io import BytesIO
    from PIL import Image

    buf = BytesIO()
    fig.savefig(buf, format='png', facecolor=BG_COLOR, bbox_inches='tight')
    plt.close()
    buf.seek(0)
    img = Image.open(buf).convert('RGBA')

    # Add transparent gaps between the 3 sections
    w, h = img.size
    row_h = h // 3
    row1 = img.crop((0, 0, w, row_h))
    row2 = img.crop((0, row_h, w, 2 * row_h))
    row3 = img.crop((0, 2 * row_h, w, h))

    gap = 10
    new_h = h + 2 * gap
    composite = Image.new('RGBA', (w, new_h), (0, 0, 0, 0))
    composite.paste(row1, (0, 0))
    composite.paste(row2, (0, row_h + gap))
    composite.paste(row3, (0, 2 * row_h + 2 * gap))

    composite.save(OUTPUT)
    print(f'Saved to {OUTPUT}')


if __name__ == '__main__':
    main()
