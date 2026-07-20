export interface RenderedEmail {
  html: string
  text: string
  /**
   * Subject line declared by the template via `defineEmail`. Absent when the
   * template does not call `defineEmail`.
   */
  subject?: string
}
