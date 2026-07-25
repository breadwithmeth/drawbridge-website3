# План технических SEO-фиксов drawbridge.kz (Google + Yandex)

Статичный HTML-сайт, 48 страниц. Каркас SEO уже неплохой — правлю конкретные пробелы, которые тянут выдачу. Контент/titles не трогаю (по вашему выбору — только техника).

## Корректировки к первоначальному аудиту
- **260 «пустых alt» трогать НЕ нужно**: ~225 из них — правильно пустые декоративные иконки рядом с текстом (WCAG 1.1.1). Карусель (34 шт.) тоже оставляем пустой по вашему решению. Заполнять alt не будем.
- Реальная проблема для ранжирования — **435 картинок без `width`/`height`** (CLS в Core Web Vitals).

---

## Часть 1. CLS: `width`/`height` на все картинки (≈435 тегов)
Напишу Python-скрипт (используется существующий `.venv`; если Pillow нет — поставлю через `sips` macOS или `pip install Pillow`):
- Для каждого `*.html` находит все `<img>` без `width`/`height`.
- Читает натуральный размер файла из `assets/...`.
- Вписывает `width`/`height` атрибуты (натуральные пиксели) — браузер сохранит соотношение сторон → CLS уходит.
- Логирует файлы, где не удалось определить размер.
- Декоративные `loading="lazy"` сохраняются.

## Часть 2. Хаб городов: GA4 + JSON-LD
`software-development-cities-kazakhstan.html` — единственная из 48 без счётчика и без разметки:
- Добавляю стандартный GA4 gtag (копия блока из других страниц, ID `G-9ECWPYFDJ7`).
- Добавляю JSON-LD: `WebPage` + `ItemList` (список из 19 городов, каждый как `ListItem` с url/name) + компактный `Organization`.

## Часть 3. Сервисные страницы: дополнить JSON-LD (≈24 страницы)
Сейчас на каждой только 2 урезанных блока (Organization + WebPage). Допишу третий — полноценный:
```json
{ "@type": "Service",
  "serviceType": "<услуга>",
  "provider": { "@id": "https://drawbridge.kz/#org" },
  "areaServed": "KZ",
  "url": "https://drawbridge.kz/<page>.html" }
```
Плюс `BreadcrumbList` (Главная → Услуга). `serviceType` беру из title/H1 страницы (без выдумывания контента). Скриптом по однотипной структуре.

## Часть 4. `hreflang` в sitemap.xml
Сейчас `xhtml:link` hreflang есть только у двух главных страниц. Добавлю в каждый `<url>` sitemap:
- `hreflang="ru"` → сама страница (self)
- `hreflang="x-default"` → главная

(English-версий внутренних страниц нет — `hreflang="en"` для них не добавляю, это корректно.)

## Часть 5. `manifest.json` (PWA) + подключение
- Создаю `manifest.json` (name, short_name, theme_color `#ff6600`, background_color, display standalone, иконки из существующих `assets/images/favicon.png`).
- Добавляю `<link rel="manifest" href="/manifest.json">` на все 48 страниц (скриптом).
- `.htaccess` менять не нужно — `default-src 'self'` в CSP пропускает self-hosted манифест.

## Часть 6. Актуализация `lastmod` в sitemap
Обновлю даты `lastmod` на изменяемые страницы на `2026-07-24` (дата деплоя).

---

## Что НЕ делаю (согласовано)
- Alt-тексты (декоративные и так корректны; карусель — по вашему решению пустая).
- Yandex.Metrika (не нужен).
- Контент/titles/descriptions.
- `home-ita.html` → rename в `home-en.html` (требует редиректов в `.htaccess` + правки hreflang/sitemap — риск больше пользы сейчас; оставляю как есть).

## Проверка после правок
- `python3 -m http.server` локально, прогон по страницам.
- Валидация JSON-LD (Schema.org Markup Validator через WebFetch на пару страниц).
- Перепроверка счётчиков grep'ом: `G-9ECWPYFDJ7` должен быть во всех 48 файлах; `rel="manifest"` во всех 48.
- Сводный отчёт по внесённым изменениям.

Все правки — скриптами с предварительным бэкапом через git (изменения видно в `git diff`, откат — `git restore`).