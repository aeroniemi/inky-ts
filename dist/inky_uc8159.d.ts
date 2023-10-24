import { Inky_Colour } from "./inky_colour";
declare class Inky_uc extends Inky_Colour {
    dc_pin: number;
    reset_pin: number;
    busy_pin: number;
    cs_pin: number;
    cs_channel: any;
    h_flip: boolean;
    v_flip: boolean;
    gpio_setup: boolean;
    constructor(width?: number, height?: number, colour?: string, cs_pin?: number, dc_pin?: number, reset_pin?: number, busy_pin?: number, h_flip?: boolean, v_flip?: boolean);
    setup(): Promise<void>;
    private busy_wait;
    protected update(buf: number[]): Promise<void>;
    private spi_write;
    private send_command;
    private send_data;
}
export declare class InkyImpression57 extends Inky_uc {
    constructor(h_flip?: boolean, v_flip?: boolean);
}
export declare class InkyImpression40 extends Inky_uc {
    constructor(h_flip?: boolean, v_flip?: boolean);
}
export {};
