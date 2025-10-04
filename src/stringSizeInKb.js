/**
 * @param {string} str
 */
export function stringSizeInKB(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  const byteLength = bytes.length;

  return (byteLength / 1024).toFixed(2);
}
