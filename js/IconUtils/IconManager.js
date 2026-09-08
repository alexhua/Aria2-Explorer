export class IconManager {
  static IconStyle = 'Default';

  static async setIconImage(imageData) {
    try {
      await chrome.action.setIcon({ imageData });
    } catch (error) {
      console.error('Failed to set extension icon image:', error);
    }
  }

  static async setIconPath(iconStyle = 'Default') {
    try {
      IconManager.IconStyle = iconStyle;
      await chrome.action.setIcon({ path: IconSet[iconStyle] });
    } catch (error) {
      console.error('Failed to set extension icon path:', error);
    }
  }

  static async restore() {
    await this.setIconPath(IconManager.IconStyle);
  }

  static async turnOn() {
    await this.setIconPath('Default');
  }

  static async turnOff(iconStyle = 'Dusk') {
    await this.setIconPath(iconStyle);
  }
}

const IconSet = {
  'Default': {
    '32': "images/logo32.png",
    '48': "images/logo48.png",
    '64': "images/logo64.png",
    '128': "images/logo128.png"
  },
  'Grey': {
    '32': "images/logo32-grey.png",
  },
  'Dark': {
    '32': "images/logo32-dark.png",
  },
  'Dusk': {
    '32': "images/logo32-dusk.png"
  }
}