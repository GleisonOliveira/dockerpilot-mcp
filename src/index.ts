import { dockerClient } from "./docker/client.js";
import { ToolContainer } from "./di/tool-container.js";
import { DockerPilotServer } from "./server.js";
import { toolClasses } from "./tools.config.js";

const container = new ToolContainer({ toolClasses, client: dockerClient });
const server = new DockerPilotServer(container);

await server.start();
