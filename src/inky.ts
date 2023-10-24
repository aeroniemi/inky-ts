// imports
import type { ResvgRenderOptions, RenderedImage } from "@resvg/resvg-js"
let resvg: Function | undefined
try {
    resvg = require('@resvg/resvg-js').renderAsync;
} catch (err) {
    console.trace("ReSVG is not available")
}

import chalk from 'chalk';
import { readFileSync, writeFileSync } from "fs";
import { PNG } from "pngjs";

// types
export type Colour = [number, number, number]
export type Palette = Array<Colour>

// inky class
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
    palette: Palette
    h_flip: boolean;
    v_flip: boolean;

    constructor(width: number, height: number, colour = 'multi', h_flip = false, v_flip = false) {  // noqa: E501
        this.width = width
        this.height = height
        this.border_colour = 0;
        this.cols = this.width
        this.rows = this.height
        this.h_flip = h_flip;
        this.v_flip = v_flip;

        this.colour = colour;
        this.lut = colour;
        this.palette = [[0, 0, 0], [255, 255, 255]]
        this.buf = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
    }
    log_buffer() {
        for (let y = 0; y < this.height; y++) {
            let line: string[] = []
            for (let x = 0; x < this.width; x++) {
                let colour = this.palette[this.buf[y][x]]
                line.push(chalk.rgb(...colour).bold("■"))
            }
            console.log(...line)
        }
    }

    async setup() {
        throw new NotImplementedError("send_command")
    }
    set_pixel(x: number, y: number, colour_index: number) {
        throw new NotImplementedError("send_command")
    }
    async show(busy_wait = true) {
        throw new NotImplementedError("show")
    }
    display_png(path: string, saturation = 0.9, dithering = 0.75) {
        var data = readFileSync(path);
        var image = PNG.sync.read(data);
        this.display_buffered_image(image.data, saturation, dithering)
    }
    display_svg(path: string, saturation: number, dithering: number, options = {}) {
        var data = readFileSync(path).toString("utf8")
        this.display_mem_svg(data, saturation, dithering, options)
    }
    display_mem_png(data: any, saturation = 0.9, dithering = 0.75) {
        var image = PNG.sync.read(data);
        this.display_buffered_image(image.data, saturation, dithering)
    }
    private group_array(array: Array<any>, n: number) {
        return [...Array(Math.ceil(array.length / n))].map((el, i) => array.slice(i * n, (i + 1) * n));
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
    public getPalette(saturation: number) {
        return this.palette
    }
    public convertToIndexedColour(image: number[][][], saturation: number = 0.5, dithering: number = 0.75) {
        return this.floydSteinbergDither(image, this.width, this.height, this.getPalette(saturation), dithering);
    }
    private RGBtoPalette(rgb: Colour, palette: Palette) {
        return palette.findIndex((ele) => ele === rgb)
    }
    private floydSteinbergDither(image: number[][][], width: number, height: number, palette: Palette, amount: number) {
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
                this.set_pixel(j, i, i_colour)
            }
        }
    }
    async display_mem_svg(svg: string, saturation: number = 0.5, dithering: number = 0.75, options: ResvgRenderOptions = {}) {
        let rendered = await this.svg_to_rendered(svg, options)
        let buff = this.rendered_to_buffered_image(rendered)
        this.display_buffered_image(buff, saturation, dithering)
    }
    private async svg_to_rendered(svg: string, options: ResvgRenderOptions) {
        if (resvg === undefined) throw new Error("resvg is required to use the SVG tools - install using 'npm install @resvg/resvg-js")
        return resvg(svg, options)
    }
    private rendered_to_png(render: RenderedImage) {
        return render.asPng()
    }
    private rendered_to_buffered_image(render: RenderedImage) {
        return render.pixels
    }
    private display_buffered_image(buf: Buffer, saturation: number, dithering: number) {
        let image = this.group_array(this.group_array([...buf], 4), this.width)
        this.convertToIndexedColour(image, saturation, dithering)
    }
    async emulate(path: string, svg: string, options: ResvgRenderOptions) {
        let render = await this.svg_to_rendered(svg, options)
        let png = this.rendered_to_png(render)
        writeFileSync(path, png, { flag: "w" })
    }
}

// error class
export class NotImplementedError extends Error {
    constructor(message = "") {
        super(message);
        this.message = message + " has not yet been implemented.";
    }
}

//utility function
export function delay(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
