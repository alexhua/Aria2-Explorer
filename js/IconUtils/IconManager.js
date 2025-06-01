export class IconManager {
  static IconType = 'Default';
  static async setIcon(imageData) {
    try {
      await chrome.action.setIcon({ imageData });
    } catch (error) {
      console.error('Failed to set extension icon:', error);
    }
  }

  static async restore() {
    if (IconManager.IconType == 'Default') {
      await this.setToDefault();
    } else if (IconManager.IconType == 'Dark') {
      await this.setToDark();
    } else {
      throw new Error("IconManager: Invalid icon type");
    }
  }

  static async setToDefault() {
    try {
      IconManager.IconType = 'Default';
      await chrome.action.setIcon({
        path: {
          '16': "images/logo16.png",
          '32': "images/logo32.png",
          '48': "images/logo48.png"
        }
      });
    } catch (error) {
      console.error('Failed to reset extension icon:', error);
    }
  }

  static async setToDark() {
    try {
      IconManager.IconType = 'Dark';
      await chrome.action.setIcon({
        path: {
          '16': "images/logo16-dusk.png",
          '32': "images/logo32-dusk.png",
          '48': "images/logo48-dusk.png"
        }
      });
    } catch (error) {
      console.error('Failed to reset extension icon:', error);
    }
  }
}