// NavDropDown Fiunctionality
document.addEventListener('DOMContentLoaded', function () {
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownList = document.querySelector('.dropdown-list');
    const dropdown = document.querySelector('.dropdown');

    if (!dropdownToggle || !dropdownList || !dropdown) {
        return;
    }

    function closeDropdown() {
        dropdownList.style.display = 'none';
        dropdownToggle.setAttribute('aria-expanded', 'false');
    }

    function openDropdown() {
        dropdownList.style.display = 'block';
        dropdownToggle.setAttribute('aria-expanded', 'true');
    }

    dropdownToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        const currentDisplay = window.getComputedStyle(dropdownList).display;
        if (currentDisplay === 'none') {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    document.addEventListener('click', function (event) {
        if (!dropdown.contains(event.target)) {
            closeDropdown();
        }
    });

    dropdownList.addEventListener('click', function (event) {
        if (event.target.closest('a, button')) {
            closeDropdown();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeDropdown();
        }
    });
});
// Animations on Scroll Handler
document.addEventListener('DOMContentLoaded', () => {
    const elementsToAnimate = document.querySelectorAll('.slide-in-left, .slide-in-right, .slide-in-down, .grow-in, .grow-big-in, .fade-in');
    console.log(elementsToAnimate);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });
});

// Service Section Accordion Functionality
document.addEventListener('DOMContentLoaded', () => {
    const accordionButtons = document.querySelectorAll('.div-block-22 > button.div-block-9[aria-controls]');

    function closeAccordion(button, item) {
        button.setAttribute('aria-expanded', 'false');
        item.classList.remove('is-open');
    }

    function openAccordion(button, item) {
        button.setAttribute('aria-expanded', 'true');
        item.classList.add('is-open');
    }

    accordionButtons.forEach(clickedButton => {
        clickedButton.addEventListener('click', () => {
            const clickedItem = clickedButton.closest('.div-block-22');
            if (!clickedItem) return;

            const isExpanded = clickedButton.getAttribute('aria-expanded') === 'true';

            // Не закрываем уже открытую секцию
            if (isExpanded) {
                return;
            }

            // Close all accordions
            accordionButtons.forEach(otherButton => {
                const otherItem = otherButton.closest('.div-block-22');
                if (otherItem) {
                    closeAccordion(otherButton, otherItem);
                }
            });
            
            // Open clicked accordion
            openAccordion(clickedButton, clickedItem);
        });
    });
});

// Image Grid Interaction Enhancements
document.addEventListener('DOMContentLoaded', function () {
    const scrollContainer = document.querySelector('.images-carousal');
    const scrollContent = document.querySelector('.div-block-11');

    if (!scrollContainer || !scrollContent) return;

    let isPaused = false;
    let rafId = null;
    let isJumping = false;
    let halfwayPoint;
    const scrollStep = 1;

    function setDimensions() {
        halfwayPoint = scrollContent.scrollWidth / 2;
    }

    setDimensions();
    scrollContainer.scrollLeft = 0;

    function scrollLoop() {
        if (!isPaused) {
            scrollContainer.scrollLeft += scrollStep;
        }
        rafId = requestAnimationFrame(scrollLoop);
    }

    scrollContainer.addEventListener('scroll', () => {
        if (isJumping) {
            isJumping = false;
            return;
        }

        if (scrollContainer.scrollLeft >= halfwayPoint) {
            isJumping = true;
            scrollContainer.scrollLeft = 0;
        }
        else if (scrollContainer.scrollLeft <= 0) {
            isJumping = true;
            scrollContainer.scrollLeft = halfwayPoint;
        }
    });

    scrollContainer.addEventListener('mouseenter', () => {
        isPaused = true;
    });
    scrollContainer.addEventListener('mouseleave', () => {
        isPaused = false;
    });
    scrollContainer.addEventListener('touchstart', () => {
        isPaused = true;
    }, { passive: true });
    scrollContainer.addEventListener('touchend', () => {
        isPaused = false;
    });

    window.addEventListener('resize', setDimensions);
    scrollLoop();
});