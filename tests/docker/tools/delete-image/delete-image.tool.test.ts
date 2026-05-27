import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteImageTool } from "../../../../src/docker/tools/delete-image/delete-image.tool.js";
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
  return new DeleteImageTool(mockClient);
}

const makeImage = (id: string, tags: string[] = [], size = 50 * 1024 * 1024) => ({
  Id: `sha256:${id}`,
  RepoTags: tags,
  RepoDigests: [],
  Created: 1700000000,
  Size: size,
  VirtualSize: size,
  Containers: 0,
  Labels: {},
  ParentId: "",
  SharedSize: 0,
});

type CallbackInput = {
  id: string;
  force?: boolean;
  confirmed: boolean;
};

describe("DeleteImageTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveImage.mockResolvedValue([{ Untagged: "nginx:latest" }, { Deleted: "sha256:abc" }]);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("confirmed=false", () => {
    it("returns preview without calling remove", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789", ["nginx:latest"])]);

      const result = (await capturedCallback({ id: "abc123", confirmed: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.confirmed).toBe(false);
      expect(parsed.message).toMatch(/confirmed must be true/i);
      expect(parsed.preview).toMatchObject({
        id: "abc123def456",
        tags: ["nginx:latest"],
        force: false,
      });
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });

    it("preview reflects force flag", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789", ["nginx:latest"])]);

      const result = (await capturedCallback({ id: "abc123", force: true, confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.preview.force).toBe(true);
    });

    it("returns error when image not found", async () => {
      mockListImages.mockResolvedValue([]);

      const result = (await capturedCallback({ id: "zzz999", confirmed: false })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No image found/);
    });
  });

  describe("confirmed=true", () => {
    it("deletes image by short ID prefix", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789", ["nginx:latest"])]);

      const result = (await capturedCallback({ id: "abc123", confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe("abc123def456");
      expect(parsed.tags).toEqual(["nginx:latest"]);
      expect(mockRemoveImage).toHaveBeenCalledWith({ force: false });
    });

    it("matches by tag", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789", ["nginx:latest"])]);

      const result = (await capturedCallback({ id: "nginx:latest", confirmed: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(mockRemoveImage).toHaveBeenCalled();
    });

    it("passes force=true to image.remove", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789", ["nginx:latest"])]);

      await capturedCallback({ id: "abc123", force: true, confirmed: true });

      expect(mockRemoveImage).toHaveBeenCalledWith({ force: true });
    });

    it("returns error when image not found", async () => {
      mockListImages.mockResolvedValue([]);

      const result = (await capturedCallback({ id: "zzz999", confirmed: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No image found/);
    });

    it("returns error when id is empty string", async () => {
      const result = (await capturedCallback({ id: "", confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.isError).toBe(true);
      expect(parsed.content[0].text).toMatch(/id is required/);
      expect(mockListImages).not.toHaveBeenCalled();
    });

    it("returns error when remove fails", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789", ["nginx:latest"])]);
      mockRemoveImage.mockRejectedValue(new Error("image is being used"));

      const result = (await capturedCallback({ id: "abc123", confirmed: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/image is being used/);
    });
  });

  describe("image lookup", () => {
    it("finds image by full id without sha256: prefix", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789jk")]);
      const result = (await capturedCallback({ id: "abc123def456ghi789jk", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirmed).toBe(false);
    });

    it("finds image by full id including sha256: prefix", async () => {
      mockListImages.mockResolvedValue([makeImage("abc123def456ghi789jk")]);
      const result = (await capturedCallback({ id: "sha256:abc123def456ghi789jk", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirmed).toBe(false);
    });

    it("uses empty array for tags in preview when RepoTags is null", async () => {
      mockListImages.mockResolvedValue([{ ...makeImage("abc123def456"), RepoTags: null }]);
      const result = (await capturedCallback({ id: "abc123", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.preview.tags).toEqual([]);
    });

    it("uses empty array for tags in delete when RepoTags is null", async () => {
      mockListImages.mockResolvedValue([{ ...makeImage("abc123def456"), RepoTags: null }]);
      const result = (await capturedCallback({ id: "abc123", confirmed: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tags).toEqual([]);
    });
  });
});
