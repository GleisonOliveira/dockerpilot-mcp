import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteContainerTool } from "../../../../src/docker/tools/delete/delete.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockRemoveContainer = vi.fn();
const mockRemoveImage = vi.fn();
const mockListContainers = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({ remove: mockRemoveContainer }),
    getImage: (_id: string) => ({ remove: mockRemoveImage }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new DeleteContainerTool(mockClient);
}

const makeContainer = (id: string, name: string, image = "nginx:latest", imageId = "sha256:abc123") => ({
  Id: id,
  Names: [`/${name}`],
  Image: image,
  ImageID: imageId,
  Status: "Exited (0) 1 hour ago",
  State: "exited",
  Labels: {},
});

type CallbackInput = {
  id: string;
  force?: boolean;
  removeImage?: boolean;
  confirmed: boolean;
};

describe("DeleteContainerTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveContainer.mockResolvedValue(undefined);
    mockRemoveImage.mockResolvedValue([{ Untagged: "nginx:latest" }]);

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
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web", "nginx:latest")]);

      const result = (await capturedCallback({ id: "aaa111", confirmed: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.confirmed).toBe(false);
      expect(parsed.message).toMatch(/confirmed must be true/i);
      expect(parsed.preview).toMatchObject({
        id: "aaa111bbb222",
        name: "web",
        image: "nginx:latest",
        state: "exited",
        force: false,
        removeImage: false,
      });
      expect(mockRemoveContainer).not.toHaveBeenCalled();
    });

    it("returns error when container not found", async () => {
      mockListContainers.mockResolvedValue([]);

      const result = (await capturedCallback({ id: "zzz999", confirmed: false })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No container found/);
    });

    it("uses id as name in preview when Names is empty", async () => {
      mockListContainers.mockResolvedValue([{ ...makeContainer("aaa111bbb222ccc333", "web"), Names: [] }]);
      const result = (await capturedCallback({ id: "aaa111", confirmed: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.preview.name).toBe("aaa111bbb222");
    });

    it("preview reflects force and removeImage flags", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);

      const result = (await capturedCallback({ id: "aaa111", confirmed: false, force: true, removeImage: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.preview.force).toBe(true);
      expect(parsed.preview.removeImage).toBe(true);
    });
  });

  describe("confirmed=true", () => {
    it("deletes container by ID prefix", async () => {
      const container = makeContainer("aaa111bbb222ccc333", "web");
      mockListContainers.mockResolvedValue([container]);

      const result = (await capturedCallback({ id: "aaa111", confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe("aaa111bbb222");
      expect(parsed.name).toBe("web");
      expect(mockRemoveContainer).toHaveBeenCalledWith({ force: false });
    });

    it("passes force=true to container.remove", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);

      await capturedCallback({ id: "aaa111", force: true, confirmed: true });

      expect(mockRemoveContainer).toHaveBeenCalledWith({ force: true });
    });

    it("removes image when removeImage=true", async () => {
      mockListContainers.mockResolvedValue([
        makeContainer("aaa111bbb222ccc333", "web", "nginx:latest", "sha256:abc123"),
      ]);

      const result = (await capturedCallback({ id: "aaa111", removeImage: true, confirmed: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.imageRemoved).toBe(true);
      expect(parsed.image).toBe("nginx:latest");
      expect(mockRemoveImage).toHaveBeenCalledWith({ force: false });
    });

    it("passes force=true to image.remove when force=true", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);

      await capturedCallback({ id: "aaa111", force: true, removeImage: true, confirmed: true });

      expect(mockRemoveImage).toHaveBeenCalledWith({ force: true });
    });

    it("reports imageRemoved=false when image removal fails", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);
      mockRemoveImage.mockRejectedValue(new Error("image in use"));

      const result = (await capturedCallback({ id: "aaa111", removeImage: true, confirmed: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.imageRemoved).toBe(false);
      expect(parsed.imageError).toMatch(/image in use/);
    });

    it("uses id as name when Names is empty", async () => {
      mockListContainers.mockResolvedValue([{ ...makeContainer("aaa111bbb222ccc333", "web"), Names: [] }]);
      const result = (await capturedCallback({ id: "aaa111", confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe("aaa111bbb222");
    });

    it("does not include image fields when removeImage is not set", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);

      const result = (await capturedCallback({ id: "aaa111", confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.imageRemoved).toBeUndefined();
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });

    it("returns error when no container matches ID", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);

      const result = (await capturedCallback({ id: "zzz999", confirmed: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No container found/);
    });

    it("returns error when id is empty string", async () => {
      const result = (await capturedCallback({ id: "", confirmed: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.isError).toBe(true);
      expect(parsed.content[0].text).toMatch(/id is required/);
      expect(mockListContainers).not.toHaveBeenCalled();
    });

    it("returns error when container removal fails", async () => {
      mockListContainers.mockResolvedValue([makeContainer("aaa111bbb222ccc333", "web")]);
      mockRemoveContainer.mockRejectedValue(new Error("container is running"));

      const result = (await capturedCallback({ id: "aaa111", confirmed: true })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/container is running/);
    });
  });
});
