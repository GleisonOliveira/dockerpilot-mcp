export function buildUserMessage(projectDir?: string): string {
  const dirContext = projectDir ? ` at \`${projectDir}\`` : "";
  return `I want to restart the entire Docker Compose project${dirContext}. Please bring down and start all services again.`;
}
