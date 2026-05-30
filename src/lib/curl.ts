// Parses a cURL command (as copied from Chrome/Firefox DevTools
// "Copy as cURL") into a structured request descriptor we can replay
// server-side. GobbleCube has no public API, so the dashboard is fed by
// replaying the dashboard's own backend calls captured from the browser.

export interface RequestDescriptor {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

// Tokenize respecting single/double quotes and backslash-newline line
// continuations that Chrome inserts in "Copy as cURL (bash)".
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const s = input.replace(/\\\r?\n/g, " ").trim();

  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let buf = "";
      while (i < s.length && s[i] !== quote) {
        if (s[i] === "\\" && quote === '"' && i + 1 < s.length) {
          buf += s[i + 1];
          i += 2;
        } else {
          buf += s[i];
          i++;
        }
      }
      i++; // closing quote
      tokens.push(buf);
    } else {
      let buf = "";
      while (i < s.length && !/\s/.test(s[i])) {
        if (s[i] === "\\" && i + 1 < s.length) {
          buf += s[i + 1];
          i += 2;
        } else {
          buf += s[i];
          i++;
        }
      }
      tokens.push(buf);
    }
  }
  return tokens;
}

export function parseCurl(command: string): RequestDescriptor {
  const tokens = tokenize(command.trim());
  if (tokens[0] !== "curl") {
    throw new Error('Command must start with "curl". Use "Copy as cURL" in DevTools.');
  }

  const headers: Record<string, string> = {};
  let url = "";
  let method = "";
  let body: string | undefined;

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t) {
      case "-H":
      case "--header": {
        const h = tokens[++i] ?? "";
        const idx = h.indexOf(":");
        if (idx > -1) {
          const name = h.slice(0, idx).trim();
          const value = h.slice(idx + 1).trim();
          headers[name] = value;
        }
        break;
      }
      case "-X":
      case "--request":
        method = tokens[++i] ?? "";
        break;
      case "-d":
      case "--data":
      case "--data-raw":
      case "--data-binary":
      case "--data-ascii":
        body = tokens[++i] ?? "";
        break;
      case "-b":
      case "--cookie": {
        const c = tokens[++i] ?? "";
        headers["Cookie"] = c;
        break;
      }
      case "--compressed":
      case "-s":
      case "--silent":
      case "-L":
      case "--location":
      case "-k":
      case "--insecure":
        break; // flags with no value, ignored
      default:
        if (t.startsWith("http://") || t.startsWith("https://")) {
          url = t;
        }
        break;
    }
  }

  if (!url) throw new Error("Could not find a URL in the cURL command.");
  if (!method) method = body ? "POST" : "GET";

  return { url, method, headers, body };
}
