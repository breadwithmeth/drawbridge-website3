// ===== PROJECT COST CALCULATOR =====
const calculator = {
    // Global price multiplier: 2.5x lower prices
    priceMultiplier: 1 / 2.5,
    basePrice: 0,
    additionalPrice: 0,
    urgencyMultiplier: 1,
    
    init() {
        const form = document.getElementById('projectCalculator');
        if (!form) return;
        
        this.setupEventListeners();
        this.updateCalculation();
    },
    
    setupEventListeners() {
        // Project type radio buttons
        const projectTypeInputs = document.querySelectorAll('input[name="projectType"]');
        projectTypeInputs.forEach(input => {
            input.addEventListener('change', () => this.updateCalculation());
        });
        
        // Platform checkboxes
        const platformInputs = document.querySelectorAll('input[name="platform"]');
        platformInputs.forEach(input => {
            input.addEventListener('change', () => this.updateCalculation());
        });
        
        // Features checkboxes
        const featureInputs = document.querySelectorAll('input[name="features"]');
        featureInputs.forEach(input => {
            input.addEventListener('change', () => this.updateCalculation());
        });
        
        // Timeline range
        const timelineRange = document.getElementById('timelineRange');
        if (timelineRange) {
            timelineRange.addEventListener('input', (e) => {
                this.updateTimelineDisplay(e.target.value);
                this.updateCalculation();
            });
        }
        
        // Quote request button
        const quoteBtn = document.getElementById('requestQuote');
        if (quoteBtn) {
            quoteBtn.addEventListener('click', () => this.requestQuote());
        }
    },
    
    updateTimelineDisplay(months) {
        const valueDisplay = document.getElementById('timelineValue');
        if (valueDisplay) {
            const monthWord = this.getMonthWord(parseInt(months));
            valueDisplay.textContent = `${months} ${monthWord}`;
        }
        
        // Update range background
        const range = document.getElementById('timelineRange');
        if (range) {
            const percentage = ((months - 1) / 11) * 100;
            range.style.background = `linear-gradient(to right, var(--te-orange) 0%, var(--te-orange) ${percentage}%, var(--primary-color-77) ${percentage}%, var(--primary-color-77) 100%)`;
        }
    },
    
    getMonthWord(num) {
        const cases = [2, 0, 1, 1, 1, 2];
        const words = ['месяц', 'месяца', 'месяцев'];
        return words[(num % 100 > 4 && num % 100 < 20) ? 2 : cases[Math.min(num % 10, 5)]];
    },
    
    updateCalculation() {
        // Get base price from selected project type
        const selectedType = document.querySelector('input[name="projectType"]:checked');
        this.basePrice = selectedType ? this.getAdjustedPrice(selectedType.dataset.price) : 0;
        
        // Calculate additional price from platforms and features
        this.additionalPrice = 0;
        
        const selectedPlatforms = document.querySelectorAll('input[name="platform"]:checked');
        selectedPlatforms.forEach(input => {
            this.additionalPrice += this.getAdjustedPrice(input.dataset.price);
        });
        
        const selectedFeatures = document.querySelectorAll('input[name="features"]:checked');
        selectedFeatures.forEach(input => {
            this.additionalPrice += this.getAdjustedPrice(input.dataset.price);
        });
        
        // Calculate urgency multiplier
        const timeline = document.getElementById('timelineRange');
        const months = timeline ? parseInt(timeline.value) : 6;
        
        if (months <= 3) {
            this.urgencyMultiplier = 1.3; // +30% для срочных проектов
        } else if (months <= 4) {
            this.urgencyMultiplier = 1.2; // +20% для ускоренных
        } else {
            this.urgencyMultiplier = 1.0; // Нормальная стоимость
        }
        
        this.displayResults();
        this.trackCalculatorEvent();
    },
    
    displayResults() {
        const basePriceEl = document.getElementById('basePrice');
        const additionalPriceEl = document.getElementById('additionalPrice');
        const urgencyPriceEl = document.getElementById('urgencyPrice');
        const urgencyModifier = document.getElementById('urgencyModifier');
        const totalPriceEl = document.getElementById('totalPrice');
        
        if (basePriceEl) {
            basePriceEl.textContent = this.formatPrice(this.basePrice);
        }
        
        if (additionalPriceEl) {
            additionalPriceEl.textContent = this.formatPrice(this.additionalPrice);
        }
        
        const subtotal = this.basePrice + this.additionalPrice;
        const urgencyFee = subtotal * (this.urgencyMultiplier - 1);
        const total = subtotal * this.urgencyMultiplier;
        
        if (this.urgencyMultiplier > 1) {
            if (urgencyModifier) urgencyModifier.style.display = 'flex';
            if (urgencyPriceEl) urgencyPriceEl.textContent = '+' + this.formatPrice(urgencyFee);
        } else {
            if (urgencyModifier) urgencyModifier.style.display = 'none';
        }
        
        if (totalPriceEl) {
            totalPriceEl.textContent = this.formatPrice(total);

            // Animated pulse: prefer Motion One spring (exposed by motion.js),
            // fall back to the legacy transform transition if unavailable.
            const motionLib = window.DrawMotion && window.DrawMotion._motion;
            if (motionLib && motionLib.animate && !window.DrawMotion.prefersReducedMotion()) {
                motionLib.animate(totalPriceEl,
                    { scale: [1, 1.12, 1] },
                    { duration: 0.5, easing: [0.34, 1.56, 0.64, 1] });
            } else {
                totalPriceEl.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    totalPriceEl.style.transform = 'scale(1)';
                }, 200);
            }
        }
    },
    
    formatPrice(price) {
        return new Intl.NumberFormat('ru-KZ', {
            style: 'currency',
            currency: 'KZT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    },

    getAdjustedPrice(rawPrice) {
        const value = parseInt(rawPrice, 10) || 0;
        return Math.round(value * this.priceMultiplier);
    },
    
    requestQuote() {
        const selectedType = document.querySelector('input[name="projectType"]:checked');
        if (!selectedType) {
            alert('Пожалуйста, выберите тип проекта');
            return;
        }
        
        const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
            .map(input => input.value);
        
        if (platforms.length === 0) {
            alert('Пожалуйста, выберите хотя бы одну платформу');
            return;
        }
        
        const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
            .map(input => input.value);
        
        const timeline = document.getElementById('timelineRange').value;
        const total = (this.basePrice + this.additionalPrice) * this.urgencyMultiplier;
        
        // Собираем данные для отправки
        const quoteData = {
            projectType: selectedType.value,
            platforms: platforms,
            features: features,
            timeline: timeline,
            estimatedCost: total
        };
        
        // Track event in Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'request_quote', {
                'event_category': 'Calculator',
                'event_label': selectedType.value,
                'value': total
            });
        }
        
        // Здесь можно добавить отправку на сервер или открытие модального окна
        console.log('Quote Request:', quoteData);
        
        // Для демонстрации - переход к контактам с предзаполненными данными
        const message = `Здравствуйте! Я рассчитал стоимость проекта через калькулятор:%0A%0A` +
            `Тип: ${this.getProjectTypeName(selectedType.value)}%0A` +
            `Платформы: ${platforms.join(', ')}%0A` +
            `Срок: ${timeline} месяцев%0A` +
            `Примерная стоимость: ${this.formatPrice(total)}%0A%0A` +
            `Хотел бы обсудить детали проекта.`;
        
        window.open(`https://api.whatsapp.com/send/?phone=77054810862&text=${message}`, '_blank');
    },
    
    getProjectTypeName(value) {
        const names = {
            'mvp': 'MVP',
            'standard': 'Стандартный',
            'enterprise': 'Enterprise'
        };
        return names[value] || value;
    },
    
    trackCalculatorEvent() {
        // Debounced tracking to avoid too many events
        clearTimeout(this.trackTimeout);
        this.trackTimeout = setTimeout(() => {
            if (typeof gtag !== 'undefined') {
                const total = (this.basePrice + this.additionalPrice) * this.urgencyMultiplier;
                gtag('event', 'calculator_calculation', {
                    'event_category': 'Calculator',
                    'event_label': 'Price Updated',
                    'value': total
                });
            }
        }, 1000);
    }
};

// Initialize calculator when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => calculator.init());
} else {
    calculator.init();
}

// ===== ANALYTICS TRACKING =====
const analytics = {
    init() {
        this.trackPageView();
        this.trackScrollDepth();
        this.trackButtonClicks();
        this.trackServiceInteractions();
    },
    
    trackPageView() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                'page_title': document.title,
                'page_location': window.location.href,
                'page_path': window.location.pathname
            });
        }
    },
    
    trackScrollDepth() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 100];
        let trackedMilestones = [];
        
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                milestones.forEach(milestone => {
                    if (scrollPercent >= milestone && !trackedMilestones.includes(milestone)) {
                        trackedMilestones.push(milestone);
                        
                        if (typeof gtag !== 'undefined') {
                            gtag('event', 'scroll_depth', {
                                'event_category': 'Engagement',
                                'event_label': `${milestone}%`,
                                'value': milestone
                            });
                        }
                    }
                });
            }
        });
    },
    
    trackButtonClicks() {
        const buttons = document.querySelectorAll('.button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const buttonText = e.target.textContent.trim();
                
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'button_click', {
                        'event_category': 'CTA',
                        'event_label': buttonText
                    });
                }
            });
        });
    },
    
    trackServiceInteractions() {
        const serviceButtons = document.querySelectorAll('.div-block-9[type="button"]');
        serviceButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const serviceTitle = button.querySelector('.text-block-10')?.textContent || 'Unknown';
                
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'service_expand', {
                        'event_category': 'Services',
                        'event_label': serviceTitle
                    });
                }
            });
        });
    }
};

// Initialize analytics
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => analytics.init());
} else {
    analytics.init();
}

console.log('📊 Calculator and Analytics loaded successfully!');
