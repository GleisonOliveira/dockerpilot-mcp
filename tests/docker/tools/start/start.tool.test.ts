import { describe, it, expect, vi, beforeEach } from "vitest";
import { StartContainersTool } from "../../../../src/docker/tools/start/start.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockStart = vi.fn();
const mockListContainers = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({ start: mockStart }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new StartContainersTool(mockClient);
}

const makeContainer = (id: string, name: string, labels: Record<string, string> = {}) => ({
  Id: id,
  Names: [`/${name}`],
  Image: "nginx:latest",
  Status: "Exited (0) 2 hours ago",
  State: "exited",
  Labels: labels,
});

const makeComposeContainer = (id: string, service: string, project: string, dependsOn: string[] = []) =>
  makeContainer(id, service, {
    "com.docker.compose.project": project,
    "com.docker.compose.service": service,
    ...(dependsOn.length ? { "com.docker.compose.depends_on": dependsOn.join(",") } : {}),
  });

const containerA = makeContainer("aaa111bbb222ccc333", "web");
const containerB = makeContainer("ddd444eee555fff666", "db");
const containerC = makeContainer("ggg777hhh888iii999", "cache");

type CallbackInput = {
  names?: string[];
  ids?: string[];
  exclude?: string[];
  startDependencies?: boolean;
  summarized?: boolean;
  dryRun?: boolean;
};

describe("StartContainersTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue(undefined);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("dryRun=true", () => {
    it("returns wouldStart list without calling start", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(true);
      expect(parsed.wouldStart).toHaveLength(2);
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("dryRun respects name filter", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: true, names: ["web"] })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStart).toHaveLength(1);
      expect(parsed.wouldStart[0].name).toBe("web");
    });

    it("dryRun respects exclude", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: true, exclude: ["db"] })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStart).toHaveLength(1);
      expect(parsed.wouldStart[0].name).toBe("web");
    });
  });

  describe("dryRun=false (default)", () => {
    it("dryRun is false by default — calls start without explicit dryRun: false", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      await capturedCallback({});

      expect(mockStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("start all (no filter)", () => {
    it("starts all stopped containers when no names or ids given", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(false);
      expect(parsed.results).toHaveLength(2);
      expect(mockStart).toHaveBeenCalledTimes(2);
    });
  });

  describe("filter by names", () => {
    it("starts only containers matching name", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["web"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it("name filter is case-insensitive and partial match", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["WEB"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("starts multiple containers matching different names", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["web", "db"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(2);
    });
  });

  describe("filter by ids", () => {
    it("starts container matching id prefix", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, ids: ["aaa111"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("starts multiple containers by id", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, ids: ["aaa111", "ddd444"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(2);
    });
  });

  describe("names + ids combined", () => {
    it("matches container if it matches name OR id", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["db"], ids: ["ggg777"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(2);
      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).toContain("db");
      expect(names).toContain("cache");
    });
  });

  describe("exclude", () => {
    it("excludes container by name", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, exclude: ["db"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).not.toContain("db");
      expect(names).toContain("web");
      expect(names).toContain("cache");
    });

    it("excludes container by short id", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, exclude: ["aaa111bbb222"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("db");
    });

    it("excludes multiple containers", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, exclude: ["web", "cache"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("db");
    });
  });

  describe("partial failures", () => {
    it("reports started=false with error when start fails for a container", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);
      mockStart.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("permission denied"));

      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const started = parsed.results.find((r: { name: string }) => r.name === "web");
      const failed = parsed.results.find((r: { name: string }) => r.name === "db");

      expect(started.started).toBe(true);
      expect(failed.started).toBe(false);
      expect(failed.error).toContain("permission denied");
    });
  });

  describe("empty results", () => {
    it("returns empty results when no stopped containers", async () => {
      mockListContainers.mockResolvedValue([]);

      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(0);
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("returns empty results when filter matches nothing", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["nonexistent"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(0);
      expect(mockStart).not.toHaveBeenCalled();
    });
  });

  describe("startDependencies=true", () => {
    it("also starts containers that the target depends on via Compose depends_on", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(2);
      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).toContain("web");
      expect(names).toContain("db");
    });

    it("marks dependencies with dependency=true and direct targets with dependency=false", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const webResult = parsed.results.find((r: { name: string }) => r.name === "web");
      const dbResult = parsed.results.find((r: { name: string }) => r.name === "db");

      expect(webResult.dependency).toBe(false);
      expect(dbResult.dependency).toBe(true);
    });

    it("dryRun includes dependency flag per container", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({ dryRun: true, names: ["web"], startDependencies: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.startDependencies).toBe(true);
      expect(parsed.wouldStart).toHaveLength(2);

      const webEntry = parsed.wouldStart.find((r: { name: string }) => r.name === "web");
      const dbEntry = parsed.wouldStart.find((r: { name: string }) => r.name === "db");

      expect(webEntry.dependency).toBe(false);
      expect(dbEntry.dependency).toBe(true);
    });

    it("does not start containers from a different Compose project", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "project-a");
      const web = makeComposeContainer("web000000000000000", "web", "project-b", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("does not start dependencies when startDependencies is false", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: false,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("does not include excluded containers even if they are dependencies", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
        exclude: ["db"],
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("starts dependencies before targets (dependency first in results)", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results[0].name).toBe("db");
      expect(parsed.results[1].name).toBe("web");
    });

    it("resolves dependencies recursively (web -> api -> db: starting web also starts api and db)", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const api = makeComposeContainer("api0000000000000000", "api", "myapp", ["db"]);
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["api"]);

      mockListContainers.mockResolvedValue([db, api, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(3);
      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).toContain("web");
      expect(names).toContain("api");
      expect(names).toContain("db");
    });

    it("starts deepest dependency first (db before api before web)", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const api = makeComposeContainer("api0000000000000000", "api", "myapp", ["db"]);
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["api"]);

      mockListContainers.mockResolvedValue([db, api, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        startDependencies: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names.indexOf("db")).toBeLessThan(names.indexOf("api"));
      expect(names.indexOf("api")).toBeLessThan(names.indexOf("web"));
    });

    it("dryRun shows recursive dependencies with correct order", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const api = makeComposeContainer("api0000000000000000", "api", "myapp", ["db"]);
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["api"]);

      mockListContainers.mockResolvedValue([db, api, web]);

      const result = (await capturedCallback({ dryRun: true, names: ["web"], startDependencies: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStart).toHaveLength(3);
      const names = parsed.wouldStart.map((r: { name: string }) => r.name);
      expect(names.indexOf("db")).toBeLessThan(names.indexOf("api"));
      expect(names.indexOf("api")).toBeLessThan(names.indexOf("web"));
    });
  });

  describe("summarized (default=true)", () => {
    it("returns { success: true } by default on successful real run", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ success: true });
    });

    it("returns { success: true } when summarized=true explicitly", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ success: true });
    });

    it("returns full result list when summarized=false", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(false);
      expect(parsed.results).toHaveLength(2);
    });

    it("dryRun ignores summarized — always returns wouldStart list", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: true, summarized: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(true);
      expect(parsed.wouldStart).toBeDefined();
    });

    it("does not suppress error responses when summarized=true", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({ dryRun: false, summarized: true })) as {
        content: { text: string }[];
        isError: boolean;
      };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Docker is not running");
    });
  });

  describe("errors", () => {
    it("returns isError when checkConnection throws", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({})) as { content: { text: string }[]; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Docker is not running");
    });

    it("returns isError when listContainers throws", async () => {
      mockListContainers.mockRejectedValueOnce(new Error("socket hang up"));

      const result = (await capturedCallback({})) as { content: { text: string }[]; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("socket hang up");
    });
  });
});
