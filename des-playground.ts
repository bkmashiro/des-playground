import { Bits } from "./backend";
import { SimpleDES } from "./cipher/DES/simple-des";
import { decodeLengthedString, encodeLengthedString } from "./cipher/LengthedString/LengthedString";
import { ECB } from "./cipher/ModeWarppers/ECB";

const key = Bits.fromNumber(0b1100011110, 10)
const des = new ECB(new SimpleDES(key));
const text = 'Network security encompasses all the steps taken to protect the integrity of a computer network and the data within it. Network security is important because it keeps sensitive data safe from cyber attacks and ensures the network is usable and trustworthy. Successful network security strategies employ multiple security solutions to protect users and organizations from malware and cyber attacks, like distributed denial of service.';
console.log(`     text:`, text);
const plaintext = Bits.fromU8Array(encodeLengthedString(text));
console.log(`plaintext:`, plaintext.toBinaryString());
const cipher = des.encrypt(plaintext);
console.log(`encrypted:`, cipher.toBinaryString());
const decrypted = des.decrypt(cipher);
console.log(`decrypted:`, decrypted.toBinaryString());
console.log(`  decoded:`, decodeLengthedString(decrypted.toU8Array()));
