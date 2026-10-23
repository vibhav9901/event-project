/** Removes control characters (keeps newlines) so text is safe to log, store and embed in prompts. */
export function stripControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 10 || (code >= 32 && code !== 127);
    })
    .join('');
}
