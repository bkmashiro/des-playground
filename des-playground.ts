import { Bits } from "./backend";
import { SimpleDES } from "./cipher/DES/simple-des";
import { decodeLengthedString, encodeLengthedString } from "./cipher/LengthedString/LengthedString";
import { CBC, ECB } from "./cipher/ModeWarppers";
import { foo } from "./plaintext";

const key = Bits.fromNumber(0b1100011110, 10)
const des = new CBC(new SimpleDES(key), Bits.fromArray([0, 1, 0, 1, 0, 1, 0, 1]));
console.log(`     text:`, foo);
const plaintext = Bits.fromU8Array(encodeLengthedString(foo));
console.log(`plaintext:`, plaintext.toBinaryString());
const cipher = des.encrypt(plaintext);
console.log(`encrypted:`, cipher.toBinaryString());
const decrypted = des.decrypt(cipher);
console.log(`decrypted:`, decrypted.toBinaryString());
console.log(`  decoded:`, decodeLengthedString(decrypted.toU8Array()));
