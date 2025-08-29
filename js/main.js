/**
 * Main Application
 * Initializes and coordinates all application components
 */
class Aria2SuiteApp {
    constructor() {
        this.themeManager = null;
        this.languageManager = null;
        this.uiComponents = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }

    /**
     * Initialize all application components
     */
    async initializeComponents() {
        try {
            // Initialize theme manager first (for immediate theme application)
            this.themeManager = new ThemeManager();
            
            // Initialize UI components
            this.uiComponents = new UIComponents();
            
            // Initialize language manager (async due to translation loading)
            this.languageManager = new LanguageManager();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Dispatch ready event
            this.dispatchReadyEvent();
            
            console.log('Aria2 Suite application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize components:', error);
        }
    }

    /**
     * Dispatch application ready event
     */
    dispatchReadyEvent() {
        const event = new CustomEvent('aria2suite:ready', {
            detail: {
                themeManager: this.themeManager,
                languageManager: this.languageManager,
                uiComponents: this.uiComponents
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get theme manager instance
     */
    getThemeManager() {
        return this.themeManager;
    }

    /**
     * Get language manager instance
     */
    getLanguageManager() {
        return this.languageManager;
    }

    /**
     * Get UI components manager instance
     */
    getUIComponents() {
        return this.uiComponents;
    }

    /**
     * Check if application is initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Handle application errors
     */
    handleError(error, context = 'Unknown') {
        console.error(`Aria2 Suite Error [${context}]:`, error);
        
        // Show user-friendly error message
        if (this.uiComponents) {
            this.uiComponents.showNotification(
                'An error occurred. Please refresh the page.',
                'error'
            );
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clean up event listeners and resources
        this.isInitialized = false;
        console.log('Aria2 Suite application destroyed');
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Initialize application
const app = new Aria2SuiteApp();

// Make app globally available for debugging
window.Aria2Suite = app;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Aria2SuiteApp;
}