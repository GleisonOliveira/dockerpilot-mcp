import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  id: z.string().describe("Container ID to delete (full or prefix)."),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe("Force removal of a running container (sends SIGKILL). Default: false."),
  removeImage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Also remove the container's image after deletion. Default: false."),
  confirmed: z
    .boolean()
    .describe("User confirmation that the container should be deleted. Must be explicitly set to true."),
});

type Input = z.infer<typeof schema>;
type ContainerInfo = Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listContainers"]>>[number];

export class DeleteContainerTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #findContainer(containers: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listContainers"]>>, id: string) {
    const match = containers.find((c) => c.Id.toLowerCase().startsWith(id.toLowerCase()));
    if (!match) throw new Error(`No container found matching ID prefix: ${id}`);
    return match;
  }

  #buildPreview(match: ContainerInfo, input: Input) {
    const shortId = match.Id.slice(0, 12);
    const name = match.Names[0]?.replace(/^\//, "") ?? shortId;
    return {
      confirmed: false,
      message: "Deletion aborted: confirmed must be true to proceed. Ask the user to confirm before retrying.",
      preview: {
        id: shortId,
        name,
        image: match.Image,
        state: match.State,
        status: match.Status,
        force: input.force ?? false,
        removeImage: input.removeImage ?? false,
      },
    };
  }

  async #removeImage(
    docker: ReturnType<DockerClient["getDocker"]>,
    imageId: string,
    imageName: string,
    force: boolean,
  ) {
    const outcome = await tryCatch(() => docker.getImage(imageId).remove({ force }));
    return {
      imageRemoved: outcome.success,
      image: imageName,
      imageError: outcome.success ? null : String(outcome.error),
    };
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      if (!input.id?.trim()) {
        return {
          content: [{ type: "text" as const, text: "Error deleting container: id is required." }],
          isError: true,
        };
      }

      await this.client.checkConnection();
      const docker = this.client.getDocker();
      const containers = await docker.listContainers({ all: true });
      const match = this.#findContainer(containers, input.id);

      if (!input.confirmed) return this.#buildPreview(match, input);

      const shortId = match.Id.slice(0, 12);
      const name = match.Names[0]?.replace(/^\//, "") ?? shortId;

      await docker.getContainer(match.Id).remove({ force: input.force ?? false });

      const imageResult = input.removeImage
        ? await this.#removeImage(docker, match.ImageID, match.Image, input.force ?? false)
        : {};

      return { deleted: true, id: shortId, name, ...imageResult };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error deleting container: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "delete_container",
      {
        description:
          "Delete a Docker container by ID. " +
          "Requires confirmed=true — always ask the user to confirm before calling with confirmed=true. " +
          "Use force=true to remove a running container (sends SIGKILL first). " +
          "Use removeImage=true to also delete the container's image after removal.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
