import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("DockerClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getDocker returns Dockerode instance", async () => {
    const { DockerClient } = await import("../../src/docker/client.js");
    const client = new DockerClient();
    const docker = client.getDocker();
    expect(docker).toBeDefined();
    expect(typeof docker.ping).toBe("function");
  });

  it("checkConnection resolves when ping succeeds", async () => {
    const { DockerClient } = await import("../../src/docker/client.js");
    const client = new DockerClient();
    vi.spyOn(client.getDocker(), "ping").mockResolvedValue(undefined as never);
    await expect(client.checkConnection()).resolves.toBeUndefined();
  });

  it("checkConnection throws when ping fails on linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    vi.resetModules();
    const { DockerClient } = await import("../../src/docker/client.js");
    const client = new DockerClient();
    vi.spyOn(client.getDocker(), "ping").mockRejectedValue(new Error("ENOENT") as never);
    await expect(client.checkConnection()).rejects.toThrow("Docker is not running or socket is not accessible.");
    await expect(client.checkConnection()).rejects.toThrow("/var/run/docker.sock is accessible");
  });

  it("checkConnection throws with windows message when platform is win32", async () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
    vi.resetModules();
    const { DockerClient } = await import("../../src/docker/client.js");
    const client = new DockerClient();
    vi.spyOn(client.getDocker(), "ping").mockRejectedValue(new Error("fail") as never);
    await expect(client.checkConnection()).rejects.toThrow("Docker Desktop is running");
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
  });
});
