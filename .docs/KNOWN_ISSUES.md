# Known Issues

Non-blocking, browser-level rendering quirks we've observed but chosen not to
"fix" in app code (either because the root cause is outside our control, or a
workaround would be worse than the symptom).

---

## Glass-mode flicker on window resize (backdrop-filter GPU re-rasterization)

**Status:** Mitigated. Blur reduced `28px` → `20px`. Root cause is a browser-level
compositing artifact, not an app-logic bug — the smaller radius cuts the
re-rasterization cost without changing the frosted look.

### Symptom

In **glass** card style (`cardStyle: "glass"`), resizing the window — especially
crossing a breakpoint, and sometimes at the default 1920px width — causes a brief
flicker/glitch at the **top or bottom edge** of the extension. It looks like a
re-render or a flash of the wrong background for a frame or two, then settles.

### Where

Every widget card applies a frosted-glass effect in
`src/widgets/BaseWidget.jsx` (and every modal/panel via `--card-blur`):

```scss
/* src/styles/_tokens.scss */
--card-bg: rgba(255, 255, 255, 0.44);
--card-blur: blur(28px) saturate(180%);
--card-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.9), /* top inset highlight */
  0 8px 32px rgba(0, 0, 0, 0.1),
  0 1px 4px rgba(0, 0, 0, 0.06);
```

`backdrop-filter` is applied on the card body in `BaseWidget.jsx:124` plus the
three-dots button (`:152`) and the resize handle (`:196`). The same token drives
Focus Mode cards (`src/components/FocusMode/theme.jsx` → `FM_CARD_BLUR`) and
modals/panels/popovers throughout.

### Root cause

`backdrop-filter` forces the browser to promote the element to its own GPU
compositor layer and **sample the backdrop** (everything behind it — the canvas
background image/orb) into a texture, then blur it. When the viewport resizes:

1. Chromium re-rasterizes the backdrop texture every frame during the resize.
2. During those frames the sampled backdrop briefly mismatches the card's
   current geometry/position — most visible at the **top and bottom edges**,
   where `border-radius` and the `inset 0 1px 0 rgba(255,255,255,0.9)` top
   highlight meet the re-sampled blur.
3. It's intermittent because it's a GPU/rasterization path, not a DOM/state path:

   - **No flicker with GPU rasterization healthy.**
   - **Flicker when GPU rasterization falls back** to SwiftShader/software, or
     when the GL context is lost/reset mid-resize (the `libGL` / ANGLE / OpenGL
     render error you'd see in `chrome://gpu` or the console on Linux, or on
     laptops with switchable graphics). This is why it "sometimes" happens and
     feels like a driver issue — it partly is.

### What it is NOT (ruled out)

- **Not a React re-render** — `WidgetCell` is `React.memo`'d; widgets don't
  re-render on resize (verified with MutationObserver during a resize).
- **Not the RGL transition** — `_react-grid.scss` already sets
  `transition: none !important` on grid items.
- **Not Focus Mode / the "focus area"** — the flicker occurs on the canvas view;
  Focus Mode has its own `FM_CARD_BLUR` and the two views don't overlap.
- **Not the breakpoint transient** — that was a *separate* bug (RGL keeping stale
  `cols` state → widgets flashing off-screen at `left:1230px` during a
  breakpoint crossing), already fixed in `WidgetGrid.jsx` via
  `debounceTimeout: 120` + `key={currentBp}` remount.

### Confirm it's the GPU path

- `chrome://gpu` → check "Rasterization" and GL renderer; "GL ERROR" or
  SwiftShader fallback confirms it.
- Launch with `--disable-gpu` (or disable "Use hardware acceleration when
  available" in Settings → System) and resize.

### Verified (A/B test, headed Chromium on Apple M2 Pro)

Ran the same resize sequence (1920 → 900 → 1280 → … crossing the `lg`/`md`/`sm`
breakpoints) in glass mode twice, capturing the compositor output via CDP
screencast:

| Mode | Renderer | Compositing | Frames captured | Result |
|------|----------|-------------|-----------------|--------|
| default | ANGLE Metal (Apple M2 Pro) | `gpu_compositing: enabled` | **229** (~60 fps) | smooth; small frame-to-frame deltas |
| `--disable-gpu` | SwiftShader (software) | `gpu_compositing: disabled_software` | **8** (~4 fps) | choppy; frame deltas up to **234** (mean abs) in the bottom card band |

**Conclusion:** the glitch does **not** disappear without GPU — it gets worse.
Software (SwiftShader) compositing can only re-rasterize the `backdrop-filter`
blur at ~4 fps during resize, so the card edges jump coarsely instead of
flickering subtly. This confirms the root cause is the **`backdrop-filter`
re-rasterization cost during resize**, not app logic and not a GL context
error/crash (GPU mode ran clean at 60 fps).

Caveats: tested with discrete `setViewportSize` jumps (breakpoint-crossing
relayout), not a continuous window-drag; frames compared via pixel-diff metrics
rather than visual inspection.

### Resolution (applied)

Kept `backdrop-filter` and the original frosted look; reduced the blur radius
from `blur(28px)` → `blur(20px)` (at the `animation-performance` skill's 20px
jank threshold, not below) in all glass profiles — `--card-blur` (glass
light/dark) and `--fm-card-blur` (focus) in `src/theme/profiles.js`, plus the
default in `src/styles/_tokens.scss`. Saturation/brightness/contrast unchanged.

A gradient edge-fade (Josh Comeau's "flickering top" mask) was tried and
**reverted** — it visibly changed the card look, which wasn't an acceptable
tradeoff.

### Remaining options (not applied — kept open)

- **Add `will-change: backdrop-filter`** (or `transform: translateZ(0)`) to card
  bodies to keep them on stable layers — may help on some drivers, no-op on others.
- **Suppress backdrop-filter during resize** — a resize handler toggles a
  `.is-resizing` class that sets `backdrop-filter: none` until the resize settles
  (debounced ~150ms), then restores it. Removes the glitch entirely but costs a
  brief "solid card" flash instead.
- **Flatten the background** under glass cards (render the blurred backdrop once
  as an image instead of per-card `backdrop-filter`) — the "correct" fix but a
  large refactor.

### Environment notes

- Chrome / Edge / Brave (Chromium): ANGLE over OpenGL (`libGL`) or Metal/D3D.
- Firefox: WebRender — similar `backdrop-filter` re-rasterization, usually less
  visible.
- The canvas background is either a curated image (`bg.webp`) or the animated
  Orb background (`OrbBackground.jsx`), both of which make the backdrop sampling
  more expensive than a flat color.
