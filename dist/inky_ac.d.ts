import { Inky_Colour } from "./inky_colour";
export declare class Inky_ac extends Inky_Colour {
    dc_pin: number;
    reset_pin: number;
    busy_pin: number;
    cs_pin: number;
    cs_channel: any;
    gpio_setup: boolean;
    constructor(width?: number, height?: number, colour?: string, cs_pin?: number, dc_pin?: number, reset_pin?: number, busy_pin?: number, h_flip?: boolean, v_flip?: boolean);
    setup(): Promise<void>;
    private busy_wait;
    protected update(buf: number[]): Promise<void>;
    show(busy_wait?: boolean): Promise<void>;
    private spi_write;
    private send_command;
    private send_data;
}
