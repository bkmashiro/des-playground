import { unwarpDeep } from "./helper";
import { _Output, Add, And, Concat, Copy, ExpandPermutation, _Literal, Not, NotImplemented, Op, OpGroup, Or, Permutation, Select, ShiftLeft, ShiftRight, Split, Xor, _Input, SBox, Swap } from "./ops/operators";
import { NonEmptyArray, EmptyableArray } from "./type.helper";

type ComputationalNodesInputType<T extends NonEmptyArray<unknown>> = {
  [K in keyof T]: ComputationalNode<NonEmptyArray<unknown>, [T[K], ...EmptyableArray<unknown>]>
};
type ComputationalNodesOutputType<R extends NonEmptyArray<unknown>> = {
  [K in keyof R]: ComputationalNode<[R[K], ...EmptyableArray<unknown>], NonEmptyArray<unknown>>
};

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

const ops = {
  add: Add,
  cat: Concat,
  shiftLeft: ShiftLeft,
  shiftRight: ShiftRight,
  not: Not,
  and: And,
  or: Or,
  xor: Xor,
  copy: Copy,
  select: Select,
  split: Split,
  permutation: Permutation,
  expandPermutation: ExpandPermutation,
  sbox: SBox,
  swap: Swap,
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
      this.parent.push(node);
      node.children.push(this);
    });
    return this;
  }

  to(...nodes: ComputationalNode<any, any>[]) {
    nodes.forEach((node, i) => {
      this.children.push(node);
      node.parent.push(this);
    });
  }
}

function Literal(val: any) {
  return new ComputationalNode(new _Literal(val));
}

function Input(name: string) {
  const input = new _Input();
  input.withArgs(name);
  return new ComputationalNode(input);
}

function Output(name: string = '') {
  const out = new _Output()
  out.withArgs(name);
  return new ComputationalNode(out);
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

    console.log(`created a graph with ${graph.nodes.length} nodes, ${graph.inputNodes.size} input nodes, ${graph.outputNodes.size} output nodes`)
    console.log(`input nodes: `, graph.inputNodes);
    console.log(`output nodes: `, graph.outputNodes);
    return graph;
  }

  static scope(scoped: () => {
    [key: string]: ComputationalNode<any, any>
  }) {
    const nodes = scoped();
    return this.of(...Object.values(nodes));
  }

  named_results = new Map<string, any>();

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
      console.log(`current running Op: `, node.op.constructor.name);
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
      if (node.op instanceof _Output && node.op.name !== '') {
        this.named_results.set(node.op.name, cache.get(node));
      }
    });

    // console.log(result);
    console.log(JSON.stringify(result, null, 2));

    return result;
  }

  retrive_result(name: string) {
    return this.named_results.get(name);
  }

  retrive_bits_results(...names: string[]) {
    return names.map(name => this.named_results.get(name)[0]);
  }

  run_with_input(input: Record<string, any>) {
    // override the input nodes
    this.inputNodes.forEach((node) => {
      if (node.op instanceof _Input) {
        const name = node.op._input;
        if (name in input) {
          node.op._input = input[name];
        } else {
          throw new Error(`Input ${name} not found`);
        }
      }
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

class Bits {
  static from(s: string) {
    return s.split(',').map(c => parseInt(c));
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
  const match = input.match(/^(\w+)(?:\{(.+?)\})?$/);
  if (match) {
    const [, name, paramsStr] = match;
    const params = paramsStr ? tryParseArgs(paramsStr) || [] : [];
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
  SP: 'split',
  SEL: 'select',
  SBOX: 'sbox',
  SW: 'swap'
} as const;

function createOp(input: string) {
  const op = parseOp(input);
  if (op) {
    // @ts-ignore
    if (ops[alias[op.name]]) {
      console.log(`Creating op: ${op.name} with params: ${op.params ?? "<empty>"}`);
      const oprand = createOpByName(alias[op.name]);
      oprand.withArgs(...op.params);
      return oprand;
    } else {
      throw new Error(`Unknown op: ${op.name}`);
    }
  }
  throw new Error(`Failed to parse op: ${input}`);
}

function createNode(input: string) {
  const op = createOp(input);
  return new ComputationalNode(op as any);
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

function Sequencial<T extends string>(init_str: T) {
  const ops = init_str.split(/\s+/).map(createOp);
  if (ops.length === 0 || ops.some(op => op === null)) {
    throw new Error('Not valid ops list');
  }
  // create computational nodes
  // @ts-ignore op is not null
  const nodes = ops.map(op => new ComputationalNode(op));
  // connect nodes
  nodes.reduce((prev, current) => {
    prev.to(current);
    return current;
  });

  return nodes
}

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
const des = ComputationalGraph.scope(() => {
  const plain_text = Input('plaintext')
  const k1 = Input('k1')
  const k2 = Input('k2')
  const ip_1 = createNode(`P{2,6,3,1,4,8,5,7}`);
  const ip_1_reversed = createNode(`P{4,1,3,5,7,2,8,6}`);
  const SP_0 = createNode(`SP{2}`);
  const left = createNode(`SEL{0}`);
  const right = createNode(`SEL{1}`);
  const sbox0_str = "1 0 3 2; 3 2 1 0; 0 2 1 3; 3 1 3 2";
  const [EP, XOR_0, SP_1, S0, P4, XOR_1] = Sequencial(`EP{4,1,2,3,2,3,4,1} XOR SP{2} SBOX{${sbox0_str}} P{2,4,3,1} XOR`);
  // add missing nodes to sequencial part
  const sbox1_str = "0 1 2 3; 2 0 1 3; 3 0 1 0; 2 1 0 3";
  const S1 = createNode(`SBOX{${sbox1_str}}`);
  const Cat_s0_s1 = createNode(`C`);
  const sw = createNode(`SW`);
  // connect nodes
  ip_1.from(plain_text);
  ip_1.to(SP_0);
  SP_0.to(left, right);
  left.to(XOR_1)
  right.to(EP);
  EP.to(XOR_0);
  k1.to(XOR_0);
  XOR_0.to(SP_1);
  SP_1.to(S0, S1);
  S0.to(Cat_s0_s1);
  S1.to(Cat_s0_s1);
  Cat_s0_s1.to(P4);
  P4.to(XOR_1);

  XOR_1.to(sw);
  right.to(sw);

  return { plain_text, k1, k2, ip_1, ip_1_reversed, SP_0, left, right, EP, XOR_0, SP_1, S0, P4, XOR_1, S1, Cat_s0_s1, sw }
})