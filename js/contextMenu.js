// ContextMenus.js
/**
 * Context menu utility for Chrome extensions.
 * 
 * Wraps chrome.contextMenus with per-instance ID tracking to avoid
 * the Chrome bug where removeAll() in incognito also clears normal-mode menus.
 */
class ContextMenu {
    constructor() {
        this.menuIds = new Set();
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

        const id = createProperties.id;

        chrome.contextMenus.create(createProperties, () => {
            if (chrome.runtime.lastError) {
                // Do nothing, maybe already existed.
                // console.error(chrome.runtime.lastError.message);
            }
            // Add the id anyway
            this.menuIds.add(id);
            if (callback) callback();
        });

        return id;
    }

    /**
     * Removes a specific menu item
     * @param {string} menuId - ID of the menu to remove
     * @returns {Promise} Promise that resolves when menu is removed
     */
    async remove(menuId) {
        try {
            await chrome.contextMenus.remove(menuId);
        } catch (error) {
            // Ignore - maybe already removed by parent id
        } finally {
            this.menuIds.delete(menuId);
        }
    }

    /**
     * Removes all menu items created by this instance
     * @returns {Promise} Promise that resolves when all menus are removed
     */
    removeAll() {
        const menuIds = [...this.menuIds];
        if (menuIds.length === 0) return Promise.resolve();
        return Promise.all(menuIds.map(id => this.remove(id)));
    }

    /**
     * Updates an existing menu item
     * @param {string} menuId - ID of the menu to update
     * @param {Object} updateProperties - Properties to update
     * @returns {Promise} Promise that resolves when menu is updated
     */
    update(menuId, updateProperties) {
        return chrome.contextMenus.update(menuId, updateProperties);
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