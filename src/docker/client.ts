import Dockerode from "dockerode";

const isWindows = process.platform === "win32";

export class DockerClient {
  private readonly docker: Dockerode;

  constructor() {
    this.docker = new Dockerode(
      isWindows
        ? { socketPath: "//./pipe/docker_engine" }
        : { socketPath: "/var/run/docker.sock" }
    );
  }

  async checkConnection(): Promise<void> {
    try {
      await this.docker.ping();
    } catch {
      throw new Error(
        "Docker is not running or socket is not accessible. " +
          (isWindows
            ? "Ensure Docker Desktop is running."
            : "Ensure Docker daemon is running and /var/run/docker.sock is accessible.")
      );
    }
  }

  getDocker(): Dockerode {
    return this.docker;
  }
}

export const dockerClient = new DockerClient();
