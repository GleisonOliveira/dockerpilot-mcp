import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ContainerTroubleshootPrompt } from "../../../../src/docker/prompts/container-troubleshoot/container-troubleshoot.prompt.js";

function makeMockServer() {
  return { registerPrompt: vi.fn() } as unknown as McpServer;
}

describe("ContainerTroubleshootPrompt", () => {
  it("registers prompt with name container_troubleshoot", () => {
    const server = makeMockServer();
    new ContainerTroubleshootPrompt().register(server);
    expect(server.registerPrompt).toHaveBeenCalledOnce();
    expect(server.registerPrompt).toHaveBeenCalledWith(
      "container_troubleshoot",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("callback returns messages array with no args", () => {
    const server = makeMockServer();
    new ContainerTroubleshootPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({}) as { messages: unknown[] };
    expect(result.messages).toHaveLength(2);
  });

  it("callback returns messages with container_name and symptom", () => {
    const server = makeMockServer();
    new ContainerTroubleshootPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({ container_name: "my-app", symptom: "crash loop" }) as { messages: unknown[] };
    expect(result.messages).toHaveLength(2);
  });

  it("registered config has description and argsSchema", () => {
    const server = makeMockServer();
    new ContainerTroubleshootPrompt().register(server);
    const config = vi.mocked(server.registerPrompt).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof config.description).toBe("string");
    expect(config.description).not.toBe("");
    expect(config.argsSchema).toBeDefined();
  });
});
