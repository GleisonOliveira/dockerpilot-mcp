import { describe, it, expect, vi } from "vitest";
import { DockerPilotServer } from "../src/server.js";
import { ToolContainer } from "../src/di/tool-container.js";
import { PromptContainer } from "../src/di/prompt-container.js";
import { BaseTool } from "../src/docker/shared/base.tool.js";
import { BasePrompt } from "../src/docker/shared/base.prompt.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function makeMockTool(): BaseTool & { register: ReturnType<typeof vi.fn> } {
  return { register: vi.fn() } as unknown as BaseTool & { register: ReturnType<typeof vi.fn> };
}

function makeMockPrompt(): BasePrompt & { register: ReturnType<typeof vi.fn> } {
  return { register: vi.fn() } as unknown as BasePrompt & { register: ReturnType<typeof vi.fn> };
}

function makeToolContainer(tools: BaseTool[]): ToolContainer {
  return { getTools: () => tools } as unknown as ToolContainer;
}

function makePromptContainer(prompts: BasePrompt[]): PromptContainer {
  return { getPrompts: () => prompts } as unknown as PromptContainer;
}

describe("DockerPilotServer", () => {
  it("calls register on every tool from container", () => {
    const toolA = makeMockTool();
    const toolB = makeMockTool();

    new DockerPilotServer(makeToolContainer([toolA, toolB]), makePromptContainer([]));

    expect(toolA.register).toHaveBeenCalledOnce();
    expect(toolB.register).toHaveBeenCalledOnce();
  });

  it("passes McpServer instance to each tool register", () => {
    const tool = makeMockTool();

    new DockerPilotServer(makeToolContainer([tool]), makePromptContainer([]));

    const receivedArg = tool.register.mock.calls[0][0];
    expect(receivedArg).toBeInstanceOf(McpServer);
  });

  it("registers no tools when tool container is empty", () => {
    expect(() => new DockerPilotServer(makeToolContainer([]), makePromptContainer([]))).not.toThrow();
  });

  it("calls register on every prompt from container", () => {
    const promptA = makeMockPrompt();
    const promptB = makeMockPrompt();

    new DockerPilotServer(makeToolContainer([]), makePromptContainer([promptA, promptB]));

    expect(promptA.register).toHaveBeenCalledOnce();
    expect(promptB.register).toHaveBeenCalledOnce();
  });

  it("passes McpServer instance to each prompt register", () => {
    const prompt = makeMockPrompt();

    new DockerPilotServer(makeToolContainer([]), makePromptContainer([prompt]));

    const receivedArg = prompt.register.mock.calls[0][0];
    expect(receivedArg).toBeInstanceOf(McpServer);
  });

  it("tools config contains ListContainersTool", async () => {
    const { toolClasses } = await import("../src/tools.config.js");
    const { ListContainersTool } = await import("../src/docker/tools/list/list.tool.js");

    expect(toolClasses).toContain(ListContainersTool);
  });

  it("prompts config contains ContainerTroubleshootPrompt", async () => {
    const { promptClasses } = await import("../src/prompts.config.js");
    const { ContainerTroubleshootPrompt } = await import("../src/docker/prompts/container-troubleshoot/container-troubleshoot.prompt.js");

    expect(promptClasses).toContain(ContainerTroubleshootPrompt);
  });
});
