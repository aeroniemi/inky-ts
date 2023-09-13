var rpio = require("rpio")
var PNG = require("pngjs").PNG;
import { readFileSync } from 'fs'
import chalk from 'chalk';
const BLACK = 0;
const WHITE = 1;
const GREEN = 2;
const BLUE = 3;
const RED = 4;
const YELLOW = 5;
const ORANGE = 6;
const CLEAN = 7;

const RESET_PIN = 27;
const BUSY_PIN = 17;
const DC_PIN = 22;

const MOSI_PIN = 10;
const SCLK_PIN = 11;
const CS0_PIN = 8;

const AC073TC1_PSR = 0x00;
const AC073TC1_PWR = 0x01;
const AC073TC1_POF = 0x02;
const AC073TC1_POFS = 0x03;
const AC073TC1_PON = 0x04;
const AC073TC1_BTST1 = 0x05;
const AC073TC1_BTST2 = 0x06;
const AC073TC1_DSLP = 0x07;
const AC073TC1_BTST3 = 0x08;
const AC073TC1_DTM = 0x10;
const AC073TC1_DSP = 0x11;
const AC073TC1_DRF = 0x12;
const AC073TC1_IPC = 0x13;
const AC073TC1_PLL = 0x30;
const AC073TC1_TSC = 0x40;
const AC073TC1_TSE = 0x41;
const AC073TC1_TSW = 0x42;
const AC073TC1_TSR = 0x43;
const AC073TC1_CDI = 0x50;
const AC073TC1_LPD = 0x51;
const AC073TC1_TCON = 0x60;
const AC073TC1_TRES = 0x61;
const AC073TC1_DAM = 0x65;
const AC073TC1_REV = 0x70;
const AC073TC1_FLG = 0x71;
const AC073TC1_AMV = 0x80;
const AC073TC1_VV = 0x81;
const AC073TC1_VDCS = 0x82;
const AC073TC1_T_VDCS = 0x84;
const AC073TC1_AGID = 0x86;
const AC073TC1_CMDH = 0xAA;
const AC073TC1_CCSET = 0xE0;
const AC073TC1_PWS = 0xE3;
const AC073TC1_TSSET = 0xE6;

const SPI_CHUNK_SIZE = 4096;
const SPI_COMMAND = 0;
const SPI_DATA = 1;
type Colour = [number, number, number]
type Palette = Array<Colour>

export class Inky {
    width: number;
    height: number;
    border_colour: number;
    cols: any;
    rows: any;
    rotation: any;
    offset_x: any;
    offset_y: any;
    resolution_setting: any;
    colour: string;
    lut: string;
    buf: number[][];
    dc_pin: number;
    reset_pin: number;
    busy_pin: number;
    cs_pin: number;
    cs_channel: any;
    h_flip: boolean;
    v_flip: boolean;
    gpio_setup: boolean;
    luts: null;
    /* Inky e-Ink Display Driver. */;
    BLACK = 0;
    WHITE = 1;
    GREEN = 2;
    BLUE = 3;
    RED = 4;
    YELLOW = 5;
    ORANGE = 6;
    CLEAN = 7;

    WIDTH = 800;
    HEIGHT = 480;

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
        [0, 0, 0],        // Black
        [217, 242, 255],  // White
        [3, 124, 76],     // Green
        [27, 46, 198],    // Blue
        [245, 80, 34],    // Red
        [255, 255, 68],   // Yellow
        [239, 121, 44],   // Orange
        [255, 255, 255]   // Clear
    ];

    constructor(width: number, height: number, colour = 'multi', cs_pin = CS0_PIN, dc_pin = DC_PIN, reset_pin = RESET_PIN, busy_pin = BUSY_PIN, h_flip = false, v_flip = true, spi_bus = null, i2c_bus = null, gpio = null) {  // noqa: E501
        /* Initialise an Inky Display.
    
        :param resolution: (width, height) in pixels, default: (600, 448)
        :param colour: one of red, black or yellow, default: black
        :param cs_pin: chip-select pin for SPI communication
        :param dc_pin: data/command pin for SPI communication
        :param reset_pin: device reset pin
        :param busy_pin: device busy/wait pin
        :param h_flip: enable horizontal display flip, default: False
        :param v_flip: enable vertical display flip, default: False
    
         */

        // Check for supported display variant and select the correct resolution
        // Eg: 600x480 and 640x400
        this.width = width
        this.height = height
        this.border_colour = WHITE;
        this.cols = this.width
        this.rows = this.height

        if (!['multi'].includes(colour)) {
            throw new Error(`Colour ${colour} is not supported!`);
        }
        this.colour = colour;
        this.lut = colour;

        this.buf = Array(this.rows).fill(0).map(() => Array(this.cols).fill(BLUE));
        this.dc_pin = dc_pin;
        this.reset_pin = reset_pin;
        this.busy_pin = busy_pin;
        this.cs_pin = cs_pin;
        this.h_flip = h_flip;
        this.v_flip = v_flip;
        this.gpio_setup = false;

        this.luts = null;
    }
    log_buffer() {
        for (let y = 0; y < this.height; y++) {
            let line: string[] = []
            for (let x = 0; x < this.width; x++) {
                let colour = this.SATURATED_PALETTE[this.buf[y][x]]
                line.push(chalk.rgb(...colour).bold("■"))
            }
            console.log(...line)
        }
    }
    private palette_blend(saturation: number, dtype = 'uint8') {
        let palette: Palette = [];
        for (let i = 0; i < 7; i++) {
            let [rs, gs, bs] = this.SATURATED_PALETTE[i].map(col => {
                return col * saturation as number
            })
            let [rd, gd, bd] = this.DESATURATED_PALETTE[i].map(col => {
                return col * (1 - saturation) as number
            })
            if (dtype == 'uint8') palette.push([Math.round(rs + rd), Math.round(gs + gd), Math.round(bs + bd)])
            // if (dtype == 'uint24') palette.push([(Math.round(rs + rd) << 16) | (Math.round(gs + gd) << 8) | Math.round(bs + bd)]);
        }

        // if (dtype == 'uint8') {
        // palette.push([255, 255, 255]);
        return palette
        // } else if (dtype == 'uint24') {
        //     palette.push([0xffffff]);
        //     return palette as number[];
        // }

    }
    async setup() {
        /* Set up Inky GPIO and reset display. */
        if (!this.gpio_setup) {
            rpio.init({
                mapping: "gpio",
                gpiomem: false
            })
            rpio.spiBegin();
            rpio.spiChipSelect(0);
            rpio.spiSetClockDivider(50);

            rpio.open(this.cs_pin, rpio.OUTPUT)
            rpio.open(this.dc_pin, rpio.OUTPUT, rpio.PULL_OFF)
            rpio.open(this.reset_pin, rpio.OUTPUT, rpio.PULL_OFF)
            rpio.open(this.busy_pin, rpio.INPUT, rpio.PULL_OFF)

            this.gpio_setup = true;
        }


        // hardware reset?
        rpio.write(this.reset_pin, rpio.LOW)
        await delay(0.1);
        rpio.write(this.reset_pin, rpio.HIGH)
        await delay(0.1);
        rpio.write(this.reset_pin, rpio.LOW)
        await delay(0.1);
        rpio.write(this.reset_pin, rpio.HIGH)


        await this.busy_wait(1.0);

        // Sending init commands to display
        this.send_command(AC073TC1_CMDH, [0x49, 0x55, 0x20, 0x08, 0x09, 0x18]);

        this.send_command(AC073TC1_PWR, [0x3F, 0x00, 0x32, 0x2A, 0x0E, 0x2A]);

        this.send_command(AC073TC1_PSR, [0x5F, 0x69]);

        this.send_command(AC073TC1_POFS, [0x00, 0x54, 0x00, 0x44]);

        this.send_command(AC073TC1_BTST1, [0x40, 0x1F, 0x1F, 0x2C]);

        this.send_command(AC073TC1_BTST2, [0x6F, 0x1F, 0x16, 0x25]);

        this.send_command(AC073TC1_BTST3, [0x6F, 0x1F, 0x1F, 0x22]);

        this.send_command(AC073TC1_IPC, [0x00, 0x04]);

        this.send_command(AC073TC1_PLL, [0x02]);

        this.send_command(AC073TC1_TSE, [0x00]);

        this.send_command(AC073TC1_CDI, [0x3F]);

        this.send_command(AC073TC1_TCON, [0x02, 0x00]);

        this.send_command(AC073TC1_TRES, [0x03, 0x20, 0x01, 0xE0]);

        this.send_command(AC073TC1_VDCS, [0x1E]);

        this.send_command(AC073TC1_T_VDCS, [0x00]);

        this.send_command(AC073TC1_AGID, [0x00]);

        this.send_command(AC073TC1_PWS, [0x2F]);

        this.send_command(AC073TC1_CCSET, [0x00]);

        this.send_command(AC073TC1_TSSET, [0x00]);
    }
    private async busy_wait(timeout_seconds = 40.0) {
        let timeout = timeout_seconds * 1000
        /* Wait for busy/wait pin. */
        // If the busy_pin is *high* (pulled up by host)
        // then assume we're not getting a signal from inky
        // and wait the timeout period to be safe.
        if (rpio.read(this.busy_pin) == rpio.HIGH) {
            console.warn(`Busy Wait: Held high. Waiting for ${timeout}s`);
            await delay(timeout);
            return;
        }
        // If the busy_pin is *low* (pulled down by inky)
        // then wait for it to high.
        let t_start = Date.now();
        while (rpio.read(this.busy_pin) !== rpio.HIGH) {
            await delay(0.01);
            if (Date.now() - t_start >= timeout) {
                console.warn(`Busy Wait: Timed out after ${Date.now() - t_start}ms`);
                return;
            }
            // console.log("Busy_waited", Date.now() -t_start, "out of", timeout, "milliseconds")
        }
    }
    private async update(buf: number[]) {
        /* Update display.

        Dispatches display update to correct driver.

        :param buf_a: Black/White pixels
        :param buf_b: Yellow/Red pixels

         */;

        await this.setup();

        this.send_command(AC073TC1_DTM, buf); // data transfer

        this.send_command(AC073TC1_PON); // power on
        await this.busy_wait(0.4);

        this.send_command(AC073TC1_DRF, [0x00]); // data refresh
        await this.busy_wait(45.0)  // 41 seconds in testing

        this.send_command(AC073TC1_POF, [0x00]); // power off
        await this.busy_wait(0.4);
    }
    set_pixel(x: number, y: number, colour_index: number) {
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
    async show(busy_wait = true) {
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
    set_border(colour: number) {
        /* Set the border colour. */
        if ([BLACK, WHITE, GREEN, BLUE, RED, YELLOW, ORANGE, CLEAN].includes(colour)) {
            this.border_colour = colour;
        }
    }
    display_png(path: string, saturation = 0.9, dithering = 0.75) {
        var data = readFileSync(path);
        var image = PNG.sync.read(data);
        let imageArray = this.group_array(this.group_array([...image.data], 4), this.width)
        this.convertToIndexedColour(imageArray, saturation, dithering)

    }
    display_mem_png(data: any, saturation = 0.9, dithering = 0.75) {
        var image = PNG.sync.read(data);
        let imageArray = this.group_array(this.group_array([...image.data], 4), this.width)
        this.convertToIndexedColour(imageArray, saturation, dithering)

    }
    private group_array(array: Array<any>, n: number) {
        return [...Array(Math.ceil(array.length / n))].map((el, i) => array.slice(i * n, (i + 1) * n));
    }
    private spi_write(dc: number, values: number[]) {
        /* Write values over SPI.
     
        :param dc: whether to write as data or command
        :param values: list of values to write
     
         */


        rpio.write(this.cs_pin, rpio.LOW);
        rpio.write(this.dc_pin, dc);

        values.forEach((byte_value) => {
            rpio.spiWrite(Buffer.from([byte_value]), 1);
        })
        rpio.write(this.cs_pin, 1);
    }
    private send_command(command: any, data: number | number[] | null = null) {

        /* Send command over SPI.
     
        :param command: command byte
        :param data: optional list oseff values
     
         */
        this.spi_write(SPI_COMMAND, [command]);
        if (data !== null) {
            this.send_data(data);
        }
    }
    private send_data(data: number | number[]) {
        /* Send data over SPI.
 
        :param data: list of values
 
         */
        if (typeof data == "number") data = [data];
        this.spi_write(SPI_DATA, data);

    }
    private getSmallestInArray(a: number[]) {
        var lowest = 0;
        for (var i = 1; i < a.length; i++) {
            if (a[i] < a[lowest]) lowest = i;
        }
        return lowest;

    }
    private getClosestColour(pixel: Colour, palette: Palette) {
        // based on https://github.com/ccpalettes/gd-indexed-color-converter/blob/master/src/GDIndexedColourConverter.php
        let distances = palette.map((colour) => {
            return this.calculateEuclideanDistanceSquare(pixel, colour)
        })
        let minIndex = this.getSmallestInArray(distances)
        return palette[minIndex] as Colour
    }
    private calculateEuclideanDistanceSquare(q: [number, number, number], p: [number, number, number]) {
        let dist = ((q[0] - p[0]) ** 2) + ((q[1] - p[1]) ** 2) + ((q[2] - p[2]) ** 2);
        return dist
    }
    public convertToIndexedColour(image: number[][][], saturation: number = 0.5, dithering: number = 0.75) {
        let palette = this.palette_blend(saturation)
        // let newPalette = palette?.map((colour) => {
        //     return { "rgb": colour, "lab": this.RGBtoLab(colour) }
        // })
        console.log("converting complete, starting dithering")
        this.floydSteinbergDither(image, this.width, this.height, palette, dithering);
    }
    private RGBtoLab(rgb: Colour) {
        return this.XYZtoCIELab(this.RGBtoXYZ(rgb));
    }
    private RGBtoPalette(rgb: Colour, palette: Palette) {
        return palette.findIndex((ele) => ele === rgb)
    }
    private RGBtoXYZ(rgb: Colour) {
        let r = rgb[0] / 255;
        let g = rgb[1] / 255;
        let b = rgb[2] / 255;

        if (r > 0.04045) {
            r = (((r + 0.055) / 1.055) ** 2.4);
        } else {
            r = r / 12.92;
        }

        if (g > 0.04045) {
            g = (((g + 0.055) / 1.055) ** 2.4);
        } else {
            g = g / 12.92;
        }

        if (b > 0.04045) {
            b = (((b + 0.055) / 1.055) ** 2.4);
        } else {
            b = b / 12.92;
        }

        r *= 100;
        g *= 100;
        b *= 100;

        return [
            r * 0.4124 + g * 0.3576 + b * 0.1805,
            r * 0.2126 + g * 0.7152 + b * 0.0722,
            r * 0.0193 + g * 0.1192 + b * 0.9505
        ] as Colour
    }
    private XYZtoCIELab(xyz: Colour) {
        let refX = 95.047;
        let refY = 100;
        let refZ = 108.883;

        let x = xyz[0] / refX;
        let y = xyz[1] / refY;
        let z = xyz[2] / refZ;

        if (x > 0.008856) {
            x **= (1 / 3);
        } else {
            x = (7.787 * x) + (16 / 116);
        }

        if (y > 0.008856) {
            y **= (1 / 3);
        } else {
            y = (7.787 * y) + (16 / 116);
        }

        if (z > 0.008856) {
            z **= (1 / 3);
        } else {
            z = (7.787 * z) + (16 / 116);
        }

        return [
            (116 * y) - 16,
            500 * (x - y),
            200 * (y - z),] as Colour
    }
    private floydSteinbergDither(image: number[][][], width: number, height: number, palette: Palette, amount: number) {
        console.log(width, height)
        let nextRowColourStorage: number[][] = []

        for (let i = 0; i < height; i++) {
            let currentRowColourStorage = nextRowColourStorage

            for (let j = 0; j < width; j++) {
                let colour: Colour
                if (i === 0 && j === 0) {
                    colour = image[i][j] as Colour
                } else {
                    colour = currentRowColourStorage[j] as Colour;
                }
                let closestColour: Colour = this.getClosestColour(colour, palette);

                if (j < width - 1) {
                    if (i === 0) {
                        currentRowColourStorage[j + 1] = image[i][j + 1]
                    }
                }
                if (i < height - 1) {
                    if (j === 0) {
                        nextRowColourStorage[j] = image[i + 1][j]
                    }
                    if (j < width - 1) {
                        nextRowColourStorage[j + 1] = image[i + 1][j + 1]
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
                })
                let i_colour: number = this.RGBtoPalette(closestColour, palette)
                // console.log(j, i, colour,closestColour, i_colour)
                this.set_pixel(j, i, i_colour)
            }
        }
    }

}


function delay(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
