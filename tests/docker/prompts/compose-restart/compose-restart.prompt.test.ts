import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ComposeRestartPrompt } from "../../../../src/docker/prompts/compose-restart/compose-restart.prompt.js";

function makeMockServer() {
  return { registerPrompt: vi.fn() } as unknown as McpServer;
}

describe("ComposeRestartPrompt", () => {
  it("registers prompt with name compose_restart", () => {
    const server = makeMockServer();
    new ComposeRestartPrompt().register(server);
    expect(server.registerPrompt).toHaveBeenCalledOnce();
    expect(server.registerPrompt).toHaveBeenCalledWith("compose_restart", expect.any(Object), expect.any(Function));
  });

  it("callback returns messages array without args", () => {
    const server = makeMockServer();
    new ComposeRestartPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({}) as { messages: unknown[] };
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("callback returns messages with project_dir", () => {
    const server = makeMockServer();
    new ComposeRestartPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({ project_dir: "/home/user/myapp" }) as { messages: unknown[] };
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("registered config has description and argsSchema", () => {
    const server = makeMockServer();
    new ComposeRestartPrompt().register(server);
    const config = vi.mocked(server.registerPrompt).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof config.description).toBe("string");
    expect(config.description).not.toBe("");
    expect(config.argsSchema).toBeDefined();
  });
});
