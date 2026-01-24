#!/usr/bin/env python3
"""Audit the quality of blue background removal."""

import os
import sys
from pathlib import Path
from PIL import Image

def calculate_stats(blue_path, transparent_path):
    """Calculate stats to determine quality of removal."""
    try:
        if not os.path.exists(transparent_path):
            return {"status": "missing_output", "path": blue_path}
            
        img_in = Image.open(blue_path).convert("RGBA")
        img_out = Image.open(transparent_path).convert("RGBA")
        
        # Get data
        pixels_in = list(img_in.getdata())
        pixels_out = list(img_out.getdata())
        
        # Count non-transparent pixels
        opaque_in = sum(1 for p in pixels_in if p[3] > 0)
        opaque_out = sum(1 for p in pixels_out if p[3] > 0)
        
        removed_pixels = opaque_in - opaque_out
        removed_ratio = removed_pixels / opaque_in if opaque_in > 0 else 0
        
        # Check for remaining blue in output
        # Get pixels that are still opaque
        remaining_pixels = [p for p in pixels_out if p[3] > 0]
        
        if remaining_pixels:
            avg_r = sum(p[0] for p in remaining_pixels) / len(remaining_pixels)
            avg_g = sum(p[1] for p in remaining_pixels) / len(remaining_pixels)
            avg_b = sum(p[2] for p in remaining_pixels) / len(remaining_pixels)
            
            # Check if still predominantly blueish
            # e.g. Blue component is significantly higher than R and G
            is_blueish = (avg_b > avg_r * 1.05 and avg_b > avg_g * 1.05 and avg_b > 50)
        else:
            is_blueish = False
            avg_r, avg_g, avg_b = 0, 0, 0

        # Classification Logic
        if opaque_out == 0:
            status = "empty" # All pixels removed
        elif removed_ratio < 0.05:
            status = "untouched" # Very few pixels removed
        elif is_blueish:
            status = "residual_blue" # Remaining image is still very blue
        elif removed_ratio > 0.95:
             status = "suspect_overkill" # >95% removed, might be too much
        else:
            status = "good"

        return {
            "status": status,
            "path": blue_path,
            "out_path": transparent_path,
            "removed_ratio": removed_ratio,
            "avg_color": (avg_r, avg_g, avg_b)
        }
            
    except Exception as e:
        return {"status": "error", "path": blue_path, "error": str(e)}

def audit_directory(input_dir, output_dir):
    """Audit all images recursively."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    results = []

    for root, dirs, files in os.walk(input_path):
        for file in files:
            if not file.lower().endswith('.png'):
                continue
                
            abs_input_file = os.path.join(root, file)
            rel_path = os.path.relpath(abs_input_file, input_path)
            
            # Reconstruct expected output filename
            folder = os.path.dirname(rel_path)
            stem = Path(file).stem
            suffix = Path(file).suffix
             
            # Same logic as removal script
            if stem.lower().endswith("-blue"):
                 new_filename = stem[:-5] + suffix
            elif stem.lower().endswith("blue"):
                 new_filename = stem[:-4] + suffix
            elif stem.lower().startswith("blue-"):
                 new_filename = stem[5:] + suffix
            else:
                new_filename = file
                
            abs_output_file = os.path.join(output_path, folder, new_filename)
            
            stats = calculate_stats(abs_input_file, abs_output_file)
            stats["name"] = new_filename
            results.append(stats)
            
    return results

def generate_report(results):
    """Generate Markdown report."""
    categories = {
        "good": [],
        "residual_blue": [],
        "untouched": [],
        "empty": [],
        "suspect_overkill": [],
        "error": []
    }
    
    for r in results:
        cat = r["status"]
        if cat in categories:
            categories[cat].append(r)
        else:
             if "error" not in categories: categories["error"] = []
             categories["error"].append(r)
             
    print("# Blue Removal Audit Report\n")
    
    print("## Summary")
    for cat, items in categories.items():
        print(f"- **{cat}**: {len(items)} images")
    print("\n")
    
    # Priority for User Attention
    attention_cats = ["residual_blue", "untouched", "empty", "suspect_overkill", "error"]
    
    print("## Attention Required")
    for cat in attention_cats:
        items = categories[cat]
        if not items:
            continue
            
        description = ""
        if cat == "residual_blue": description = "The output still appears to be blue-tinted. Thresholds might be too low."
        if cat == "untouched": description = "Less than 5% of the image was removed. Thresholds might be too strict (high)."
        if cat == "empty": description = "The entire image was removed. Thresholds might be too loose (low)."
        if cat == "suspect_overkill": description = "More than 95% of the image was removed. Likely destroyed the icon."
        if cat == "error": description = "Processing errors."
        
        print(f"### {cat.replace('_', ' ').title()} ({len(items)})")
        print(f"_{description}_\n")
        
        for item in items:
            print(f"- `{item['name']}` ({item['path']})")
            if "removed_ratio" in item:
                print(f"  - Removed: {item['removed_ratio']*100:.1f}%")
            if "avg_color" in item:
                r,g,b = item['avg_color']
                print(f"  - Avg Remnant Color: R{r:.0f} G{g:.0f} B{b:.0f}")
        print("\n")
        
    print("## Likely Good")
    if categories["good"]:
        print(f"{len(categories['good'])} images appear to have been processed reasonably.\n")
        # List first 10 examples
        for item in categories["good"][:10]:
             print(f"- `{item['name']}`")
        if len(categories["good"]) > 10:
             print(f"- ... and {len(categories['good']) - 10} more.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", type=str, default="icons/blue")
    parser.add_argument("--output", "-o", type=str, default="icons/transparent")
    args = parser.parse_args()
    
    results = audit_directory(args.input, args.output)
    generate_report(results)
