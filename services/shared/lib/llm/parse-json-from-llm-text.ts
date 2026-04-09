/**
 * LLM이 JSON만 달라도 마크다운 코드 펜스(json)나 앞뒤 문장을 붙이는 경우가 많아
 * 단순 JSON.parse 전에 펜스·첫 JSON 객체를 꺼낸다.
 */

const stripBom = (s: string): string => s.replace(/^\uFEFF/, "").trim();

/** 첫 번째 완전한 top-level `{ ... }` 또는 `[ ... ]` 구간 (문자열/이스케이프 반영). */
const extractFirstBalancedJson = (
  s: string,
  open: "{" | "[",
  close: "}" | "]",
): string | null => {
  const start = s.indexOf(open);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (c === "\\" && inString) {
      escape = true;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (c === open) {
      depth += 1;
    } else if (c === close) {
      depth -= 1;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  return null;
};

/**
 * 첫 ``` 부터 다음 ``` 까지(닫는 펜스 있음). 없으면 null.
 * 언어 태그는 ``` 직후 공백·json 등 허용.
 */
const extractClosedFenceBody = (s: string): string | null => {
  const fence = s.indexOf("```");
  if (fence === -1) {
    return null;
  }

  let pos = fence + 3;
  while (pos < s.length && /[a-zA-Z]/.test(s[pos])) {
    pos += 1;
  }
  while (pos < s.length && (s[pos] === " " || s[pos] === "\t")) {
    pos += 1;
  }
  if (s[pos] === "\r") {
    pos += 1;
  }
  if (s[pos] === "\n") {
    pos += 1;
  }

  const close = s.indexOf("```", pos);
  if (close === -1) {
    return null;
  }

  return s.slice(pos, close).trim();
};

/** 닫는 ``` 가 없을 때: 여는 펜스 줄 다음부터 끝에서 trailing ``` 제거 후 사용. */
const extractOpenFenceTail = (s: string): string | null => {
  const fence = s.indexOf("```");
  if (fence === -1) {
    return null;
  }

  let pos = fence + 3;
  while (pos < s.length && /[a-zA-Z]/.test(s[pos])) {
    pos += 1;
  }
  while (pos < s.length && (s[pos] === " " || s[pos] === "\t")) {
    pos += 1;
  }
  if (s[pos] === "\r") {
    pos += 1;
  }
  if (s[pos] === "\n") {
    pos += 1;
  }

  let tail = s.slice(pos).trim();
  if (tail.endsWith("```")) {
    tail = tail.slice(0, -3).trim();
  }
  return tail.length > 0 ? tail : null;
};

const tryParse = (raw: string): unknown => JSON.parse(raw) as unknown;

export const parseJsonFromLlmText = (content: string): unknown => {
  const trimmed = stripBom(content);

  const closedFence = extractClosedFenceBody(trimmed);
  if (closedFence) {
    try {
      return tryParse(closedFence);
    } catch {
      const fromFenceObj = extractFirstBalancedJson(closedFence, "{", "}");
      if (fromFenceObj) {
        return tryParse(fromFenceObj);
      }
      const fromFenceArr = extractFirstBalancedJson(closedFence, "[", "]");
      if (fromFenceArr) {
        return tryParse(fromFenceArr);
      }
    }
  }

  const openTail = extractOpenFenceTail(trimmed);
  if (openTail) {
    try {
      return tryParse(openTail);
    } catch {
      const o = extractFirstBalancedJson(openTail, "{", "}");
      if (o) {
        return tryParse(o);
      }
      const a = extractFirstBalancedJson(openTail, "[", "]");
      if (a) {
        return tryParse(a);
      }
    }
  }

  try {
    return tryParse(trimmed);
  } catch {
    const obj = extractFirstBalancedJson(trimmed, "{", "}");
    if (obj) {
      return tryParse(obj);
    }
    const arr = extractFirstBalancedJson(trimmed, "[", "]");
    if (arr) {
      return tryParse(arr);
    }
    throw new SyntaxError(
      `No valid JSON object/array found in LLM response (length=${trimmed.length})`,
    );
  }
};
