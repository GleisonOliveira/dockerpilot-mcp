import { buildUserMessage } from "./messages/user.message.js";
import { buildAssistantMessage } from "./messages/assistant.message.js";

export interface ComposeServiceArgs {
  service_name?: string;
  action?: string;
}

export function buildComposeServiceMessages({ service_name, action }: ComposeServiceArgs) {
  return [
    {
      role: "user" as const,
      content: { type: "text" as const, text: buildUserMessage(service_name, action) },
    },
    {
      role: "assistant" as const,
      content: { type: "text" as const, text: buildAssistantMessage(service_name ?? "", action ?? "") },
    },
  ];
}
