import os
import glob
import json
from PIL import Image, ImageFilter, ImageChops

SAFE_EROSION = 20  # How many pixels to erode the paper mask
PAPER_BASE_PATH = "icons/raw/paper/paper-base.png"

def get_paper_mask():
    if not os.path.exists(PAPER_BASE_PATH):
        print(f"Error: Paper base not found at {PAPER_BASE_PATH}")
        return None
        
    paper = Image.open(PAPER_BASE_PATH).convert("RGBA")
    alpha = paper.split()[3]
    
    # Threshold alpha to get binary mask
    mask = alpha.point(lambda p: 255 if p > 50 else 0)
    
    # Erode the mask (shrink the safe area)
    # Using MinFilter simulates erosion
    eroded_mask = mask.filter(ImageFilter.MinFilter(SAFE_EROSION * 2 + 1))
    
    return eroded_mask

def check_overflow():
    paper_mask = get_paper_mask()
    if not paper_mask:
        return

    # Invert mask: White (255) = Dangerous area, Black (0) = Safe area
    # Original mask: White = Paper, Black = Background
    # Danger Map: Invert -> White = Danger
    danger_map = ImageChops.invert(paper_mask)
    
    search_path = "icons/transparent/**/*.png"
    files = glob.glob(search_path, recursive=True)
    
    overflowing_files = []
    
    print(f"Checking {len(files)} files using eroded paper mask (Erosion: {SAFE_EROSION}px)...")
    
    for file_path in files:
        try:
            img = Image.open(file_path).convert("RGBA")
            
            if img.size != danger_map.size:
                if img.size != (1024, 1024):
                    print(f"Skipping {file_path}: dimensions {img.size}")
                    continue
            
            img_alpha = img.split()[3]
            
            # Threshold icon visibility
            icon_mask = img_alpha.point(lambda p: 255 if p > 40 else 0)
            
            # Intersection: Danger Map AND Icon Mask
            overlap = ImageChops.multiply(danger_map, icon_mask)
            
            # Get extrema to see if there are any non-zero pixels
            if overlap.getextrema()[1] > 0:
                hist = overlap.histogram()
                # Sum pixels > 0
                pixel_count = sum(hist[1:])
                
                if pixel_count > 100:
                    rel_path = os.path.relpath(file_path, "icons/transparent")
                    base_dir = os.path.dirname(rel_path)
                    base_name = os.path.splitext(os.path.basename(rel_path))[0]
                    
                    possible_conf_1 = os.path.join("icons/blue", base_dir, base_name + "-blue.png.json")
                    possible_conf_2 = os.path.join("icons/blue", base_dir, base_name + ".png.json")
                    
                    target_conf = None
                    if os.path.exists(possible_conf_1):
                       target_conf = possible_conf_1
                    elif os.path.exists(possible_conf_2):
                       target_conf = possible_conf_2
                    
                    overflowing_files.append((file_path, target_conf, pixel_count))
                
        except Exception as e:
            print(f"Error checking {file_path}: {e}")

    print(f"\nFound {len(overflowing_files)} icons needing adjustment:")
    for img_path, conf_path, count in overflowing_files:
        print(f"[OVERFLOW] {img_path} ({count} pixels) -> Config: {conf_path}")
        
        if conf_path:
             update_scale(conf_path)

def update_scale(conf_path):
    try:
        with open(conf_path, 'r') as f:
            data = json.load(f)
        
        current_scale = data.get('scale', 1.0)
        new_scale = 0.8
        
        if current_scale > new_scale:
            data['scale'] = new_scale
            with open(conf_path, 'w') as f:
                json.dump(data, f, indent=4)
            print(f"  -> Updated {conf_path} to scale {new_scale}")
        else:
            print(f"  -> Skipping update, current {current_scale} <= {new_scale}")
            
    except Exception as e:
        print(f"  -> Failed: {e}")

if __name__ == "__main__":
    check_overflow()
