import { Canvas } from "./Canvas.js";
import { FRAME_RATE, ANIMATION_DURATION } from "./Constants.js"

class BaseAnimation {
  constructor() {
    this.canvas = new Canvas();
    this.ctx = this.canvas.getContext();
    this.frameId = 0;
    this.totalFrames = FRAME_RATE;
    this.scaleFactor = this.canvas.getSize() / 16;
    this.duration = ANIMATION_DURATION;
  }

  setupContext() {
    this.canvas.clear();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  addShadow(color = 'rgba(0, 0, 0, 0.3)', blur = 1) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = 0.5;
    this.ctx.shadowOffsetY = 0.5;
  }

  createGradient(colorStops, x0, y0, x1, y1) {
    const gradient = this.ctx.createLinearGradient(x0, y0, x1, y1);
    colorStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    return gradient;
  }

  draw(alpha = 1) {
    this.setupContext();
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.scale(this.scaleFactor, this.scaleFactor);
    this.render();
    this.frameId = (this.frameId + 1) % this.totalFrames;
    this.ctx.restore();
    return this.canvas.getImageData();
  }

  render() {
    throw new Error('render method must be implemented');
  }
}

export class DownloadAnimation extends BaseAnimation {
  constructor() {
    super();
    this.colors = [
      [0, '#4FC3F7'],    // Light blue
      [0.5, '#2196F3'],  // Medium blue
      [1, '#1976D2']     // Dark blue
    ];
  }

  render() {
    const progress = this.frameId / this.totalFrames;
    const bounceOffset = Math.sin(progress * Math.PI * 2) * 2 + 2;

    // Draw arrow shaft
    this.addShadow('rgba(33, 150, 243, 0.3)', 2);
    this.ctx.lineWidth = 2.5;

    const gradient = this.createGradient(this.colors, 8, 0, 8, 16);
    this.ctx.strokeStyle = gradient;

    this.ctx.beginPath();
    this.ctx.moveTo(8, bounceOffset);
    this.ctx.lineTo(8, bounceOffset + 12);
    this.ctx.moveTo(4, bounceOffset + 9);
    this.ctx.lineTo(8, bounceOffset + 12);
    this.ctx.lineTo(12, bounceOffset + 9);
    this.ctx.stroke();
  }
}

export class ErrorAnimation extends BaseAnimation {
  constructor() {
    super();
    this.colors = [
      [0, '#FF5252'],    // Light red
      [0.5, '#F44336'],  // Medium red
      [1, '#D32F2F']     // Dark red
    ];
  }

  render() {
    const progress = this.frameId / this.totalFrames;
    const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.15;
    const alpha = 0.7 + Math.sin(progress * Math.PI * 2) * 0.3;

    this.ctx.save();
    this.ctx.translate(8, 8);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-8, -8);

    const gradient = this.createGradient(
      this.colors.map(([stop, color]) => [
        stop,
        color.replace(')', `, ${alpha})`)
      ]),
      4, 4, 12, 12
    );

    this.addShadow('rgba(255, 0, 0, 0.4)', 3);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 3;

    // Draw X with curved lines
    this.ctx.beginPath();
    this.ctx.moveTo(4, 4);
    this.ctx.quadraticCurveTo(8, 8, 13, 13);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(13, 4);
    this.ctx.quadraticCurveTo(8, 8, 4, 13);
    this.ctx.stroke();

    this.ctx.restore();
  }
}

export class CompleteAnimation extends BaseAnimation {
  constructor() {
    super();
    this.colors = [
      [0, '#64DD17'],    // Light green
      [0.5, '#4CAF50'],  // Medium green
      [1, '#388E3C']     // Dark green
    ];
    // Checkmark path points
    this.pathPoints = [
      [2, 8],    // Start point
      [7, 14],   // Corner point
      [15, 4]    // End point
    ];
  }

  render() {
    const progress = this.frameId / this.totalFrames;

    // Calculate animation progress for drawing the checkmark
    const drawProgress = Math.min(1, progress * 1.5);

    // Add shadow effect
    this.addShadow('rgba(76, 175, 80, 0.3)', 2);
    this.ctx.lineWidth = 2.5;

    // Create gradient for stroke
    const gradient = this.createGradient(
      this.colors,
      this.pathPoints[0][0],
      this.pathPoints[0][1],
      this.pathPoints[2][0],
      this.pathPoints[2][1]
    );
    this.ctx.strokeStyle = gradient;

    // Draw animated checkmark
    this.ctx.beginPath();
    this.ctx.moveTo(this.pathPoints[0][0], this.pathPoints[0][1]);

    // First segment (down-right)
    if (drawProgress <= 0.5) {
      const t = drawProgress * 2;
      const x = this.pathPoints[0][0] + (this.pathPoints[1][0] - this.pathPoints[0][0]) * t;
      const y = this.pathPoints[0][1] + (this.pathPoints[1][1] - this.pathPoints[0][1]) * t;
      this.ctx.lineTo(x, y);
    } else {
      this.ctx.lineTo(this.pathPoints[1][0], this.pathPoints[1][1]);

      // Second segment (up-right)
      const t = (drawProgress - 0.5) * 2;
      const x = this.pathPoints[1][0] + (this.pathPoints[2][0] - this.pathPoints[1][0]) * t;
      const y = this.pathPoints[1][1] + (this.pathPoints[2][1] - this.pathPoints[1][1]) * t;
      this.ctx.lineTo(x, y);
    }

    this.ctx.stroke();
  }
}

export class ProgressAnimation extends BaseAnimation {
  constructor() {
    super();
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.animationSpeed = 0.02;
    this.ctx.lineWidth = 1.5;
    this.colors = [
      [0, '#4FC3F7'],    // Light blue
      [0.5, '#2196F3'],  // Medium blue
      [1, '#1976D2']     // Dark blue
    ];
  }

  setProgress(progress) {
    this.targetProgress = Math.max(0, Math.min(1, progress));
  }

  #updateProgress() {
    if (this.currentProgress !== this.targetProgress) {
      const diff = this.targetProgress - this.currentProgress;
      if (Math.abs(diff) < this.animationSpeed) {
        this.currentProgress = this.targetProgress;
      } else {
        this.currentProgress += diff > 0 ? this.animationSpeed : -this.animationSpeed;
      }
    }
  }

  #drawArrow() {
    const gradient = this.createGradient(this.colors, 8, 0, 8, 16);

    this.ctx.beginPath();

    // Arrow shaft
    this.ctx.moveTo(8, 4);
    this.ctx.lineTo(8, 12);

    // Arrow head
    this.ctx.lineTo(5, 9);
    this.ctx.moveTo(8, 12);
    this.ctx.lineTo(11, 9);

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = gradient;
    this.ctx.stroke();
  }

  #drawProgressCircle() {
    const centerX = 8;
    const centerY = 8;
    const radius = 7;

    // Background circle
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(33, 150, 243, 0.2)';
    this.ctx.stroke();

    const gradient = this.ctx.createConicGradient(
      -Math.PI / 2,
      centerX,
      centerY
    );

    gradient.addColorStop(0, this.colors[0][1]);
    gradient.addColorStop(this.currentProgress, this.colors[2][1]);
    gradient.addColorStop(1, this.colors[0][1]);

    // Progress arc
    this.ctx.beginPath();
    this.ctx.arc(
      centerX,
      centerY,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + this.currentProgress * Math.PI * 2
    );
    this.ctx.strokeStyle = gradient;
    this.ctx.stroke();
  }

  render() {
    this.addShadow('rgba(33, 150, 243, 0.3)', 2);

    this.#updateProgress();
    this.ctx.clearRect(0, 0, 16, 16);

    this.#drawProgressCircle();
    this.#drawArrow();
  }
}

export class PauseAnimation extends BaseAnimation {
  constructor() {
    super();
    this.duration = 3010;
    this.colors = [
      [0, '#4FC3F7'],    // Light blue
      [0.5, '#2196F3'],  // Medium blue
      [1, '#1976D2']     // Dark blue   
    ];
  }

  render() {

    // Draw circle
    this.ctx.beginPath();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(33, 150, 243, .6)';
    this.ctx.arc(8, 8, 7, 0, Math.PI * 2);
    this.ctx.stroke();

    // set round conner
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw pause symbol
    this.addShadow('rgba(3, 169, 244, 0.2)', 1);
    const gradient = this.createGradient(this.colors, 0, 0, 16, 16);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 1.5;

    // left line
    this.ctx.beginPath();
    this.ctx.moveTo(6.75, 5);
    this.ctx.lineTo(6.75, 11);
    this.ctx.stroke();

    // right line
    this.ctx.beginPath();
    this.ctx.moveTo(9.25, 5);
    this.ctx.lineTo(9.25, 11);
    this.ctx.stroke();
  }
}