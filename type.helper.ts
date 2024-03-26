type TupleOf<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

type Bits<Length extends number> = TupleOf<0 | 1, Length>;


type NonEmptyArray<T> = [T, ...T[]];
type EmptyableArray<T> = [...T[]];

export {
  TupleOf,
  Bits,
  NonEmptyArray,
  EmptyableArray,
}