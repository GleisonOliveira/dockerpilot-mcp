export function buildUserMessage(projectDir?: string): string {
  const dirContext = projectDir ? ` located at \`${projectDir}\`` : "";
  return `I want to start the entire Docker Compose project${dirContext}. Please bring up all services.`;
}
