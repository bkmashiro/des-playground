import { Bits, ComputationalGraph, createNode, Sequencial } from "./backend";
import { $, Cat, Input, Output, Select, Split, Xor } from "./shortcut";


const keygen = ComputationalGraph.scope(() => {
  // simple DES generate key
  const key_input = Input('key');
  // P10(key)
  const p10 = createNode(`P{3,5,2,7,4,10,1,9,8,6}`);
  // Split into two parts
  const sp = createNode(`SP{2}`);
  // LS-1
  const [SEL_L, LS1_L] = Sequencial("SEL{0} LS{1}");
  const [SEL_R, LS1_R] = Sequencial("SEL{1} LS{1}");
  // LS-2
  const LS2_L = createNode(`LS{2}`);
  const LS2_R = createNode(`LS{2}`);
  // Join
  const join = createNode(`C`);
  const join2 = createNode(`C`);
  // P8
  const p8 = createNode(`P{6,3,7,4,8,5,10,9}`);
  const P8_2 = createNode(`P{6,3,7,4,8,5,10,9}`);
  // Then we get k1
  const k1 = Output('k1');
  const k2 = Output('k2');
  // connect nodes
  p10.from(key_input).to(sp);
  sp.to(SEL_L, SEL_R);
  SEL_L.to(LS1_L);
  LS1_L.to(join);
  SEL_R.to(LS1_R);
  LS1_R.to(join);
  join.to(p8);
  p8.to(k1);

  // k2
  LS1_L.to(LS2_L); //TODO check why this cause problem
  LS1_R.to(LS2_R);
  LS2_L.to(join2);
  LS2_R.to(join2);
  join2.to(P8_2);
  P8_2.to(k2);

  return { key_input, p10, sp, SEL_L, LS1_L, SEL_R, LS1_R, join, p8, k1, LS2_L, LS2_R, join2, P8_2, k2 }
})

const key = Bits.from("1,0,1,0,0,0,0,0,1,0")
keygen.run_with_input({ key });
const [k1, k2] = keygen.retrive_bits_results('k1', 'k2')
console.log(`k1: `, k1);
console.log(`k2: `, k2);


const plaintext = Bits.from("1,0,0,0,0,0,0,1")

const f_k = ComputationalGraph.scope(() => {
  const k = Input('k')
  const l = Input('l')
  const r = Input('r')
  const EP = $.EP([4, 1, 2, 3, 2, 3, 4, 1]);
  const XOR_0 = Xor();
  const SBox0 = $.SBox([1, 0, 3, 2, 3, 2, 1, 0, 0, 2, 1, 3, 3, 1, 3, 2]);
  const SBox1 = $.SBox([0, 1, 2, 3, 2, 0, 1, 3, 3, 0, 1, 0, 2, 1, 0, 3]);
  const cat = Cat()
  const P4 = $.P([2, 4, 3, 1]);
  const XOR_1 = Xor();
  const out_l = Output('l');
  const out_r = Output('r');
  // connect nodes
  k.to(Xor())
  l.to(XOR_1)
  r.to(
    out_r,
    EP.to(
      XOR_0.to(
        Split(2).to(
          Select(0).to(
            SBox0.to(cat)
          ),
          Select(1).to(
            SBox1.to(cat)
          )
        )
      )
    )
  );
  cat.to(P4.to(XOR_1.to(out_l)));
  return {
    k, l, r,
    out_l, out_r,
  }
})


const des = ComputationalGraph.scope(() => {
  const plain_text = Input('plaintext')
  const tmp_out_1 = Output('tmp1')
  const tmp_out_2 = Output('tmp2')
  const k1 = Input('k1')
  // const k2 = Input('k2')
  const ip_1 = createNode(`P{2,6,3,1,4,8,5,7}`);
  // const ip_1_reversed = createNode(`P{4,1,3,5,7,2,8,6}`);
  const SP_0 = createNode(`SP{2}`);
  const left = createNode(`SEL{0}`);
  const right = createNode(`SEL{1}`);
  const sbox0_str = "1,0,3,2,3,2,1,0,0,2,1,3,3,1,3,2";
  const [EP, XOR_0, SP_1, SEL_0, S0, P4, XOR_1] = Sequencial(`EP{4,1,2,3,2,3,4,1} XOR SP{2} SEL{0} SBOX{${sbox0_str}} P{2,4,3,1} XOR`);
  const SEL_1 = createNode(`SEL{1}`);
  const sbox1_str = "0,1,2,3,2,0,1,3,3,0,1,0,2,1,0,3";
  const S1 = createNode(`SBOX{${sbox1_str}}`);
  const Cat_s0_s1 = createNode(`C`);
  const sw = createNode(`SW`);
  // connect nodes
  ip_1.from(plain_text);
  ip_1.to(SP_0);
  SP_0.to(left, right);
  right.to(EP);
  k1.to(XOR_0);
  EP.to(XOR_0);

  XOR_0.to(SP_1);
  SP_1.to(SEL_0, SEL_1);

  SEL_0.to(S0)
  SEL_1.to(S1)

  S0.to(Cat_s0_s1);
  S1.to(Cat_s0_s1);

  Cat_s0_s1.to(P4);
  P4.to(XOR_1);
  left.to(XOR_1);

  XOR_1.to(sw);
  right.to(sw);

  const sw_l = createNode(`SEL{0}`);
  const sw_r = createNode(`SEL{1}`);
  sw.to(sw_l, sw_r);

  return { plain_text, k1, ip_1, tmp_out_1, tmp_out_2, EP, SP_0, right, XOR_0 }
})

des.run_with_input({ plaintext, k1, k2 })

console.log(des.retrive_bits_results('tmp1', 'tmp2'));


























// left.to(XOR_1)
// right.to(EP);
// EP.to(XOR_0);
// k1.to(XOR_0);
// XOR_0.to(SP_1);
// SP_1.to(S0, S1);
// S0.to(Cat_s0_s1);
// S1.to(Cat_s0_s1);
// Cat_s0_s1.to(P4);
// P4.to(XOR_1);

// XOR_1.to(sw);
// right.to(sw);
