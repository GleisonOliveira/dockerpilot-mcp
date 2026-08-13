export function parseCommand(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let tokenizing = false;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote === "'") {
      if (ch === "'") {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (quote === '"') {
      if (ch === '"') {
        quote = null;
      } else if (ch === "\\" && (input[i + 1] === '"' || input[i + 1] === "\\")) {
        current += input[i + 1];
        i++;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      tokenizing = true;
      continue;
    }

    if (ch === "\\") {
      const next = input[i + 1];
      if (next !== undefined) {
        current += next;
        i++;
      }
      continue;
    }

    if (ch === " " || ch === "\t") {
      if (tokenizing) {
        args.push(current);
        current = "";
        tokenizing = false;
      }
      continue;
    }

    current += ch;
    tokenizing = true;
  }

  if (tokenizing) args.push(current);
  return args;
}
