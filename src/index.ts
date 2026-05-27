#!/usr/bin/env node
import { dockerClient } from "./docker/client.js";
import { ToolContainer } from "./di/tool-container.js";
import { PromptContainer } from "./di/prompt-container.js";
import { DockerPilotServer } from "./server.js";
import { toolClasses } from "./tools.config.js";
import { promptClasses } from "./prompts.config.js";

const toolContainer = new ToolContainer({ toolClasses, client: dockerClient });
const promptContainer = new PromptContainer({ promptClasses });
const server = new DockerPilotServer(toolContainer, promptContainer);

await server.start();
