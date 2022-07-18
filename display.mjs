import i2c from 'i2c-bus';
import OLED from 'oled-i2c-bus';
import font from 'oled-font-5x7';

const opts = {
  width: 128,
  height: 32,
  address: 0x3C
}

// oled initialization
const i2cBus = i2c.openSync(0);
let oled = new OLED(i2cBus, opts);

export function clear() {
  oled.clearDisplay();
}
export function write(str) {
  oled.setCursor(1, 0);
  oled.writeString(font, 1, str, 1, true);
}

export function init() {
  oled.clearDisplay();
  oled.turnOnDisplay();
  oled.invertDisplay(false);
}

export default {
  init,
  write,
  clear
}