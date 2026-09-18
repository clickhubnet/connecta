import type { Prisma } from "@prisma/client";

export type CreateAgentInput = {
  name: string;
  gender?: string;
  personality: string;
  rules?: Prisma.InputJsonValue;
  flow?: Prisma.InputJsonValue;
  active?: boolean;
  minTypingSeconds?: number;
  maxTypingSeconds?: number;
  enableReadReceipt?: boolean;
  enableTyping?: boolean;
  enableReplyDelay?: boolean;
  openAiModel?: string;
  planIds?: string[];
};

export type UpdateAgentInput = Partial<CreateAgentInput>;
