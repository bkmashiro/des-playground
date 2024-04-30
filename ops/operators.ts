import { Number, Test, Object, List, F } from "ts-toolbelt";
import { Bits, TupleOf, NonEmptyArray } from "../type.helper";

abstract class Op<T = any, R = any> {
  constructor() { }
  abstract apply(input: T): R;
  withArgs(..._args: any[]) { }
}

class Add<L extends number> extends Op<[Bits<L>, Bits<L>], [Bits<L>]> {
  apply([a, b]: [Bits<L>, Bits<L>]): [Bits<L>] {
    // lower is on the right
    let carry = 0;
    const result = a;
    for (let i = a.length - 1; i >= 0; i--) {
      const sum = a[i] + b[i] + carry;
      result[i] = (sum % 2) as any;
      carry = sum > 1 ? 1 : 0;
    }
    return [result] as [Bits<L>];
  }
}

class Concat<L extends number, R extends number> extends Op<
  [Bits<L>, Bits<R>],
  [Bits<Number.Add<L, R>>]
> {
  apply([a, b]: [Bits<L>, Bits<R>]): [Bits<Number.Add<L, R>>] {
    return [[...a, ...b]] as [Bits<Number.Add<L, R>>];
  }
}

class ShiftLeft<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  _n_digits: number = 0;
  withArgs(...args: any[]) {
    this._n_digits = args[0];
  }
  // circular shift
  apply(input: [Bits<L>]): [Bits<L>] {
    const n = this._n_digits;
    return [[...input[0].slice(n), ...input[0].slice(0, n)]] as [Bits<L>];
  }
}

class ShiftRight<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  _n_digits: number = 0;
  withArgs(...args: any[]) {
    this._n_digits = args[0];
  }
  // circular shift
  apply(input: [Bits<L>]): [Bits<L>] {
    const n = this._n_digits;
    return [[...input[0].slice(-n), ...input[0].slice(0, -n)]] as [Bits<L>];
  }
}

// actually it's a permutation, nothing different
class ExpandPermutation<L extends number, P extends number> extends Op<
  [Bits<L>],
  [Bits<P>]
> {
  // @ts-ignore
  _permutation: TupleOf<number, L>;
  withArgs(...args: any[]) {
    this._permutation = args as TupleOf<number, L>;
    const min = Math.min(...this._permutation);
    if (min === 1) {
      this._permutation = this._permutation.map((p) => p - 1) as any;
    }
  }
  apply(input: [Bits<L>]): [Bits<P>] {
    const result = new Array(input[0].length);
    for (let i = 0; i < this._permutation.length; i++) {
      result[i] = input[0][this._permutation[i]];
    }
    return [result] as [Bits<P>];
  }
}

class Permutation<L extends number> extends Op<[Bits<L>], [Bits<any>]> {
  _permutation: number[] = [];
  withArgs(...args: any[]) {
    this._permutation = args as number[];
    this._permutation = this._permutation.map((p) => p - 1);
  }
  apply(input: [Bits<L>]): [Bits<L>] {
    const result = new Array(this._permutation.length);
    for (let i = 0; i < this._permutation.length; i++) {
      result[i] = input[0][this._permutation[i]];
    }
    return [result] as [Bits<L>];
  }
}

class Not<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  apply(input: [Bits<L>]): [Bits<L>] {
    return [input[0].map((bit) => bit ^ 1)] as [Bits<L>];
  }
}

class And<L extends number> extends Op<[Bits<L>, Bits<L>], [Bits<L>]> {
  apply([a, b]: [Bits<L>, Bits<L>]): [Bits<L>] {
    return [a.map((bit, i) => bit & b[i])] as [Bits<L>];
  }
}

class Or<L extends number> extends Op<[Bits<L>, Bits<L>], [Bits<L>]> {
  apply([a, b]: [Bits<L>, Bits<L>]): [Bits<L>] {
    return [a.map((bit, i) => bit | b[i])] as [Bits<L>];
  }
}

class Xor<L extends number> extends Op<[Bits<L>, Bits<L>], [Bits<L>]> {
  apply([a, b]: [Bits<L>, Bits<L>]): [Bits<L>] {
    return [a.map((bit, i) => bit ^ b[i])] as [Bits<L>];
  }
}

class Copy<L extends number> extends Op<[Bits<L>], Bits<L>[]> {
  n_copies: number = 1;

  apply(input: [Bits<L>]): Bits<L>[] {
    return Array(this.n_copies).fill(input[0]);
  }

  withArgs(...args: any[]) {
    this.n_copies = args[0];
  }
}

class Select<L extends number> extends Op<Bits<L>[], [Bits<L>]> {
  index: number = 0;

  apply(input: Bits<L>[]): [Bits<L>] {
    return [input[this.index]];
  }

  withArgs(...args: any[]) {
    this.index = args[0];
  }
}

class Split<L extends number> extends Op<[Bits<L>], Bits<any>[]> {
  n_splits: number = 2;

  apply(input: [Bits<L>]): Bits<any>[] {
    const result = [] as Bits<any>[];
    const n = Math.ceil(input[0].length / this.n_splits);
    for (let i = 0; i < this.n_splits; i++) {
      result.push(input[0].slice(i * n, (i + 1) * n));
    }
    return result;
  }

  withArgs(...args: any[]) {
    this.n_splits = args[0];
  }
}

class SBox extends Op<[Bits<any>], [Bits<any>]> {
  _sbox: number[][] = [];
  withArgs(...args: any[]) {
    const vals = args as number[];
    const n = Math.sqrt(vals.length);
    this._sbox = new Array(n)
      .fill(0)
      .map((_, i) => vals.slice(i * n, (i + 1) * n));
  }

  apply(input: [Bits<any>]): [Bits<any>] {
    // 1st, 4th bit as row, 2nd, 3rd bit as column
    const row = input[0][0] * 2 + input[0][3];
    const col = input[0][1] * 2 + input[0][2];
    const value = this._sbox[row][col];
    console.log("SBox value:", value);
    // convert to binary
    // if range is 0-3, then 2 bits is enough
    if (value > 15 || value < 0) {
      throw new Error("Invalid SBox value");
    }
    let result: number[];

    result = new Array(2).fill(0);
    for (let i = 0; i < 2; i++) {
      result[i] = (value >> i) & 1;
    }

    // reverse
    result.reverse();
    return [result] as [Bits<any>];
  }
}

class NibbleSubstitution extends Op<[Bits<any>], [Bits<any>]> {
  _mapping: number[][] = [];
  withArgs(...args: any[]) {
    const vals = args as number[];
    const n = Math.sqrt(vals.length);
    this._mapping = new Array(n)
      .fill(0)
      .map((_, i) => vals.slice(i * n, (i + 1) * n));
  }

  /**
   * Nibble substitution is easier select row and column
   * just by simply using left 2 bits as row, right 2 bits as column
   */
  apply(input: [Bits<any>]): [Bits<any>] {
    const n_numbers = input[0].length / 4;
    let result = new Array(n_numbers * 4).fill(0);
    for (let i = 0; i < n_numbers; i++) {
      const row = BitsToNumber(input[0].slice(i * 4, i * 4 + 2));
      const col = BitsToNumber(input[0].slice(i * 4 + 2, i * 4 + 4));
      const value = this._mapping[row][col];
      const bits = NumberToBits(value, 4);
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = bits[j];
      }
    }

    return [result] as [Bits<any>];
  }
}
// ... 8 4 2 1
function BitsToNumber(bits: Bits<any>) {
  let result = 0;
  for (let i = 0; i < bits.length; i++) {
    result += bits[i] * 2 ** (bits.length - i - 1);
  }
  return result;
}

function NumberToBits(n: number, length: number) {
  const result = new Array(length).fill(0);
  for (let i = 0; i < length; i++) {
    result[length - i - 1] = (n >> i) & 1;
  }
  return result;
}

// mul under Galois field GF(16)
function gf2_4_multiply(a: number, b: number) {
  let result = 0;
  while (b > 0) {
    if (b & 1) {
      result ^= a; // 乘法转换为异或操作
    }
    a <<= 1;
    if (a & 0x10) { // 检查是否需要模 4 阶多项式
      a ^= 0x13; // 0x13 对应的二进制为 10011，是 4 阶多项式 x^4 + x + 1
    }
    b >>= 1;
  }
  return result;
}

class MixColumns extends Op<[Bits<any>], [Bits<any>]> {
  _matrix: number[][] = [];
  withArgs(...args: any[]) {
    const vals = args as number[];
    const n = Math.sqrt(vals.length);
    this._matrix = new Array(n)
      .fill(0)
      .map((_, i) => vals.slice(i * n, (i + 1) * n));
  }
  /**
   * M_e = [1,4,
   *        4,1] 
   * 
   * S   = [S_00, S_01
   *        S_10, S_11]
   * 
   * S' = M_e * S
   */
  apply(input: [Bits<any>]): [Bits<any>] {
    const S_00 = BitsToNumber(input[0].slice(0, 4));
    const S_01 = BitsToNumber(input[0].slice(4, 8));
    const S_10 = BitsToNumber(input[0].slice(8, 12));
    const S_11 = BitsToNumber(input[0].slice(12, 16));
    // console.log("MixColumns input:", S_00, S_01, S_10, S_11);
    const M_e = this._matrix;
    const mul = gf2_4_multiply;
    const S_00_new = mul(M_e[0][0], S_00) ^ mul(M_e[0][1], S_01);
    // console.log("mul:", mul(M_e[0][0], S_00), mul(M_e[0][1], S_01));
    // console.log("mul result:", mul(M_e[0][0], S_00) ^ mul(M_e[0][1], S_01));
    const S_01_new = mul(M_e[1][0], S_00) ^ mul(M_e[1][1], S_01);
    const S_10_new = mul(M_e[0][0], S_10) ^ mul(M_e[0][1], S_11);
    const S_11_new = mul(M_e[1][0], S_10) ^ mul(M_e[1][1], S_11);
    // console.log("MixColumns result:", S_00_new, S_01_new, S_10_new, S_11_new);
    const result = new Array(16).fill(0);
    const S_00_bits = NumberToBits(S_00_new, 4);
    const S_01_bits = NumberToBits(S_01_new, 4);
    const S_10_bits = NumberToBits(S_10_new, 4);
    const S_11_bits = NumberToBits(S_11_new, 4);

    for (let i = 0; i < 4; i++) {
      result[i] = S_00_bits[i];
      result[i + 4] = S_01_bits[i];
      result[i + 8] = S_10_bits[i];
      result[i + 12] = S_11_bits[i];
    }

    return [result] as [Bits<any>];
  }
}

class Swap extends Op<[Bits<any>, Bits<any>], [Bits<any>, Bits<any>]> {
  apply([a, b]: [Bits<any>, Bits<any>]): [Bits<any>, Bits<any>] {
    return [b, a];
  }
}

class Flatten extends Op<Bits<any>[], Bits<any>> {
  apply(input: Bits<any>[]): Bits<any> {
    return input[0];
  }
}

class OpGroup<
  T extends NonEmptyArray<unknown>,
  R extends NonEmptyArray<unknown>,
> extends Op<T, R> {
  constructor(private ops: Op[]) {
    super();
  }

  apply(input: T): R {
    let result = input as any;
    this.ops.forEach((op) => {
      result = op.apply(result);
    });
    return result as R;
  }
}

const __INPUT_NOT_SET = Symbol("Input not set");
class _Input<L extends number> extends Op<[], [Bits<L>]> {
  _input: any = __INPUT_NOT_SET;
  _name: string = "";

  apply(): [Bits<L>] {
    if (this._input === __INPUT_NOT_SET) {
      throw new Error("Input not set");
    }
    return [this._input] as [Bits<L>];
  }

  withArgs(...args: any[]) {
    this._input = args[0];
  }
}

class _Output<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  _name: string = "";
  memory: any;
  apply(input: [Bits<L>]): [Bits<L>] {
    this.memory = input;
    return input;
  }

  withArgs(...args: any[]) {
    this._name = args[0];
  }
}

class _Literal<L extends number> extends Op<[], [Bits<L>]> {
  constructor(val?: any) {
    super();
    this.memory = val;
  }

  memory: any;
  apply(): [Bits<L>] {
    return [this.memory] as [Bits<L>];
  }
}

class NotImplemented extends Op {
  apply() {
    throw new Error("Not implemented");
  }
}

export {
  Op,
  Add,
  Concat,
  ShiftLeft,
  ShiftRight,
  ExpandPermutation,
  Permutation,
  Not,
  And,
  Or,
  Xor,
  Copy,
  Select,
  Split,
  SBox,
  NibbleSubstitution,
  MixColumns,
  Swap,
  Flatten,
  OpGroup,
  _Input,
  _Output,
  _Literal,
  NotImplemented,
};
