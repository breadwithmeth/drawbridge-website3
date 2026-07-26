## План исправления скролл-лагов

### Шаг 1: Сузить правило `transition` (главный kill-фикс)
Заменить селектор `body, main, header, section, div, p, h1-h6` → только `body, main, .navbar, .hero-section, .footer`. Убрать `div, p, h1-h6` — они создают оверхед на сотни элементов.

### Шаг 2: Уменьшить `filter: blur()` на фоновых слоях
- `.bg-orb`: `blur(80px)` → `blur(40px)`, размер `32vmax` → `24vmax`
- `.bg-layer-mesh`: `blur(40px)` → `blur(20px)`
- Добавить `@media (prefers-reduced-motion)` гейт для тяжёлых слоёв

### Шаг 3: `content-visibility: auto` для секций
Добавить `content-visibility: auto; contain-intrinsic-size: auto 500px` на большие секции (usps, services, footer), чтобы браузер не рендерил их вне viewport.

### Шаг 4: Почистить `will-change`
Убрать постоянный `will-change` с `.split-word/.split-char`, `.footer a`, кнопок — добавлять только через JS на время анимации и снимать после.

### Шаг 5: Починить карусель
Добавить `IntersectionObserver` в `script.js:132` — останавливать RAF когда `.images-carousal` не в viewport.

### Шаг 6: Убрать `scroll-behavior: smooth` с `<html>`
Перенести на `@media (prefers-reduced-motion: no-preference)`.

Файлы: `styles.css`, `script.js`