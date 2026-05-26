import { PromptConstructor } from "./di/prompt-container.js";
import { ContainerTroubleshootPrompt } from "./docker/prompts/container-troubleshoot/container-troubleshoot.prompt.js";
import { ImageCleanupPrompt } from "./docker/prompts/image-cleanup/image-cleanup.prompt.js";
import { VolumeRemovalPrompt } from "./docker/prompts/volume-removal/volume-removal.prompt.js";

export const promptClasses: PromptConstructor[] = [
  ContainerTroubleshootPrompt,
  ImageCleanupPrompt,
  VolumeRemovalPrompt,
];
