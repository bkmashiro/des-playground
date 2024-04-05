import { Bits } from "./backend";
import { SimpleDES } from "./cipher/DES/simple-des";

const key = Bits.fromNumber(0b1010000010, 10)
const des = new SimpleDES(key);

const plaintext = Bits.fromNumber(0b10000001, 8)
console.log(`plaintext:`, plaintext.toBinaryString());
const cipher = des.encrypt(plaintext);
console.log(`encrypted:`, cipher.toBinaryString());
const decrypted = des.decrypt(cipher);
console.log(`decrypted:`, decrypted.toBinaryString());
