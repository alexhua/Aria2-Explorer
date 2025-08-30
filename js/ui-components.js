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
        this.initNavLinkEffects();
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
            // Toggle menu on button click
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu(navMenu, mobileToggle);
            });

            // Close menu when clicking on nav links
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu(navMenu, mobileToggle);
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    this.closeMobileMenu(navMenu, mobileToggle);
                }
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                    this.closeMobileMenu(navMenu, mobileToggle);
                }
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 768) {
                    this.closeMobileMenu(navMenu, mobileToggle);
                }
            });
        }
    }

    /**
     * Toggle mobile menu state
     */
    toggleMobileMenu(navMenu, mobileToggle) {
        const isActive = navMenu.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu(navMenu, mobileToggle);
        } else {
            this.openMobileMenu(navMenu, mobileToggle);
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu(navMenu, mobileToggle) {
        navMenu.classList.add('active');
        mobileToggle.classList.add('active');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
        
        // Set aria attributes for accessibility
        mobileToggle.setAttribute('aria-expanded', 'true');
        navMenu.setAttribute('aria-hidden', 'false');
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu(navMenu, mobileToggle) {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Set aria attributes for accessibility
        mobileToggle.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-hidden', 'true');
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

    /**
     * Initialize navigation link sliding background effects
     */
    initNavLinkEffects() {
        // Only enable on desktop (768px and above)
        if (window.innerWidth < 768) return;

        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');
        
        if (!navMenu || navLinks.length === 0) return;

        let isHoveringMenu = false;

        // Function to move slider to target link
        const moveSliderToLink = (targetLink) => {
            if (!targetLink || window.innerWidth < 768) return;

            // Get positions relative to the nav menu
            const menuRect = navMenu.getBoundingClientRect();
            const linkRect = targetLink.getBoundingClientRect();
            
            // Calculate relative position
            const left = linkRect.left - menuRect.left;
            const width = linkRect.width;
            
            // Update CSS custom properties
            navMenu.style.setProperty('--slider-left', `${left}px`);
            navMenu.style.setProperty('--slider-width', `${width}px`);
            navMenu.style.setProperty('--slider-opacity', '1');
        };

        // Function to hide slider
        const hideSlider = () => {
            navMenu.style.setProperty('--slider-opacity', '0');
        };

        // Add event listeners to each nav link
        navLinks.forEach((link) => {
            link.addEventListener('mouseenter', () => {
                if (window.innerWidth >= 768) {
                    isHoveringMenu = true;
                    moveSliderToLink(link);
                }
            });
        });

        // Handle mouse leave from entire nav menu
        navMenu.addEventListener('mouseleave', () => {
            if (window.innerWidth >= 768) {
                isHoveringMenu = false;
                setTimeout(() => {
                    if (!isHoveringMenu) {
                        hideSlider();
                    }
                }, 100);
            }
        });

        navMenu.addEventListener('mouseenter', () => {
            if (window.innerWidth >= 768) {
                isHoveringMenu = true;
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) {
                hideSlider();
            }
        });

        // Initialize CSS custom properties
        navMenu.style.setProperty('--slider-left', '0px');
        navMenu.style.setProperty('--slider-width', '0px');
        navMenu.style.setProperty('--slider-opacity', '0');
    }
}// Export for ES6 modules
export default UIComponents;