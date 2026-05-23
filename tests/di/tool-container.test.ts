import { describe, it, expect } from "vitest";
import { ToolContainer, ToolConstructor } from "../../src/di/tool-container.js";
import { DockerClient } from "../../src/docker/client.js";
import { BaseTool } from "../../src/docker/shared/base.tool.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockClient = {} as DockerClient;

function makeMockToolClass(name: string): ToolConstructor {
  return class extends BaseTool {
    public readonly name = name;
    register(_server: McpServer): void { }
  };
}

describe("ToolContainer", () => {
  it("instantiates one tool per class", () => {
    const ToolA = makeMockToolClass("A");
    const ToolB = makeMockToolClass("B");

    const container = new ToolContainer({ toolClasses: [ToolA, ToolB], client: mockClient });

    expect(container.getTools()).toHaveLength(2);
    expect(container.getTools()[0]).toBeInstanceOf(ToolA);
    expect(container.getTools()[1]).toBeInstanceOf(ToolB);
  });

  it("passes client to each tool constructor", () => {
    const receivedClients: DockerClient[] = [];

    class SpyTool extends BaseTool {
      constructor(client: DockerClient) {
        super();
        receivedClients.push(client);
      }
      register(_server: McpServer): void { }
    }

    new ToolContainer({ toolClasses: [SpyTool, SpyTool], client: mockClient });

    expect(receivedClients).toHaveLength(2);
    expect(receivedClients[0]).toBe(mockClient);
    expect(receivedClients[1]).toBe(mockClient);
  });

  it("returns empty list when no tool classes configured", () => {
    const container = new ToolContainer({ toolClasses: [], client: mockClient });

    expect(container.getTools()).toEqual([]);
  });

  it("getTools returns same instance on multiple calls", () => {
    const ToolA = makeMockToolClass("A");
    const container = new ToolContainer({ toolClasses: [ToolA], client: mockClient });

    expect(container.getTools()).toBe(container.getTools());
  });
});
