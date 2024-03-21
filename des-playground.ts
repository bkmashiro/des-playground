import { Number, Test, Object, List } from "ts-toolbelt"

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
    let carry = 0;
    const result = a.map((bit, i) => {
      const sum = bit + b[i] + carry;
      carry = sum >> 1;
      return sum & 1;
    });
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

  apply(input: T): R {
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
    const _output = new ComputationalNode(new Output());
    _output.addParent(node);
    this.outputNodes.add(_output);
  }

  run() {
    // we use topological sort to run the graph
    const visited = new Set<ComputationalNode<any, any>>();
    const stack = [] as ComputationalNode<any, any>[];
    this.inputNodes.forEach((node) => {
      stack.push(node);
    });
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (!visited.has(node)) {
        visited.add(node);
        const input = node.parent.map((parent) => {
          return parent.children.map((child) => {
            return child.apply(parent.apply(input));
          });
        });
        node.apply(input);
        node.children.forEach((child) => {
          stack.push(child);
        });
      }
    }

    // output the result
    this.outputNodes.forEach((node) => {
      console.log((node.op as Output<any>).memory);
    });
  }
}


// Test
const add = new Add();
const concat = new Concat();

const a = new ComputationalNode(add);
const b = new ComputationalNode(add);
const c = new ComputationalNode(concat);

a.addParent(b);
b.addParent(c);

const graph = new ComputationalGraph();
graph.addInputNode(a);
graph.addInputNode(b);
graph.addOutputNode(c);
graph.run();
