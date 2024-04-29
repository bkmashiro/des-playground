/**
 * unwarp every element in the array, and combine them into a single array
 * @param arr 
 */
export function unwarpDeep(arr: any[][]) {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

export function prettyPrint(arr: any[]) {
  //deep flatten the array
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    str += (arr[i].join('')) + '\n';
  }
  return str;
}