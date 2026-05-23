import { buildUserMessage } from "./messages/user.message.js";
import { buildAssistantMessage } from "./messages/assistant.message.js";

export interface ContainerTroubleshootArgs {
  container_name?: string;
  symptom?: string;
}

export function buildContainerTroubleshootMessages({ container_name, symptom }: ContainerTroubleshootArgs) {
  const containerRef = container_name ? `\`${container_name}\`` : "the affected container";
  const nameArg = container_name ?? "<name>";

  return [
    {
      role: "user" as const,
      content: { type: "text" as const, text: buildUserMessage(containerRef, symptom) },
    },
    {
      role: "assistant" as const,
      content: { type: "text" as const, text: buildAssistantMessage(containerRef, nameArg) },
    },
  ];
}
