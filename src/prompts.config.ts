import { PromptConstructor } from "./di/prompt-container.js";
import { ContainerTroubleshootPrompt } from "./docker/prompts/container-troubleshoot/container-troubleshoot.prompt.js";

export const promptClasses: PromptConstructor[] = [ContainerTroubleshootPrompt];
