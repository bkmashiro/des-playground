import { Bits } from "../../backend";
import { Cipher, ModeWarpper } from "../cipher.interface";

export class CBC implements ModeWarpper {
  constructor(private cipher: Cipher, private iv: Bits) {
    this.temp = iv;
   }

  private temp: Bits = Bits.empty;

  encrypt(data: Bits): Bits {
    const blocks = data.split(8);
    let result = Bits.empty;
    for (const _b of blocks) {
      const block = new Bits(_b);
      block.xor(this.temp);
      this.temp = this.cipher.encrypt(block);
      result.append(this.temp.getBits());
    }
    return result;
  }

  decrypt(data: Bits): Bits {
    const blocks = data.split(8);
    let result = Bits.empty;
    for (const _b of blocks) {
      const block = new Bits(_b);
      const temp = new Bits(this.temp.getBits().slice());
      this.temp = new Bits(_b);
      result.append(temp.xor(this.cipher.decrypt(block)).getBits());
    }
    return result;
  }
}