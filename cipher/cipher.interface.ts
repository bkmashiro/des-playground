import { Bits } from "../backend";

export interface BlockCipher {
  encrypt(data: Bits): Bits;
  decrypt(data: Bits): Bits;
}

export interface StreamCipher {
  encrypt(data: Bits): Bits;
  decrypt(data: Bits): Bits;
}

export type Cipher = BlockCipher | StreamCipher;

export interface ModeWarpper {
  encrypt(data: Bits): Bits;
  decrypt(data: Bits): Bits;
}