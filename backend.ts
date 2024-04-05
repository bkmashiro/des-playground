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
    return unwarpDeep(this.graph.run_with_tuple_input(input)) as R;
  }
}
const enable_debug = false;
function Log(...args: any[]) {
  if (enable_debug) {
    console.log(...args);
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

class ComputationalNode<T extends NonEmptyArray<unknown> = any, R extends NonEmptyArray<unknown> = any> {
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
    return this;
  }
}

function Literal(val: any) {
  return new ComputationalNode(new _Literal(val));
}


function createOpByName(name: keyof typeof ops) {
  return new (ops[name] as any)() as InstanceType<typeof ops[keyof typeof ops]>;
}

class ComputationalGraph {
  constructor() { }
  static __do_debug_static = false;
  static log = (...args: any[]) => {
    if (this.__do_debug_static) {
      console.log(...args);
    }
  }
  __do_debug = false;
  log = (...args: any[]) => {
    if (this.__do_debug) {
      console.log(...args);
    }
  }
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

    Log(`created a graph with ${graph.nodes.length} nodes, ${graph.inputNodes.size} input nodes, ${graph.outputNodes.size} output nodes`)
    Log(`input nodes: `, graph.inputNodes);
    Log(`output nodes: `, graph.outputNodes);
    return graph;
  }

  static scope(scoped: (stub: ReturnType<ComputationalGraph["getScopeStub"]>) => any) {
    const g = new ComputationalGraph();
    const nodes = scoped(g.getScopeStub());
    for (const key in nodes) {
      const node = nodes[key];
      g.addNode(node);
      if (node.parent.length === 0) {
        g.addInputNode(node);
      }
      if (node.children.length === 0) {
        g.addOutputNode(node);
      }
    }

    Log(`created a graph with ${g.inputNodes.size} input nodes, ${g.outputNodes.size} output nodes`)

    return g;
  }

  private getScopeStub() {
    const g = this
    const Input = (name: string) => {
      const input = new _Input();
      input._name = name;
      const node = new ComputationalNode(input);
      g.addNode(node);
      g.addInputNode(node);
      return node;
    }

    const Output = (name: string = '') => {
      const out = new _Output()
      out.withArgs(name);
      const node = new ComputationalNode(out);
      g.addNode(node);
      g.addOutputNode(node);
      return node;
    }

    const map = new Map<string, ComputationalNode>();
    const dim = (node: ComputationalNode<any, any>, name: string) => {
      if (map.has(name)) {
        throw new Error(`Duplicated name: ${name}`);
      }
      map.set(name, node);
      return node!;
    }

    const ref = (name: string) => {
      if (!map.has(name)) {
        throw new Error(`Reference not found: ${name}`);
      }
      return map.get(name)!;
    }

    return { Input, Output, dim, ref }
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
      let can_calculate = true;
      for (const p of node.parent) {
        if (!cache.has(p)) {
          // cannot calculate the result of this node now,
          // put it back to the set
          set.add(node);
          // trying to calculate other nodes
          can_calculate = false;
        }
      }
      if (!can_calculate) {
        continue;
      }

      const input = node.parent.map((parent) => cache.get(parent));
      const extractArgs = (input: any) => {
        const vals = Object.values(input);
        return vals
      }
      this.log(`current running Op: `, node.op.constructor.name, extractArgs(node.op));
      this.log(`in: `, unwarpDeep(input));
      const output = node.apply(...unwarpDeep(input));
      this.log(`out: `, output);
      cache.set(node, output);
      node.children.forEach((child) => {
        set.add(child);
      });
    }

    // collect the result
    const result = [] as any[];
    this.outputNodes.forEach((node) => {
      result.push(cache.get(node));
      if (node.op instanceof _Output && node.op._name !== '') {
        this.named_results.set(node.op._name, cache.get(node));
      }
    });

    return result;
  }

  retrive_result(name: string) {
    return this.named_results.get(name);
  }

  retrive_bits_results(...names: string[]) {
    return names.map(name => this.named_results.get(name)[0]);
  }

  run_with_input(input: Record<string, any>) {
    console.log(`@@@input`, input);
    // override the input nodes
    this.inputNodes.forEach((node) => {
      if (node.op instanceof _Input) {
        const name = node.op._name;
        if (name in input) {
          node.op._input = input[name];
        } else {
          console.error(`invalid input for `, node);
          console.error(`input`, name, `not found`);
          throw new Error(`Input ${name} not found`);
        }
      }
    });
    return this.run();
  }

  run_with_tuple_input(input: any[]) {
    // since no name is provided, we assume the input nodes are in the same order as the input array
    const _input_nodes = Array.from(this.inputNodes);
    _input_nodes.forEach((node, i) => {
      if (node.op instanceof _Input) {
        node.op._input = input[i];
        this.log(`set input ${i} to `, input[i]);
      }
    })
    return this.run();
  }

  // private clean_cache() {
  //   this.named_results.clear();
  // }

  /**
   * You must make sure the computationalGraph is a pure function,
   * because is reused in the main graph, if multiple asNode is called,
   * they share the same underlying ComputationalGraph instance.
   * @returns 
   */
  asNode() {
    return new ComputationalNode(new SubGraph(this));
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
class Bits {
  constructor(private bits: number[] = []) { }

  static from(s: string) {
    return new Bits(s.split('').map(c => parseInt(c)));
  }

  static fromNumber(n: number, length: number) {
    return new Bits(n.toString(2).padStart(length, '0').split('').map(c => parseInt(c)));
  }

  static fromUTF8(s: string) {
    return new Bits(new TextEncoder().encode(s).map(c => parseInt(c.toString(2).padStart(8, '0'))).join('').split('').map(c => parseInt(c)));
  }

  toNumber() {
    return parseInt(this.bits.join(''), 2);
  }

  toBinaryString() {
    return this.bits.join('');
  }

  toUTF8() {
    return new TextDecoder().decode(new Uint8Array(this.bits));
  }

  public get length(): number {
    return this.bits.length;
  }

  public get(index: number) {
    return this.bits[index];
  }

  public slice(start: number, end: number) {
    return this.bits.slice(start, end);
  }

  public concat(...bits: Bits[]) {
    return new Bits(this.bits.concat(...bits.map(b => b.bits)));
  }

  public append(...bits: Bits[]) {
    this.bits.push(...bits.map(b => b.bits).flat());
  }

  public set(index: number, value: number) {
    this.bits[index] = value;
  }

  public getBits() {
    return this.bits as readonly number[];
  }

  public static get empty(): Bits {
    return new Bits();
  }

}

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
      Log(`Creating op: ${op.name} with params: ${op.params ?? "<empty>"}`);
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

function Sequencial<T extends string>(init_str: T, connect: boolean = false) {
  // const ops = init_str.split(/\s+/).map(createOp);
  const ops = init_str.split(/\s+/).map(createOp);
  if (ops.length === 0 || ops.some(op => op === null)) {
    throw new Error('Not valid ops list');
  }
  // create computational nodes
  // @ts-ignore op is not null
  const nodes = ops.map(op => new ComputationalNode(op));
  // connect nodes
  if (connect) {
    nodes.reduce((prev, current) => {
      prev.to(current);
      return current;
    });
  }

  return nodes
}


export {
  Sequencial,
  createNode,
  ComputationalGraph,
  ComputationalNode,
  Bits,
  createOpByName,
  ops,
}