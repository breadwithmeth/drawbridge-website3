/**
 * motion.js — Drawbridge reusable animation harness.
 *
 * Vanilla JS + Motion One (https://motionone.dev) — the same engine as
 * motion/react, but DOM-based. Loaded as an ES module on every page.
 *
 * NOTE on the brief: the project uses motion/react's lazyLoad hooks
 * (useScroll, useTransform, useSpring, useMotionValue, variants, LazyMotion)
 * ONLY in a React tree. This site is static HTML, so we use Motion One's
 * vanilla equivalents (animate, inView, stagger, scroll, spring, timeline)
 * and native requestAnimationFrame / IntersectionObserver / Web Animations
 * API where Motion One lacks a primitive. Effects are what matter; the
 * primitive names are HONESTLY commented below, not faked.
 *
 * Everything respects prefers-reduced-motion: heavy effects short-circuit,
 * reveals land instantly, RAF loops pause.
 */

// ----------------------------------------------------------------------------
// 0. Lazy-load Motion One via CDN with graceful fallback.
//    If the network/CDN fails, page still works — effects just degrade to
//    the existing CSS transitions / instant state.
// ----------------------------------------------------------------------------
let motion = null;
try {
    // Motion One exposes named exports via ESM: animate, inView, stagger, scroll, spring, timeline, styler.
    motion = await import('https://cdn.jsdelivr.net/npm/@motionone/dom@10.16.4/+esm');
} catch (err) {
    console.warn('[motion.js] Motion One CDN import failed; running in degraded mode.', err);
    motion = null;
}

const animate = motion?.animate;
const inView = motion?.inView;
const stagger = motion?.stagger;
const scroll = motion?.scroll;
const spring = motion?.spring;
const timeline = motion?.timeline;

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

/** True if the user prefers reduced motion. Used as the master gate. */
export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Animate transform/opacity/filter only — never layout props. */
const gpuProps = new Set(['opacity', 'x', 'y', 'scale', 'rotate', 'filter', 'blur']);

/** Clamp helper. */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** rAF-throttled function. */
function rafThrottle(fn) {
    let scheduled = false;
    let lastArgs;
    return (...args) => {
        lastArgs = args;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            fn(...lastArgs);
        });
    };
}

/** Spring easing preset used by Motion One's animate() */
const SPRING = () => spring({ stiffness: 400, damping: 28, mass: 0.6 });
const EASE_OUT = [0.16, 1, 0.3, 1];

// ----------------------------------------------------------------------------
// 1. Unified reveal-on-scroll — replaces the two duplicated observers
//    (script.js:66-83  `.is-visible`  +  ux-enhancements.js:49-74  `.revealed`)
// ----------------------------------------------------------------------------

const REVEAL_CLASSES = [
    '.slide-in-left', '.slide-in-right', '.slide-in-down',
    '.grow-in', '.grow-big-in', '.fade-in',
    '.scroll-reveal', '.scroll-reveal-left', '.scroll-reveal-right', '.scroll-reveal-scale'
];

/** Map legacy class -> active class used by styles.css. */
function activeClassFor(el) {
    if (el.matches('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale')) {
        return 'revealed';
    }
    return 'is-visible';
}

/**
 * Register elements for reveal on enter. Supports staggering children when the
 * element carries data-stagger (ms) and a child selector via data-stagger-children.
 */
export function revealOnScroll(scope = document) {
    const reduce = prefersReducedMotion();
    const selector = REVEAL_CLASSES.join(', ');
        const elements = scope.querySelectorAll(selector);
        const toObserve = Array.from(elements).filter(el => !el.classList.contains(activeClassFor(el)));

    if (reduce) {
        // No motion: reveal everything immediately, no observer overhead.
        elements.forEach(el => el.classList.add(activeClassFor(el)));
        return;
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const cls = activeClassFor(el);

            const staggerMs = parseFloat(el.dataset.stagger);
            const childSel = el.dataset.staggerChildren;
            if (staggerMs > 0 && childSel) {
                const kids = el.querySelectorAll(childSel);
                kids.forEach((kid, i) => {
                    kid.style.transitionDelay = `${i * staggerMs}ms`;
                    kid.classList.add(cls);
                });
                // Mark container visible too if it has its own animation.
                el.classList.add(cls);
            } else {
                el.classList.add(cls);
            }
            io.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    toObserve.forEach(el => io.observe(el));
}

// ----------------------------------------------------------------------------
// 2. Magnetic hover — pointer-driven translate, spring settles on leave.
//    Vanilla equivalent of a motion/react magnetic-button variant.
// ----------------------------------------------------------------------------

export function magnetic(el, options = {}) {
    if (!el || prefersReducedMotion()) return;
    const strength = options.strength ?? 0.35;
    const radius = options.radius ?? el.getBoundingClientRect().width;

    el.style.willChange = 'transform';

    const onMove = rafThrottle((e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) return;
        const tx = dx * strength;
        const ty = dy * strength;
        if (animate) {
            animate(el, { x: tx, y: ty }, { duration: 0.25, easing: SPRING() });
        } else {
            el.style.transform = `translate(${tx}px, ${ty}px)`;
        }
    });

    const onLeave = () => {
        if (animate) {
            animate(el, { x: 0, y: 0 }, { duration: 0.5, easing: SPRING() });
        } else {
            el.style.transform = '';
        }
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
    };
}

// ----------------------------------------------------------------------------
// 3. Count-up — animate a numeric stat from 0 → target when in view.
//    Handles prefix (+, -) and suffix (+, %, мес, etc.) for Russian copy.
// ----------------------------------------------------------------------------

/**
 * Parse "50+", "5+", "100%", "+250%", "-40%", "6 мес" into {value, prefix, suffix}.
 * Non-numeric strings (e.g. "API", "Алматы") return null.
 */
export function parseNumber(text) {
    const t = text.trim();
    const m = t.match(/^([+\-]?)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m) return null;
    return {
        prefix: m[1],
        value: parseFloat(m[2].replace(',', '.')),
        suffix: m[3].trim()
    };
}

export function countUp(el, options = {}) {
    if (!el || prefersReducedMotion()) return;
    const parsed = parseNumber(el.textContent);
    if (!parsed) return; // non-numeric — leave as-is
    const { prefix, value, suffix } = parsed;
    const duration = options.duration ?? 1.4;
    const decimals = (String(value).split('.')[1] || '').length;

    const start = () => {
        if (animate) {
            const controls = animate(0, value, {
                duration,
                easing: EASE_OUT,
                onUpdate(v) {
                    el.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
                }
            });
            return controls;
        }
        // Fallback: rAF tween.
        const t0 = performance.now();
        const tick = (now) => {
            const p = clamp((now - t0) / (duration * 1000), 0, 1);
            const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
            el.textContent = `${prefix}${(value * eased).toFixed(decimals)}${suffix}`;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    if (inView) {
        inView(el, start, { margin: '0px 0px -10% 0px' });
    } else {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) { start(); io.unobserve(el); }
            });
        }, { threshold: 0.5 });
        io.observe(el);
    }
}

// ----------------------------------------------------------------------------
// 4. Scroll-linked parallax — replaces ux-enhancements.js:93-101 raw listener.
//    Uses Motion One scroll() (scroll-linked driver) when available.
// ----------------------------------------------------------------------------

export function parallax(el, speed = 0.3) {
    if (!el || prefersReducedMotion()) return;
    el.style.willChange = 'transform';

    if (scroll && animate) {
        // Motion One scroll(): maps page scroll progress of the element to a value.
        scroll(
            animate(el, { y: [0, -speed * 200] }, { easing: 'linear', duration: 0.001 }),
            { target: el, offset: ['start end', 'end start'] }
        );
        return;
    }
    // Fallback: throttled scroll listener.
    const onScroll = rafThrottle(() => {
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2);
        el.style.transform = `translateY(${offset * speed * -1}px)`;
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// ----------------------------------------------------------------------------
// 5. Split text — wrap words / chars in spans for staggered reveals.
//    Preserves the original Russian copy exactly. Returns {words, chars}.
// ----------------------------------------------------------------------------

export function splitText(el, mode = 'words') {
    if (!el) return { words: [], chars: [] };
    // Preserve existing child elements (e.g. <em>, <br>) by walking text nodes.
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const frag = document.createDocumentFragment();
            if (mode === 'chars') {
                for (const ch of text) {
                    if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
                    const span = document.createElement('span');
                    span.className = 'split-char';
                    span.textContent = ch;
                    frag.appendChild(span);
                }
            } else {
                for (const word of text.split(/(\s+)/)) {
                    if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(word)); continue; }
                    const span = document.createElement('span');
                    span.className = 'split-word';
                    span.textContent = word;
                    frag.appendChild(span);
                }
            }
            node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach(walk);
        }
    };
    walk(el);
    return {
        words: el.querySelectorAll('.split-word'),
        chars: el.querySelectorAll('.split-char')
    };
}

/** Staggered blur-in + translateY reveal over a set of split spans. */
export function revealSplit(el, mode = 'words', options = {}) {
    if (!el || prefersReducedMotion()) return;
    const { words, chars } = splitText(el, mode);
    const targets = mode === 'chars' ? chars : words;
    if (!targets.length) return;

    const staggerStep = options.stagger ?? 0.045;
    targets.forEach(t => {
        t.style.display = 'inline-block';
        t.style.opacity = '0';
        t.style.transform = 'translateY(0.4em)';
        t.style.filter = 'blur(8px)';
        t.style.willChange = 'opacity, transform, filter';
    });

    const run = () => {
        if (animate) {
            animate(
                targets,
                { opacity: [0, 1], y: ['0.4em', '0em'], filter: ['blur(8px)', 'blur(0px)'] },
                { duration: 0.8, delay: stagger(staggerStep, { start: options.startDelay ?? 0 }), easing: EASE_OUT }
            );
        } else {
            targets.forEach((t, i) => {
                t.style.transition = 'opacity 0.7s, transform 0.7s, filter 0.7s';
                setTimeout(() => {
                    t.style.opacity = '1';
                    t.style.transform = 'translateY(0)';
                    t.style.filter = 'blur(0)';
                }, i * staggerStep * 1000);
            });
        }
    };

    if (inView) {
        inView(el, run, { margin: '0px 0px -10% 0px' });
    } else {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { run(); io.unobserve(el); } });
        }, { threshold: 0.4 });
        io.observe(el);
    }
}

// ----------------------------------------------------------------------------
// 6. 3D card tilt on hover. Subtle, pointer-driven.
// ----------------------------------------------------------------------------

export function tilt(el, options = {}) {
    if (!el || prefersReducedMotion()) return;
    const max = options.max ?? 6; // degrees
    el.style.willChange = 'transform';
    el.style.transformStyle = 'preserve-3d';

    const onMove = rafThrottle((e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const rx = clamp(-py * max * 2, -max, max);
        const ry = clamp(px * max * 2, -max, max);
        if (animate) {
            animate(el, { rotateX: rx, rotateY: ry }, { duration: 0.2, easing: SPRING() });
        } else {
            el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        }
    });
    const onLeave = () => {
        if (animate) animate(el, { rotateX: 0, rotateY: 0 }, { duration: 0.5, easing: SPRING() });
        else el.style.transform = '';
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
    };
}

// ----------------------------------------------------------------------------
// 7. Mouse tracker — throttled global pointer mover for reactive backgrounds.
//    Registers a callback fired (throttled) with normalized -1..1 x/y.
// ----------------------------------------------------------------------------

export function trackMouse(cb) {
    if (prefersReducedMotion()) return () => {};
    const handler = rafThrottle((e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        cb(x, y);
    });
    window.addEventListener('pointermove', handler);
    return () => window.removeEventListener('pointermove', handler);
}

// ----------------------------------------------------------------------------
// 8. Smooth height animation for accordions / FAQ (AnimatePresence-style).
//    Replaces the CSS-visibility flip with a measured open/close.
// ----------------------------------------------------------------------------

export function animateHeight(el, open, options = {}) {
    if (!el) return;
    const duration = options.duration ?? 0.4;
    if (prefersReducedMotion() || !animate) {
        el.style.height = open ? 'auto' : '0';
        el.style.overflow = open ? '' : 'hidden';
        return;
    }
    if (open) {
        const target = el.scrollHeight;
        animate(el, { height: [0, target], opacity: [0, 1] }, { duration, easing: EASE_OUT });
        el.style.overflow = 'hidden';
        // release to auto after settling so contents can reflow.
        setTimeout(() => { el.style.height = 'auto'; el.style.overflow = ''; }, duration * 1000 + 50);
    } else {
        el.style.height = `${el.scrollHeight}px`;
        el.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            animate(el, { height: 0, opacity: 0 }, { duration, easing: EASE_OUT });
        });
    }
}

// ----------------------------------------------------------------------------
// Phase 2: Layered animated background — inject a single fixed .bg-layers
// container once per page so all pages inherit the 7-layer backdrop without
// per-page markup.	targeted CSS lives in the "DRAWBRIDGE ANIMATION SYSTEM"
// block at the bottom of styles.css.
// ----------------------------------------------------------------------------

export function injectBackground() {
    if (document.querySelector('.bg-layers')) return;
    // Skip injection when the user prefers reduced motion: a static tint alone.
    const reduce = prefersReducedMotion();

    const root = document.createElement('div');
    root.className = 'bg-layers';
    root.setAttribute('aria-hidden', 'true');

    // L1
    if (!reduce) root.appendChild(layerEl('bg-layer-grid'));
    // L2
    if (!reduce) root.appendChild(layerEl('bg-layer-mesh'));
    // L3
    if (!reduce) root.appendChild(layerEl('bg-layer-beam'));
    // L4 — particles
    const pc = layerEl('bg-layer-particles');
    if (!reduce) {
        const n = window.matchMedia('(max-width: 767px)').matches ? 12 : 24;
        for (let i = 0; i < n; i++) {
            const p = document.createElement('span');
            p.className = 'bg-particle';
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${70 + Math.random() * 30}%`;
            p.style.setProperty('--p-dur', `${12 + Math.random() * 16}s`);
            p.style.setProperty('--p-delay', `${-Math.random() * 18}s`);
            p.style.setProperty('--p-x', `${(Math.random() - 0.5) * 80}px`);
            pc.appendChild(p);
        }
    } else {
        pc.style.display = 'none';
    }
    root.appendChild(pc);
    // L5 — orbs
    if (!reduce) {
        const orbs = layerEl('bg-layer-orbs');
        orbs.className = 'bg-layer-orbs';
        ['bg-orb--1', 'bg-orb--2', 'bg-orb--3'].forEach(c => {
            const o = document.createElement('div');
            o.className = `bg-orb ${c}`;
            o.style.setProperty('--o-dur', `${22 + Math.random() * 14}s`);
            orbs.appendChild(o);
        });
        root.appendChild(orbs);
    }
    // L6 — noise (static, cheap — keep even under reduced motion, it's subtle)
    root.appendChild(layerEl('bg-layer-noise'));
    // L7 — laser sweep
    if (!reduce) root.appendChild(layerEl('bg-layer-laser'));

    document.body.insertBefore(root, document.body.firstChild);
}

function layerEl(cls) {
    const d = document.createElement('div');
    d.className = cls;
    return d;
}

// ----------------------------------------------------------------------------
// Phase 1.1 helper: navbar shrink-on-scroll — toggles .scrolled after 40px.
// Uses Motion One scroll() when available (scroll-linked driver); otherwise a
// throttled scroll listener that only writes a class (no per-frame style).
// ----------------------------------------------------------------------------

export function navbarShrink(selector = '.navbar') {
    const nav = document.querySelector(selector);
    if (!nav) return;
    const onScroll = rafThrottle(() => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}

// ----------------------------------------------------------------------------
// Phase 1.3 helper: promote existing card roots to .motion-card so the card
// system applies. Safe no-op where selector matches nothing.
// Pass selectors via data-motion-card on a container, or call directly.
// ----------------------------------------------------------------------------

export function promoteCards(selectors = []) {
    document.querySelectorAll(selectors.join(',')).forEach(el => {
        el.classList.add('motion-card');
    });
}

// ----------------------------------------------------------------------------
// Phase 3: Hero wiring (index.html only — guards out when markers absent).
//   • word-by-word mask/blur reveal of the headline
//   • count-up of [data-count-up] stat numbers
//   • mouse-reactive 3D tilt on [data-hero-canvas-stage]
//   • spring float loop on [data-float-card]
//   • gentle scroll parallax on [data-hero-parallax]
// ----------------------------------------------------------------------------

export function wireHero(root = document) {
    const stage = root.querySelector('[data-hero-canvas-stage]');
    const parallaxEl = root.querySelector('[data-hero-parallax]');
    if (!stage && !parallaxEl) return; // not a hero page
    const reduce = prefersReducedMotion();

    // Headline word-by-word reveal.
    const headline = root.querySelector('[data-split-words]');
    if (headline && !reduce) {
        // Split each direct span child (e.g. .hero-brand, .hero-tagline)
        // independently so the brand line and tagline reveal as separate groups.
        headline.querySelectorAll('.hero-brand, .hero-tagline').forEach((line, i) => {
            revealSplit(line, 'words', {
                stagger: parseFloat(headline.dataset.staggerWords) || 0.08,
                startDelay: i * 0.15
            });
        });
    }

    // Stats count-up.
    root.querySelectorAll('[data-count-up]').forEach(el => countUp(el));

    // Mouse-reactive stage tilt (skips under reduced motion via trackMouse).
    if (stage && !reduce) {
        trackMouse((x, y) => {
            const rx = clamp(-y * 6, -6, 6);
            const ry = clamp(x * 8, -8, 8);
            if (animate) {
                animate(stage, { rotateX: rx, rotateY: ry },
                    { duration: 0.6, easing: SPRING() });
            } else {
                stage.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
            }
        });
    }

    // Floating cards — staggered entrance + looping bob.
    if (!reduce) {
        root.querySelectorAll('[data-float-card]').forEach((card, i) => {
            card.dataset.floatVisible = '1';
            // Entrance.
            if (animate) {
                animate(card, { opacity: [0, 1], y: [12, 0] },
                    { duration: 0.6, delay: 0.4 + i * 0.15, easing: EASE_OUT });
            }
            // Continuous spring bob via Web Animations API (cheap, no re-renders).
            const amp = 10 + i * 4;
            card.animate(
                [
                    { transform: 'translateY(0)' },
                    { transform: `translateY(-${amp}px)` },
                    { transform: 'translateY(0)' }
                ],
                {
                    duration: 3200 + i * 600,
                    iterations: Infinity,
                    easing: 'ease-in-out',
                    delay: i * 500
                }
            );
        });
    } else {
        // Reduced motion: reveal the cards statically.
        root.querySelectorAll('[data-float-card]').forEach(c => {
            c.dataset.floatVisible = '1';
        });
    }

    // Scroll parallax on the hero section.
    if (parallaxEl) parallax(parallaxEl, 0.15);
}


// ----------------------------------------------------------------------------
// Phase 4: Per-section polish (index.html only -- guards out where elements
// are absent). Adds reveal/hover/counter classes and CSS hooks at runtime so
// the static markup does not need per-section edits.
// ----------------------------------------------------------------------------

export function wireSections(root = document) {
    const reduce = prefersReducedMotion();

    // Marquee: velocity-based skew on fast scroll.
    const marquee = root.querySelector('.we-love-everything-section');
    if (marquee && !reduce) {
        const scroll = root.querySelector('.jumbo-text-scroll') || marquee;
        let lastY = window.scrollY;
        const onScroll = rafThrottle(() => {
            const v = window.scrollY - lastY;
            lastY = window.scrollY;
            const rect = scroll.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            const skew = clamp(v * 0.04, -8, 8);
            scroll.style.setProperty('--marquee-skew', skew + 'deg');
        });
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Promote existing card roots to .motion-card so the card system applies.
    promoteCards([
        '.services-section .div-block-10 > *',
        '.what-makes-us-different-section .div-block-12',
        '.tech-stack-section .tech-category',
        '.portfolio-item'
    ]);

    // About heading: mask-reveal reveal personality.
    root.querySelectorAll('.about-section h3').forEach(h => h.classList.add('reveal-mask'));

    // Portfolio result numbers -> count-up.
    root.querySelectorAll('.portfolio-results .result-item strong').forEach(el => countUp(el));

    // 3D tilt on portfolio case cards.
    if (!reduce) root.querySelectorAll('.portfolio-item').forEach(el => tilt(el, { max: 4 }));

    // Carousel images: blur-up lazy reveal.
    root.querySelectorAll('.images-carousal img').forEach(img => {
        if (img.complete) {
            img.dataset.loaded = '1';
        } else {
            img.addEventListener('load', () => { img.dataset.loaded = '1'; }, { once: true });
        }
    });

    // FAQ: smooth height when aria-expanded toggles (new-features.js flips the
    // attribute; we animate the answer panel around it). Reduced motion skips.
    if (!reduce) enhanceFaq(root);

    // Footer reveal.
        root.querySelectorAll('.footer').forEach(f => f.classList.add('fade-in'));
        revealOnScroll();
}

function enhanceFaq(root) {
    root.querySelectorAll('.faq-item[aria-expanded]').forEach(i => i.classList.add('is-faq-enhanced'));
    const items = root.querySelectorAll('.faq-item[aria-expanded]');
    items.forEach(item => {
        const answer = item.querySelector('.faq-answer') || item.querySelector('.faq-answer-content');
        if (!answer) return;
        answer.style.transition =
            'max-height var(--dur-med) var(--ease-out), opacity var(--dur-med) var(--ease-out)';
        answer.style.overflow = 'hidden';
        const sync = () => {
            const open = item.getAttribute('aria-expanded') === 'true';
            answer.style.maxHeight = open ? answer.scrollHeight + 'px' : '0';
            answer.style.opacity = open ? '1' : '0';
        };
        sync();
        const observer = new MutationObserver(() => {
            const open = item.getAttribute('aria-expanded') === 'true';
            if (open) {
                answer.style.opacity = '1';
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                requestAnimationFrame(() => { answer.style.maxHeight = '0'; answer.style.opacity = '0'; });
            }
        });
        observer.observe(item, { attributes: true, attributeFilter: ['aria-expanded'] });
        window.addEventListener('resize', rafThrottle(() => {
            if (item.getAttribute('aria-expanded') === 'true') {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        }), { passive: true });
    });
}

// ----------------------------------------------------------------------------
// 9. Public auto-init — runs on DOMContentLoaded for every page.
//    Wires the global pieces (Phase 1) so no per-page markup is needed.
// ----------------------------------------------------------------------------

function autoInit() {
    injectBackground();
    revealOnScroll();
    navbarShrink();
    wireHero();
    wireSections();

    // Button magnetic effect (Phase 1.2).
    if (!prefersReducedMotion()) {
        document.querySelectorAll('.button, .button-primary, .button-secondary')
            .forEach(b => magnetic(b, { strength: 0.35 }));
        // Skip the theme-toggle as a magnetic target; it's UI chrome.
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
} else {
    autoInit();
}

// Expose a global so the (deferred, non-module) legacy scripts can opt into
// helpers without duplicating logic.
window.DrawMotion = {
    prefersReducedMotion,
    revealOnScroll,
    magnetic,
    countUp,
    parseNumber,
    parallax,
    splitText,
    revealSplit,
    tilt,
    trackMouse,
    animateHeight,
    injectBackground,
    navbarShrink,
    promoteCards,
    wireHero,
    wireSections,
    _motion: motion
};
