import { CANVAS_SIZE } from './Constants.js';

export class Canvas {
    constructor() {
        this.canvas = new OffscreenCanvas(CANVAS_SIZE, CANVAS_SIZE);
        // Turn on 'willReadFrequently' to use CPU rendering to avoid frequent data copying
        // since getImageData will be called at every animation frame
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    clear() {
        this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    getImageData() {
        return this.ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    getContext() {
        return this.ctx;
    }

    getCanvas() {
        return this.canvas;
    }

    getSize() {
        return CANVAS_SIZE;
    }
}