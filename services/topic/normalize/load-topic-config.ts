export const loadTopicConfig = () => {
  return {
    channelId: process.env.CHANNEL_ID ?? "history-en",
    targetLanguage: process.env.DEFAULT_LANGUAGE ?? "en",
  };
};
