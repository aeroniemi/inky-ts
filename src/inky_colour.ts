import { Inky, NotImplementedError } from "./inky";
export type Colour = [number, number, number]
export type Palette = Array<Colour>
const BLACK = 0;
const WHITE = 1;
const GREEN = 2;
const BLUE = 3;
const RED = 4;
const YELLOW = 5;
const ORANGE = 6;
const CLEAN = 7;

export class Inky_Colour extends Inky {
    DESATURATED_PALETTE: Palette = [
        [0, 0, 0],        // Black
        [255, 255, 255],  // White
        [0, 255, 0],      // Green
        [0, 0, 255],      // Blue
        [255, 0, 0],      // Red
        [255, 255, 0],    // Yellow
        [255, 140, 0],    // Orange
        [255, 255, 255]   // Clear
    ];

    SATURATED_PALETTE: Palette = [
        [57, 47, 57],        // Black
        [255, 255, 255],  // White
        [58, 91, 70],     // Green
        [61, 59, 94],    // Blue
        [156, 72, 75],    // Red
        [208, 190, 71],   // Yellow
        [177, 106, 73],   // Orange
        [255, 255, 255]   // Clear
    ];

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
    public getPalette(saturation: number) {
        return this.palette_blend(saturation)
    }
    private palette_blend(saturation: number) {
        let palette: Palette = [];
        for (let i = 0; i < 7; i++) {
            let [rs, gs, bs] = this.SATURATED_PALETTE[i].map(col => {
                return col * saturation as number
            })
            let [rd, gd, bd] = this.DESATURATED_PALETTE[i].map(col => {
                return col * (1 - saturation) as number
            })
            palette.push([Math.round(rs + rd), Math.round(gs + gd), Math.round(bs + bd)])
        }
        return palette

    }
    public set_pixel(x: number, y: number, colour_index: number) {
        /* Set a single pixel.
    
        :param x: x position on display
        :param y: y position on display
        :param v: colour to set
    
         */

        if (x < 0 || x > this.width - 1) {
            throw new Error(`Pixel is outside of dimensions of screen (${this.width}x${this.height}): x=${x}`)
        }
        if (y < 0 || y > this.height - 1) {
            throw new Error(`Pixel is outside of dimensions of screen (${this.width}x${this.height}): y=${y}`)
        }
        if (colour_index < 0 || colour_index >= this.DESATURATED_PALETTE.length) {
            throw new Error(`Colour is not a valid index: ${colour_index}`)
        }


        this.buf[y][x] = colour_index & 0x07;
    }
    public set_border(colour: number) {
        /* Set the border colour. */
        if ([BLACK, WHITE, GREEN, BLUE, RED, YELLOW, ORANGE, CLEAN].includes(colour)) {
            this.border_colour = colour;
        }
    }
    public async show(busy_wait = true) {
        /* Show buffer on display.
    
        :param busy_wait: If True, wait for display update to finish before returning.
    
         */
        let region = this.buf;

        if (this.h_flip) region = region.map((row) => row.reverse())
        if (!this.v_flip) region = region.reverse()
        //!if (this.rotation) region = numpy.rot90(region, this.rotation / 90)

        let buf = region.flat();
        let output: number[] = []
        for (let i = 0; i < buf.length; i += 2) {
            let even = buf[i]
            let odd = buf[i + 1]
            let res = ((even << 4) & 0xF0) | (odd & 0x0F);
            output.push(res)
        }
        await this.update(output);
    }
    protected async update(buf: number[]) {
        throw new NotImplementedError()
    }
}