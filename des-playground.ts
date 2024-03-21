import { Number, Test, Object, List } from "ts-toolbelt"
import { unwarpDeep } from "./helper";

type TupleOf<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

type Bits<Length extends number> = TupleOf<0 | 1, Length>;

//TODO check if this is correct
type MapedArray<T extends unknown[], K extends (u: unknown) => unknown> = { [K in keyof T]: K extends keyof T ? K : never };

abstract class Op<T, R> {
  abstract apply(input: T): R;
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

class Output<L extends number> extends Op<[Bits<L>], [Bits<L>]> {
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

type NonEmptyArray<T> = [T, ...T[]];
type EmptyableArray<T> = [...T[]];
type ComputationalNodesInputType<T extends NonEmptyArray<unknown>> = {
  [K in keyof T]: ComputationalNode<NonEmptyArray<unknown>, [T[K], ...EmptyableArray<unknown>]>
};
type ComputationalNodesOutputType<R extends NonEmptyArray<unknown>> = {
  [K in keyof R]: ComputationalNode<[R[K], ...EmptyableArray<unknown>], NonEmptyArray<unknown>>
};



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
  addParent(node: ComputationalNode<any, any>) {
    this.parent.push(node);
    node.children.push(this);
  }

  public static Input(val: any) {
    return new ComputationalNode(new Input(val));
  }

  public static Output() {
    return new ComputationalNode(new Output());
  }
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


// Test
const i = ComputationalNode.Input([1, 0, 0, 1])
const j = ComputationalNode.Input([0, 1, 0, 1])
const k = ComputationalNode.Input([0, 0, 1, 1])
const add = new ComputationalNode(new Add());
const cat = new ComputationalNode(new Concat());
const output = ComputationalNode.Output();

add.addParent(i);
add.addParent(j);

cat.addParent(add);
cat.addParent(k);

output.addParent(cat);

const graph = new ComputationalGraph();
graph.addInputNode(i);
graph.addInputNode(j);
graph.addInputNode(k);

graph.addOutputNode(output);

graph.run();
