import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  id: z.string().describe("Container ID (full or prefix). Name not accepted."),
  command: z.string().describe("Command to execute inside the container (e.g. 'ls -la /app')."),
  silent: z
    .boolean()
    .optional()
    .default(false)
    .describe("When true, omits output from the response. Returns only success status and exit code."),
});

type Input = z.infer<typeof schema>;

export class ExecCommandTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #handle(input: Input) {
    if (!input.id?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error executing command: id is required." }],
        isError: true,
      };
    }

    if (!input.command?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error executing command: command is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const all = await docker.listContainers({ all: true });
      const ref = input.id.trim().toLowerCase();

      const match = all.find((c) => c.Id.toLowerCase().startsWith(ref));

      if (!match) throw new Error(`Container not found: ${input.id.trim()}`);

      if (match.State !== "running") {
        throw new Error(`Container is not running (state: ${match.State}). Start it first.`);
      }

      const container = docker.getContainer(match.Id);

      const cmd = input.command.trim().split(/\s+/);

      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      const output = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          const raw = Buffer.concat(chunks);
          // Strip dockerode multiplexed stream headers (8-byte prefix per frame)
          const lines: string[] = [];
          let offset = 0;
          while (offset + 8 <= raw.length) {
            const size = raw.readUInt32BE(offset + 4);
            if (offset + 8 + size > raw.length) break;
            lines.push(raw.slice(offset + 8, offset + 8 + size).toString("utf8"));
            offset += 8 + size;
          }
          resolve(lines.length > 0 ? lines.join("") : raw.toString("utf8"));
        });
        stream.on("error", reject);
      });

      const inspectExec = await exec.inspect();

      const result: Record<string, unknown> = {
        containerId: match.Id.slice(0, 12),
        command: input.command.trim(),
        exitCode: inspectExec.ExitCode,
        success: inspectExec.ExitCode === 0,
      };
      if (!input.silent) {
        result.output = output.trimEnd();
      }
      return result;
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error executing command: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "exec_command",
      {
        description:
          "Execute a command inside a running Docker container. " +
          "Accepts container ID (full or prefix) — names are NOT accepted. " +
          "Returns stdout/stderr output and the command exit code. " +
          "Set silent=true to suppress output and return only success status and exit code.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
