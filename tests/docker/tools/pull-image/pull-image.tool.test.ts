import { describe, it, expect, vi, beforeEach } from "vitest";
import { PullImageTool } from "../../../../src/docker/tools/pull-image/pull-image.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockPull = vi.fn();
const mockFollowProgress = vi.fn();
const mockListImages = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    pull: mockPull,
    modem: { followProgress: mockFollowProgress },
    listImages: mockListImages,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new PullImageTool(mockClient);
}

const fakeImage = {
  Id: "sha256:abc123def456ghi7",
  RepoTags: ["nginx:latest"],
  Size: 50 * 1024 * 1024,
};

type CallbackInput = { image?: string };

describe("PullImageTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPull.mockResolvedValue({});
    mockFollowProgress.mockImplementation((_stream: unknown, cb: (err: null) => void) => cb(null));
    mockListImages.mockResolvedValue([fakeImage]);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("validation", () => {
    it("returns error when image is empty", async () => {
      const result = (await capturedCallback({ image: "" })) as { content: { text: string }[]; isError: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/image is required/);
    });

    it("returns error when image is whitespace-only", async () => {
      const result = (await capturedCallback({ image: "   " })) as { content: { text: string }[]; isError: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/image is required/);
    });
  });

  describe("success", () => {
    it("returns pulled true", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(result.isError).toBeUndefined();
      expect(parsed.pulled).toBe(true);
    });

    it("returns image name", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.image).toBe("nginx:latest");
    });

    it("returns short id (12 chars)", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toHaveLength(12);
    });

    it("returns tags", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tags).toContain("nginx:latest");
    });

    it("returns size_bytes", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.size_bytes).toBe(50 * 1024 * 1024);
    });

    it("trims whitespace from image name", async () => {
      await capturedCallback({ image: "  nginx:latest  " });
      expect(mockPull).toHaveBeenCalledWith("nginx:latest");
    });

    it("calls pull then listImages", async () => {
      const order: string[] = [];
      mockPull.mockImplementation(() => {
        order.push("pull");
        return Promise.resolve({});
      });
      mockListImages.mockImplementation(() => {
        order.push("list");
        return Promise.resolve([fakeImage]);
      });

      await capturedCallback({ image: "nginx:latest" });
      expect(order).toEqual(["pull", "list"]);
    });

    it("returns null id when listImages returns empty", async () => {
      mockListImages.mockResolvedValue([]);
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBeNull();
    });
  });

  describe("errors", () => {
    it("returns isError when pull fails", async () => {
      mockPull.mockRejectedValue(new Error("pull access denied"));
      const result = (await capturedCallback({ image: "private/image:latest" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/pull access denied/);
    });

    it("returns isError when followProgress reports error", async () => {
      mockFollowProgress.mockImplementation((_stream: unknown, cb: (err: Error) => void) =>
        cb(new Error("manifest unknown")),
      );
      const result = (await capturedCallback({ image: "nginx:nonexistent" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/manifest unknown/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValue(new Error("Docker is not running"));
      const result = (await capturedCallback({ image: "nginx:latest" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });

  describe("registration", () => {
    it("registers with name pull_image", () => {
      const tool = buildTool();
      let registeredName = "";
      const fakeServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredName = name;
        },
      } as unknown as McpServer;
      tool.register(fakeServer);
      expect(registeredName).toBe("pull_image");
    });
  });
});
