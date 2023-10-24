import type { ResvgRenderOptions } from "@resvg/resvg-js";
export type Colour = [number, number, number];
export type Palette = Array<Colour>;
export declare class Inky {
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
    palette: Palette;
    h_flip: boolean;
    v_flip: boolean;
    constructor(width: number, height: number, colour?: string, h_flip?: boolean, v_flip?: boolean);
    log_buffer(): void;
    setup(): Promise<void>;
    set_pixel(x: number, y: number, colour_index: number): void;
    show(busy_wait?: boolean): Promise<void>;
    display_png(path: string, saturation?: number, dithering?: number): void;
    display_svg(path: string, saturation: number, dithering: number, options?: {}): void;
    display_mem_png(data: any, saturation?: number, dithering?: number): void;
    private group_array;
    private getSmallestInArray;
    private getClosestColour;
    private calculateEuclideanDistanceSquare;
    getPalette(saturation: number): Palette;
    convertToIndexedColour(image: number[][][], saturation?: number, dithering?: number): void;
    private RGBtoPalette;
    private floydSteinbergDither;
    display_mem_svg(svg: string, saturation?: number, dithering?: number, options?: ResvgRenderOptions): Promise<void>;
    private svg_to_rendered;
    private rendered_to_png;
    private rendered_to_buffered_image;
    private display_buffered_image;
    emulate(path: string, svg: string, options: ResvgRenderOptions): Promise<void>;
}
export declare class NotImplementedError extends Error {
    constructor(message?: string);
}
export declare function delay(seconds: number): Promise<unknown>;
