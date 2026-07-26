# Drawbridge — Premium Animation Overhaul (Vanilla JS + Motion One)

## Context correction (so we're aligned)
The brief assumed React/Vite/`motion/react` and a "road safety" company. The real repo is **48 static HTML pages** for a **software-dev agency**, with zero build step. Per your decisions: **Vanilla JS + Motion One**, **keep the real Drawbridge identity** (software studio, TE-style orange canvas), **full redesign on index.html + global system inherited by all 48 pages**. SEO (48 canonical URLs, JSON-LD, sitemap, hreflang, 19 city pages) is preserved untouched.

> ⚠️ **Honesty note on Motion One:** `motion/react` hooks (`useScroll`, `useTransform`, `useSpring`, `LazyMotion`, `variants`) are React-only and have **no vanilla equivalent**. Motion One's vanilla API gives us `animate()`, `spring()`/`inView()`/`stagger()`/`scroll()` helpers, and `timeline()`. I'll honor the *spirit* of the brief (every effect it lists) but the API calls will be Motion One's DOM API, not the React hooks. Where Motion One lacks a primitive (e.g. `useMotionValue`-style reactive values), I'll use native `requestAnimationFrame` + `IntersectionObserver` + Web Animations API. I'll say so in code comments rather than silently faking it.

---

## Phase 0 — Foundation & motion tokens (global, all 48 pages)
**Files:** `styles.css` (edit `:root` L1–16), add new `assets/js/motion.js`, add `<script>` tags to all 48 pages' `<head>`/end-of-body.

1. **Extend design tokens** in `styles.css :root`: add `--dur-fast/med/slow`, `--ease-out/exp/in-out`, `--ease-spring` (spring-like cubic-bezier), `--glow-orange`, `--glass-bg`, `--glass-border`. Reuse existing `--te-orange: #ff6600` and `--outQuart`.
2. **Add Motion One** via ESM CDN import (motionone.dev, ~3.5 KB gzip, tree-shakeable) inside the new `motion.js` — no npm/build needed. Gate behind a single dynamic `import()` so pages that fail to load CDN still work (graceful no-op).
3. **Create `assets/js/motion.js`** — the reusable harness (the brief's "reusable hooks/variants" goal, vanilla-ized):
   - `prefersReducedMotion()` helper → JS guard (currently missing; the CSS guard at L2659 doesn't stop the JS RAF loops).
   - `revealOnScroll()` — unified IntersectionObserver replacing the **two duplicated** observers (`script.js:66-83` `.is-visible` + `ux-enhancements.js:49-74` `.revealed`). Supports stagger via `data-stagger` + child selectors.
   - `magnetic(el)` — magnetic-hover for buttons/CTAs (pointer-driven translate via Motion One `animate()`).
   - `countUp(el, target)` — animated counter (Motion One `animate(0, target, {duration})`) with suffix/prefix support for the hero + portfolio numbers.
   - `parallax(el, speed)` — scroll-linked translateY via Motion One `scroll()` (replaces the raw `ux-enhancements.js:93-101` listener).
   - `splitText(el)` — word/char splitter that wraps spans for word-by-word / char reveal (preserves Russian text).
   - `tilt(el)` — subtle 3D card tilt on hover.
   - `trackMouse(fn)` throttled pointer mover for the mouse-reactive hero background.
4. **Add `<script type="module" defer src="assets/js/motion.js">`** to all 48 pages (after the existing deferred scripts). One scripted find/replace across files.

## Phase 1 — Global components (apply to all 48 pages via shared CSS/JS, no per-page markup edits)
These work by targeting existing classes, so every page inherits them.

1. **Glassmorphism navbar + shrink-on-scroll:** target existing `.navbar` (currently L238). Add `backdrop-filter: blur()` + translucency, and a Motion One `scroll()` that scales/pads `.navbar` down after 40px. No markup change — pure CSS + the global script.
2. **Magnetic buttons:** auto-enhance all `.button`, `.button-primary`, `.button-secondary` with `magnetic()`. Adds glow ring + spring hover + press scale. Existing ripple (`ux-enhancements.js:103-149`) is preserved and harmonized.
3. **Card system:** target existing card containers (`.div-block-10` services, `.what-makes-us-different` items, `.tech-stack` items) → add hover-elevation, gradient border-light sweep, subtle spring tilt. CSS-driven where possible (cheapest), Motion One for the spring lift.
4. **Section reveals upgraded:** the existing `.slide-in-*`/`.grow-in`/`.fade-in` classes get Motion One springs instead of CSS `transition` for snappier feel; add new `.reveal-mask`, `.reveal-clip` (clip-path) variants. Reduced-motion → instant.
5. **Icon hover animations** on `.tech-badge` and service icons.

## Phase 2 — Layered animated background (index.html + global)
Build the 7-layer background the brief asks for, as a single fixed `.bg-layers` container injected once by `motion.js` (so all pages get it):
- L1 grid, L2 animated gradient mesh, L3 moving light beam, L4 floating particles (canvas or DOM), L5 blurred glowing orbs, L6 SVG noise overlay, L7 occasional laser sweep. Mostly CSS keyframes + one light canvas; gated behind reduced-motion.

## Phase 3 — Hero redesign (index.html, L257–293)
- **Keep** the TE-style `#pixelCanvas` hero (it *is* the brand identity) but enrich: add the gradient mesh + light beam behind it, and make it **react to mouse** via `trackMouse()` (slight parallax/rotation).
- **Word-by-word headline reveal:** `splitText()` on `.hero-title` → staggered blur-in + translateY (mask reveal).
- **Hero stats count-up:** `countUp()` for `50+`, `5+`, `100%` (triggered on inView).
- **Magnetic CTAs** (Phase 1 inherits).
- **Floating cards:** add 2–3 floating accent cards around the canvas with spring `float` loops.
- Hero parallax on scroll (replace `ux-enhancements.js:93-101`).
- Remove the **commented-out legacy hero** (L298–310) — dead markup.

## Phase 4 — Per-section polish (index.html, the 10 sections)
Each section gets a distinct reveal personality per the brief ("every section its own personality"):
- **Marquee** (`we-love-everything`): keep CSS loop, add velocity-based skew on fast scroll.
- **Services** (`#services`): staggered card entrance + border-glow hover.
- **Carousel** (`images-carousal`): keep RAF loop (`script.js:125-183`), add image blur-up lazy + parallax.
- **What-makes-us-different**: stagger list reveal.
- **About**: mask-reveal text.
- **Tech-stack**: staggered badge pop-in, hover lift.
- **Portfolio**: **count-up the result numbers** (`+250%`, `6`, `-40%`, etc.) + case card tilt.
- **Calculator**: keep `calculator.js` logic; enhance the price-update pulse (`calculator.js:137-140`) with a Motion One spring.
- **FAQ**: keep accordion (`new-features.js:1-24`), add `AnimatePresence`-style height animation via Motion One.
- **Footer** (L947–980): animated logo, floating link hover, social icon spring.

## Phase 5 — Cleanup & dedup (correctness/perf)
- Remove the **duplicated smooth-scroll** (`ux-enhancements.js:76-91` == `new-features.js:67-87`) — keep one.
- Remove the **duplicated scroll-reveal observer** (now consolidated in `motion.js`).
- Add **JS reduced-motion guards** to the two unconditional RAF loops: `geometric-shapes.js` (canvas) and `script.js:125-183` (carousel) — they currently run regardless of preference.
- Keep payload lean: Motion One ESM is ~3.5 KB gzip; target stays well under 100 KB global. Background layers are CSS-first.

## Phase 6 — Verify
- Manual pass on index.html + 2 inner pages (a service + a city page) for: responsiveness, reduced-motion (motion disabled cleanly), keyboard nav, focus visibility, dark-theme compatibility.
- Confirm SEO markup (canonical/JSON-LD/hreflang/sitemap) is byte-identical to before.
- Lighthouse sanity check (animates `transform/opacity/filter` only, no layout thrash).

---

## Files touched
- **New:** `assets/js/motion.js` (the reusable harness).
- **Edited:** `styles.css` (tokens + new component/layer classes), `index.html` (hero redesign, hero/section markup for reveal hooks, footer polish, dead-markup removal), `script.js` (reduced-motion guard on carousel, remove dup observer), `ux-enhancements.js` (remove dup smooth-scroll + dup observer, hand reveal/parallax to `motion.js`), `new-features.js` (remove dup smooth-scroll), `geometric-shapes.js` (reduced-motion guard).
- **All 48 HTML pages:** add one `<script>` tag for `motion.js` (scripted). Per-page hero/footer *text* untouched.

## Explicitly NOT doing (per your decisions)
- No React/Vite/SPA migration. No `motion/react`. No road-safety/highway re-theme. No per-page bespoke hero redesigns (only global pieces propagate; index.html gets the full treatment).

## Open risk I'll flag during build
Motion One's ESM CDN import adds a runtime network dependency. If you'd prefer **zero** external dependency (Phase 0 option 3), I can swap to pure Web Animations API — same effects, more code. I'll proceed with Motion One unless you say otherwise.