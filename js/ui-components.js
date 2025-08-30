/**
 * UI Components Manager
 * Handles interactive UI components and animations
 */
class UIComponents {
    constructor() {
        this.init();
    }

    /**
     * Initialize all UI components
     */
    init() {
        this.initSmoothScrolling();
        this.initMobileMenu();
        this.initScrollEffects();
        this.initAnimations();
    }

    /**
     * Initialize smooth scrolling for anchor links
     */
    initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Initialize mobile menu functionality
     */
    initMobileMenu() {
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.getElementById('navMenu');

        if (mobileToggle && navMenu) {
            mobileToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                mobileToggle.classList.toggle('active');

                // Toggle hamburger animation
                const lines = mobileToggle.querySelectorAll('.hamburger-line');
                lines.forEach((line, index) => {
                    line.style.transform = navMenu.classList.contains('active')
                        ? this.getHamburgerTransform(index)
                        : 'none';
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    mobileToggle.classList.remove('active');

                    const lines = mobileToggle.querySelectorAll('.hamburger-line');
                    lines.forEach(line => {
                        line.style.transform = 'none';
                    });
                }
            });
        }
    }

    /**
     * Get hamburger menu animation transforms
     */
    getHamburgerTransform(index) {
        const transforms = [
            'rotate(45deg) translate(5px, 5px)',
            'opacity: 0',
            'rotate(-45deg) translate(7px, -6px)'
        ];
        return transforms[index] || 'none';
    }

    /**
     * Initialize scroll effects
     */
    initScrollEffects() {
        const header = document.getElementById('header');
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Header background opacity based on scroll
            if (header) {
                if (currentScrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            }

            lastScrollY = currentScrollY;
        });
    }

    /**
     * Initialize scroll-triggered animations
     */
    initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll(
            '.feature-card, .product-showcase, .download-section'
        );

        animateElements.forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Show loading state
     */
    showLoading(element) {
        if (element) {
            element.classList.add('loading');
            element.setAttribute('aria-busy', 'true');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading(element) {
        if (element) {
            element.classList.remove('loading');
            element.setAttribute('aria-busy', 'false');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Debounce function for performance
     */
    debounce(func, wait) {
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

    /**
     * Throttle function for performance
     */
    throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}// Export for ES6 modules
export default UIComponents;