export function buildUserMessage(): string {
  return "I need to remove a Docker volume. Please guide me through the safe removal process, including checking which containers use it, warning me about data loss, stopping the containers, deleting the volume, and restarting the containers.";
}
