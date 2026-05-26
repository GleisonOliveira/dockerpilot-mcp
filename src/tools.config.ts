import { ToolConstructor } from "./di/tool-container.js";
import { ListContainersTool } from "./docker/tools/list/list.tool.js";
import { ListImagesTool } from "./docker/tools/list-images/list-images.tool.js";
import { StopContainersTool } from "./docker/tools/stop/stop.tool.js";
import { StartContainersTool } from "./docker/tools/start/start.tool.js";
import { DeleteContainerTool } from "./docker/tools/delete/delete.tool.js";
import { DeleteImageTool } from "./docker/tools/delete-image/delete-image.tool.js";
import { ListVolumesTool } from "./docker/tools/list-volumes/list-volumes.tool.js";

export const toolClasses: ToolConstructor[] = [
  ListContainersTool,
  ListImagesTool,
  StopContainersTool,
  StartContainersTool,
  DeleteContainerTool,
  DeleteImageTool,
  ListVolumesTool,
];
