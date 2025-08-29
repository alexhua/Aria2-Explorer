/**
 * Language Management System
 * Handles bilingual content switching between English and Chinese
 */
class LanguageManager {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
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
        await this.loadTranslations();
        this.applyLanguage();
        this.bindEvents();
        this.updateToggleButton();
    }

    /**
     * Load translation data
     */
    async loadTranslations() {
        try {
            // Load English translations
            const enResponse = await fetch('data/en.json');
            this.translations.en = await enResponse.json();
            
            // Load Chinese translations
            const zhResponse = await fetch('data/zh.json');
            this.translations.zh = await zhResponse.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to inline translations if files not found
            this.loadFallbackTranslations();
        }
    }

    /**
     * Fallback translations if JSON files are not available
     */
    loadFallbackTranslations() {
        this.translations = {
            en: {
                "brand": { "name": "Aria2 Suite" },
                "nav": {
                    "features": "Features",
                    "products": "Products", 
                    "download": "Download",
                    "support": "Support"
                },
                "hero": {
                    "headline": "Complete Aria2 Download Solution",
                    "description": "Seamlessly integrate browser extension with desktop software for the ultimate downloading experience",
                    "cta_primary": "Get Started Now",
                    "cta_secondary": "Learn More",
                    "screenshot_placeholder": "App Screenshot",
                    "screenshot_note": "Coming Soon"
                }
            },
            zh: {
                "brand": { "name": "Aria2 套件" },
                "nav": {
                    "features": "功能特性",
                    "products": "产品介绍",
                    "download": "立即下载", 
                    "support": "技术支持"
                },
                "hero": {
                    "headline": "完整的 Aria2 下载解决方案",
                    "description": "浏览器扩展与桌面软件完美结合，打造极致下载体验",
                    "cta_primary": "立即开始",
                    "cta_secondary": "了解更多",
                    "screenshot_placeholder": "应用截图",
                    "screenshot_note": "即将推出"
                }
            }
        };
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
        this.currentLanguage = this.currentLanguage === 'en' ? 'zh' : 'en';
        localStorage.setItem('language', this.currentLanguage);
        this.applyLanguage();
        this.updateToggleButton();
    }

    /**
     * Apply current language to all elements with data-i18n
     */
    applyLanguage() {
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
        const keys = keyPath.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return typeof value === 'string' ? value : null;
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