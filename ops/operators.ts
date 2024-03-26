import { Number, Test, Object, List } from "ts-toolbelt"
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
      result[i] = sum % 2 as any;
      carry = sum > 1 ? 1 : 0;
    }
    return [result] as [Bits<L>];
  }
}

class Concat<L extends number, R extends number> extends Op<[Bits<L>, Bits<R>], [Bits<Number.Add<L, R>>]> {
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
class ExpandPermutation<L extends number, P extends number> extends Op<[Bits<L>], [Bits<P>]> {
  // @ts-ignore
  _permutation: TupleOf<number, L>
  withArgs(...args: any[]) {
    this._permutation = args as TupleOf<number, L>
  }
  apply(input: [Bits<L>]): [Bits<P>] {
    // if min of permutation is 1, minus 1
    const min = Math.min(...this._permutation);
    if (min === 1) {
      this._permutation = this._permutation.map((p) => p - 1) as any;
    }
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
  }
  apply(input: [Bits<L>]): [Bits<L>] {
    // if min of permutation is 1, minus 1
    this._permutation = this._permutation.map((p) => p - 1);

    const result = new Array(this._permutation.length);
    for (let i = 0; i < this._permutation.length; i++) {
      console.log(this._permutation[i], `=>`, input[0][this._permutation[i]])
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

class OpGroup<T extends NonEmptyArray<unknown>, R extends NonEmptyArray<unknown>> extends Op<T, R> {
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

class _Output<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  name: string = '';
  memory: any
  apply(input: [Bits<L>]): [Bits<L>] {
    this.memory = input;
    return input;
  }

  withArgs(...args: any[]) {
    this.name = args[0];
  }
}

class Input<L extends number> extends Op<[], [Bits<L>]> {
  constructor(val?: any) {
    super();
    this.memory = val;
  }

  memory: any
  apply(): [Bits<L>] {
    return [this.memory] as [Bits<L>];
  }
}

class NotImplemented extends Op {
  apply() {
    throw new Error('Not implemented');
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
  OpGroup,
  _Output,
  Input,
  NotImplemented,
}