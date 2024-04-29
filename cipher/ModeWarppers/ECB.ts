import { Bits } from "../../backend";
import { Cipher, ModeWarpper } from "../cipher.interface";

export class ECB implements ModeWarpper {
  constructor(private cipher: Cipher, private _block_size = 8) { }
  encrypt(data: Bits): Bits {
    const result = Bits.empty;
    const blocks = data.split(this._block_size);
    console.log(`blocks:`, blocks);
    for (const block of blocks) {
      result.append(this.cipher.encrypt(new Bits(block)).getBits());
      console.log(`len`, result.length)
    }
    return result;
  }

  decrypt(data: Bits): Bits {
    const result = Bits.empty;
    const blocks = data.split(this._block_size);
    for (const block of blocks) {
      result.append(this.cipher.decrypt(new Bits(block)).getBits());
    }
    return result;
  }
}