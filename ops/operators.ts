import { Number, Test, Object, List, F } from "ts-toolbelt";
import { Bits, TupleOf, NonEmptyArray } from "../type.helper";

abstract class Op<T = any, R = any> {
  constructor() {}
  abstract apply(input: T): R;
  withArgs(..._args: any[]) {}
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

function BitsToNumber(bits: Bits<any>) {
  return bits.reduce((acc, bit) => acc * 2 + bit, 0 as number);
}

function NumberToBits(n: number, length: number) {
  const result = new Array(length).fill(0);
  for (let i = 0; i < length; i++) {
    result[length - i - 1] = (n >> i) & 1;
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
  _mod = 16;
  apply(input: [Bits<any>]): [Bits<any>] {
    const s00 = BitsToNumber(input[0].slice(0, 4));
    const s10 = BitsToNumber(input[0].slice(4, 8));
    const s01 = BitsToNumber(input[0].slice(8, 12));
    const s11 = BitsToNumber(input[0].slice(12, 16));

    const s00_ =
      (this._matrix[0][0] * s00 + this._matrix[0][1] * s10) % this._mod;
    const s10_ =
      (this._matrix[1][0] * s00 + this._matrix[1][1] * s10) % this._mod;
    const s01_ =
      (this._matrix[0][0] * s01 + this._matrix[0][1] * s11) % this._mod;
    const s11_ =
      (this._matrix[1][0] * s01 + this._matrix[1][1] * s11) % this._mod;

    return [
      NumberToBits(s00_, 4).concat(NumberToBits(s10_, 4)).concat(
        NumberToBits(s01_, 4),
      ).concat(NumberToBits(s11_, 4)),
    ] as [Bits<any>];
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
