export function buildUserMessage(containerRef: string, symptom?: string): string {
  const symptomContext = symptom ? `\n\nReported symptom: **${symptom}**\n` : "";
  return `I need help diagnosing a problem with ${containerRef}.${symptomContext}`;
}
