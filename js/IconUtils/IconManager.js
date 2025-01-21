export class IconManager {
  static async setIcon(imageData) {
    try {
      await chrome.action.setIcon({ imageData });
    } catch (error) {
      console.error('Failed to set extension icon:', error);
    }
  }

  static async setToDefault() {
    try {
      await chrome.action.setIcon({
        path: {
          '32': "images/logo32.png",
          '64': "images/logo64.png",
          '128': "images/logo128.png",
          '256': "images/logo256.png"
        }
      });
    } catch (error) {
      console.error('Failed to reset extension icon:', error);
    }
  }

  static async setToDark() {
    try {
      await chrome.action.setIcon({
        path: {
          '32': "images/logo32-dark.png",
          '64': "images/logo64-dark.png",
          '128': "images/logo128-dark.png",
          '256': "images/logo256-dark.png"
        }
      });
    } catch (error) {
      console.error('Failed to reset extension icon:', error);
    }
  }
}