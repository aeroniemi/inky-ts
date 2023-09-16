

// var PNG = require("pngjs").PNG;
import { PNG } from "pngjs"
import chalk from 'chalk';
import { readFileSync } from 'fs'


export type Colour = [number, number, number]
export type Palette = Array<Colour>

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
    /* Inky e-Ink Display Driver. */;
    palette: Palette

    constructor(width: number, height: number, colour = 'multi') {  // noqa: E501

        this.width = width
        this.height = height
        this.border_colour = 0;
        this.cols = this.width
        this.rows = this.height

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
        let palette = this.getPalette(saturation)
        // let newPalette = palette?.map((colour) => {
        //     return { "rgb": colour, "lab": this.RGBtoLab(colour) }
        // })
        // console.log("converting complete, starting dithering")
        this.floydSteinbergDither(image, this.width, this.height, palette, dithering);
    }
    private RGBtoLab(rgb: Colour) {
        return this.XYZtoCIELab(this.RGBtoXYZ(rgb));
    }
    private RGBtoPalette(rgb: Colour, palette: Palette) {
        return palette.findIndex((ele) => ele === rgb)
    }
    private floydSteinbergDither(image: number[][][], width: number, height: number, palette: Palette, amount: number) {
        // console.log(width, height)
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

class NotImplementedError extends Error {
    constructor(message = "", ...args: any) {
        super(message, ...args);
        this.message = message + " has not yet been implemented.";
    }
}

function delay(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}