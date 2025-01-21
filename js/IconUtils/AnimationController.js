import { DownloadAnimation, CompleteAnimation, ErrorAnimation } from './Animation.js';
import { INTERVAL, FADE_INTERVAL, ANIMATION_DURATION } from './Constants.js';
import { IconManager } from './IconManager.js';
import { TransitionManager } from './TransitionManager.js';

export class AnimationController {
  constructor() {
    this.transitionManager = new TransitionManager();
    this.intervalId = null;
    this.timeOutId = null;
    this.fadeIntervalId = null;
  }

  start(type) {
    let newAnimation = null;
    switch (type) {
      case 'Download':
        newAnimation = new DownloadAnimation();
        break;
      case 'Complete':
        newAnimation = new CompleteAnimation();
        break;
      case 'Error':
        newAnimation = new ErrorAnimation();
        break;
      default:
        throw new Error(`Invalid animation type: ${type}`);
    }

    if (this.transitionManager.currentAnimation) {
      this.transitionManager.startTransition(
        this.transitionManager.currentAnimation,
        newAnimation
      );
    } else {
      this.transitionManager.currentAnimation = newAnimation;
    }

    if (!this.intervalId) {
      this.startAnimationLoop();
    }

    // Clear any existing timeout
    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
    }

    // Set new timeout for auto-stop
    this.timeOutId = setTimeout(() => {
      this.#stop();
    }, ANIMATION_DURATION);

    // Stop existing fadeout
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }
  }

  startAnimationLoop() {
    this.intervalId = setInterval(async () => {
      const currentTime = performance.now();
      const imageData = this.transitionManager.update(currentTime);
      if (imageData) {
        await IconManager.setIcon(imageData);
      }
    }, INTERVAL);
  }

  async #stop() {
    // Clear the auto-stop timeout if it exists
    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
      this.timeOutId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.transitionManager.currentAnimation) {
      let progress = 0;
      this.fadeIntervalId = setInterval(async () => {
        progress += 0.1;
        const imageData = this.transitionManager.currentAnimation.draw(1 - progress);
        await IconManager.setIcon(imageData);

        if (progress >= 1) {
          clearInterval(this.fadeIntervalId);
          this.fadeIntervalId = null;
          this.transitionManager.currentAnimation = null;
          await IconManager.setToDefault();
        }
      }, FADE_INTERVAL);
    } else {
      await IconManager.setToDefault();
    }
  }
}