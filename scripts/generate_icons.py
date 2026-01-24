#!/usr/bin/env python3
"""Generate transparent and paper-backed icons from blue-background images."""

import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image

PAPER_BASE_PATH = "icons/raw/paper/paper-base.png"

def remove_blue_background(input_path, output_path, config):
    """Remove blue background and save to output_path."""
    print(f"Processing transparent: {input_path} -> {output_path}")
    
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    blue_threshold = config.get("blue_threshold", 60)
    blue_ratio = config.get("blue_ratio", 1.1)
    
    # Shadow/Dark blue detection parameters
    dark_blue_min = config.get("dark_blue_min", 40)
    dark_component_max = config.get("dark_component_max", 80)
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Check if pixel is predominantly blue or has strong blue component
            is_blue = b > blue_threshold and b > r * blue_ratio and b > g * blue_ratio
            
            # Also catch shadow areas with blue tint
            is_dark_blue = (b > dark_blue_min and 
                          r < dark_component_max and 
                          g < dark_component_max and 
                          b > r and b > g)
                          
            if is_blue or is_dark_blue:
                # Make transparent
                pixels[x, y] = (r, g, b, 0)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    return img

def create_paper_icon(transparent_img, output_path, config):
    """Create paper-backed icon using transparent image."""
    print(f"Processing paper: -> {output_path}")
    
    if not os.path.exists(PAPER_BASE_PATH):
        print(f"Warning: Paper base not found at {PAPER_BASE_PATH}")
        return

    paper_base = Image.open(PAPER_BASE_PATH).convert("RGBA")
    
    # Resize paper base if dimensions don't match (though they should be 1024x1024)
    if paper_base.size != transparent_img.size:
        paper_base = paper_base.resize(transparent_img.size)

    # Create a copy of the transparent image to adjust alpha
    foreground = transparent_img.copy()
    
    # Resize foreground based on scale parameter
    scale = config.get("scale", 1.0)
    if scale != 1.0:
        new_width = int(foreground.width * scale)
        new_height = int(foreground.height * scale)
        foreground = foreground.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create a canvas of the paper size to center the resized foreground
    canvas = Image.new("RGBA", paper_base.size, (0, 0, 0, 0))
    
    # Calculate centering position
    x_offset = (paper_base.width - foreground.width) // 2
    y_offset = (paper_base.height - foreground.height) // 2
    
    # Paste resized foreground onto canvas
    canvas.paste(foreground, (x_offset, y_offset))
    foreground = canvas

    # Apply global alpha to the foreground
    paper_alpha = config.get("paper_alpha", 0.8)
    
    # Get alpha data
    data = foreground.getdata()
    new_data = []
    for item in data:
        # Scale alpha channel
        new_data.append((item[0], item[1], item[2], int(item[3] * paper_alpha)))
    foreground.putdata(new_data)
    
    # Composite foreground onto paper base
    # Alpha composite requires both images to be RGBA and same size
    combined = Image.alpha_composite(paper_base, foreground)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    combined.save(output_path, "PNG")


def get_config_for_file(file_path):
    """Load config from .json file if exists, otherwise return defaults."""
    config_path = f"{file_path}.json"
    default_config = {
        "blue_threshold": 60,
        "blue_ratio": 1.1,
        "dark_blue_min": 40,
        "dark_component_max": 80,
        "paper_alpha": 0.6,
        "scale": 1.0
    }
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                saved_config = json.load(f)
                # Merge with defaults to ensure all keys exist
                return {**default_config, **saved_config}
        except Exception as e:
            print(f"Error reading config {config_path}: {e}")
            return default_config
    
    # Save default config if none exists
    try:
        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=4)
        print(f"Created config for {file_path}")
    except Exception as e:
        print(f"Error creating config {config_path}: {e}")
        
    return default_config

def process_directory(input_dir, transparent_dir, paper_dir):
    """Recursively process images."""
    input_path = Path(input_dir)
    transparent_path = Path(transparent_dir)
    paper_path = Path(paper_dir)
    
    if not input_path.exists():
        print(f"Input directory {input_dir} does not exist")
        return

    # Walk through all files
    for root, dirs, files in os.walk(input_path):
        for file in files:
            file_lower = file.lower()
            if not (file_lower.endswith('.png') or file_lower.endswith('.jpg') or file_lower.endswith('.jpeg')):
                continue
                
            # Calculate input and output paths
            abs_input_file = os.path.join(root, file)
            rel_path = os.path.relpath(abs_input_file, input_path)
            
            # Transform filename: remove "blue"
            new_filename = file
            stem = Path(file).stem
            suffix = Path(file).suffix
            
            # Handle JPG inputs by changing suffix to png for output
            output_suffix = ".png"
            
            if stem.lower().endswith("-blue"):
                 new_stem = stem[:-5]
            elif stem.lower().endswith("blue"):
                 new_stem = stem[:-4]
            elif stem.lower().startswith("blue-"):
                 new_stem = stem[5:]
            else:
                 new_stem = stem
                 
            new_filename = new_stem + output_suffix
            
            # Construct output paths
            rel_dir = os.path.dirname(rel_path)
            transparent_file_path = os.path.join(transparent_path, rel_dir, new_filename)
            paper_file_path = os.path.join(paper_path, rel_dir, new_filename)
            
            # Process the file
            config = get_config_for_file(abs_input_file)
            config_path = f"{abs_input_file}.json"
            
            # --- 1. Generate Transparent Icon ---
            should_gen_transparent = True
            if os.path.exists(transparent_file_path):
                input_mtime = os.path.getmtime(abs_input_file)
                output_mtime = os.path.getmtime(transparent_file_path)
                config_mtime = os.path.getmtime(config_path) if os.path.exists(config_path) else 0
                
                if output_mtime > input_mtime and output_mtime > config_mtime:
                     should_gen_transparent = False
            
            if should_gen_transparent:
                transparent_img = remove_blue_background(abs_input_file, transparent_file_path, config)
            else:
                # Load existing image for next step
                transparent_img = Image.open(transparent_file_path).convert("RGBA")

            # --- 2. Generate Paper Icon ---
            should_gen_paper = True
            if os.path.exists(paper_file_path):
                 # Dependencies: transparent icon and paper base
                 trans_mtime = os.path.getmtime(transparent_file_path)
                 paper_base_mtime = os.path.getmtime(PAPER_BASE_PATH) if os.path.exists(PAPER_BASE_PATH) else 0
                 paper_out_mtime = os.path.getmtime(paper_file_path)
                 
                 # Note: If transparent was rebuilt, trans_mtime is NOW, so paper_out_mtime < trans_mtime -> rebuild.
                 # If transparent was skipped, trans_mtime is OLD. 
                 
                 if paper_out_mtime > trans_mtime and paper_out_mtime > paper_base_mtime:
                      should_gen_paper = False

            if should_gen_paper:
                create_paper_icon(transparent_img, paper_file_path, config)

def main():
    parser = argparse.ArgumentParser(description="Generate transparent and paper icons.")
    parser.add_argument("--input", "-i", type=str, default="icons/blue", help="Input directory")
    parser.add_argument("--transparent", "-t", type=str, default="icons/transparent", help="Transparent Output directory")
    parser.add_argument("--paper", "-p", type=str, default="icons/paper", help="Paper Output directory")
    
    args = parser.parse_args()
    
    process_directory(args.input, args.transparent, args.paper)

if __name__ == "__main__":
    main()
