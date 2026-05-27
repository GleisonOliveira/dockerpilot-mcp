import { describe, it, expect, vi, beforeEach } from "vitest";
import { StopContainersTool } from "../../../../src/docker/tools/stop/stop.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockStop = vi.fn();
const mockKill = vi.fn();
const mockListContainers = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({ stop: mockStop, kill: mockKill }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new StopContainersTool(mockClient);
}

const makeContainer = (id: string, name: string, labels: Record<string, string> = {}) => ({
  Id: id,
  Names: [`/${name}`],
  Image: "nginx:latest",
  Status: "Up 2 hours",
  State: "running",
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
  timeout?: number;
  force?: boolean;
  stopDependents?: boolean;
  summarized?: boolean;
  dryRun?: boolean;
};

describe("StopContainersTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStop.mockResolvedValue(undefined);
    mockKill.mockResolvedValue(undefined);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("dryRun=true", () => {
    it("returns wouldStop list without calling stop", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(true);
      expect(parsed.wouldStop).toHaveLength(2);
      expect(parsed.wouldStop[0]).toEqual({ id: "aaa111bbb222", name: "web", dependent: false });
      expect(parsed.wouldStop[1]).toEqual({ id: "ddd444eee555", name: "db", dependent: false });
      expect(mockStop).not.toHaveBeenCalled();
      expect(mockKill).not.toHaveBeenCalled();
    });

    it("dryRun respects name filter", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: true, names: ["web"] })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStop).toHaveLength(1);
      expect(parsed.wouldStop[0].name).toBe("web");
    });

    it("includes force=false and timeout=10 by default", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.force).toBe(false);
      expect(parsed.timeout).toBe(10);
    });

    it("includes force=true and timeout=null when force specified", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: true, force: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.force).toBe(true);
      expect(parsed.timeout).toBeNull();
    });

    it("includes custom timeout when specified", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: true, timeout: 30 })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.force).toBe(false);
      expect(parsed.timeout).toBe(30);
    });

    it("dryRun respects exclude", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: true, exclude: ["db"] })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStop).toHaveLength(1);
      expect(parsed.wouldStop[0].name).toBe("web");
    });

    it("uses id as name in dryRun when Names is empty", async () => {
      mockListContainers.mockResolvedValue([{ ...makeContainer("aaa111bbb222ccc333", "web"), Names: [] }]);
      const result = (await capturedCallback({ dryRun: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.wouldStop[0].name).toBe("aaa111bbb222");
    });
  });

  describe("dryRun=false (default is true)", () => {
    it("dryRun is true by default — does not call stop without explicit dryRun: false", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(true);
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe("stop all (no filter)", () => {
    it("stops all running containers when no names or ids given", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(false);
      expect(parsed.results).toHaveLength(2);
      expect(mockStop).toHaveBeenCalledTimes(2);
    });

    it("uses default timeout of 10 when not specified", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      await capturedCallback({ dryRun: false, summarized: false });

      expect(mockStop).toHaveBeenCalledWith({ t: 10 });
    });

    it("uses custom timeout when specified", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      await capturedCallback({ dryRun: false, summarized: false, timeout: 30 });

      expect(mockStop).toHaveBeenCalledWith({ t: 30 });
    });

    it("uses id as name when Names is empty", async () => {
      mockListContainers.mockResolvedValue([{ ...makeContainer("aaa111bbb222ccc333", "web"), Names: [] }]);
      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results[0].name).toBe("aaa111bbb222");
    });
  });

  describe("filter by names", () => {
    it("stops only containers matching name", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["web"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
      expect(mockStop).toHaveBeenCalledTimes(1);
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

    it("stops multiple containers matching different names", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["web", "db"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(2);
    });
  });

  describe("filter by ids", () => {
    it("stops container matching id prefix", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB, containerC]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, ids: ["aaa111"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("stops multiple containers by id", async () => {
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

  describe("force=true", () => {
    it("calls kill instead of stop", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      await capturedCallback({ dryRun: false, summarized: false, force: true });

      expect(mockKill).toHaveBeenCalledTimes(1);
      expect(mockStop).not.toHaveBeenCalled();
    });

    it("reports stopped=true on successful kill", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, force: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results[0].stopped).toBe(true);
    });
  });

  describe("partial failures", () => {
    it("reports stopped=false with error when stop fails for a container", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);
      mockStop.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("permission denied"));

      const result = (await capturedCallback({ dryRun: false, summarized: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const stopped = parsed.results.find((r: { name: string }) => r.name === "web");
      const failed = parsed.results.find((r: { name: string }) => r.name === "db");

      expect(stopped.stopped).toBe(true);
      expect(failed.stopped).toBe(false);
      expect(failed.error).toContain("permission denied");
    });

    it("reports stopped=false with error when kill fails", async () => {
      mockListContainers.mockResolvedValue([containerA]);
      mockKill.mockRejectedValueOnce(new Error("no such container"));

      const result = (await capturedCallback({ dryRun: false, summarized: false, force: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results[0].stopped).toBe(false);
      expect(parsed.results[0].error).toContain("no such container");
    });
  });

  describe("empty results", () => {
    it("returns empty wouldStop when no running containers (dryRun default)", async () => {
      mockListContainers.mockResolvedValue([]);

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStop).toHaveLength(0);
      expect(mockStop).not.toHaveBeenCalled();
    });

    it("returns empty results when filter matches nothing", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ dryRun: false, summarized: false, names: ["nonexistent"] })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(0);
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe("stopDependents=true", () => {
    it("also stops containers that depend on the target via Compose depends_on", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(2);
      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).toContain("db");
      expect(names).toContain("web");
    });

    it("marks dependents with dependent=true and direct targets with dependent=false", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const dbResult = parsed.results.find((r: { name: string }) => r.name === "db");
      const webResult = parsed.results.find((r: { name: string }) => r.name === "web");

      expect(dbResult.dependent).toBe(false);
      expect(webResult.dependent).toBe(true);
    });

    it("dryRun includes dependent flag per container", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({ dryRun: true, names: ["db"], stopDependents: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.stopDependents).toBe(true);
      expect(parsed.wouldStop).toHaveLength(2);

      const dbEntry = parsed.wouldStop.find((r: { name: string }) => r.name === "db");
      const webEntry = parsed.wouldStop.find((r: { name: string }) => r.name === "web");

      expect(dbEntry.dependent).toBe(false);
      expect(webEntry.dependent).toBe(true);
    });

    it("does not stop containers from a different Compose project", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "project-a");
      const web = makeComposeContainer("web000000000000000", "web", "project-b", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("db");
    });

    it("does not stop dependents when stopDependents is false", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: false,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("db");
    });

    it("does not include excluded containers even if they are dependents", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);

      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: true,
        exclude: ["web"],
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("db");
    });

    it("resolves dependents recursively (A <- B <- C: stopping A also stops C and B)", async () => {
      const a = makeComposeContainer("aaa000000000000000", "a", "myapp");
      const b = makeComposeContainer("bbb000000000000000", "b", "myapp", ["a"]);
      const c = makeComposeContainer("ccc000000000000000", "c", "myapp", ["b"]);

      mockListContainers.mockResolvedValue([a, b, c]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["a"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(3);
      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).toContain("a");
      expect(names).toContain("b");
      expect(names).toContain("c");
    });

    it("stops leaf dependents before their parents (C before B before A)", async () => {
      const a = makeComposeContainer("aaa000000000000000", "a", "myapp");
      const b = makeComposeContainer("bbb000000000000000", "b", "myapp", ["a"]);
      const c = makeComposeContainer("ccc000000000000000", "c", "myapp", ["b"]);

      mockListContainers.mockResolvedValue([a, b, c]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["a"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names.indexOf("c")).toBeLessThan(names.indexOf("b"));
      expect(names.indexOf("b")).toBeLessThan(names.indexOf("a"));
    });

    it("dryRun shows recursive dependents with correct order", async () => {
      const a = makeComposeContainer("aaa000000000000000", "a", "myapp");
      const b = makeComposeContainer("bbb000000000000000", "b", "myapp", ["a"]);
      const c = makeComposeContainer("ccc000000000000000", "c", "myapp", ["b"]);

      mockListContainers.mockResolvedValue([a, b, c]);

      const result = (await capturedCallback({ dryRun: true, names: ["a"], stopDependents: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.wouldStop).toHaveLength(3);
      const names = parsed.wouldStop.map((r: { name: string }) => r.name);
      expect(names.indexOf("c")).toBeLessThan(names.indexOf("b"));
      expect(names.indexOf("b")).toBeLessThan(names.indexOf("a"));
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

    it("dryRun ignores summarized — always returns wouldStop list", async () => {
      mockListContainers.mockResolvedValue([containerA]);

      const result = (await capturedCallback({ dryRun: true, summarized: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.dryRun).toBe(true);
      expect(parsed.wouldStop).toBeDefined();
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

  describe("stopDependents edge cases", () => {
    it("skips dependent resolution for containers without Labels", async () => {
      const noLabels = {
        ...makeContainer("aaa111bbb222ccc333", "web"),
        Labels: undefined as unknown as Record<string, string>,
      };
      mockListContainers.mockResolvedValue([noLabels]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["web"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].name).toBe("web");
    });

    it("skips container as dependent when depends_on label is present but empty", async () => {
      const web = makeContainer("web000000000000000", "web", {
        "com.docker.compose.project": "myapp",
        "com.docker.compose.service": "web",
        "com.docker.compose.depends_on": "",
      });
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      mockListContainers.mockResolvedValue([db, web]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).not.toContain("web");
    });

    it("handles frontier container without Labels when resolving transitive dependents", async () => {
      const db = makeComposeContainer("db0000000000000000", "db", "myapp");
      const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
      const noLabels = {
        ...makeContainer("ext000000000000000", "ext"),
        Labels: undefined as unknown as Record<string, string>,
      };
      mockListContainers.mockResolvedValue([db, web, noLabels]);

      const result = (await capturedCallback({
        dryRun: false,
        summarized: false,
        names: ["db"],
        stopDependents: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      const names = parsed.results.map((r: { name: string }) => r.name);
      expect(names).toContain("web");
      expect(names).not.toContain("ext");
    });
  });
});
