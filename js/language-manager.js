import TranslationManager from './translations.js';

/**
 * Language Management System
 * Handles bilingual content switching between English and Chinese
 */
class LanguageManager {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translationManager = new TranslationManager();
        this.isInitialized = false;
        this.init();
    }

    /**
     * Detect saved language or default to English
     */
    detectLanguage() {
        const saved = localStorage.getItem('language');
        if (saved && ['en', 'zh'].includes(saved)) {
            return saved;
        }

        // Try to detect from browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('zh')) {
            return 'zh';
        }

        return 'en';
    }

    /**
     * Initialize language system
     */
    async init() {
        try {
            await this.loadTranslations();
            this.isInitialized = true;
            this.applyLanguage();
            this.bindEvents();
            this.updateToggleButton();
        } catch (error) {
            console.error('Failed to initialize language system:', error);
        }
    }

    /**
     * Load translation data
     */
    async loadTranslations() {
        try {
            // Load both English and Chinese translations
            await this.translationManager.loadLanguages(['en', 'zh']);
        } catch (error) {
            console.error('Failed to load translations:', error);
            throw error;
        }
    }

    /**
     * Bind language toggle button events
     */
    bindEvents() {
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => this.toggleLanguage());
        }
    }

    /**
     * Toggle between English and Chinese
     */
    toggleLanguage() {
        if (!this.isInitialized) {
            return;
        }

        this.currentLanguage = this.currentLanguage === 'en' ? 'zh' : 'en';
        localStorage.setItem('language', this.currentLanguage);
        this.applyLanguage();
        this.updateToggleButton();
    }

    /**
     * Apply current language to all elements with data-i18n
     */
    applyLanguage() {
        if (!this.isInitialized) {
            return;
        }

        document.documentElement.lang = this.currentLanguage;

        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                element.textContent = translation;
            }
        });

        // Handle alt attributes
        const altElements = document.querySelectorAll('[data-i18n-alt]');
        altElements.forEach(element => {
            const key = element.getAttribute('data-i18n-alt');
            const translation = this.getTranslation(key);
            if (translation) {
                element.setAttribute('alt', translation);
            }
        });
    }

    /**
     * Get translation by key path (e.g., "nav.features")
     */
    getTranslation(keyPath) {
        return this.translationManager.getTranslation(this.currentLanguage, keyPath);
    }

    /**
     * Update language toggle button text
     */
    updateToggleButton() {
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            const langText = langToggle.querySelector('.lang-text');
            if (langText) {
                langText.textContent = this.currentLanguage === 'en' ? 'EN | 中文' : '中文 | EN';
            }
            langToggle.setAttribute('data-lang', this.currentLanguage);
        }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Set language programmatically
     */
    setLanguage(lang) {
        if (['en', 'zh'].includes(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('language', this.currentLanguage);
            this.applyLanguage();
            this.updateToggleButton();
        }
    }
}

export default LanguageManager;