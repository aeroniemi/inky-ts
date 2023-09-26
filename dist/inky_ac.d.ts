import { Inky } from "./inky";
type Colour = [number, number, number];
type Palette = Array<Colour>;
export declare class Inky_ac extends Inky {
    dc_pin: number;
    reset_pin: number;
    busy_pin: number;
    cs_pin: number;
    cs_channel: any;
    h_flip: boolean;
    v_flip: boolean;
    gpio_setup: boolean;
    DESATURATED_PALETTE: Palette;
    SATURATED_PALETTE: Palette;
    constructor(width?: number, height?: number, colour?: string, cs_pin?: number, dc_pin?: number, reset_pin?: number, busy_pin?: number, h_flip?: boolean, v_flip?: boolean);
    getPalette(saturation: number): Palette;
    private palette_blend;
    setup(): Promise<void>;
    private busy_wait;
    private update;
    set_pixel(x: number, y: number, colour_index: number): void;
    show(busy_wait?: boolean): Promise<void>;
    set_border(colour: number): void;
    private spi_write;
    private send_command;
    private send_data;
}
export {};
