export const loadPlanConfig = () => {
  return {
    contentId:
      process.env.DEFAULT_CONTENT_ID ?? process.env.CHANNEL_ID ?? "history-en",
    targetLanguage: process.env.DEFAULT_LANGUAGE ?? "en",
  };
};
