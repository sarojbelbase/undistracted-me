"""Analyze Playwright screenshots to check for visual issues in widgets."""
import struct
import zlib
import os

import os as _os
DIR = _os.path.join(_os.path.dirname(
    _os.path.abspath(__file__)), 'screenshots')


def read_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', "Not a PNG"

    # Collect IDAT chunks
    raw_data = b''
    pos = 8
    ihdr_data = None
    while pos < len(data) - 12:
        length = struct.unpack('>I', data[pos:pos+4])[0]
        ctype = data[pos+4:pos+8].decode('ascii', errors='replace')
        cdata = data[pos+8:pos+8+length]
        if ctype == 'IHDR':
            ihdr_data = cdata
        elif ctype == 'IDAT':
            raw_data += cdata
        elif ctype == 'IEND':
            break
        pos += 12 + length

    w, h = struct.unpack('>II', ihdr_data[:8])
    bit_depth = ihdr_data[8]
    color_type = ihdr_data[9]  # 2=RGB, 6=RGBA

    channels = 4 if color_type == 6 else 3
    stride = w * channels + 1

    raw = zlib.decompress(raw_data)
    rows = []
    prev_row = bytearray(w * channels)

    for y in range(h):
        offset = y * stride
        ftype = raw[offset]
        scanline = bytearray(raw[offset+1: offset+1 + w*channels])

        if ftype == 0:  # None
            pass
        elif ftype == 1:  # Sub
            for x in range(channels, len(scanline)):
                scanline[x] = (scanline[x] + scanline[x - channels]) & 0xFF
        elif ftype == 2:  # Up
            for x in range(len(scanline)):
                scanline[x] = (scanline[x] + prev_row[x]) & 0xFF
        elif ftype == 3:  # Average
            for x in range(len(scanline)):
                a = scanline[x - channels] if x >= channels else 0
                b = prev_row[x]
                scanline[x] = (scanline[x] + (a + b) // 2) & 0xFF
        elif ftype == 4:  # Paeth
            for x in range(len(scanline)):
                a = scanline[x - channels] if x >= channels else 0
                b = prev_row[x]
                c = prev_row[x - channels] if x >= channels else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                if pa <= pb and pa <= pc:
                    pr = a
                elif pb <= pc:
                    pr = b
                else:
                    pr = c
                scanline[x] = (scanline[x] + pr) & 0xFF

        rows.append(bytes(scanline))
        prev_row = scanline

    return w, h, channels, rows


def get_pixel(rows, channels, x, y):
    row = rows[y]
    px = x * channels
    return row[px], row[px+1], row[px+2]


def is_background(r, g, b, threshold=30):
    """Check if pixel looks like the dark background (~#18181b)."""
    return r < threshold and g < threshold and b < threshold


def check_edges(path, label):
    try:
        w, h, ch, rows = read_png(path)
        print(f"\n=== {label} ({w}x{h}) ===")

        # Sample right edge column
        right_x = w - 3
        non_bg_right = 0
        for y in range(0, h, 5):
            r, g, b = get_pixel(rows, ch, right_x, y)
            if not is_background(r, g, b):
                non_bg_right += 1
                print(
                    f"  Right edge y={y}: rgb({r},{g},{b}) <- non-background!")

        # Sample bottom edge row
        bot_y = h - 3
        non_bg_bot = 0
        for x in range(0, w, 5):
            r, g, b = get_pixel(rows, ch, x, bot_y)
            if not is_background(r, g, b):
                non_bg_bot += 1

        # Sample center
        cx, cy = w // 2, h // 2
        cr, cg, cb = get_pixel(rows, ch, cx, cy)
        print(f"  Center pixel: rgb({cr},{cg},{cb})")
        print(f"  Non-background pixels on right edge: {non_bg_right}")
        print(f"  Non-background pixels on bottom edge: {non_bg_bot}")

        # Check overall brightness distribution (detect if content is clipped)
        bright_right = sum(
            1 for y in range(h)
            for _ in [get_pixel(rows, ch, w-2, y)]
            if max(_) > 80
        )
        print(f"  Bright pixels on rightmost column: {bright_right}/{h}")

    except Exception as e:
        print(f"  ERROR: {e}")


# Analyze key widgets
check_edges(f'{DIR}/widget_v2_0.png', 'Clock (12h + 2 TZ)')
check_edges(f'{DIR}/widget_v2_12.png', 'Stock (3 symbols)')
check_edges(f'{DIR}/widget_0.png', 'Clock (default 24h)')
check_edges(f'{DIR}/widget_12.png', 'Stock (default single)')

print("\nDone.")
