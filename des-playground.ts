import { Bits } from "./backend";
import { SimpleDES } from "./cipher/DES/simple-des";

const key = Bits.fromNumber(0b1010000010, 10)
const des = new SimpleDES(key);
console.log(`keys:`, des.keys);
const plaintext = Bits.fromNumber(0b10000001, 8)
console.log(`plaintext:`, plaintext.getBits());
const cipher = des.encrypt(plaintext);
console.log(`encrypted:`, cipher.getBits());
const decrypted = des.decrypt(cipher);
console.log(`decrypted:`, decrypted.getBits());
