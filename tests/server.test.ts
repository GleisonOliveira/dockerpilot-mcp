import { describe, it, expect, vi } from "vitest";
import { DockerPilotServer } from "../src/server.js";
import { ToolContainer } from "../src/di/tool-container.js";
import { BaseTool } from "../src/docker/shared/base.tool.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function makeMockTool(): BaseTool & { register: ReturnType<typeof vi.fn> } {
  return { register: vi.fn() } as unknown as BaseTool & { register: ReturnType<typeof vi.fn> };
}

function makeContainer(tools: BaseTool[]): ToolContainer {
  return { getTools: () => tools } as unknown as ToolContainer;
}

describe("DockerPilotServer", () => {
  it("calls register on every tool from container", () => {
    const toolA = makeMockTool();
    const toolB = makeMockTool();

    new DockerPilotServer(makeContainer([toolA, toolB]));

    expect(toolA.register).toHaveBeenCalledOnce();
    expect(toolB.register).toHaveBeenCalledOnce();
  });

  it("passes McpServer instance to each tool register", () => {
    const tool = makeMockTool();

    new DockerPilotServer(makeContainer([tool]));

    const receivedArg = tool.register.mock.calls[0][0];
    expect(receivedArg).toBeInstanceOf(McpServer);
  });

  it("registers no tools when container is empty", () => {
    expect(() => new DockerPilotServer(makeContainer([]))).not.toThrow();
  });

  it("tools config contains ListContainersTool", async () => {
    const { toolClasses } = await import("../src/tools.config.js");
    const { ListContainersTool } = await import("../src/docker/tools/list/list.tool.js");

    expect(toolClasses).toContain(ListContainersTool);
  });
});
