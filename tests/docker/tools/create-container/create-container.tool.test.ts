import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateContainerTool } from "../../../../src/docker/tools/create-container/create-container.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockCreateContainer = vi.fn();
const mockInspect = vi.fn();
const mockStart = vi.fn();
const mockPull = vi.fn();
const mockFollowProgress = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    pull: mockPull,
    modem: { followProgress: mockFollowProgress },
    createContainer: mockCreateContainer,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new CreateContainerTool(mockClient);
}

const makeInspectResponse = (overrides: Partial<ReturnType<typeof baseInspect>> = {}) => ({
  ...baseInspect(),
  ...overrides,
});

function baseInspect() {
  return {
    Id: "abc123def456ghi7",
    Name: "/my-container",
    Config: { Image: "nginx:latest" },
    State: { Status: "created" },
    HostConfig: {
      PortBindings: { "80/tcp": [{ HostPort: "8080" }] },
      RestartPolicy: { Name: "no" },
    },
    NetworkSettings: { Networks: { bridge: {} } as Record<string, object> },
  };
}

type CallbackInput = {
  image?: string;
  name?: string;
  command?: string[];
  env?: Record<string, string>;
  ports?: { host: string; container: string }[];
  volumes?: string[];
  networks?: string[];
  restart_policy?: "no" | "always" | "on-failure" | "unless-stopped";
  healthcheck?: {
    test: string[];
    interval_seconds?: number;
    timeout_seconds?: number;
    retries?: number;
    start_period_seconds?: number;
  };
  resources?: {
    memory_mb?: number;
    cpu_shares?: number;
    cpu_quota?: number;
    cpu_period?: number;
  };
  labels?: Record<string, string>;
};

describe("CreateContainerTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckConnection.mockResolvedValue(undefined);
    mockPull.mockResolvedValue({});
    mockFollowProgress.mockImplementation((_stream: unknown, cb: (err: null) => void) => cb(null));
    mockStart.mockResolvedValue(undefined);
    mockInspect.mockResolvedValue(makeInspectResponse());
    mockCreateContainer.mockResolvedValue({ start: mockStart, inspect: mockInspect });

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("validation", () => {
    it("returns error when image is missing", async () => {
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

  describe("basic creation", () => {
    it("creates container with minimal options", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.created).toBe(true);
      expect(parsed.container.id).toBe("abc123def456");
      expect(parsed.container.name).toBe("my-container");
      expect(parsed.container.status).toBe("created");
    });

    it("passes image to createContainer", async () => {
      await capturedCallback({ image: "nginx:latest" });

      expect(mockCreateContainer).toHaveBeenCalledWith(expect.objectContaining({ Image: "nginx:latest" }));
    });

    it("passes name to createContainer", async () => {
      await capturedCallback({ image: "nginx:latest", name: "my-web" });

      expect(mockCreateContainer).toHaveBeenCalledWith(expect.objectContaining({ name: "my-web" }));
    });

    it("passes command to createContainer", async () => {
      await capturedCallback({ image: "ubuntu:22.04", command: ["bash", "-c", "echo hello"] });

      expect(mockCreateContainer).toHaveBeenCalledWith(expect.objectContaining({ Cmd: ["bash", "-c", "echo hello"] }));
    });

    it("returns started true after container is started", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.started).toBe(true);
    });
  });

  describe("image pull", () => {
    it("pulls image before creating container", async () => {
      await capturedCallback({ image: "nginx:latest" });

      expect(mockPull).toHaveBeenCalledWith("nginx:latest");
      expect(mockFollowProgress).toHaveBeenCalled();
      expect(mockCreateContainer).toHaveBeenCalled();
    });

    it("pull is called before createContainer", async () => {
      const order: string[] = [];
      mockPull.mockImplementation(() => {
        order.push("pull");
        return Promise.resolve({});
      });
      mockCreateContainer.mockImplementation(() => {
        order.push("create");
        return Promise.resolve({ inspect: mockInspect });
      });

      await capturedCallback({ image: "nginx:latest" });

      expect(order).toEqual(["pull", "create"]);
    });

    it("returns isError when pull fails", async () => {
      mockPull.mockRejectedValue(new Error("pull access denied for private/image"));

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

      const result = (await capturedCallback({ image: "nginx:nonexistent-tag" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/manifest unknown/);
    });
  });

  describe("environment variables", () => {
    it("converts env record to KEY=VALUE array", async () => {
      await capturedCallback({ image: "nginx:latest", env: { NODE_ENV: "production", PORT: "3000" } });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining(["NODE_ENV=production", "PORT=3000"]),
        }),
      );
    });

    it("omits Env when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Env).toBeUndefined();
    });
  });

  describe("port mappings", () => {
    it("builds ExposedPorts and PortBindings", async () => {
      await capturedCallback({
        image: "nginx:latest",
        ports: [{ host: "8080", container: "80" }],
      });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          ExposedPorts: { "80/tcp": {} },
          HostConfig: expect.objectContaining({
            PortBindings: { "80/tcp": [{ HostPort: "8080" }] },
          }),
        }),
      );
    });

    it("preserves explicit protocol in port", async () => {
      await capturedCallback({
        image: "nginx:latest",
        ports: [{ host: "5353", container: "53/udp" }],
      });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          ExposedPorts: { "53/udp": {} },
        }),
      );
    });

    it("maps multiple ports", async () => {
      await capturedCallback({
        image: "nginx:latest",
        ports: [
          { host: "8080", container: "80" },
          { host: "8443", container: "443" },
        ],
      });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(Object.keys(call.ExposedPorts)).toHaveLength(2);
    });

    it("omits ports when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.ExposedPorts).toBeUndefined();
      expect(call.HostConfig.PortBindings).toBeUndefined();
    });
  });

  describe("volumes", () => {
    it("passes Binds to HostConfig", async () => {
      await capturedCallback({
        image: "nginx:latest",
        volumes: ["myvolume:/app/data", "/host/path:/container/path:ro"],
      });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Binds: ["myvolume:/app/data", "/host/path:/container/path:ro"],
          }),
        }),
      );
    });

    it("omits Binds when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.HostConfig.Binds).toBeUndefined();
    });
  });

  describe("networks", () => {
    it("builds EndpointsConfig for each network", async () => {
      await capturedCallback({ image: "nginx:latest", networks: ["my-net", "bridge"] });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          NetworkingConfig: {
            EndpointsConfig: { "my-net": {}, bridge: {} },
          },
        }),
      );
    });

    it("omits NetworkingConfig when networks is empty", async () => {
      await capturedCallback({ image: "nginx:latest", networks: [] });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.NetworkingConfig).toBeUndefined();
    });

    it("omits NetworkingConfig when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.NetworkingConfig).toBeUndefined();
    });
  });

  describe("restart policy", () => {
    it("passes restart policy to HostConfig", async () => {
      await capturedCallback({ image: "nginx:latest", restart_policy: "always" });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            RestartPolicy: { Name: "always" },
          }),
        }),
      );
    });

    it("omits RestartPolicy when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.HostConfig.RestartPolicy).toBeUndefined();
    });

    it.each(["no", "always", "on-failure", "unless-stopped"] as const)("accepts policy '%s'", async (policy) => {
      await capturedCallback({ image: "nginx:latest", restart_policy: policy });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({ RestartPolicy: { Name: policy } }),
        }),
      );
    });
  });

  describe("healthcheck", () => {
    it("passes test command to Healthcheck", async () => {
      await capturedCallback({
        image: "nginx:latest",
        healthcheck: { test: ["CMD", "curl", "-f", "http://localhost"] },
      });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Healthcheck: expect.objectContaining({ Test: ["CMD", "curl", "-f", "http://localhost"] }),
        }),
      );
    });

    it("converts interval_seconds to nanoseconds", async () => {
      await capturedCallback({
        image: "nginx:latest",
        healthcheck: { test: ["CMD-SHELL", "curl -f http://localhost"], interval_seconds: 30 },
      });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Healthcheck.Interval).toBe(30 * 1e9);
    });

    it("converts timeout_seconds to nanoseconds", async () => {
      await capturedCallback({
        image: "nginx:latest",
        healthcheck: { test: ["CMD-SHELL", "echo ok"], timeout_seconds: 10 },
      });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Healthcheck.Timeout).toBe(10 * 1e9);
    });

    it("converts start_period_seconds to nanoseconds", async () => {
      await capturedCallback({
        image: "nginx:latest",
        healthcheck: { test: ["CMD-SHELL", "echo ok"], start_period_seconds: 5 },
      });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Healthcheck.StartPeriod).toBe(5 * 1e9);
    });

    it("passes retries directly", async () => {
      await capturedCallback({
        image: "nginx:latest",
        healthcheck: { test: ["NONE"], retries: 5 },
      });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Healthcheck.Retries).toBe(5);
    });

    it("omits Healthcheck when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Healthcheck).toBeUndefined();
    });
  });

  describe("resources", () => {
    it("converts memory_mb to bytes", async () => {
      await capturedCallback({ image: "nginx:latest", resources: { memory_mb: 512 } });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({ Memory: 512 * 1024 * 1024 }),
        }),
      );
    });

    it("passes cpu_shares to HostConfig", async () => {
      await capturedCallback({ image: "nginx:latest", resources: { cpu_shares: 512 } });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({ CpuShares: 512 }),
        }),
      );
    });

    it("passes cpu_quota and cpu_period to HostConfig", async () => {
      await capturedCallback({ image: "nginx:latest", resources: { cpu_quota: 50000, cpu_period: 100000 } });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({ CpuQuota: 50000, CpuPeriod: 100000 }),
        }),
      );
    });

    it("omits resource fields when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.HostConfig.Memory).toBeUndefined();
      expect(call.HostConfig.CpuShares).toBeUndefined();
    });
  });

  describe("labels", () => {
    it("passes labels to createContainer", async () => {
      await capturedCallback({ image: "nginx:latest", labels: { env: "prod", app: "web" } });

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({ Labels: { env: "prod", app: "web" } }),
      );
    });

    it("omits Labels when not provided", async () => {
      await capturedCallback({ image: "nginx:latest" });

      const call = mockCreateContainer.mock.calls[0][0];
      expect(call.Labels).toBeUndefined();
    });
  });

  describe("response shape", () => {
    it("returns short id (12 chars)", async () => {
      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.container.id).toHaveLength(12);
    });

    it("strips leading slash from container name", async () => {
      mockInspect.mockResolvedValue(makeInspectResponse({ Name: "/stripped-name" }));

      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.container.name).toBe("stripped-name");
    });

    it("includes networks in response", async () => {
      mockInspect.mockResolvedValue(
        makeInspectResponse({ NetworkSettings: { Networks: { "my-net": {}, bridge: {} } } }),
      );

      const result = (await capturedCallback({ image: "nginx:latest" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.container.networks).toEqual(expect.arrayContaining(["my-net", "bridge"]));
    });
  });

  describe("errors", () => {
    it("returns isError when createContainer throws", async () => {
      mockCreateContainer.mockRejectedValue(new Error("image not found"));

      const result = (await capturedCallback({ image: "nginx:latest" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/image not found/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({ image: "nginx:latest" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });

    it("returns isError when inspect throws", async () => {
      mockInspect.mockRejectedValue(new Error("inspect failed"));

      const result = (await capturedCallback({ image: "nginx:latest" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/inspect failed/);
    });
  });
});
