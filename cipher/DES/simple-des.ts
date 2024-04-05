import { Bits, ComputationalGraph, createNode, Sequencial } from "../../backend";
import { $, Xor, Cat, Split, Select, SW } from "../../shortcut";

const keygen = ComputationalGraph.scope(({ Input, Output }) => {
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
})


const F_k = ComputationalGraph.scope(({ Input, Output }) => {
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
  k.to(XOR_0)
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
})

const DES = ComputationalGraph.scope(({ Input, Output }) => {
  const f_k_1 = F_k.asNode()
  const f_k_2 = F_k.asNode()
  Input('plaintext').to(
    $.P([2, 6, 3, 1, 4, 8, 5, 7]).to(
      Split(2).to(
        Select(0).to(f_k_1.from(Input('k1'))),
        Select(1).to(f_k_1),
      )
    )
  )
  f_k_1.to(
    SW().to(
      Select(0).to(f_k_2.from(Input('k2'))),
      Select(1).to(f_k_2),
    )
  )
  f_k_2.to(
    Cat().to(
      $.P_inverse([2, 6, 3, 1, 4, 8, 5, 7]).to(
        Output('ciphertext')
      )
    )
  )
})

export class SimpleDES {
  private k1: number[];
  private k2: number[];

  constructor(private key: Bits) {
    keygen.run_with_input({ key: key.getBits() });
    [this.k1, this.k2] = keygen.retrive_bits_results('k1', 'k2')
  }

  public encrypt(plaintext: Bits, padding_value: 0 | 1 = 0) {
    const cipher = Bits.empty
    for (let i = 0; i < plaintext.length; i += 8) {
      cipher.append(this._encrypt(plaintext.slice(i, i + 8), padding_value))
    }
    return cipher
  }

  private _encrypt(plaintext: number[], padding_value: 0 | 1 = 0) {
    if (plaintext.length < 8) {
      plaintext = plaintext.concat(new Array(8 - plaintext.length).fill(padding_value))
    }
    DES.run_with_input({ plaintext, k1: this.k1, k2: this.k2 });
    // pick the first result, because we only have one output
    return DES.retrive_bits_results('ciphertext').at(0) as number[]
  }

  public decrypt(ciphertext: Bits) {
    const plaintext = Bits.empty
    for (let i = 0; i < ciphertext.length; i += 8) {
      plaintext.append(this._decrypt(ciphertext.slice(i, i + 8)))
    }
    return plaintext
  }

  /**
   * trick here: we swap k1 and k2
   * because the decryption process is the same as encryption process
   * by swapping k1 and k2, we can reuse the encryption process
   */
  private _decrypt(ciphertext: number[]) {
    DES.run_with_input({ plaintext: ciphertext, k1: this.k2, k2: this.k1 });
    return DES.retrive_bits_results('ciphertext') as number[]
  }

  get keys() {
    return [this.k1, this.k2]
  }
}