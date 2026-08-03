/**
 * Local stand-in for the backend AI speech-similarity engine described in
 * docs/DIGITAL_MALA_API.md. There is no `/api/digital_mala.php` deployed yet
 * (confirmed 404), so accuracy is estimated on-device from the transcript
 * the phone's speech recognizer already produced. This is character-level
 * Levenshtein similarity against the canonical Navkar Mantra text, which
 * tolerates minor recognition/pronunciation drift without requiring exact
 * word matches — replace with the server's real score once it exists.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '');
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow.push(Math.min(
        previousRow[j + 1] + 1,
        currentRow[j] + 1,
        previousRow[j] + cost,
      ));
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

/** Returns a 0–100 similarity score between a spoken transcript and the reference mantra text. */
export function computeMantraAccuracy(transcript: string, reference: string): number {
  const a = normalize(transcript);
  const b = normalize(reference);
  if (!a || !b) return 0;
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const similarity = (1 - distance / maxLen) * 100;
  return Math.max(0, Math.min(100, Math.round(similarity)));
}
