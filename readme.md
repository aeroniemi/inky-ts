# inky
> A typescript package to interact with Pimoroni's [Inky Impression 7.3](https://shop.pimoroni.com/products/inky-impression-7-3). Implemenents a subset of the features of [@pimoroni/inky](https://github.com/pimoroni/inky)

## Features
- Support for the Inky Impression 7.3 (only currently)
- Individual pixel interaction
- Setting images in:
    - PNG
    - SVG (using optional resvg-js dependency)

## Usage
### Install inky
- ``npm install --save @aeroniemi/inky``

### Setup GPIO
-  This package uses [rpio](https://www.npmjs.com/package/rpio) for GPIO interactions, so you'll need a working install of that
-  In particular, you need to:
    -  Disable GPIO interrupts
    -  Enable /dev/gpiomem access
    -  Run as root user (for access to the SPI device)

### (Optional) Setup resvg
- ``npm install --save @resvg/resvg-js``
- If you're using a Raspberry Pi 3/4/Zero 2W it'll probably "just work", but if you're on a Zero or Zero W you'll need to compile resvg to get it to run properly. See [this issue](https://github.com/yisibl/resvg-js/issues/231) for more details on how.


## Example
### Display a PNG 
```ts
import { Impression73 } from "@aeroniemi/inky"

async function main() {
    let screen = new Impression73()
    screen.display_png("./[IMAGE.png]")
    await screen.show()
}
main()
```

### Display a SVG
```ts
import { Inky_ac } from "@aeroniemi/inky"

async function main() {
    let screen = new Impression73()
    screen.display_svg("./[IMAGE.svg]")
    await screen.show()
}
main()
```