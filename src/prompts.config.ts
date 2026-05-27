import { PromptConstructor } from "./di/prompt-container.js";
import { ContainerTroubleshootPrompt } from "./docker/prompts/container-troubleshoot/container-troubleshoot.prompt.js";
import { ImageCleanupPrompt } from "./docker/prompts/image-cleanup/image-cleanup.prompt.js";
import { VolumeRemovalPrompt } from "./docker/prompts/volume-removal/volume-removal.prompt.js";
import { ComposeStartPrompt } from "./docker/prompts/compose-start/compose-start.prompt.js";
import { ComposeStopPrompt } from "./docker/prompts/compose-stop/compose-stop.prompt.js";
import { ComposeRestartPrompt } from "./docker/prompts/compose-restart/compose-restart.prompt.js";
import { ComposeServicePrompt } from "./docker/prompts/compose-service/compose-service.prompt.js";

export const promptClasses: PromptConstructor[] = [
  ContainerTroubleshootPrompt,
  ImageCleanupPrompt,
  VolumeRemovalPrompt,
  ComposeStartPrompt,
  ComposeStopPrompt,
  ComposeRestartPrompt,
  ComposeServicePrompt,
];
