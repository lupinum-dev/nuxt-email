export function unescapeClass(singleClass: string): string {
  return singleClass.replaceAll(/\\\d|\\/g, '')
}
