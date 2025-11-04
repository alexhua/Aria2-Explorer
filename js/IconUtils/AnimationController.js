import { DownloadAnimation, CompleteAnimation, ErrorAnimation, ProgressAnimation, PauseAnimation } from './Animation.js';
import { FRAME_INTERVAL, FADE_INTERVAL } from './Constants.js';
import { IconManager } from './IconManager.js';
import { TransitionManager } from './TransitionManager.js';

export class AnimationController {
  constructor() {
    this.transitionManager = new TransitionManager();
    this.intervalId = null;
    this.timeoutId = null;
    this.fadeIntervalId = null;
    this.progressAnimation = null;
    // 添加状态管理
    this.isBlocked = false;
    this.blockEndTime = 0;
    this.priorityAnimations = new Set(['Complete', 'Error']);
  }

  start(type, progress) {
    // 检查是否被阻塞，以及是否是优先级动画
    const currentTime = performance.now();
    const isPriorityAnimation = this.priorityAnimations.has(type);
    
    // 如果当前被阻塞且不是优先级动画，则忽略
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
        this.#setBlocked(newAnimation.duration * 0.5);
        break;
      case 'Error':
        newAnimation = new ErrorAnimation();
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

  // 设置阻塞状态
  #setBlocked(duration) {
    this.isBlocked = true;
    this.blockEndTime = performance.now() + duration;
    
    // 设置定时器清除阻塞状态
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
