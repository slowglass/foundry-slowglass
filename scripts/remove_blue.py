#!/usr/bin/env python3
"""Remove blue background from paper image using chroma key."""

import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image

def remove_blue_background(input_path, output_path, config):
    """Remove blue background and make it transparent based on config."""
    print(f"Processing {input_path} -> {output_path}")
    
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

def get_config_for_file(file_path):
    """Load config from .json file if exists, otherwise return defaults."""
    config_path = f"{file_path}.json"
    default_config = {
        "blue_threshold": 60,
        "blue_ratio": 1.1,
        "dark_blue_min": 40,
        "dark_component_max": 80
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

def process_directory(input_dir, output_dir, file_pattern="*.png"):
    """Recursively process images in directory."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    if not input_path.exists():
        print(f"Input directory {input_dir} does not exist")
        return

    # Walk through all files
    for root, dirs, files in os.walk(input_path):
        for file in files:
            if not file.lower().endswith('.png'):
                continue
                
            # Calculate input and output paths
            abs_input_file = os.path.join(root, file)
            rel_path = os.path.relpath(abs_input_file, input_path)
            
            # Transform filename: remove "blue" (case-insensitive)
            # handle both "name-blue.png" -> "name.png" and "blue-thing.png" -> "thing.png"
            new_filename = file
            stem = Path(file).stem
            suffix = Path(file).suffix
            
            if stem.lower().endswith("-blue"):
                 new_filename = stem[:-5] + suffix
            elif stem.lower().endswith("blue"): # catch cases without hyphen if any
                 new_filename = stem[:-4] + suffix
            elif stem.lower().startswith("blue-"):
                 new_filename = stem[5:] + suffix
            
            # Construct output path preserving directory structure
            # rel_dir is the subpath inside input_dir (excluding filename)
            rel_dir = os.path.dirname(rel_path)
            output_file_path = os.path.join(output_path, rel_dir, new_filename)
            
            # Process the file
            config = get_config_for_file(abs_input_file)
            remove_blue_background(abs_input_file, output_file_path, config)

def main():
    parser = argparse.ArgumentParser(description="Remove blue background from images.")
    parser.add_argument("--input", "-i", type=str, default="icons/blue", help="Input directory")
    parser.add_argument("--output", "-o", type=str, default="icons/transparent", help="Output directory")
    
    args = parser.parse_args()
    
    process_directory(args.input, args.output)

if __name__ == "__main__":
    main()
