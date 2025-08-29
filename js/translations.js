/**
 * Translation Manager
 * Handles dynamic loading of translation modules
 */
class TranslationManager {
    constructor() {
        this.translations = {};
        this.loadedLanguages = new Set();
    }

    /**
     * Load translation for a specific language
     */
    async loadLanguage(lang) {
        if (this.loadedLanguages.has(lang)) {
            return this.translations[lang];
        }

        try {
            const module = await import(`../langs/${lang}.js`);
            this.translations[lang] = module.default;
            this.loadedLanguages.add(lang);
            return this.translations[lang];
        } catch (error) {
            console.error(`Failed to load language ${lang}:`, error);
            throw error;
        }
    }

    /**
     * Load multiple languages
     */
    async loadLanguages(languages) {
        const promises = languages.map(lang => this.loadLanguage(lang));
        await Promise.all(promises);
        return this.translations;
    }

    /**
     * Get translation by key path
     */
    getTranslation(lang, keyPath) {
        if (!this.translations[lang]) {
            return null;
        }

        const keys = keyPath.split('.');
        let value = this.translations[lang];

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
     * Check if language is loaded
     */
    isLanguageLoaded(lang) {
        return this.loadedLanguages.has(lang);
    }

    /**
     * Get all loaded languages
     */
    getLoadedLanguages() {
        return Array.from(this.loadedLanguages);
    }
}

export default TranslationManager;