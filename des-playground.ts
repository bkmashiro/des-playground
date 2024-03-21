import { Number, Test, Object, List } from "ts-toolbelt"
import { unwarpDeep } from "./helper";

type TupleOf<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

type Bits<Length extends number> = TupleOf<0 | 1, Length>;

//TODO check if this is correct
type MapedArray<T extends unknown[], K extends (u: unknown) => unknown> = { [K in keyof T]: K extends keyof T ? K : never };


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

class Permutation<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  _permutation: number[] = [];
  withArgs(...args: any[]) {
    this._permutation = args as number[];
  }
  apply(input: [Bits<L>]): [Bits<L>] {
    // if min of permutation is 1, minus 1
    const min = Math.min(...this._permutation);
    if (min === 1) {
      this._permutation = this._permutation.map((p) => p - 1);
    }

    const result = new Array(input[0].length);
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

class SubGraph<T extends NonEmptyArray<unknown>, R extends NonEmptyArray<unknown>> extends Op<T, R> {
  graph: ComputationalGraph

  constructor(g: ComputationalGraph) {
    super();
    this.graph = g;
  }

  apply(input: T): R {
    return this.graph.run() as R;
  }
}

class _Output<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  memory: any
  apply(input: [Bits<L>]): [Bits<L>] {
    this.memory = input;
    return input;
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

type NonEmptyArray<T> = [T, ...T[]];
type EmptyableArray<T> = [...T[]];
type ComputationalNodesInputType<T extends NonEmptyArray<unknown>> = {
  [K in keyof T]: ComputationalNode<NonEmptyArray<unknown>, [T[K], ...EmptyableArray<unknown>]>
};
type ComputationalNodesOutputType<R extends NonEmptyArray<unknown>> = {
  [K in keyof R]: ComputationalNode<[R[K], ...EmptyableArray<unknown>], NonEmptyArray<unknown>>
};


const ops = {
  add: Add,
  cat: Concat,
  shiftLeft: ShiftLeft,
  shiftRight: ShiftRight,
  not: Not,
  and: And,
  or: Or,
  xor: Xor,
  permutation: Permutation,
  expandPermutation: ExpandPermutation,
  // output: Output,
  // input: Input,
  __NOT_IMPLEMENTED__: NotImplemented,
} as const;

class ComputationalNode<T extends NonEmptyArray<unknown>, R extends NonEmptyArray<unknown>> {
  constructor(
    public op: Op<T, R>,
  ) { }

  apply(...input: T): R {
    return this.op.apply(input);
  }

  // ComputationalNode[] of T.length，
  // parent is ComputationalNode<unknown, input of this node>
  // children is ComputationalNode<output of this node, unknown>
  parent = [] as ComputationalNodesInputType<T>
  children = [] as ComputationalNodesOutputType<R>
  from(...nodes: ComputationalNode<any, any>[]) {
    nodes.forEach((node, i) => {
      this.parent[i] = node;
      node.children.push(this);
    });
    return this;
  }

  to(...nodes: ComputationalNode<any, any>[]) {
    nodes.forEach((node, i) => {
      this.children[i] = node;
      node.parent.push(this);
    });
    return this;
  }
}

function Literal(val: any) {
  return new ComputationalNode(new Input(val));
}

function Output() {
  return new ComputationalNode(new _Output());
}

function createOpByName(name: keyof typeof ops) {
  return new (ops[name] as any)() as InstanceType<typeof ops[keyof typeof ops]>;
}

function $<
  Input extends NonEmptyArray<unknown>,
  Output extends NonEmptyArray<unknown>,
  K extends keyof typeof ops,
>(name: K) {
  const instance = createOpByName(name);
  return new ComputationalNode(instance as any) as ComputationalNode<Input, Output>;
}

function From(...nodes: ComputationalNode<any, any>[]) {
  class _ {
    to = (name: keyof typeof ops | 'out') => {
      if (name === 'out') {
        return Output().from(...nodes);
      }
      const node = $(name)
      return node.from(...nodes);
    }
  }

  return new _();
}

class ComputationalGraph {
  constructor() { }

  nodes = [] as ComputationalNode<any, any>[]

  inputNodes: Set<ComputationalNode<any, any>> = new Set()
  outputNodes: Set<ComputationalNode<any, any>> = new Set()

  addNode(node: ComputationalNode<any, any>) {
    this.nodes.push(node);
  }

  addInputNode(node: ComputationalNode<any, any>) {
    this.inputNodes.add(node);
  }

  addOutputNode(node: ComputationalNode<any, any>) {
    this.outputNodes.add(node);
  }

  static of(...nodes: ComputationalNode<any, any>[]) {
    const graph = new ComputationalGraph();
    nodes.forEach((node) => {
      graph.addNode(node);
      // if a node has no parent, then it's an input node
      if (node.parent.length === 0) {
        graph.addInputNode(node);
      }
      // if a node has no children, then it's an output node
      if (node.children.length === 0) {
        graph.addOutputNode(node);
      }
    });
    return graph;
  }

  // run according to the topological order
  run() {
    const set = new Set<ComputationalNode<any, any>>(); // to avoid duplicate nodes
    const cache = new Map<ComputationalNode<any, any>, any>(); // cache the result of each node

    this.inputNodes.forEach((node) => {
      set.add(node);
    });

    while (set.size > 0) {
      const node = set.values().next().value as ComputationalNode<any, any>;
      set.delete(node);
      // assume we can always get the result from cache
      // if not, then it's not a valid graph (not a DAG)
      const input = node.parent.map((parent) => cache.get(parent));
      // console.log(`in : `, input);
      // console.log(`in (unwarp): `, unwarpDeep(input));
      const output = node.apply(...unwarpDeep(input));
      // console.log(`out: `, output);
      cache.set(node, output);
      node.children.forEach((child) => {
        set.add(child);
      });
    }

    // collect the result
    const result = [] as any[];
    this.outputNodes.forEach((node) => {
      result.push(cache.get(node));
    });

    // console.log(result);
    console.log(JSON.stringify(result, null, 2));

    return result;
  }

  run_with_input(input: Map<ComputationalNode<any, any>, any>) {
    // override the input nodes
    input.forEach((value, node) => {
      (node.op as Input<any>).memory = value;
    });

    return this.run();
  }
}

/**
 * P{2,1,...,n} - permutation of n elements, position 2, 1, ..., n
 * LS[n] - left shift
 * RS[n] - right shift
 * SP[n] - split into two parts, [0..n-1], [n.. rest]
 * C - concatenate all parameters
 * ADD - add all parameters
 * XOR - xor all parameters
 * AND - and all parameters
 * OR - or all parameters
 * NOT - not all parameters
 * SELECT[n] - select the nth element in the parameters list
 * EP{2,3,1,4,2,3,4,1} - expand permutation
 */
class ShortHandParser {
  constructor() { }

  parse() {

  }
}


// Test
// const i = Literal([1, 0, 0, 1])
// const j = Literal([0, 1, 0, 1])
// const k = Literal([0, 0, 1, 1])

// const add = From(i, j).to('add');
// const cat = From(add, k).to('cat');
// const output = From(cat).to('out');

// const graph = ComputationalGraph.of(i, j, k, add, cat, output);

// graph.run();


function parseOp(input: string) {
  const match = input.match(/^(\w+)\{(.+?)\}$/);
  if (match) {
    const [, name, paramsStr] = match;
    const params = tryParseArgs(paramsStr) || [];
    return { name, params };
  }
  return null;
}

const alias: {
  [key: string]: keyof typeof ops
} = {
  LS: 'shiftLeft',
  RS: 'shiftRight',
  C: 'cat',
  ADD: 'add',
  XOR: 'xor',
  AND: 'and',
  OR: 'or',
  NOT: 'not',
  EP: 'expandPermutation',
  P: 'permutation',
} as const;

function createOpInstance(input: string) {
  const op = parseOp(input);
  if (op) {
    // @ts-ignore
    if (ops[alias[op.name]]) {
      console.log(`Creating op: ${op.name} with params: ${op.params}`);
      const oprand = createOpByName(alias[op.name]);
      oprand.withArgs(...op.params);
      return oprand;
    } else {
      console.error(`Unknown op: ${op.name}`);
      return null
    }
  }
  return op;
}
type Argument = number[] | number[][];

function parseArray(input: string): number[] | null {
  const match = input.match(/^\{(.+?)\}$/);
  if (match) {
    const [, valuesStr] = match;
    return valuesStr.split(',').map(value => parseInt(value.trim()));
  }
  return null;
}

function tryParseArgs(input: string): Argument | null {
  input = `{${input}}`
  const matchArray = input.match(/^\{(.+?)\}$/);
  if (matchArray) {
    const [, valuesStr] = matchArray;
    if (valuesStr.includes('{')) {
      // 嵌套的 {}，表示矩阵
      const rows = valuesStr.split('},{');
      const matrix = rows.map(row => parseArray(`{${row}}`)) as number[][];
      return matrix;
    } else {
      // 单个的 {}，表示数字列表
      return parseArray(input) as number[];
    }
  }
  console.error(`Failed to parse args: ${input}`);
  return null;
}

function Sequencial(init_str: string) {
  const ops = init_str.split(/\s+/).map(createOpInstance);
  if (ops.length === 0 || ops.some(op => op === null)) {
    throw new Error('Not valid ops list');
  }
  // create OpGroup
  return new OpGroup(ops as any);
}


const sequencial = Sequencial("P{2,1,3,4} LS{3} EP{4,1,2,3,2,3,4,1}"); 
console.log(sequencial.apply([[1, 0, 0, 1]]));
// after P: [0, 1, 0, 1]
// after LS: [1, 0, 1, 0]
// after EP: [0, 1, 0, 1, 0, 1, 0, 1]