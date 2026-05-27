import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ImageCleanupPrompt } from "../../../../src/docker/prompts/image-cleanup/image-cleanup.prompt.js";

function makeMockServer() {
  return { registerPrompt: vi.fn() } as unknown as McpServer;
}

describe("ImageCleanupPrompt", () => {
  it("registers prompt with name image_cleanup", () => {
    const server = makeMockServer();
    new ImageCleanupPrompt().register(server);
    expect(server.registerPrompt).toHaveBeenCalledOnce();
    expect(server.registerPrompt).toHaveBeenCalledWith("image_cleanup", expect.any(Object), expect.any(Function));
  });

  it("callback returns messages array", () => {
    const server = makeMockServer();
    new ImageCleanupPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as () => unknown;
    const result = callback() as { messages: unknown[] };
    expect(result.messages).toHaveLength(2);
  });

  it("registered config has description", () => {
    const server = makeMockServer();
    new ImageCleanupPrompt().register(server);
    const config = vi.mocked(server.registerPrompt).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof config.description).toBe("string");
    expect(config.description).not.toBe("");
  });
});
