import rpio from "rpio"
import { delay } from "./inky"
import { Inky_Colour } from "./inky_colour";


const RESET_PIN = 27;
const BUSY_PIN = 17;
const DC_PIN = 22;

const MOSI_PIN = 10;
const SCLK_PIN = 11;
const CS0_PIN = 8;

const AC073TC1_PSR = 0x00; // panel setting
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
const AC073TC1_PLL = 0x30; // pll clock frequency
const AC073TC1_TSC = 0x40;
const AC073TC1_TSE = 0x41;
const AC073TC1_TSW = 0x42;
const AC073TC1_TSR = 0x43;
const AC073TC1_CDI = 0x50;
const AC073TC1_LPD = 0x51;
const AC073TC1_TCON = 0x60;
const AC073TC1_TRES = 0x61; // resolution setting
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


export class Inky_ac extends Inky_Colour {
    dc_pin: number;
    reset_pin: number;
    busy_pin: number;
    cs_pin: number;
    cs_channel: any;
   
    gpio_setup: boolean;

    constructor(width: number = 800, height: number = 480, colour = 'multi', cs_pin = CS0_PIN, dc_pin = DC_PIN, reset_pin = RESET_PIN, busy_pin = BUSY_PIN, h_flip = false, v_flip = true) {  // noqa: E501
        super(width, height, colour, h_flip, v_flip)
        if (!['multi'].includes(colour)) {
            throw new Error(`Colour ${colour} is not supported!`);
        }
        this.dc_pin = dc_pin;
        this.reset_pin = reset_pin;
        this.busy_pin = busy_pin;
        this.cs_pin = cs_pin;
        
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
        let cdi = (this.border_colour << 5) | 0x1F
        this.send_command(AC073TC1_CDI, [cdi]);

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
    protected async update(buf: number[]) {
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


