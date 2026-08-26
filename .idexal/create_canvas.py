"""
Computational Elegance — Canvas Artwork
A visual expression of intelligent systems, human craftsmanship, and the invisible
architectures that connect thought to creation.
"""

import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# === Canvas Setup ===
W, H = 2400, 1600
img = Image.new('RGB', (W, H), (10, 14, 26))  # Deep midnight navy
draw = ImageDraw.Draw(img)

# === Color Palette ===
VOID = (10, 14, 26)
SURFACE = (17, 24, 39)
BRAND_BLUE = (59, 130, 246)
BRAND_DARK = (37, 99, 235)
BRAND_LIGHT = (96, 165, 250)
ACCENT_PURPLE = (139, 92, 246)
ACCENT_LIGHT = (167, 139, 250)
GLOW_BLUE = (30, 58, 138)
GLOW_PURPLE = (88, 28, 135)
WHITE_DIM = (100, 116, 139)
WHITE_BRIGHT = (203, 213, 225)

random.seed(42)  # Reproducible

# === Helper Functions ===
def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

def draw_gradient_circle(draw, cx, cy, r, color_inner, color_outer, alpha_max=60):
    """Draw a radial gradient circle."""
    for i in range(r, 0, -1):
        t = 1 - (i / r)
        c = lerp_color(color_outer, color_inner, t)
        alpha = int(alpha_max * (1 - t))
        # Simulate alpha by blending with background
        blended = lerp_color(VOID, c, alpha / 255)
        draw.ellipse([cx - i, cy - i, cx + i, cy + i], fill=blended)

def draw_glow_line(draw, x1, y1, x2, y2, color, width=1, glow_radius=8):
    """Draw a line with soft glow."""
    for w in range(glow_radius, 0, -1):
        alpha_factor = 1 - (w / glow_radius)
        c = lerp_color(VOID, color, alpha_factor * 0.3)
        draw.line([x1, y1, x2, y2], fill=c, width=width + w * 2)
    draw.line([x1, y1, x2, y2], fill=color, width=width)

def draw_grid_pattern(draw, x, y, w, h, spacing=40, color=(30, 41, 59)):
    """Draw a subtle grid pattern."""
    for gx in range(x, x + w, spacing):
        draw.line([gx, y, gx, y + h], fill=color, width=1)
    for gy in range(y, y + h, spacing):
        draw.line([x, gy, x + w, gy], fill=color, width=1)

def draw_neural_node(draw, cx, cy, radius, color, intensity=1.0):
    """Draw a glowing neural network node."""
    # Outer glow
    for r in range(radius * 4, 0, -1):
        t = 1 - (r / (radius * 4))
        c = lerp_color(VOID, color, t * 0.15 * intensity)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    # Core
    for r in range(radius, 0, -1):
        t = 1 - (r / radius)
        c = lerp_color(VOID, color, t * intensity)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)

# === Background: Deep Space with Subtle Gradient ===
for y in range(H):
    t = y / H
    # Subtle vertical gradient from slightly lighter at top to deeper at bottom
    base = lerp_color((12, 16, 30), VOID, t)
    draw.line([0, y, W, y], fill=base)

# === Grid Underlay (center area) ===
grid_x, grid_y = W // 2 - 400, H // 2 - 300
draw_grid_pattern(draw, grid_x, grid_y, 800, 600, spacing=30, color=(16, 22, 36))

# === Large Background Gradient Orbs ===
draw_gradient_circle(draw, W // 2 - 300, H // 2 - 100, 350, BRAND_DARK, VOID, alpha_max=25)
draw_gradient_circle(draw, W // 2 + 200, H // 2 + 50, 280, GLOW_PURPLE, VOID, alpha_max=20)
draw_gradient_circle(draw, W // 2, H // 2, 200, ACCENT_PURPLE, VOID, alpha_max=15)

# === Neural Network Pathways ===
# Central node cluster
nodes = []
for i in range(24):
    angle = (i / 24) * 2 * math.pi
    r = random.randint(120, 380)
    nx = W // 2 + int(r * math.cos(angle + random.uniform(-0.3, 0.3)))
    ny = H // 2 + int(r * math.sin(angle + random.uniform(-0.3, 0.3)))
    nodes.append((nx, ny))

# Draw connections between nearby nodes
for i, (x1, y1) in enumerate(nodes):
    for j, (x2, y2) in enumerate(nodes):
        if i >= j:
            continue
        dist = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        if dist < 300:
            # Gradient line from blue to purple
            t = dist / 300
            c = lerp_color(BRAND_BLUE, ACCENT_PURPLE, t)
            alpha_factor = 1 - (dist / 300)
            line_color = lerp_color(VOID, c, alpha_factor * 0.5)
            draw_glow_line(draw, x1, y1, x2, y2, line_color, width=1, glow_radius=4)

# Draw nodes
for i, (nx, ny) in enumerate(nodes):
    size = random.randint(3, 8)
    intensity = random.uniform(0.5, 1.0)
    color = lerp_color(BRAND_BLUE, ACCENT_PURPLE, random.random())
    draw_neural_node(draw, nx, ny, size, color, intensity)

# === Geometric Forms: Concentric Rings ===
cx, cy = W // 2, H // 2
for r in range(60, 320, 40):
    opacity = max(5, 30 - r // 12)
    ring_color = lerp_color(BRAND_BLUE, ACCENT_PURPLE, r / 320)
    c = lerp_color(VOID, ring_color, opacity / 255)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=c, width=1)

# === Precision Markers (Clinical Typography Feel) ===
try:
    font_tiny = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 9)
    font_small = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 11)
    font_label = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 10)
except:
    font_tiny = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_label = ImageFont.load_default()

# Coordinate markers around the composition
markers = [
    (80, 60, "0x00"), (W - 100, 60, "0xFF"),
    (80, H - 80, "NEURAL"), (W - 120, H - 80, "LATTICE"),
    (W // 2 - 40, 80, "COMPUTATIONAL ELEGANCE"),
    (W // 2 - 30, H - 60, "SYSTEMATIC OBSERVATION"),
]

for mx, my, text in markers:
    draw.text((mx, my), text, fill=(40, 55, 80), font=font_tiny)

# === Data Visualization Elements (Left Side) ===
# Vertical bar chart suggesting computation
bar_x = 160
bar_base_y = H // 2 + 200
bar_heights = [45, 78, 34, 92, 56, 110, 67, 88, 42, 95, 73, 105, 38, 82, 60, 100]
for i, h in enumerate(bar_heights):
    bx = bar_x + i * 14
    color_t = i / len(bar_heights)
    c = lerp_color(BRAND_BLUE, ACCENT_PURPLE, color_t)
    bar_color = lerp_color(VOID, c, 0.6)
    draw.rectangle([bx, bar_base_y - h, bx + 10, bar_base_y], fill=bar_color)
    # Glow top
    glow_c = lerp_color(VOID, c, 0.3)
    draw.rectangle([bx, bar_base_y - h - 3, bx + 10, bar_base_y - h], fill=glow_c)

# === Data Visualization Elements (Right Side) ===
# Circular progress rings
ring_cx = W - 200
ring_cy = H // 2
for i in range(5):
    r = 30 + i * 18
    color_t = i / 5
    c = lerp_color(BRAND_BLUE, ACCENT_PURPLE, color_t)
    ring_c = lerp_color(VOID, c, 0.4)
    draw.arc([ring_cx - r, ring_cy - r, ring_cx + r, ring_cy + r],
             start=0, end=270, fill=ring_c, width=2)

# === Repeating Dot Pattern (Top Right) ===
for row in range(8):
    for col in range(12):
        dx = W - 380 + col * 20
        dy = 100 + row * 20
        dist_center = math.sqrt((col - 6) ** 2 + (row - 4) ** 2)
        if dist_center < 7:
            dot_color = lerp_color(VOID, BRAND_BLUE, max(0, 0.4 - dist_center * 0.06))
            r = max(1, int(3 - dist_center * 0.3))
            draw.ellipse([dx - r, dy - r, dx + r, dy + r], fill=dot_color)

# === Hexagonal Pattern (Bottom Left) ===
hex_cx, hex_cy = 200, H - 300
hex_size = 18
for row in range(-4, 5):
    for col in range(-3, 4):
        hx = hex_cx + col * hex_size * 1.75 + (row % 2) * hex_size * 0.875
        hy = hex_cy + row * hex_size * 1.5
        dist = math.sqrt((hx - hex_cx) ** 2 + (hy - hex_cy) ** 2)
        if dist < 160:
            c = lerp_color(VOID, ACCENT_PURPLE, max(0, 0.3 - dist * 0.002))
            # Draw hexagon outline
            points = []
            for k in range(6):
                angle = k * math.pi / 3
                px = hx + int(hex_size * 0.7 * math.cos(angle))
                py = hy + int(hex_size * 0.7 * math.sin(angle))
                points.append((px, py))
            draw.polygon(points, outline=c)

# === Central Focal Point: Large Gradient Circle ===
for r in range(120, 0, -1):
    t = 1 - (r / 120)
    # Radial gradient from bright center to transparent
    intensity = (1 - t) ** 2
    c = lerp_color(VOID, BRAND_LIGHT, intensity * 0.4)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)

# Bright core
for r in range(20, 0, -1):
    t = 1 - (r / 20)
    c = lerp_color(VOID, WHITE_BRIGHT, t * 0.6)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)

# === Scattered Precision Dots (Star Field) ===
for _ in range(200):
    sx = random.randint(50, W - 50)
    sy = random.randint(50, H - 50)
    # Avoid center cluster
    dist_center = math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2)
    if dist_center > 200:
        brightness = random.uniform(0.05, 0.2)
        c = lerp_color(VOID, WHITE_DIM, brightness)
        r = random.choice([1, 1, 1, 2])
        draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=c)

# === Flowing Arc Lines (Top) ===
for i in range(6):
    y_offset = 200 + i * 35
    points = []
    for x in range(400, W - 400, 5):
        t = (x - 400) / (W - 800)
        y = y_offset + int(30 * math.sin(t * math.pi * 2 + i * 0.5))
        points.append((x, y))
    if len(points) > 1:
        arc_color = lerp_color(VOID, BRAND_BLUE, 0.15 + i * 0.03)
        for j in range(len(points) - 1):
            draw.line([points[j], points[j + 1]], fill=arc_color, width=1)

# === Bottom Annotation Bar ===
bar_y = H - 40
draw.rectangle([0, bar_y, W, H], fill=(8, 11, 20))
draw.line([0, bar_y, W, bar_y], fill=lerp_color(VOID, BRAND_BLUE, 0.3), width=1)

annotations = [
    (40, bar_y + 12, "NEURAL.LATTICE.v3", font_tiny),
    (W // 3, bar_y + 12, "SYSTEMATIC OBSERVATION PROTOCOL", font_tiny),
    (W * 2 // 3, bar_y + 12, "COMPUTATIONAL ELEGANCE", font_tiny),
    (W - 180, bar_y + 12, "2026.08.25", font_tiny),
]

for ax, ay, text, font in annotations:
    draw.text((ax, ay), text, fill=(50, 65, 90), font=font)

# === Top Annotation Bar ===
draw.rectangle([0, 0, W, 35], fill=(8, 11, 20))
draw.line([0, 35, W, 35], fill=lerp_color(VOID, ACCENT_PURPLE, 0.3), width=1)

top_annotations = [
    (40, 12, "FIG. 1", font_small),
    (W // 2 - 120, 12, "INTELLIGENCE GEOMETRY", font_small),
    (W - 200, 12, "IDEXAL RESEARCH", font_small),
]

for ax, ay, text, font in top_annotations:
    draw.text((ax, ay), text, fill=(50, 65, 90), font=font)

# === Corner Accents ===
corner_size = 30
corner_color = lerp_color(VOID, BRAND_BLUE, 0.25)

# Top-left
draw.line([20, 50, 20, 50 + corner_size], fill=corner_color, width=1)
draw.line([20, 50, 20 + corner_size, 50], fill=corner_color, width=1)

# Top-right
draw.line([W - 20, 50, W - 20, 50 + corner_size], fill=corner_color, width=1)
draw.line([W - 20, 50, W - 20 - corner_size, 50], fill=corner_color, width=1)

# Bottom-left
draw.line([20, H - 50, 20, H - 50 - corner_size], fill=corner_color, width=1)
draw.line([20, H - 50, 20 + corner_size, H - 50], fill=corner_color, width=1)

# Bottom-right
draw.line([W - 20, H - 50, W - 20, H - 50 - corner_size], fill=corner_color, width=1)
draw.line([W - 20, H - 50, W - 20 - corner_size, H - 50], fill=corner_color, width=1)

# === Save ===
output_path = ".freebuff/computational-elegance.png"
img.save(output_path, "PNG", quality=100)
print(f"Canvas saved to {output_path}")
print(f"Dimensions: {W}x{H}")
print(f"File size: {__import__('os').path.getsize(output_path) / 1024:.1f} KB")
