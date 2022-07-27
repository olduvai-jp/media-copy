import i2c from 'i2c-bus';
import OLED from 'oled-i2c-bus';
import font from 'oled-font-5x7';

const opts = {
  width: 128,
  height: 32,
  address: 0x3C
}

let oled = null
// oled initialization
try {
  const i2cBus = i2c.openSync(0);
  oled = new OLED(i2cBus, opts);    
} catch (error) {
  oled = null  
}

export function clear() {
  if(oled == null) return;
  oled.clearDisplay();
}
export function write(str) {
  if(oled == null) return;
  oled.setCursor(1, 0);
  oled.writeString(font, 1, str, 1, true);
}

export function init() {
  if(oled == null) return;
  oled.clearDisplay();
  oled.turnOnDisplay();
  oled.invertDisplay(false);
}

export default {
  init,
  write,
  clear
}