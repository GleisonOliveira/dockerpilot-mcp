import { ToolConstructor } from "./di/tool-container.js";
import { ListContainersTool } from "./docker/tools/list/list.tool.js";
import { ListImagesTool } from "./docker/tools/list-images/list-images.tool.js";
import { StopContainersTool } from "./docker/tools/stop/stop.tool.js";
import { StartContainersTool } from "./docker/tools/start/start.tool.js";
import { DeleteContainerTool } from "./docker/tools/delete/delete.tool.js";
import { DeleteImageTool } from "./docker/tools/delete-image/delete-image.tool.js";
import { ListVolumesTool } from "./docker/tools/list-volumes/list-volumes.tool.js";
import { CreateVolumeTool } from "./docker/tools/create-volume/create-volume.tool.js";
import { DeleteVolumeTool } from "./docker/tools/delete-volume/delete-volume.tool.js";
import { CreateContainerTool } from "./docker/tools/create-container/create-container.tool.js";
import { DockerStatusTool } from "./docker/tools/docker-status/docker-status.tool.js";
import { PullImageTool } from "./docker/tools/pull-image/pull-image.tool.js";
import { RestartContainerTool } from "./docker/tools/restart/restart.tool.js";
import { ExecCommandTool } from "./docker/tools/exec-command/exec-command.tool.js";
import { ContainerLogsTool } from "./docker/tools/container-logs/container-logs.tool.js";

export const toolClasses: ToolConstructor[] = [
  ListContainersTool,
  ListImagesTool,
  StopContainersTool,
  StartContainersTool,
  DeleteContainerTool,
  DeleteImageTool,
  ListVolumesTool,
  CreateVolumeTool,
  DeleteVolumeTool,
  CreateContainerTool,
  DockerStatusTool,
  PullImageTool,
  RestartContainerTool,
  ExecCommandTool,
  ContainerLogsTool,
];
