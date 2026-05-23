import { DockerClient } from "../docker/client.js";
import { BaseTool } from "../docker/shared/base.tool.js";

export interface ToolConstructor {
  new (client: DockerClient): BaseTool;
}

export interface ToolContainerConfig {
  toolClasses: ToolConstructor[];
  client: DockerClient;
}

export class ToolContainer {
  private readonly tools: BaseTool[];

  constructor(config: ToolContainerConfig) {
    this.tools = config.toolClasses.map((ToolClass) => new ToolClass(config.client));
  }

  getTools(): BaseTool[] {
    return this.tools;
  }
}
