export function buildUserMessage(projectDir?: string): string {
  const dirContext = projectDir ? ` at \`${projectDir}\`` : "";
  return `I want to stop the entire Docker Compose project${dirContext}. Please bring down all services.`;
}
