import { DownloadAnimation, CompleteAnimation, ErrorAnimation, ProgressAnimation, PauseAnimation } from './Animation.js';
import { FRAME_INTERVAL, FADE_INTERVAL } from './Constants.js';
import { IconManager } from './IconManager.js';
import { TransitionManager } from './TransitionManager.js';

/**
 * AnimationController - Controls browser icon animations
 * Singleton pattern to ensure only one animation controller exists globally
 */
export class AnimationController {
  static #instance = null;

  constructor() {
    // Enforce singleton pattern
    if (AnimationController.#instance) {
      return AnimationController.#instance;
    }

    this.transitionManager = new TransitionManager();
    this.intervalId = null;
    this.timeoutId = null;
    this.fadeIntervalId = null;
    this.progressAnimation = null;
    // Add state management
    this.isBlocked = false;
    this.blockEndTime = 0;
    // Priority animations that cannot be interrupted
    this.priorityAnimations = new Set(['Complete', 'Error']);

    AnimationController.#instance = this;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!AnimationController.#instance) {
      AnimationController.#instance = new AnimationController();
    }
    return AnimationController.#instance;
  }

  start(type, progress) {
    // Check if blocked and if this is a priority animation
    const currentTime = performance.now();
    const isPriorityAnimation = this.priorityAnimations.has(type);

    // If currently blocked and not a priority animation, ignore
    if (this.isBlocked && currentTime < this.blockEndTime && !isPriorityAnimation) {
      return;
    }

    let newAnimation = null;
    switch (type) {
      case 'Download':
        newAnimation = new DownloadAnimation();
        break;
      case 'Pause':
        newAnimation = new PauseAnimation();
        break;
      case 'Complete':
        newAnimation = new CompleteAnimation();
        // Block for the full duration to prevent interruption
        this.#setBlocked(newAnimation.duration * 0.5);
        break;
      case 'Error':
        newAnimation = new ErrorAnimation();
        // Block for the full duration to prevent interruption
        this.#setBlocked(newAnimation.duration * 0.5);
        break;
      case 'Progress':
        if (progress < 0 || progress > 1) {
          console.error("AnimationController: Invalid progress value.")
          return;
        }
        if (!this.progressAnimation) {
          this.progressAnimation = new ProgressAnimation();
        }
        newAnimation = this.progressAnimation;
        this.progressAnimation.setProgress(progress);
        break;
      default:
        throw new Error(`AnimationController: Invalid animation type: ${type}`);
    }

    const currentAnimation = this.transitionManager.isTransitioning ?
      this.transitionManager.nextAnimation : this.transitionManager.currentAnimation;

    // Start transition between different animation
    if (currentAnimation?.constructor !== newAnimation.constructor) {
      this.transitionManager.startTransition(currentAnimation, newAnimation);
    } else if (!this.transitionManager.isTransitioning) {
      this.transitionManager.currentAnimation = newAnimation;
    }

    // Stop existing fadeout
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }

    // Start animation loop
    if (!this.intervalId) {
      this.#startAnimationLoop();
    }

    // Clear any existing timeout auto-stop
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Set new timeout for auto-stop
    this.timeoutId = setTimeout(() => {
      this.#stop();
    }, newAnimation.duration);
  }

  #startAnimationLoop() {
    this.intervalId = setInterval(async () => {
      const currentTime = performance.now();
      const imageData = this.transitionManager.requestFrame(currentTime);
      if (imageData) {
        await IconManager.setIconImage(imageData);
      }
    }, FRAME_INTERVAL);
  }

  // Set blocked state
  #setBlocked(duration) {
    this.isBlocked = true;
    this.blockEndTime = performance.now() + duration;

    // Set timer to clear blocked state
    setTimeout(() => {
      this.isBlocked = false;
    }, duration);
  }

  async #stop() {
    // Clear the auto-stop timeout if it exists
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
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
        await IconManager.setIconImage(imageData);

        if (progress >= 1) {
          clearInterval(this.fadeIntervalId);
          this.fadeIntervalId = null;
          this.transitionManager.currentAnimation = null;
          await IconManager.restore();
        }
      }, FADE_INTERVAL);
    } else {
      await IconManager.restore();
    }
  }
}
