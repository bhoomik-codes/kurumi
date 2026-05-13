// ────────────────────────────────────────────────────────────────────────────
// Approximate 512-token chunks with overlap for context continuity.
// ────────────────────────────────────────────────────────────────────────────
const CHARS_PER_TOKEN = 4
const CHUNK_TOKENS = 512
const CHUNK_OVERLAP_TOKENS = 128
const CHUNK_CHARS = CHUNK_TOKENS * CHARS_PER_TOKEN
const CHUNK_OVERLAP = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN

export function chunkText(text: string): string[] {
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  if (!normalised) return []

  const splitLong = (block: string): string[] => {
    if (block.length <= CHUNK_CHARS) return [block]
    const slices: string[] = []
    let pos = 0
    while (pos < block.length) {
      slices.push(block.slice(pos, pos + CHUNK_CHARS))
      pos += CHUNK_CHARS - CHUNK_OVERLAP
    }
    return slices
  }

  const paragraphs: string[] = normalised
    .split(/\n\n+/)
    .flatMap((p) => splitLong(p.trim()))
    .filter((p) => p.length > 30)

  const chunks: string[] = []
  let current = ''

  for (const p of paragraphs) {
    if (current.length > 0 && current.length + p.length + 2 > CHUNK_CHARS) {
      chunks.push(current.trim())
      const tail = current.slice(Math.max(0, current.length - CHUNK_OVERLAP))
      current = tail + '\n\n' + p
    } else {
      current = current ? current + '\n\n' + p : p
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks
}
