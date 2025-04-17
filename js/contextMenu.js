// ContextMenus.js
/**
 * Context menu utility for Chrome extensions
 * Drop-in replacement for chrome.contextMenus with ID tracking
 */
class ContextMenu {
    constructor() {
        this.menuIds = new Set();
        this.isInIncognito = chrome.extension.inIncognitoContext;
    }

    /**
     * Creates a context menu item
     * @param {Object} createProperties - Menu properties
     * @param {Function} [callback] - Called when operation completes
     * @returns {Number|String} The ID of the newly created item
     */
    create(createProperties, callback) {
        if (typeof createProperties !== 'object') {
            throw new TypeError('createProperties must be an object');
        }

        if (callback && typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }

        if (!createProperties.id) {
            createProperties.id = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        chrome.contextMenus.create(createProperties, () => {
            if (chrome.runtime.lastError) {
                // Do nothing, maybe already existed.
                // console.error(chrome.runtime.lastError.message);
            }
            // Add the id anyway
            this.menuIds.add(createProperties.id);
            if (callback) callback();
        });

        return createProperties.id;
    }

    /**
     * Removes a specific menu item
     * @param {string} menuId - ID of the menu to remove
     * @param {Function} [callback] - Called when operation completes
     * @returns {Promise} Promise that resolves when menu is removed
     */
    remove(menuId, callback) {
        if (callback && typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }

        return chrome.contextMenus.remove(menuId, () => {
            this.menuIds.delete(menuId);
            if (callback) callback();
            if (chrome.runtime.lastError) {
                // Do nothing，maybe already removed by parent id.
                // console.error(chrome.runtime.lastError.message);
            }
        });
    }

    /**
     * Removes all menu items created by this instance
     * @param {Function} [callback] - Called when operation completes
     * @returns {Promise} Promise that resolves when all menus are removed
     */
    removeAll(callback) {
        if (callback && typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }

        const menuIds = [...this.menuIds];

        if (menuIds.length === 0) {
            if (callback) callback();
            return Promise.resolve();
        }

        const promises = menuIds.map(id => this.remove(id));
        return Promise.all(promises).then(() => {
            if (callback) callback();
        });
    }

    /**
     * Updates an existing menu item
     * @param {string} menuId - ID of the menu to update
     * @param {Object} updateProperties - Properties to update
     * @param {Function} [callback] - Called when operation completes
     * @returns {Promise} Promise that resolves when menu is updated
     */
    update(menuId, updateProperties, callback) {
        return chrome.contextMenus.update(menuId, updateProperties, callback);
    }

    /**
     * Returns all menu IDs managed by this instance
     * @returns {Array} Array of menu IDs
     */
    getMenuIds() {
        return [...this.menuIds];
    }

    /**
     * Forwards the native onClicked event
     */
    get onClicked() {
        return chrome.contextMenus.onClicked;
    }
}

// Export the class, not an instance
export default ContextMenu;