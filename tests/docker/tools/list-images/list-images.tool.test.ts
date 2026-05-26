import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListImagesTool } from "../../../../src/docker/tools/list-images/list-images.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListImages = vi.fn();
const mockListContainers = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listImages: mockListImages,
    listContainers: mockListContainers,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new ListImagesTool(mockClient);
}

const fakeImageRaw = {
  Id: "sha256:abc123def456789012345678901234567890",
  ParentId: "",
  RepoTags: ["nginx:latest", "nginx:1.25"],
  RepoDigests: ["nginx@sha256:deadbeef"],
  Created: 1700000000,
  Size: 50 * 1024 * 1024,
  VirtualSize: 60 * 1024 * 1024,
  SharedSize: 0,
  Labels: {},
  Containers: 2,
};

const fakeImageRaw2 = {
  Id: "sha256:fff999eee888ddd777ccc666bbb555aaa444",
  ParentId: "",
  RepoTags: ["postgres:15"],
  RepoDigests: ["postgres@sha256:cafebabe"],
  Created: 1699000000,
  Size: 120 * 1024 * 1024,
  VirtualSize: 130 * 1024 * 1024,
  SharedSize: 0,
  Labels: {},
  Containers: 1,
};

const fakeUntaggedImage = {
  Id: "sha256:000111222333444555666777888999aaabbb",
  ParentId: "sha256:abc123",
  RepoTags: null,
  RepoDigests: undefined,
  Created: 1698000000,
  Size: 5 * 1024 * 1024,
  VirtualSize: 5 * 1024 * 1024,
  SharedSize: 0,
  Labels: {},
  Containers: 0,
};

type CallbackInput = {
  name?: string;
  all?: boolean;
  includeDigests?: boolean;
  includeContainers?: boolean;
  dangling?: boolean;
};

describe("ListImagesTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListContainers.mockResolvedValue([]);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("base fields (always returned)", () => {
    it("returns id, tags, created, size_mb, virtual_size_mb, containers", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0]).toEqual({
        id: "abc123def456",
        tags: ["nginx:latest", "nginx:1.25"],
        created: new Date(1700000000 * 1000).toISOString(),
        size_mb: 50,
        virtual_size_mb: 60,
        containers: 2,
      });
    });

    it("strips sha256: prefix from id", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].id).toBe("abc123def456");
      expect(parsed[0].id).not.toContain("sha256:");
    });

    it("does not include digests without flag", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0]).not.toHaveProperty("digests");
    });

    it("returns empty array when no images", async () => {
      mockListImages.mockResolvedValue([]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it("passes all=false to listImages by default", async () => {
      mockListImages.mockResolvedValue([]);
      await capturedCallback({ all: false });
      expect(mockListImages).toHaveBeenCalledWith({ all: false, digests: false });
    });

    it("passes all=true to listImages when requested", async () => {
      mockListImages.mockResolvedValue([]);
      await capturedCallback({ all: true });
      expect(mockListImages).toHaveBeenCalledWith({ all: true, digests: false });
    });
  });

  describe("includeDigests=true", () => {
    it("includes digests field", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);

      const result = (await capturedCallback({ includeDigests: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].digests).toEqual(["nginx@sha256:deadbeef"]);
    });

    it("passes digests=true to listImages", async () => {
      mockListImages.mockResolvedValue([]);
      await capturedCallback({ all: false, includeDigests: true });
      expect(mockListImages).toHaveBeenCalledWith({ all: false, digests: true });
    });

    it("returns empty digests array when image has no digests", async () => {
      mockListImages.mockResolvedValue([fakeUntaggedImage]);

      const result = (await capturedCallback({ includeDigests: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].digests).toEqual([]);
    });
  });

  describe("name filter", () => {
    it("returns all images when name not provided", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw, fakeImageRaw2]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(2);
    });

    it("filters by partial tag match", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw, fakeImageRaw2]);

      const result = (await capturedCallback({ name: "postgres" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tags).toContain("postgres:15");
    });

    it("filter is case-insensitive", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw, fakeImageRaw2]);

      const result = (await capturedCallback({ name: "NGINX" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tags).toContain("nginx:latest");
    });

    it("matches by tag version", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw, fakeImageRaw2]);

      const result = (await capturedCallback({ name: "1.25" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tags).toContain("nginx:1.25");
    });

    it("returns empty array when name matches nothing", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw, fakeImageRaw2]);

      const result = (await capturedCallback({ name: "redis" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual([]);
    });

    it("filters by digest when name matches digest", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw, fakeImageRaw2]);

      const result = (await capturedCallback({ name: "deadbeef" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tags).toContain("nginx:latest");
    });
  });

  describe("untagged images", () => {
    it("returns empty tags array for untagged images", async () => {
      mockListImages.mockResolvedValue([fakeUntaggedImage]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].tags).toEqual([]);
    });

    it("untagged image not matched by name filter", async () => {
      mockListImages.mockResolvedValue([fakeUntaggedImage]);

      const result = (await capturedCallback({ name: "anything" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual([]);
    });
  });

  describe("dangling=true", () => {
    it("passes dangling filter to listImages", async () => {
      mockListImages.mockResolvedValue([]);
      await capturedCallback({ dangling: true });
      expect(mockListImages).toHaveBeenCalledWith({
        all: false,
        digests: false,
        filters: JSON.stringify({ dangling: ["true"] }),
      });
    });

    it("does not pass filters when dangling is false", async () => {
      mockListImages.mockResolvedValue([]);
      await capturedCallback({ all: false });
      expect(mockListImages).toHaveBeenCalledWith({ all: false, digests: false, filters: undefined });
    });

    it("returns only dangling images from docker response", async () => {
      mockListImages.mockResolvedValue([fakeUntaggedImage]);
      const result = (await capturedCallback({ dangling: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].tags).toEqual([]);
    });
  });

  describe("includeContainers=true", () => {
    const fakeContainer1 = { Id: "aaa111bbb222ccc333", Names: ["/web-app"] };
    const fakeContainer2 = { Id: "ddd444eee555fff666", Names: ["/web-worker"] };

    it("includes running_containers with id and name", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);
      mockListContainers.mockResolvedValue([fakeContainer1, fakeContainer2]);

      const result = (await capturedCallback({ includeContainers: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].running_containers).toEqual([
        { id: "aaa111bbb222", name: "/web-app" },
        { id: "ddd444eee555", name: "/web-worker" },
      ]);
    });

    it("queries listContainers with all=true and ancestor filter", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);
      mockListContainers.mockResolvedValue([]);

      await capturedCallback({ includeContainers: true });

      expect(mockListContainers).toHaveBeenCalledWith({
        all: true,
        filters: JSON.stringify({ ancestor: [fakeImageRaw.Id] }),
      });
    });

    it("returns empty array when no containers use image", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);
      mockListContainers.mockResolvedValue([]);

      const result = (await capturedCallback({ includeContainers: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].running_containers).toEqual([]);
    });

    it("returns empty array when listContainers throws", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);
      mockListContainers.mockRejectedValueOnce(new Error("permission denied"));

      const result = (await capturedCallback({ includeContainers: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].running_containers).toEqual([]);
    });

    it("does not include running_containers when flag is false", async () => {
      mockListImages.mockResolvedValue([fakeImageRaw]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0]).not.toHaveProperty("running_containers");
      expect(mockListContainers).not.toHaveBeenCalled();
    });
  });

  describe("errors", () => {
    it("returns isError when listImages throws", async () => {
      mockListImages.mockRejectedValue(new Error("socket hang up"));

      const result = (await capturedCallback({})) as { content: { text: string }[]; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("socket hang up");
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({})) as { content: { text: string }[]; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Docker is not running");
    });
  });
});
