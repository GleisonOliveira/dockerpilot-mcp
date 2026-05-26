import { buildUserMessage } from "./messages/user.message.js";
import { buildAssistantMessage } from "./messages/assistant.message.js";

export function buildImageCleanupMessages() {
  return [
    {
      role: "user" as const,
      content: { type: "text" as const, text: buildUserMessage() },
    },
    {
      role: "assistant" as const,
      content: { type: "text" as const, text: buildAssistantMessage() },
    },
  ];
}
