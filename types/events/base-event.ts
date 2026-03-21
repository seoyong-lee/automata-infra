export type BaseEvent<TPayload> = {
  eventName: string;
  eventId: string;
  jobId: string;
  contentId: string;
  occurredAt: string;
  producer: string;
  payload: TPayload;
};
