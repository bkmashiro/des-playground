import { Bits } from "../../backend";
import { Cipher, ModeWarpper } from "../cipher.interface";

export class ECB implements ModeWarpper {
  constructor(private cipher: Cipher) {}

  encrypt(data: Bits): Bits {
    return this.cipher.encrypt(data);
  }

  decrypt(data: Bits): Bits {
    return this.cipher.decrypt(data);
  }
}