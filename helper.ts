/**
 * unwarp every element in the array, and combine them into a single array
 * @param arr 
 */
export function unwarpDeep(arr: any[][]) {
  return arr.reduce((acc, val) => acc.concat(val), []);
}