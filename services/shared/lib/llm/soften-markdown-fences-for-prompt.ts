/**
 * 사용자 입력에 마크다운 코드 펜스(백틱 3개)가 있으면 모델이 응답도 json 펜스로 감싸기 쉽다.
 * 프롬프트에 넣기 직전에만 백틱 3개를 작은따옴표 3개로 바꾼다.
 */
export const softenMarkdownFencesForPrompt = (value: string): string =>
  value.replace(/```/g, "'''");
