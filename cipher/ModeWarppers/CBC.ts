import { Bits } from "../../backend";
import { Cipher, ModeWarpper } from "../cipher.interface";

export class CBC implements ModeWarpper {
  constructor(private cipher: Cipher, private readonly iv: Bits) {
    this.temp = iv.copy();
  }
  
  private temp: Bits;
  _block_size = 8;


  encrypt(data: Bits): Bits {
    const blocks = data.split(this._block_size);
    let result = Bits.empty;
    for (const _b of blocks) {
      const block = new Bits(_b);
      this.temp = this.cipher.encrypt(block.xor(this.temp));
      result.append(this.temp.getBits());
    }
    return result;
  }

  decrypt(data: Bits): Bits {
    const blocks = data.split(this._block_size);
    let result = Bits.empty;
    this.temp = this.iv.copy();
    for (const _b of blocks) {
      const decrypted = this.cipher.decrypt(new Bits(_b));
      result.append(decrypted.xor(this.temp).getBits());
      this.temp = new Bits(_b);
    }
    return result;
  }
}