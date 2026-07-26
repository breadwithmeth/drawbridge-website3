// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Load saved theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
}

// Theme toggle functionality
themeToggle?.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    
    // Save theme preference
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Add ripple effect
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: var(--te-orange);
        opacity: 0.3;
        animation: ripple 0.6s ease-out;
    `;
    themeToggle.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

// Scroll progress bar removed as part of top bar removal

// ===== ENHANCED SCROLL ANIMATIONS =====
// NOTE: scroll-reveal classes are not used anywhere in the 48 pages (verified
// via grep: 0 hits for .scroll-reveal*). The legacy observer below observed
// nothing. Reveal animations are handled by:
//   • assets/js/motion.js (revealOnScroll) — the unified harness, and
//   • script.js:67-83 — fallback observer that adds .is-visible to
//     .slide-in-* / .grow-in / .fade-in (used on ALL 48 pages, kept as a
//     fallback so reveals still work if motion.js's CDN import fails).
// The dead observer was removed to avoid duplicating logic.

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ===== PARALLAX EFFECT FOR HERO SECTION =====
const heroSection = document.querySelector('.hero-section');
if (heroSection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;
        heroSection.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
    }, { passive: true });
}

// ===== ADD RIPPLE EFFECT TO BUTTONS =====
document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: translate(-50%, -50%);
            animation: rippleEffect 0.6s ease-out;
        `;
        
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation to CSS
if (!document.querySelector('#ripple-animation-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation-style';
    style.textContent = `
        @keyframes rippleEffect {
            to {
                width: 500px;
                height: 500px;
                opacity: 0;
            }
        }
        
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===== TECH BADGE PULSE ANIMATION =====
const techBadges = document.querySelectorAll('.tech-badge');
techBadges.forEach((badge, index) => {
    badge.addEventListener('mouseenter', function() {
        this.style.animationDelay = `${index * 0.05}s`;
    });
});

// ===== PERFORMANCE OPTIMIZATION =====
// Debounce scroll events
function debounce(func, wait = 10) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced scroll handling removed with scroll progress bar

console.log('✨ UX Enhancements loaded successfully!');
