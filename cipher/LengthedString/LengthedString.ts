function concatUint8Arrays(...arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
/**
 * Description: LengthedString is a string with a length prefix.
 * length prefix is a 32-bit unsigned integer.
 * Example:
 * ```ts
 * const value = 'hello';
 * const bytes = encodeLengthedString(value);
 * const decodedValue = decodeLengthedString(bytes);
 * console.log(decodedValue); // hello
 * ```
 */
function encodeLengthedString(value: string) {
  const encoder = new TextEncoder();
  const length = encoder.encode(value).length;
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, length);
  const ret = concatUint8Arrays(lengthBytes, encoder.encode(value));
  return ret;
}

/**
 * Description: LengthedString is a string with a length prefix.
 * length prefix is a 32-bit unsigned integer.
 * Example:
 * ```ts
 * const value = 'hello';
 * const bytes = encodeLengthedString(value);
 * const decodedValue = decodeLengthedString(bytes);
 * console.log(decodedValue); // hello
 * ```
 */
function decodeLengthedString(bytes: Uint8Array) {
  const length = new DataView(bytes.buffer).getUint32(0);
  const decoder = new TextDecoder();
  return decoder.decode(bytes.slice(4, 4 + length));
}

export { decodeLengthedString, encodeLengthedString };