"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.NotImplementedError = exports.Inky = void 0;
let resvg;
try {
    resvg = require('@resvg/resvg-js').renderAsync;
}
catch (err) {
    console.trace("ReSVG is not available");
}
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const pngjs_1 = require("pngjs");
// inky class
class Inky {
    constructor(width, height, colour = 'multi', h_flip = false, v_flip = false) {
        this.width = width;
        this.height = height;
        this.border_colour = 0;
        this.cols = this.width;
        this.rows = this.height;
        this.h_flip = h_flip;
        this.v_flip = v_flip;
        this.colour = colour;
        this.lut = colour;
        this.palette = [[0, 0, 0], [255, 255, 255]];
        this.buf = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
    }
    log_buffer() {
        for (let y = 0; y < this.height; y++) {
            let line = [];
            for (let x = 0; x < this.width; x++) {
                let colour = this.palette[this.buf[y][x]];
                line.push(chalk_1.default.rgb(...colour).bold("■"));
            }
            console.log(...line);
        }
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new NotImplementedError("send_command");
        });
    }
    set_pixel(x, y, colour_index) {
        throw new NotImplementedError("send_command");
    }
    show(busy_wait = true) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new NotImplementedError("show");
        });
    }
    display_png(path, saturation = 0.9, dithering = 0.75) {
        var data = (0, fs_1.readFileSync)(path);
        var image = pngjs_1.PNG.sync.read(data);
        this.display_buffered_image(image.data, saturation, dithering);
    }
    display_svg(path, saturation, dithering, options = {}) {
        var data = (0, fs_1.readFileSync)(path).toString("utf8");
        this.display_mem_svg(data, saturation, dithering, options);
    }
    display_mem_png(data, saturation = 0.9, dithering = 0.75) {
        var image = pngjs_1.PNG.sync.read(data);
        this.display_buffered_image(image.data, saturation, dithering);
    }
    group_array(array, n) {
        return [...Array(Math.ceil(array.length / n))].map((el, i) => array.slice(i * n, (i + 1) * n));
    }
    getSmallestInArray(a) {
        var lowest = 0;
        for (var i = 1; i < a.length; i++) {
            if (a[i] < a[lowest])
                lowest = i;
        }
        return lowest;
    }
    getClosestColour(pixel, palette) {
        // based on https://github.com/ccpalettes/gd-indexed-color-converter/blob/master/src/GDIndexedColourConverter.php
        let distances = palette.map((colour) => {
            return this.calculateEuclideanDistanceSquare(pixel, colour);
        });
        let minIndex = this.getSmallestInArray(distances);
        return palette[minIndex];
    }
    calculateEuclideanDistanceSquare(q, p) {
        let dist = (Math.pow((q[0] - p[0]), 2)) + (Math.pow((q[1] - p[1]), 2)) + (Math.pow((q[2] - p[2]), 2));
        return dist;
    }
    getPalette(saturation) {
        return this.palette;
    }
    convertToIndexedColour(image, saturation = 0.5, dithering = 0.75) {
        return this.floydSteinbergDither(image, this.width, this.height, this.getPalette(saturation), dithering);
    }
    RGBtoPalette(rgb, palette) {
        return palette.findIndex((ele) => ele === rgb);
    }
    floydSteinbergDither(image, width, height, palette, amount) {
        let nextRowColourStorage = [];
        for (let i = 0; i < height; i++) {
            let currentRowColourStorage = nextRowColourStorage;
            for (let j = 0; j < width; j++) {
                let colour;
                if (i === 0 && j === 0) {
                    colour = image[i][j];
                }
                else {
                    colour = currentRowColourStorage[j];
                }
                let closestColour = this.getClosestColour(colour, palette);
                if (j < width - 1) {
                    if (i === 0) {
                        currentRowColourStorage[j + 1] = image[i][j + 1];
                    }
                }
                if (i < height - 1) {
                    if (j === 0) {
                        nextRowColourStorage[j] = image[i + 1][j];
                    }
                    if (j < width - 1) {
                        nextRowColourStorage[j + 1] = image[i + 1][j + 1];
                    }
                }
                closestColour.forEach((channel, key) => {
                    let quantError = colour[key] - closestColour[key];
                    if (j < width - 1) {
                        currentRowColourStorage[j + 1][key] += quantError * 7 / 16 * amount;
                    }
                    if (i < height - 1) {
                        if (j > 0) {
                            nextRowColourStorage[j - 1][key] += quantError * 3 / 16 * amount;
                        }
                        nextRowColourStorage[j][key] += quantError * 5 / 16 * amount;
                        if (j < width - 1) {
                            nextRowColourStorage[j + 1][key] += quantError * 1 / 16 * amount;
                        }
                    }
                });
                let i_colour = this.RGBtoPalette(closestColour, palette);
                this.set_pixel(j, i, i_colour);
            }
        }
    }
    display_mem_svg(svg, saturation = 0.5, dithering = 0.75, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let rendered = yield this.svg_to_rendered(svg, options);
            let buff = this.rendered_to_buffered_image(rendered);
            this.display_buffered_image(buff, saturation, dithering);
        });
    }
    svg_to_rendered(svg, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (resvg === undefined)
                throw new Error("resvg is required to use the SVG tools - install using 'npm install @resvg/resvg-js");
            return resvg(svg, options);
        });
    }
    rendered_to_png(render) {
        return render.asPng();
    }
    rendered_to_buffered_image(render) {
        return render.pixels;
    }
    display_buffered_image(buf, saturation, dithering) {
        let image = this.group_array(this.group_array([...buf], 4), this.width);
        this.convertToIndexedColour(image, saturation, dithering);
    }
    emulate(path, svg, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let render = yield this.svg_to_rendered(svg, options);
            let png = this.rendered_to_png(render);
            (0, fs_1.writeFileSync)(path, png, { flag: "w" });
        });
    }
}
exports.Inky = Inky;
// error class
class NotImplementedError extends Error {
    constructor(message = "") {
        super(message);
        this.message = message + " has not yet been implemented.";
    }
}
exports.NotImplementedError = NotImplementedError;
//utility function
function delay(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
exports.delay = delay;
