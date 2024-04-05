import { Bits } from "./backend";
import { SimpleDES } from "./cipher/DES/simple-des";
import { decodeLengthedString, encodeLengthedString } from "./cipher/LengthedString/LengthedString";

const key = Bits.fromNumber(0b1010000010, 10)
const des = new SimpleDES(key);
const text = 'hello';
console.log(`     text:`, text);
const plaintext = Bits.fromU8Array(encodeLengthedString(text));
console.log(`plaintext:`, plaintext.toBinaryString());
const cipher = des.encrypt(plaintext);
console.log(`encrypted:`, cipher.toBinaryString());
const decrypted = des.decrypt(cipher);
console.log(`decrypted:`, decrypted.toBinaryString());
console.log(`  decoded:`, decodeLengthedString(decrypted.toU8Array()));
