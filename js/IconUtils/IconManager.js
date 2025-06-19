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
    '16': "images/logo16.png",
    '32': "images/logo32.png",
    '48': "images/logo48.png"
  },
  'Grey': {
    '16': "images/logo16-grey.png",
    '32': "images/logo32-grey.png",
  },
  'Dark': {
    '16': "images/logo16-dark.png",
    '32': "images/logo32-dark.png",
  },
  'Dusk': {
    '16': "images/logo16-dusk.png",
    '32': "images/logo32-dusk.png"
  }
}