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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inky_Colour = void 0;
const inky_1 = require("./inky");
const BLACK = 0;
const WHITE = 1;
const GREEN = 2;
const BLUE = 3;
const RED = 4;
const YELLOW = 5;
const ORANGE = 6;
const CLEAN = 7;
class Inky_Colour extends inky_1.Inky {
    constructor() {
        super(...arguments);
        this.DESATURATED_PALETTE = [
            [0, 0, 0],
            [255, 255, 255],
            [0, 255, 0],
            [0, 0, 255],
            [255, 0, 0],
            [255, 255, 0],
            [255, 140, 0],
            [255, 255, 255] // Clear
        ];
        this.SATURATED_PALETTE = [
            [57, 47, 57],
            [255, 255, 255],
            [58, 91, 70],
            [61, 59, 94],
            [156, 72, 75],
            [208, 190, 71],
            [177, 106, 73],
            [255, 255, 255] // Clear
        ];
    }
    // SATURATED_PALETTE: Palette = [
    //     [0, 0, 0],        // Black
    //     [217, 242, 255],  // White
    //     [3, 124, 76],     // Green
    //     [27, 46, 198],    // Blue
    //     [245, 80, 34],    // Red
    //     [255, 255, 68],   // Yellow
    //     [239, 121, 44],   // Orange
    //     [255, 255, 255]   // Clear
    // ];
    getPalette(saturation) {
        return this.palette_blend(saturation);
    }
    palette_blend(saturation) {
        let palette = [];
        for (let i = 0; i < 7; i++) {
            let [rs, gs, bs] = this.SATURATED_PALETTE[i].map(col => {
                return col * saturation;
            });
            let [rd, gd, bd] = this.DESATURATED_PALETTE[i].map(col => {
                return col * (1 - saturation);
            });
            palette.push([Math.round(rs + rd), Math.round(gs + gd), Math.round(bs + bd)]);
        }
        return palette;
    }
    set_pixel(x, y, colour_index) {
        /* Set a single pixel.
    
        :param x: x position on display
        :param y: y position on display
        :param v: colour to set
    
         */
        if (x < 0 || x > this.width - 1) {
            throw new Error(`Pixel is outside of dimensions of screen (${this.width}x${this.height}): x=${x}`);
        }
        if (y < 0 || y > this.height - 1) {
            throw new Error(`Pixel is outside of dimensions of screen (${this.width}x${this.height}): y=${y}`);
        }
        if (colour_index < 0 || colour_index >= this.DESATURATED_PALETTE.length) {
            throw new Error(`Colour is not a valid index: ${colour_index}`);
        }
        this.buf[y][x] = colour_index & 0x07;
    }
    set_border(colour) {
        /* Set the border colour. */
        if ([BLACK, WHITE, GREEN, BLUE, RED, YELLOW, ORANGE, CLEAN].includes(colour)) {
            this.border_colour = colour;
        }
    }
    show(busy_wait = true) {
        return __awaiter(this, void 0, void 0, function* () {
            /* Show buffer on display.
        
            :param busy_wait: If True, wait for display update to finish before returning.
        
             */
            let region = this.buf;
            if (this.h_flip)
                region = region.map((row) => row.reverse());
            if (!this.v_flip)
                region = region.reverse();
            //!if (this.rotation) region = numpy.rot90(region, this.rotation / 90)
            let buf = region.flat();
            let output = [];
            for (let i = 0; i < buf.length; i += 2) {
                let even = buf[i];
                let odd = buf[i + 1];
                let res = ((even << 4) & 0xF0) | (odd & 0x0F);
                output.push(res);
            }
            yield this.update(output);
        });
    }
    update(buf) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new inky_1.NotImplementedError();
        });
    }
}
exports.Inky_Colour = Inky_Colour;
