import { buildUserMessage } from "./messages/user.message.js";
import { buildAssistantMessage } from "./messages/assistant.message.js";

export interface ComposeRestartArgs {
  project_dir?: string;
}

export function buildComposeRestartMessages({ project_dir }: ComposeRestartArgs) {
  return [
    {
      role: "user" as const,
      content: { type: "text" as const, text: buildUserMessage(project_dir) },
    },
    {
      role: "assistant" as const,
      content: { type: "text" as const, text: buildAssistantMessage(project_dir ?? "") },
    },
  ];
}
