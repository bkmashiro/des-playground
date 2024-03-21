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
  apply(input: [Bits<L>]): [Bits<L>] {
    return [[0, ...input[0].slice(0, -1)]] as [Bits<L>];
  }
}

class ShiftRight<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
  apply(input: [Bits<L>]): [Bits<L>] {
    return [[...input[0].slice(1), 0]] as [Bits<L>];
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

function $<
  Input extends NonEmptyArray<unknown>,
  Output extends NonEmptyArray<unknown>,
  K extends keyof typeof ops,
>(name: K) {
  const instance = new (ops[name] as any)() as InstanceType<typeof ops[K]>;
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
    const params = paramsStr.split(',').map(param => parseInt(param.trim()));
    return { name, params };
  }
  return null;
}

const alias: {
  [key: string]: keyof typeof ops
} = {
  LS: 'shiftLeft',
  RS: 'shiftRight',
  SP: 'cat',
  ADD: 'add',
  XOR: 'xor',
  AND: 'and',
  OR: 'or',
  NOT: 'not',
  EP: '__NOT_IMPLEMENTED__',
  P: '__NOT_IMPLEMENTED__',
} as const;

function createOpInstance(input: string) {
  const op = parseOp(input);
  if (op) {
    // @ts-ignore
    if (ops[alias[op.name]]) {
      console.log(`Creating op: ${op.name} with params: ${op.params}`);
      const node = $(alias[op.name] as any)
      node.op.withArgs(...op.params);
      return node;
    } else {
      console.error(`Unknown op: ${op.name}`);
      return null
    }
  }
  return op;
}
const example = "P{2,1,3,4} LS{3} SP{3} EP{2,3,1,4,2,3,4,1}";

const myops = example.split(/\s+/).map(createOpInstance).filter(op => op !== null);
console.log(myops);
