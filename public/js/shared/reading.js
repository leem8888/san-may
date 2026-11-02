// Reading texts (public/data/stories.json) split the same way on client and server: one sentence per passage,
// then the reflection question. Paragraph mode, bookmarks and shared reading all count in these passages.
export function passages(item) {
  if (!item) return [];
  const sentences = String(item.text || '').split(/(?<=[.!?…”])\s+/).map(s => s.trim()).filter(Boolean);
  return item.reflect ? [...sentences, `Suy ngẫm: ${item.reflect}`] : sentences;
}
