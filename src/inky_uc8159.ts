import rpio from "rpio"
import { delay } from "./inky"
import { Inky_Colour } from "./inky_colour";


const RESET_PIN = 27;
const BUSY_PIN = 17;
const DC_PIN = 22;

const MOSI_PIN = 10;
const SCLK_PIN = 11;
const CS0_PIN = 8;

const UC8159_PSR = 0x00
const UC8159_PWR = 0x01
const UC8159_POF = 0x02
const UC8159_PFS = 0x03
const UC8159_PON = 0x04
const UC8159_BTST = 0x06
const UC8159_DSLP = 0x07
const UC8159_DTM1 = 0x10
const UC8159_DSP = 0x11
const UC8159_DRF = 0x12
const UC8159_IPC = 0x13
const UC8159_PLL = 0x30
const UC8159_TSC = 0x40
const UC8159_TSE = 0x41
const UC8159_TSW = 0x42
const UC8159_TSR = 0x43
const UC8159_CDI = 0x50
const UC8159_LPD = 0x51
const UC8159_TCON = 0x60
const UC8159_TRES = 0x61
const UC8159_DAM = 0x65
const UC8159_REV = 0x70
const UC8159_FLG = 0x71
const UC8159_AMV = 0x80
const UC8159_VV = 0x81
const UC8159_VDCS = 0x82
const UC8159_PWS = 0xE3
const UC8159_TSSET = 0xE5

const SPI_CHUNK_SIZE = 4096;
const SPI_COMMAND = 0;
const SPI_DATA = 1;


class Inky_uc extends Inky_Colour {
    dc_pin: number;
    reset_pin: number;
    busy_pin: number;
    cs_pin: number;
    cs_channel: any;
    h_flip: boolean;
    v_flip: boolean;
    gpio_setup: boolean;

    constructor(width: number = 600, height: number = 448, colour = 'multi', cs_pin = CS0_PIN, dc_pin = DC_PIN, reset_pin = RESET_PIN, busy_pin = BUSY_PIN, h_flip = false, v_flip = true) {  // noqa: E501
        super(width, height, colour)
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

    async setup() {
        /* Set up Inky GPIO and reset display. */
        if (!this.gpio_setup) {
            rpio.init({
                mapping: "gpio",
                gpiomem: false
            })
            rpio.spiBegin();
            rpio.spiChipSelect(0);
            rpio.spiSetClockDivider(250000000 / 3000000); // 25MHz

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

        await this.busy_wait(1.0);

        // Resolution Setting
        // 10bit horizontal followed by a 10bit vertical resolution
        // we'll let struct.pack do the work here and send 16bit values
        // life is too short for manual bit wrangling
        this.send_command(
            UC8159_TRES,
            [
                (this.width >> 8) & 0xFF,
                this.width & 0xFF,
                (this.height >> 8) & 0xFF,
                this.height & 0xFF
            ]
        )
        // Panel Setting
        // 0b11000000 = Resolution select, 0b00 = 640x480, our panel is 0b11 = 600x448
        // 0b00100000 = LUT selection, 0 = ext flash, 1 = registers, we use ext flash
        // 0b00010000 = Ignore
        // 0b00001000 = Gate scan direction, 0 = down, 1 = up(default )
        // 0b00000100 = Source shift direction, 0 = left, 1 = right(default )
        // 0b00000010 = DC - DC converter, 0 = off, 1 = on
        // 0b00000001 = Soft reset, 0 = Reset, 1 = Normal(Default)
        // 0b11 = 600x448
        // 0b10 = 640x400
        this.send_command(
            UC8159_PSR,
            [
                (this.resolution_setting << 6) | 0b101111,  // See above for more magic numbers
                0x08                                        // display_colours == UC8159_7C
            ]
        )

        // Power Settings
        this.send_command(
            UC8159_PWR,
            [
                (0x06 << 3) |  // ??? - not documented in UC8159 datasheet  // noqa: W504
                    (0x01 << 2) |  // SOURCE_INTERNAL_DC_DC                     // noqa: W504
                        (0x01 << 1) |  // GATE_INTERNAL_DC_DC                       // noqa: W504
                    (0x01),        // LV_SOURCE_INTERNAL_DC_DC
                0x00,          // VGx_20V
                0x23,          // UC8159_7C
                0x23           // UC8159_7C
            ]
        )

        // Set the PLL clock frequency to 50Hz
        // 0b11000000 = Ignore
        // 0b00111000 = M
        // 0b00000111 = N
        // PLL = 2MHz * (M / N)
        // PLL = 2MHz * (7 / 4)
        // PLL = 2, 800,000 ???
        this.send_command(UC8159_PLL, [0x3C])  // 0b00111100

        // Send the TSE register to the display
        this.send_command(UC8159_TSE, [0x00])  // Colour

        // VCOM and Data Interval setting
        // 0b11100000 = Vborder control(0b001 = LUTB voltage)
        // 0b00010000 = Data polarity
        // 0b00001111 = Vcom and data interval(0b0111 = 10, default )
        let cdi = (this.border_colour << 5) | 0x17
        this.send_command(UC8159_CDI, [cdi])  // 0b00110111

        // Gate / Source non - overlap period
        // 0b11110000 = Source to Gate(0b0010 = 12nS, default )
        // 0b00001111 = Gate to Source
        this.send_command(UC8159_TCON, [0x22])  // 0b00100010

        // Disable external flash
        this.send_command(UC8159_DAM, [0x00])

        // UC8159_7C
        this.send_command(UC8159_PWS, [0xAA])

        // Power off sequence
        // 0b00110000 = power off sequence of VDH and VDL, 0b00 = 1 frame(default )
        // All other bits ignored ?
            this.send_command(
                UC8159_PFS, [0x00]  // PFS_1_FRAME
            )
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
    protected async update(buf: number[]) {
        /* Update display.

        Dispatches display update to correct driver.

        :param buf_a: Black/White pixels
        :param buf_b: Yellow/Red pixels

         */;
        await this.setup()

        this.send_command(UC8159_DTM1, buf)

        this.send_command(UC8159_PON)
        await this.busy_wait(0.2)

        this.send_command(UC8159_DRF)
        await this.busy_wait(32.0)

        this.send_command(UC8159_POF)
        await this.busy_wait(0.2)
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
}

export class InkyImpression57 extends Inky_uc {
    constructor(h_flip = false, v_flip = true) {
        super(600, 448, undefined, undefined, undefined, undefined, undefined, h_flip, v_flip)
    }
}
export class InkyImpression40 extends Inky_uc {
    constructor(h_flip = false, v_flip = true) {
        super(640, 400, undefined, undefined, undefined, undefined, undefined, h_flip, v_flip)
    }
}
