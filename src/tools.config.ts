import { ToolConstructor } from "./di/tool-container.js";
import { ListContainersTool } from "./docker/tools/list/list.tool.js";
import { StopContainersTool } from "./docker/tools/stop/stop.tool.js";

export const toolClasses: ToolConstructor[] = [ListContainersTool, StopContainersTool];
