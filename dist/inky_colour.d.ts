import { Inky } from "./inky";
export type Colour = [number, number, number];
export type Palette = Array<Colour>;
export declare class Inky_Colour extends Inky {
    DESATURATED_PALETTE: Palette;
    SATURATED_PALETTE: Palette;
    getPalette(saturation: number): Palette;
    private palette_blend;
    set_pixel(x: number, y: number, colour_index: number): void;
    set_border(colour: number): void;
    show(busy_wait?: boolean): Promise<void>;
    protected update(buf: number[]): Promise<void>;
}
