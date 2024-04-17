import {
  Bits,
  ComputationalGraph,
  createNode,
  Sequencial,
} from "../../backend";
import {
  $,
  Xor,
  Cat,
  Split,
  Select,
  SW,
  Literal,
  Flatten,
} from "../../shortcut";

const g = ComputationalGraph.scope(({ Input, Output }) => {
  const w = Input("w");
  const RCON = Input("rcon");
  const sbox1 = $.NibbleSubstitution([
    0x9, 0x4, 0xa, 0xb, 0xd, 0x1, 0x8, 0x5, 0x6, 0x2, 0x0, 0x3, 0xc, 0xe, 0xf,
    0x7,
  ]);
  const sbox2 = $.NibbleSubstitution([
    0x9, 0x4, 0xa, 0xb, 0xd, 0x1, 0x8, 0x5, 0x6, 0x2, 0x0, 0x3, 0xc, 0xe, 0xf,
    0x7,
  ]);
  const sw = SW();
  w.to(Split(2).to(Select(0).to(sw), Select(1).to(sw)));
  sw.to(Select(0).to(sbox1), Select(1).to(sbox2));
  Cat()
    .from(sbox1, sbox2)
    .to(Xor().from(RCON).to(Output("g_w")));
});
g.__do_debug = true

// test g
// const w = Bits.fromNumber(0x28, 8)
// const RCON = Bits.fromNumber(0x30, 8)
// g.run_with_input({
//   w: w.getBits(),
//   rcon: RCON.getBits()
// })
// console.log(g.retrive_bits_results('g_w'))

const keygen = ComputationalGraph.scope(({ Input, Output }) => {
  const key = Input("key"); // w0w1
  const RCON_1 = Input("RCON_1");
  const RCON_2 = Input("RCON_2");
  const g1 = g.asNode(); // accept w, rcon; output g_w
  const g2 = g.asNode();
  const xor1 = Xor();
  const xor2 = Xor();
  const xor3 = Xor();
  const xor4 = Xor();
  key.to(
    Split(2).to(
      Select(0).to(Output("w0"), xor1),
      Select(1).to(Output("w1"), g1, xor2)
    )
  );
  g1.from(RCON_1).to(xor1);
  xor1.to(Output("w2"), xor2, xor3);
  xor2.to(Output("w3"), g2, xor4);
  g2.from(RCON_2).to(xor3);
  xor3.to(Output("w4"), xor4);
  xor4.to(Output("w5"));
});
keygen.__do_debug = true;
// test keygen
const key = Bits.fromNumber(0x4af5, 16); //01001010 11110101
const RCON_1 = Bits.fromNumber(0x80, 8);
const RCON_2 = Bits.fromNumber(0x30, 8);
keygen.run_with_input({
  key: key.getBits(),
  RCON_1: RCON_1.getBits(),
  RCON_2: RCON_2.getBits(),
});

console.log(
  ["w0", "w1", "w2", "w3", "w4", "w5"].map(
    (k) => `${k}:` + keygen.retrive_bits_results(k).at(0).join("")
  )
);

const AES = ComputationalGraph.scope(({ Input, Output }) => {
  const [w0, w1, w2, w3, w4, w5] = ["w0", "w1", "w2", "w3", "w4", "w5"].map(
    (k) => Input(k)
  );
  const plaintext = Input("plaintext");
  // add round key
  const xor0 = Xor();
  plaintext.to(xor0.from(Cat().from(Flatten().from(w0), Flatten().from(w1))));
  // nibble substitution
  const ns0 = $.NibbleSubstitution([
    0x9, 0x4, 0xa, 0xb, 0xd, 0x1, 0x8, 0x5, 0x6, 0x2, 0x0, 0x3, 0xc, 0xe, 0xf,
    0x7,
  ]);
  xor0.to(ns0);
  // shift rows
  const cat0 = Cat();
  const cat1 = Cat();
  const cat01 = Cat();
  ns0.to(
    Split(4).to(
      Select(0).to(cat0),
      Select(3).to(cat0.to(cat01)),
      Select(2).to(cat1),
      Select(1).to(cat1.to(cat01))
    )
  );
  // mix columns
  const mc0 = $.MixColumns([0x1, 0x4, 0x4, 0x1]);
  cat01.to(mc0);
  // add round key
  const xor1 = Xor();
  mc0.to(xor1.from(Cat().from(Flatten().from(w2), Flatten().from(w3))));
  // nibble substitution
  const ns1 = $.NibbleSubstitution([
    0x9, 0x4, 0xa, 0xb, 0xd, 0x1, 0x8, 0x5, 0x6, 0x2, 0x0, 0x3, 0xc, 0xe, 0xf,
    0x7,
  ]);
  xor1.to(ns1);
  // shift rows
  const cat2 = Cat();
  const cat3 = Cat();
  const cat23 = Cat();
  ns1.to(
    Split(4).to(
      Select(0).to(cat2),
      Select(3).to(cat2.to(cat23)),
      Select(2).to(cat3),
      Select(1).to(cat3.to(cat23))
    )
  );
  // mix columns
  const mc1 = $.MixColumns([0x1, 0x4, 0x4, 0x1]);
  cat23.to(mc1);
  // add round key
  const xor2 = Xor();
  mc1.to(xor2.from(Cat().from(Flatten().from(w4), Flatten().from(w5))));
  xor2.to(Output("ciphertext"));
});

AES.__do_debug = true;

AES.run_with_input({
  w0: keygen.retrive_bits_results("w0"),
  w1: keygen.retrive_bits_results("w1"),
  w2: keygen.retrive_bits_results("w2"),
  w3: keygen.retrive_bits_results("w3"),
  w4: keygen.retrive_bits_results("w4"),
  w5: keygen.retrive_bits_results("w5"),
  plaintext: Bits.fromNumber(0xd728, 16).getBits(),
});

console.log(AES.retrive_bits_results("ciphertext").at(0).join(""));
