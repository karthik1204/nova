"""Project the nine October 13 photos onto solid hero packaging.

The glass views cover the circumference with narrow blended joins. Labels use
complete, separately registered panels: text is never cut by those view joins.
This is a photographic reconstruction, not a measured 360-degree scan.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'hero-oct13'
OUT = ROOT / 'assets' / 'prepared'

# Main printed panels only, excluding slivers of neighbouring panels visible
# at the edges of the photographs. Vertical bounds follow the label curvature.
# Format: x bounds, top y (left/centre/right), bottom y, angular panel width.
LABELS = {
    'digestive': [
        ((238, 849), (479, 470, 479), (1228, 1264, 1238), 140),
        ((327, 786), (483, 475, 480), (1280, 1303, 1285), 100),
        ((241, 843), (426, 416, 428), (1263, 1287, 1263), 120),
    ],
    'immunity': [
        ((244, 839), (478, 469, 478), (1235, 1264, 1235), 140),
        ((302, 788), (441, 427, 439), (1304, 1330, 1304), 100),
        ((250, 833), (414, 400, 412), (1308, 1325, 1308), 120),
    ],
}


def sample_rgb(photo, xs, ys):
    """Subpixel sampling avoids the stair-stepped text of integer rounding."""
    xs, ys = np.broadcast_arrays(xs, ys)
    xs = np.clip(xs, 0, photo.shape[1]-2)
    ys = np.clip(ys, 0, photo.shape[0]-2)
    x0, y0 = xs.astype(int), ys.astype(int)
    dx, dy = (xs-x0)[..., None], (ys-y0)[..., None]
    return ((photo[y0, x0, :3]*(1-dx)+photo[y0, x0+1, :3]*dx)*(1-dy)
            +(photo[y0+1, x0, :3]*(1-dx)+photo[y0+1, x0+1, :3]*dx)*dy)


def label_atlas(key, width, height):
    """Lay out intact label panels with paper margins, never blended text."""
    configs = LABELS[key]
    panels, metadata = [], []
    remaining = width
    for i, (suffix, config) in enumerate(zip(('front', 'back', 'nutrition'), configs)):
        (left, right), tops, bottoms, degrees = config
        photo, _, _, _, _ = read_view(f'{key}-{suffix}')
        w = round(width*degrees/360) if i < 2 else remaining
        remaining -= w
        padding = max(12, round(w*.02))
        # Inverse projection of the WHOLE panel, not a ±60-degree slice that
        # discards the ends of lines. Paper gutters keep seams clear of text.
        theta = np.linspace(-np.pi/3, np.pi/3, w-2*padding)
        u = .5+.5*np.sin(theta)/np.sin(np.pi/3)
        xs = left+(right-left)*u
        top = np.interp(u, [0, .5, 1], tops)
        bottom = np.interp(u, [0, .5, 1], bottoms)
        v = np.linspace(0, 1, height)[:, None]
        rgb = sample_rgb(photo, xs[None, :], top[None, :]+v*(bottom-top)[None, :])
        # Sample blank paper above the text; no generated or recreated lettering.
        paper = np.median(rgb[:max(2, height//80), :, :], axis=(0, 1))
        panel = np.empty((height, w, 3), dtype=np.uint8)
        panel[:] = paper
        panel[:, padding:w-padding] = np.clip(rgb, 0, 255).astype(np.uint8)
        panels.append(panel)
        metadata.append({'photo': f'{key}-{suffix}', 'degrees': degrees,
                         'padding': padding, 'textBlend': 0})
    atlas = np.concatenate(panels, axis=1)
    # Lathe UV starts at the back (-pi); centre the complete front panel at 0.
    atlas = np.roll(atlas, width//2-panels[0].shape[1]//2, axis=1)
    return atlas, metadata


def read_view(name):
    photo = np.asarray(Image.open(SOURCE / f'{name}.png').convert('RGBA'))
    edges = []
    for row in photo:
        padded = np.r_[False, row[:, 3] > 230, False].astype(int)
        starts = np.flatnonzero(np.diff(padded) == 1)
        ends = np.flatnonzero(np.diff(padded) == -1)
        best = np.argmax(ends-starts) if len(starts) else None
        edges.append((starts[best], ends[best]-1) if best is not None else (0, 0))
    edges = np.asarray(edges)
    valid = np.flatnonzero(edges[:, 1]-edges[:, 0] > 110)
    return photo, edges, valid, int(valid[0]), int(valid[-1])


def pouch_surface(name, texture):
    photo, edges, valid, top, bottom = read_view(name)
    left, right = int(edges[valid, 0].min()), int(edges[valid, 1].max())
    # Geometry supplies the outline; opaque row-normalized textures avoid
    # transparent cutout fringes becoming black on solid faces.
    ys = np.linspace(top, bottom, 1440)
    ls = np.interp(ys, valid, edges[valid, 0])
    rs = np.interp(ys, valid, edges[valid, 1])
    xs = ls[:, None]+np.linspace(.002, .998, 1024)[None, :]*(rs-ls)[:, None]
    rgb = photo[np.rint(ys).astype(int)[:, None], np.rint(xs).astype(int), :3]
    Image.fromarray(rgb).save(OUT/f'{texture}.webp', quality=94, method=6)
    contour = [[float((np.interp(y, valid, edges[valid, 0])-left)/(right-left)),
                float((np.interp(y, valid, edges[valid, 1])-left)/(right-left))]
               for y in np.linspace(top, bottom, 81)]
    return contour, (right-left)/(bottom-top)


def build():
    models = {}
    for key in ('digestive', 'immunity'):
        width, height = 4096, 2048
        angles = np.linspace(-np.pi, np.pi, width)
        accumulated = np.zeros((height, width, 3), dtype=np.float32)
        total_weight = np.zeros(width, dtype=np.float32)
        sources = [f'{key}-front', f'{key}-back', f'{key}-nutrition']
        for view_index, (name, bearing) in enumerate(zip(sources, [0, 2*np.pi/3, -2*np.pi/3])):
            photo, edges, valid, top, bottom = read_view(name)
            ys = np.linspace(top, bottom, height)
            if view_index:
                # Register photographed label boundaries before blending glass.
                # Otherwise an old strip of rear label survives above the new
                # band because the rear photograph's label starts higher.
                ys = np.interp(np.linspace(0, 1, height),
                    [0, (LABELS[key][0][1][1]-front_top)/(front_bottom-front_top),
                     (LABELS[key][0][2][1]-front_top)/(front_bottom-front_top), 1],
                    [top, LABELS[key][view_index][1][1], LABELS[key][view_index][2][1], bottom])
            left = np.interp(ys, valid, edges[valid, 0])
            right = np.interp(ys, valid, edges[valid, 1])
            radii, centers = (right-left)/2, (right+left)/2
            delta = (angles-bearing+np.pi) % (2*np.pi)-np.pi
            weight = np.clip((np.deg2rad(68)-np.abs(delta))/np.deg2rad(16), 0, 1)
            weight = weight*weight*(3-2*weight)
            xs = np.rint(centers[:, None]+radii[:, None]*np.sin(delta)[None, :]*.996).astype(int)
            pixels = photo[np.rint(ys).astype(int)[:, None], xs, :3]
            accumulated += pixels*weight[None, :, None]
            total_weight += weight
            if name.endswith('-front'):
                front_top, front_bottom = top, bottom
                h = 6.3
                scale = h/(bottom-top)
                sample_y = np.linspace(bottom, top, 321)
                sample_r = np.interp(sample_y, ys, radii)*scale
                profile = [[round(float(r), 5), round(float((bottom-y)*scale-h/2), 5)]
                           for y, r in zip(sample_y, sample_r)]
                Image.fromarray(photo).save(OUT/f'hero-{key}-oct13-front.webp', quality=94, method=6)
        assert np.all(total_weight > 0), 'Every angle must use a supplied photo'
        wrap = np.clip(accumulated/total_weight[None, :, None], 0, 255).astype(np.uint8)
        label_top = round((LABELS[key][0][1][1]-front_top)/(front_bottom-front_top)*(height-1))
        label_bottom = round((LABELS[key][0][2][1]-front_top)/(front_bottom-front_top)*(height-1))
        atlas, panel_metadata = label_atlas(key, width, label_bottom-label_top+1)
        # Replace the entire label band. Photo blending above is for glass only.
        wrap[label_top:label_bottom+1] = atlas
        texture = f'hero-{key}-oct13-surface'
        Image.fromarray(wrap).save(OUT/f'{texture}.webp', lossless=True, method=6)
        models[key] = {'texture': texture, 'profile': profile, 'height': h,
                       'source': f'hero-{key}-oct13-front', 'photos': sources,
                       'labelMapping': 'intact-panels-v1', 'labelPanels': panel_metadata,
                       'textureSize': [width, height]}
        print(key, ': new front, rear and nutrition pictures on solid bottle')

    contour, aspect = pouch_surface('broth-front', 'hero-broth-oct13-surface')
    pouch_surface('broth-back', 'hero-broth-oct13-back')
    pouch_surface('broth-side', 'hero-broth-oct13-side')
    Image.open(SOURCE/'broth-front.png').save(OUT/'hero-broth-oct13-front.webp', quality=94, method=6)
    models['broth'] = {'texture': 'hero-broth-oct13-surface',
                       'backTexture': 'hero-broth-oct13-back',
                       'sideTexture': 'hero-broth-oct13-side',
                       'contour': contour, 'height': 6.05, 'width': 6.05*aspect,
                       'source': 'hero-broth-oct13-front',
                       'photos': ['broth-front', 'broth-side', 'broth-back']}
    for spec in models.values():
        spec['sourceHashes'] = {name: hashlib.sha256((SOURCE/f'{name}.png').read_bytes()).hexdigest()
                                for name in spec['photos']}
    (OUT/'hero-models.json').write_text(json.dumps(models), encoding='utf-8')
    print('broth: supplied front, back and side on solid tapered pouch')


if __name__ == '__main__':
    build()
