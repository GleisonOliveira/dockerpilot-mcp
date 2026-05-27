import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ComposeStopPrompt } from "../../../../src/docker/prompts/compose-stop/compose-stop.prompt.js";

function makeMockServer() {
  return { registerPrompt: vi.fn() } as unknown as McpServer;
}

describe("ComposeStopPrompt", () => {
  it("registers prompt with name compose_stop", () => {
    const server = makeMockServer();
    new ComposeStopPrompt().register(server);
    expect(server.registerPrompt).toHaveBeenCalledOnce();
    expect(server.registerPrompt).toHaveBeenCalledWith("compose_stop", expect.any(Object), expect.any(Function));
  });

  it("callback returns messages array", () => {
    const server = makeMockServer();
    new ComposeStopPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({}) as { messages: unknown[] };
    expect(result.messages).toHaveLength(2);
  });

  it("callback returns messages with project_dir", () => {
    const server = makeMockServer();
    new ComposeStopPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({ project_dir: "/home/user/myapp" }) as { messages: unknown[] };
    expect(result.messages).toHaveLength(2);
  });

  it("registered config has description and argsSchema", () => {
    const server = makeMockServer();
    new ComposeStopPrompt().register(server);
    const config = vi.mocked(server.registerPrompt).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof config.description).toBe("string");
    expect(config.description).not.toBe("");
    expect(config.argsSchema).toBeDefined();
  });
});
