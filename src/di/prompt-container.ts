import { BasePrompt } from "../docker/shared/base.prompt.js";

export interface PromptConstructor {
  new (): BasePrompt;
}

export interface PromptContainerConfig {
  promptClasses: PromptConstructor[];
}

export class PromptContainer {
  private readonly prompts: BasePrompt[];

  constructor(config: PromptContainerConfig) {
    this.prompts = config.promptClasses.map((PromptClass) => new PromptClass());
  }

  getPrompts(): BasePrompt[] {
    return this.prompts;
  }
}
