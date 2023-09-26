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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inky_ac = void 0;
const rpio_1 = __importDefault(require("rpio"));
const inky_1 = require("./inky");
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
class Inky_ac extends inky_1.Inky {
    constructor(width = 800, height = 480, colour = 'multi', cs_pin = CS0_PIN, dc_pin = DC_PIN, reset_pin = RESET_PIN, busy_pin = BUSY_PIN, h_flip = false, v_flip = true) {
        super(width, height, colour);
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
            [0, 0, 0],
            [217, 242, 255],
            [3, 124, 76],
            [27, 46, 198],
            [245, 80, 34],
            [255, 255, 68],
            [239, 121, 44],
            [255, 255, 255] // Clear
        ];
        if (!['multi'].includes(colour)) {
            throw new Error(`Colour ${colour} is not supported!`);
        }
        this.dc_pin = dc_pin;
        this.reset_pin = reset_pin;
        this.busy_pin = busy_pin;
        this.cs_pin = cs_pin;
        this.h_flip = h_flip;
        this.v_flip = v_flip;
        this.gpio_setup = false;
    }
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
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            /* Set up Inky GPIO and reset display. */
            if (!this.gpio_setup) {
                rpio_1.default.init({
                    mapping: "gpio",
                    gpiomem: false
                });
                rpio_1.default.spiBegin();
                rpio_1.default.spiChipSelect(0);
                rpio_1.default.spiSetClockDivider(50);
                rpio_1.default.open(this.cs_pin, rpio_1.default.OUTPUT);
                rpio_1.default.open(this.dc_pin, rpio_1.default.OUTPUT, rpio_1.default.PULL_OFF);
                rpio_1.default.open(this.reset_pin, rpio_1.default.OUTPUT, rpio_1.default.PULL_OFF);
                rpio_1.default.open(this.busy_pin, rpio_1.default.INPUT, rpio_1.default.PULL_OFF);
                this.gpio_setup = true;
            }
            // hardware reset?
            rpio_1.default.write(this.reset_pin, rpio_1.default.LOW);
            yield delay(0.1);
            rpio_1.default.write(this.reset_pin, rpio_1.default.HIGH);
            yield delay(0.1);
            rpio_1.default.write(this.reset_pin, rpio_1.default.LOW);
            yield delay(0.1);
            rpio_1.default.write(this.reset_pin, rpio_1.default.HIGH);
            yield this.busy_wait(1.0);
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
        });
    }
    busy_wait(timeout_seconds = 40.0) {
        return __awaiter(this, void 0, void 0, function* () {
            let timeout = timeout_seconds * 1000;
            /* Wait for busy/wait pin. */
            // If the busy_pin is *high* (pulled up by host)
            // then assume we're not getting a signal from inky
            // and wait the timeout period to be safe.
            if (rpio_1.default.read(this.busy_pin) == rpio_1.default.HIGH) {
                console.warn(`Busy Wait: Held high. Waiting for ${timeout}s`);
                yield delay(timeout);
                return;
            }
            // If the busy_pin is *low* (pulled down by inky)
            // then wait for it to high.
            let t_start = Date.now();
            while (rpio_1.default.read(this.busy_pin) !== rpio_1.default.HIGH) {
                yield delay(0.01);
                if (Date.now() - t_start >= timeout) {
                    console.warn(`Busy Wait: Timed out after ${Date.now() - t_start}ms`);
                    return;
                }
                // console.log("Busy_waited", Date.now() -t_start, "out of", timeout, "milliseconds")
            }
        });
    }
    update(buf) {
        return __awaiter(this, void 0, void 0, function* () {
            /* Update display.
    
            Dispatches display update to correct driver.
    
            :param buf_a: Black/White pixels
            :param buf_b: Yellow/Red pixels
    
             */ ;
            yield this.setup();
            this.send_command(AC073TC1_DTM, buf); // data transfer
            this.send_command(AC073TC1_PON); // power on
            yield this.busy_wait(0.4);
            this.send_command(AC073TC1_DRF, [0x00]); // data refresh
            yield this.busy_wait(45.0); // 41 seconds in testing
            this.send_command(AC073TC1_POF, [0x00]); // power off
            yield this.busy_wait(0.4);
        });
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
    set_border(colour) {
        /* Set the border colour. */
        if ([BLACK, WHITE, GREEN, BLUE, RED, YELLOW, ORANGE, CLEAN].includes(colour)) {
            this.border_colour = colour;
        }
    }
    spi_write(dc, values) {
        /* Write values over SPI.
     
        :param dc: whether to write as data or command
        :param values: list of values to write
     
         */
        rpio_1.default.write(this.cs_pin, rpio_1.default.LOW);
        rpio_1.default.write(this.dc_pin, dc);
        values.forEach((byte_value) => {
            rpio_1.default.spiWrite(Buffer.from([byte_value]), 1);
        });
        rpio_1.default.write(this.cs_pin, 1);
    }
    send_command(command, data = null) {
        /* Send command over SPI.
     
        :param command: command byte
        :param data: optional list oseff values
     
         */
        this.spi_write(SPI_COMMAND, [command]);
        if (data !== null) {
            this.send_data(data);
        }
    }
    send_data(data) {
        /* Send data over SPI.
 
        :param data: list of values
 
         */
        if (typeof data == "number")
            data = [data];
        this.spi_write(SPI_DATA, data);
    }
}
exports.Inky_ac = Inky_ac;
function delay(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
