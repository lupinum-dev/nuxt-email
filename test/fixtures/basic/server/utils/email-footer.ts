/** A server util that a template calls without importing it (Nitro auto-import). */
export function emailFooterNote(name: string): string {
  return `AUTO_IMPORT_3B9E for ${name}`
}
