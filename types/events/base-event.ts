export type BaseEvent<TPayload> = {
  eventName: string;
  eventId: string;
  jobId: string;
  channelId: string;
  occurredAt: string;
  producer: string;
  payload: TPayload;
};
