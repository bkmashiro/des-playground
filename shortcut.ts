import { ComputationalNode, createNode, createOpByName, ops } from "./backend";
import { _Input, _Output } from "./ops/operators";
import { NonEmptyArray } from "./type.helper";

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

// function $<
//   Input extends NonEmptyArray<unknown>,
//   Output extends NonEmptyArray<unknown>,
//   K extends keyof typeof ops,
// >(name: K) {
//   const instance = createOpByName(name);
//   return new ComputationalNode(instance as any) as ComputationalNode<Input, Output>;
// }

// function From(...nodes: ComputationalNode<any, any>[]) {
//   class _ {
//     to = (name: keyof typeof ops | 'out') => {
//       if (name === 'out') {
//         return Output().from(...nodes);
//       }
//       const node = $(name)
//       return node.from(...nodes);
//     }
//   }

//   return new _();
// }

function Select(n: number) {
  return createNode(`SEL{${n}}`);
}

function Split(n: number) {
  return createNode(`SP{${n}}`);
}

function Xor() {
  return createNode(`XOR`);
}

const XOR = Xor();

function Cat() {
  return createNode(`C`);
}

const CAT = Cat();

function EP(args: number[]) {
  return createNode(`EP{${args.join(',')}}`);
}

function SBox(args: number[]) {
  return createNode(`SBOX{${args.join(',')}}`);
}

function P(args: number[]) {
  return createNode(`P{${args.join(',')}}`);
}

export const $ = {

  EP,
  SBox,
  P,
}

export const $$ = {
  XOR,
  CAT,
}

export {
  Input,
  Output,
  Split,
  Select,
  Xor,
  Cat,
}