/**
 * Tokenizes a shell-like command string into an array of arguments.
 *
 * It walks the input character by character, accumulating the token
 * being built and pushing it to `args` whenever whitespace (space/tab)
 * is met outside a quoted region. Quoting and escaping work like a
 * shell, so arguments that contain spaces stay as a single token.
 *
 * Rules:
 * - Space/tab separates tokens outside quotes; consecutive whitespace,
 *   leading whitespace and trailing whitespace produce no empty tokens.
 * - Single quotes: everything inside is literal (backslashes and double
 *   quotes are NOT interpreted); the region ends at the closing quote.
 * - Double quotes: `\"` and `\\` are unescaped; any other backslash is
 *   kept verbatim. The region ends at an unescaped closing quote.
 * - Backslash outside quotes escapes the next character (any char),
 *   including whitespace, so `a\ b` is one token `a b`.
 * - Unclosed quotes run until the end of the input (no error).
 *
 * Security contract:
 * - The returned array is meant to be executed WITHOUT a shell (e.g. as
 *   `exec.Cmd` argv in the Docker Engine API). Never re-join it into a
 *   single string and run it through a shell: quotes/escapes are already
 *   resolved here, so shell metacharacters smuggled inside a token (e.g.
 *   `\;`, `$()`) would become active if a shell were involved.
 * - Input containing a NUL byte (`\0`) is rejected: NUL cannot appear in
 *   an `execve()` argv entry, so it would otherwise truncate the argument
 *   or fail at runtime, making the executed command diverge from the one
 *   that was parsed and displayed.
 */
export function parseCommand(input: string): string[] {
  if (input.includes("\0")) {
    throw new Error("parseCommand: input contains a NUL byte (\\0)");
  }

  // Only empty input or separator-only input can yield no tokens.
  if (!/[^\t ]/.test(input)) return [];

  const args: string[] = [];
  let currentToken = "";
  let tokenStarted = false;
  let openQuote: "'" | '"' | null = null;
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    const nextChar = input[index + 1];

    // Inside single quotes: literal mode until the closing quote.
    if (openQuote === "'") {
      if (char === "'") openQuote = null;
      else currentToken += char;
      index++;
      continue;
    }

    // Inside double quotes: only \" and \\ are special.
    if (openQuote === '"') {
      if (char === '"') {
        openQuote = null;
        index++;
      } else if (char === "\\" && (nextChar === '"' || nextChar === "\\")) {
        currentToken += nextChar;
        index += 2;
      } else {
        currentToken += char;
        index++;
      }
      continue;
    }

    // Opening quote: enter the quoted region (token content may follow).
    if (char === "'" || char === '"') {
      openQuote = char;
      tokenStarted = true;
      index++;
      continue;
    }

    // Backslash outside quotes: escape the next character literally.
    if (char === "\\") {
      // Trailing backslash with nothing to escape: skip it.
      if (nextChar === undefined) {
        index++;
        continue;
      }
      currentToken += nextChar;
      index += 2;
      continue;
    }

    // Whitespace outside quotes: close the current token if it has content.
    if (char === " " || char === "\t") {
      if (tokenStarted) args.push(currentToken);
      currentToken = "";
      tokenStarted = false;
      index++;
      continue;
    }

    // Regular character: append to the current token.
    currentToken += char;
    tokenStarted = true;
    index++;
  }

  // Flush the last token when the input does not end in whitespace.
  if (tokenStarted) args.push(currentToken);
  return args;
}
