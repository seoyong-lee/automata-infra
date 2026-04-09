/**
 * LLM이 JSON만 달라도 마크다운 코드 펜스(json)나 앞뒤 문장을 붙이는 경우가 많아,
 * 단순 JSON.parse 전에 펜스 블록을 먼저 꺼낸다.
 */
export const parseJsonFromLlmText = (content: string): unknown => {
  const trimmed = content.trim();

  const strictFence = trimmed.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  if (strictFence) {
    return JSON.parse(strictFence[1].trim()) as unknown;
  }

  const openMatch = trimmed.match(/```[a-zA-Z]*\s*\n?/);
  if (openMatch?.index !== undefined) {
    const bodyStart = openMatch.index + openMatch[0].length;
    const afterOpen = trimmed.slice(bodyStart);
    const closeIdx = afterOpen.indexOf("```");
    if (closeIdx !== -1) {
      const inner = afterOpen.slice(0, closeIdx).trim();
      if (inner.length > 0) {
        return JSON.parse(inner) as unknown;
      }
    }
  }

  return JSON.parse(trimmed) as unknown;
};
