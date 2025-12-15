// FAQ Accordion Functionality
document.addEventListener('DOMContentLoaded', function () {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        if (!question) return;
        
        question.addEventListener('click', function () {
            const isExpanded = item.getAttribute('aria-expanded') === 'true';
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.setAttribute('aria-expanded', 'false');
                }
            });
            
            // Toggle current item
            item.setAttribute('aria-expanded', !isExpanded);
        });
    });
});

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            
            // Here you would typically send data to your backend
            console.log('Form data:', data);
            
            // Create mailto link as fallback
            const subject = encodeURIComponent(`Заявка от ${data.name} - ${data.service}`);
            const body = encodeURIComponent(`
Имя: ${data.name}
Компания: ${data.company || 'Не указана'}
Email: ${data.email}
Телефон: ${data.phone || 'Не указан'}
Услуга: ${data.service}
Бюджет: ${data.budget || 'Не указан'}

Описание проекта:
${data.message}
            `);
            
            // Show success message
            alert('Спасибо за вашу заявку! Мы свяжемся с вами в ближайшее время.');
            
            // Optional: Send email
            window.location.href = `mailto:shrvse@drawbridge.kz?subject=${subject}&body=${body}`;
            
            // Reset form
            contactForm.reset();
        });
    }
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function () {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
