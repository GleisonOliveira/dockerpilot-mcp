import { describe, it, expect, vi, beforeEach } from "vitest";
import { PruneImagesTool } from "../../../../src/docker/tools/prune-images/prune-images.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockRemoveImage = vi.fn();
const mockListImages = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listImages: mockListImages,
    getImage: (_id: string) => ({ remove: mockRemoveImage }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new PruneImagesTool(mockClient);
}

const makeImage = (id: string, size = 100 * 1024 * 1024, created = 1700000000) => ({
  Id: `sha256:${id}`,
  RepoTags: null,
  RepoDigests: [],
  Created: created,
  Size: size,
  VirtualSize: size,
  Containers: 0,
  Labels: {},
  ParentId: "",
  SharedSize: 0,
});

type CallbackInput = { confirmed: boolean; force?: boolean };

describe("PruneImagesTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveImage.mockResolvedValue([{ Deleted: "sha256:abc" }]);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("confirmed=false", () => {
    it("returns preview without deleting", async () => {
      mockListImages.mockResolvedValue([
        makeImage("aaa111bbb222ccc333", 200 * 1024 * 1024),
        makeImage("ddd444eee555fff666", 50 * 1024 * 1024),
      ]);

      const result = (await capturedCallback({ confirmed: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.confirmed).toBe(false);
      expect(parsed.message).toMatch(/confirmed must be true/i);
      expect(parsed.preview.count).toBe(2);
      expect(parsed.preview.total_size_mb).toBeCloseTo(250, 0);
      expect(parsed.preview.images).toHaveLength(2);
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });

    it("preview images have id, size_mb and created", async () => {
      mockListImages.mockResolvedValue([makeImage("aaa111bbb222ccc333", 100 * 1024 * 1024, 1700000000)]);

      const result = (await capturedCallback({ confirmed: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const img = parsed.preview.images[0];
      expect(img.id).toBe("aaa111bbb222");
      expect(img.size_mb).toBeCloseTo(100, 0);
      expect(img.created).toBe(new Date(1700000000 * 1000).toISOString());
    });

    it("returns no dangling message when list is empty", async () => {
      mockListImages.mockResolvedValue([]);

      const result = (await capturedCallback({ confirmed: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(false);
      expect(parsed.message).toMatch(/no dangling/i);
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });
  });

  describe("confirmed=true", () => {
    it("deletes all dangling images and returns summary", async () => {
      mockListImages.mockResolvedValue([
        makeImage("aaa111bbb222ccc333", 200 * 1024 * 1024),
        makeImage("ddd444eee555fff666", 50 * 1024 * 1024),
      ]);

      const result = (await capturedCallback({ confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.count).toBe(2);
      expect(parsed.total_freed_mb).toBeCloseTo(250, 0);
      expect(parsed.images).toHaveLength(2);
      expect(mockRemoveImage).toHaveBeenCalledTimes(2);
    });

    it("calls remove with force=false by default", async () => {
      mockListImages.mockResolvedValue([makeImage("aaa111bbb222ccc333")]);

      await capturedCallback({ confirmed: true });

      expect(mockRemoveImage).toHaveBeenCalledWith({ force: false });
    });

    it("calls remove with force=true when specified", async () => {
      mockListImages.mockResolvedValue([makeImage("aaa111bbb222ccc333")]);

      await capturedCallback({ confirmed: true, force: true });

      expect(mockRemoveImage).toHaveBeenCalledWith({ force: true });
    });

    it("returns no dangling message when list is empty", async () => {
      mockListImages.mockResolvedValue([]);

      const result = (await capturedCallback({ confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(false);
      expect(parsed.message).toMatch(/no dangling/i);
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });

    it("partial failure: reports succeeded and failed separately", async () => {
      mockListImages.mockResolvedValue([
        makeImage("aaa111bbb222ccc333", 100 * 1024 * 1024),
        makeImage("ddd444eee555fff666", 80 * 1024 * 1024),
      ]);

      mockRemoveImage
        .mockResolvedValueOnce([{ Deleted: "sha256:aaa" }])
        .mockRejectedValueOnce(new Error("image is in use"));

      const result = (await capturedCallback({ confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.count).toBe(1);
      expect(parsed.failed_count).toBe(1);
      expect(parsed.errors).toHaveLength(1);
      expect(parsed.errors[0]).toMatch(/image is in use/);
    });

    it("returns error when docker connection fails", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker not running"));

      const result = (await capturedCallback({ confirmed: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker not running/);
    });

    it("images result contains id and size_mb", async () => {
      mockListImages.mockResolvedValue([makeImage("aaa111bbb222ccc333", 150 * 1024 * 1024)]);

      const result = (await capturedCallback({ confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const img = parsed.images[0];
      expect(img.id).toBe("aaa111bbb222");
      expect(img.size_mb).toBeCloseTo(150, 0);
    });
  });
});
