// example: P{2,1,3,4} LS{3} EP{4,1,2,3,2,3,4,1}
/*
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
 */

type Keyword = 'LS' | 'RS' | 'C' | 'ADD' | 'XOR' | 'AND' | 'OR' | 'NOT' | 'EP' | 'P';
type ParamList<T extends string> = `{${T}}`;
type Epsilon = '';
type EmptyParamList = '{}';
type NumberParam = `${number}`;
type Seperator = ',';

type SplitComma<S extends string, R extends any[] = []> =
    S extends `${infer First},${infer Rest}`
    ? SplitComma<Rest, [...R, First]>
    : S extends `${infer Last}`
    ? [...R, Last]
    : never;

type CommaSeparatedNumbers = "1" | "123" | "4,5,6,7";

type Result = SplitComma<CommaSeparatedNumbers>; // Result: ["1"] | ["2", "3"] | ["4", "5", "6", "7"]
