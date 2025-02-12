import { Canvas } from "./Canvas.js";
import { Easing } from "./Easing.js";
import { TRANSITION_DURATION } from "./Constants.js";

export class TransitionManager {
  constructor() {
    this.canvas = new Canvas();
    this.currentAnimation = null;
    this.nextAnimation = null;
    this.progress = 0;
    this.duration = TRANSITION_DURATION;
    this.isTransitioning = false;
    this.startTime = 0;
  }

  startTransition(fromAnimation, toAnimation) {
    this.currentAnimation = fromAnimation;
    this.nextAnimation = toAnimation;
    this.progress = 0;
    this.isTransitioning = true;
    this.startTime = performance.now();
  }

  requestFrame(currentTime) {
    if (!this.isTransitioning) {
      return this.currentAnimation?.draw();
    }

    const elapsed = currentTime - this.startTime;
    this.progress = Math.min(elapsed / this.duration, 1);

    if (this.progress >= 1) {
      this.isTransitioning = false;
      this.currentAnimation = this.nextAnimation;
      this.nextAnimation = null;
      return this.currentAnimation?.draw();
    }

    const easedProgress = Easing.easeInOutCubic(this.progress);
    return this.#blend(easedProgress);
  }

  #blend(progress) {
    const ctx = this.canvas.getContext();

    this.canvas.clear();

    if (this.currentAnimation) {
      this.currentAnimation.draw();
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(this.currentAnimation.canvas.getCanvas(), 0, 0);
    }

    if (this.nextAnimation) {
      this.nextAnimation.draw();
      ctx.globalAlpha = progress;
      ctx.drawImage(this.nextAnimation.canvas.getCanvas(), 0, 0);
    }

    return this.canvas.getImageData();
  }
}