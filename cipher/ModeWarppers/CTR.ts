import { Bits } from "../../backend";
import { Cipher, ModeWarpper } from "../cipher.interface";

export class CTR implements ModeWarpper {
  constructor(private cipher: Cipher) {
    
  }

  encrypt(data: Bits): Bits {
    throw new Error("Method not implemented.");
  }

  decrypt(data: Bits): Bits {
    throw new Error("Method not implemented.");
  }
}