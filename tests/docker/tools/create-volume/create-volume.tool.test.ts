import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateVolumeTool } from "../../../../src/docker/tools/create-volume/create-volume.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListContainers = vi.fn();
const mockCreateVolume = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    createVolume: mockCreateVolume,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new CreateVolumeTool(mockClient);
}

const makeContainer = (id: string, name: string, state = "running", image = "nginx:latest") => ({
  Id: id,
  Names: [`/${name}`],
  State: state,
  Image: image,
  ImageID: `sha256:${id}`,
});

const makeVolumeResponse = (name: string, driver = "local") => ({
  Name: name,
  Driver: driver,
  Mountpoint: `/var/lib/docker/volumes/${name}/_data`,
  Scope: "local",
  Labels: { "mcp.container.id": "abc123def456", "mcp.container.name": "web" },
  Options: {},
});

type CallbackInput = {
  containerId?: string;
  name?: string;
  driver?: "local" | "nfs" | "tmpfs" | "overlay2";
  readOnly?: boolean;
  nocopy?: boolean;
  mountpoint?: string;
  nfsServer?: string;
  nfsShare?: string;
  nfsVersion?: "3" | "4";
  tmpfsSize?: string;
  tmpfsMode?: string;
  labels?: Record<string, string>;
  containerPath?: string;
};

describe("CreateVolumeTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckConnection.mockResolvedValue(undefined);
    mockListContainers.mockResolvedValue([makeContainer("abc123def456ghi7", "web")]);
    mockCreateVolume.mockResolvedValue(makeVolumeResponse("my-vol"));

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("validation", () => {
    it("returns error when containerId is missing", async () => {
      const result = (await capturedCallback({ containerId: "" })) as { content: { text: string }[]; isError: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/containerId is required/);
    });

    it("returns error when containerId is whitespace-only", async () => {
      const result = (await capturedCallback({ containerId: "   " })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/containerId is required/);
    });

    it("returns error when container not found", async () => {
      mockListContainers.mockResolvedValue([]);

      const result = (await capturedCallback({ containerId: "nonexistent" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No container found matching ID prefix/);
    });
  });

  describe("basic creation", () => {
    it("creates volume with minimal options (local driver default)", async () => {
      const result = (await capturedCallback({ containerId: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.created).toBe(true);
      expect(parsed.volume.name).toBe("my-vol");
      expect(parsed.volume.driver).toBe("local");
    });

    it("passes container id and name as labels", async () => {
      await capturedCallback({ containerId: "abc123" });

      expect(mockCreateVolume).toHaveBeenCalledWith(
        expect.objectContaining({
          Labels: expect.objectContaining({
            "mcp.container.id": "abc123def456",
            "mcp.container.name": "web",
          }),
        }),
      );
    });

    it("includes container info in response", async () => {
      const result = (await capturedCallback({ containerId: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.container).toMatchObject({ id: "abc123def456", name: "web", state: "running" });
    });

    it("includes containerPath in mountOptions when provided", async () => {
      const result = (await capturedCallback({ containerId: "abc123", containerPath: "/app/data" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.mountOptions.containerPath).toBe("/app/data");
      expect(parsed.note).toContain("/app/data");
    });

    it("containerPath is null when not provided", async () => {
      const result = (await capturedCallback({ containerId: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.mountOptions.containerPath).toBeNull();
    });

    it("creates volume with explicit name", async () => {
      mockCreateVolume.mockResolvedValue(makeVolumeResponse("named-vol"));

      await capturedCallback({ containerId: "abc123", name: "named-vol" });

      expect(mockCreateVolume).toHaveBeenCalledWith(expect.objectContaining({ Name: "named-vol" }));
    });
  });

  describe("driver options", () => {
    it("uses local driver by default", async () => {
      await capturedCallback({ containerId: "abc123" });

      expect(mockCreateVolume).toHaveBeenCalledWith(expect.objectContaining({ Driver: "local" }));
    });

    it("passes local driver with mountpoint as bind options", async () => {
      await capturedCallback({ containerId: "abc123", driver: "local", mountpoint: "/mnt/data" });

      expect(mockCreateVolume).toHaveBeenCalledWith(
        expect.objectContaining({
          Driver: "local",
          DriverOpts: { device: "/mnt/data", type: "none", o: "bind" },
        }),
      );
    });

    it("passes nfs driver options", async () => {
      mockCreateVolume.mockResolvedValue(makeVolumeResponse("nfs-vol", "nfs"));

      await capturedCallback({
        containerId: "abc123",
        driver: "nfs",
        nfsServer: "192.168.1.10",
        nfsShare: "/exports/data",
        nfsVersion: "4",
      });

      expect(mockCreateVolume).toHaveBeenCalledWith(
        expect.objectContaining({
          Driver: "nfs",
          DriverOpts: { addr: "192.168.1.10", device: ":/exports/data", vers: "4" },
        }),
      );
    });

    it("passes tmpfs driver options", async () => {
      mockCreateVolume.mockResolvedValue(makeVolumeResponse("tmpfs-vol", "tmpfs"));

      await capturedCallback({
        containerId: "abc123",
        driver: "tmpfs",
        tmpfsSize: "100m",
        tmpfsMode: "1777",
      });

      expect(mockCreateVolume).toHaveBeenCalledWith(
        expect.objectContaining({
          Driver: "tmpfs",
          DriverOpts: { size: "100m", mode: "1777" },
        }),
      );
    });

    it("sends empty DriverOpts when no driver-specific options provided", async () => {
      await capturedCallback({ containerId: "abc123", driver: "local" });

      expect(mockCreateVolume).toHaveBeenCalledWith(expect.objectContaining({ DriverOpts: {} }));
    });
  });

  describe("mount options (checkboxes)", () => {
    it("reports readOnly=false by default", async () => {
      const result = (await capturedCallback({ containerId: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.mountOptions.readOnly).toBe(false);
    });

    it("reports readOnly=true when set", async () => {
      const result = (await capturedCallback({ containerId: "abc123", readOnly: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.mountOptions.readOnly).toBe(true);
      expect(parsed.mountOptions.extraOptions).toContain("ro");
    });

    it("reports nocopy=true when set", async () => {
      const result = (await capturedCallback({ containerId: "abc123", nocopy: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.mountOptions.nocopy).toBe(true);
      expect(parsed.mountOptions.extraOptions).toContain("nocopy");
    });

    it("combines readOnly and nocopy in extraOptions", async () => {
      const result = (await capturedCallback({ containerId: "abc123", readOnly: true, nocopy: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.mountOptions.extraOptions).toEqual(["ro", "nocopy"]);
    });
  });

  describe("labels", () => {
    it("merges user labels with container labels", async () => {
      await capturedCallback({ containerId: "abc123", labels: { env: "prod", app: "web" } });

      expect(mockCreateVolume).toHaveBeenCalledWith(
        expect.objectContaining({
          Labels: expect.objectContaining({
            env: "prod",
            app: "web",
            "mcp.container.id": "abc123def456",
          }),
        }),
      );
    });
  });

  describe("container lookup", () => {
    it("finds container by ID prefix (case-insensitive)", async () => {
      mockListContainers.mockResolvedValue([makeContainer("ABC123DEF456GHI7", "myapp")]);

      const result = (await capturedCallback({ containerId: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.container.name).toBe("myapp");
    });

    it("queries all containers (including stopped)", async () => {
      await capturedCallback({ containerId: "abc123" });

      expect(mockListContainers).toHaveBeenCalledWith({ all: true });
    });

    it("uses shortId as container name fallback when Names is empty", async () => {
      mockListContainers.mockResolvedValue([
        { Id: "abc123def456ghi7", Names: [], State: "running", Image: "nginx:latest" },
      ]);
      const result = (await capturedCallback({ containerId: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.container.name).toBe("abc123def456");
    });
  });

  describe("errors", () => {
    it("returns isError when createVolume throws", async () => {
      mockCreateVolume.mockRejectedValue(new Error("volume name already in use"));

      const result = (await capturedCallback({ containerId: "abc123" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/volume name already in use/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({ containerId: "abc123" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });
});
