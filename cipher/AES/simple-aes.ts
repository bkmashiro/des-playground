import { Bits, ComputationalGraph, createNode, Sequencial } from "../../backend";
import { $, Xor, Cat, Split, Select, SW } from "../../shortcut";

const g = ComputationalGraph.scope(({ Input, Output }) => {
  const w = Input('w');
  const RCON = Input('rcon');
  const sbox1 = $.NibbleSubstitution([
    0x9, 0x4, 0xA, 0xB,
    0xD, 0x1, 0x8, 0x5,
    0x6, 0x2, 0x0, 0x3,
    0xC, 0xE, 0xF, 0x7
  ]);
  const sbox2 = $.NibbleSubstitution([
    0x9, 0x4, 0xA, 0xB,
    0xD, 0x1, 0x8, 0x5,
    0x6, 0x2, 0x0, 0x3,
    0xC, 0xE, 0xF, 0x7
  ]);
  const sw = SW();
  w.to(
    Split(2).to(
      Select(0).to(sw),
      Select(1).to(sw)
    )
  )
  sw.to(
    Select(0).to(sbox1),
    Select(1).to(sbox2),
  )
  Cat().from(sbox1, sbox2).to(Xor().from(RCON)).to(Output('g_w'));
})
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
  const key = Input('key'); // w0w1
  const RCON_1 = Input('RCON_1');
  const RCON_2 = Input('RCON_2');
  const g1 = g.asNode(); // accept w, rcon; output g_w
  const g2 = g.asNode();
  const xor1 = Xor();
  const xor2 = Xor();
  const xor3 = Xor();
  const xor4 = Xor();
  key.to(
    Split(2).to(
      Select(0).to(Output('w0'), xor1),
      Select(1).to(Output('w1'), g1, xor2)
    )
  )
  g1.from(RCON_1)
  xor1.to(Output('w2'), xor2, xor3)
  xor2.to(Output('w3'), g2, xor4)
  g2.from(RCON_2)
  xor3.to(Output('w4'), xor4)
  xor4.to(Output('w5'))
})