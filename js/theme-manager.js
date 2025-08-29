/**
 * Theme Management System
 * Handles light/dark/auto theme switching with system preference detection
 */
class ThemeManager {
    constructor() {
        this.themes = ['light', 'dark', 'auto'];
        this.currentTheme = this.detectTheme();
        this.init();
    }

    /**
     * Detect saved theme or default to auto
     */
    detectTheme() {
        const saved = localStorage.getItem('theme');
        if (saved && this.themes.includes(saved)) {
            return saved;
        }
        return 'dark';
    }

    /**
     * Initialize theme system
     */
    init() {
        this.applyTheme();
        this.bindEvents();
        this.updateToggleButton();
        this.watchSystemTheme();
    }

    /**
     * Bind theme toggle button events
     */
    bindEvents() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    /**
     * Cycle through themes: light -> dark -> auto -> light
     */
    toggleTheme() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        this.currentTheme = this.themes[nextIndex];
        
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
        this.updateToggleButton();
    }

    /**
     * Apply current theme to document
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
    }

    /**
     * Update theme toggle button icon and aria-label
     */
    updateToggleButton() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('.theme-icon');
            if (icon) {
                // Remove all theme icon classes
                icon.classList.remove('fa-sun', 'fa-moon', 'fa-circle-half-stroke');
                
                // Add appropriate icon based on current theme
                switch (this.currentTheme) {
                    case 'light':
                        icon.classList.add('fa-sun');
                        themeToggle.setAttribute('aria-label', 'Switch to Dark Theme');
                        break;
                    case 'dark':
                        icon.classList.add('fa-moon');
                        themeToggle.setAttribute('aria-label', 'Switch to Auto Theme');
                        break;
                    case 'auto':
                        icon.classList.add('fa-circle-half-stroke');
                        themeToggle.setAttribute('aria-label', 'Switch to Light Theme');
                        break;
                }
            }
        }
    }

    /**
     * Watch for system theme changes when in auto mode
     */
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                if (this.currentTheme === 'auto') {
                    // Force re-apply theme to trigger CSS updates
                    this.applyTheme();
                }
            });
        }
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically
     */
    setTheme(theme) {
        if (this.themes.includes(theme)) {
            this.currentTheme = theme;
            localStorage.setItem('theme', this.currentTheme);
            this.applyTheme();
            this.updateToggleButton();
        }
    }
}