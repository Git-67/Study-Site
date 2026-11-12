// Each run gets a fresh browser Python runtime and virtual filesystem.
// The site's service worker (sw.js) relays stdin only; it never executes the program.
const send = (type, text = "") => self.postMessage({ type, text });

// Prefer a copy of Pyodide in src/pyodide/ when one is added (works offline);
// otherwise use one exact, pinned release from jsDelivr so it cannot change silently.
const PYODIDE_SOURCES = [
  new URL("./pyodide/", self.location.href).href,
  "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
];
const TERMINAL_URL = new URL("../api/terminal-input", self.location.href).href;

async function loadPyodideRuntime() {
  for (const base of PYODIDE_SOURCES) {
    let loadPyodide;
    try {
      ({ loadPyodide } = await import(base + "pyodide.mjs"));
    } catch {
      continue; // Not bundled here; try the next source.
    }
    return loadPyodide({ indexURL: base });
  }
  throw Error("Python could not load. Check your internet connection and try again.");
}

self.onmessage = async ({ data: { code, session } }) => {
  try {
    send("status", "Loading Python…");
    const python = await loadPyodideRuntime();
    const decoders = {output: new TextDecoder(), stderr: new TextDecoder()};
    let outputSize = 0;
    const write = (buffer, type = "output") => {
      outputSize += buffer.length;
      if (outputSize > 100000) throw Error("Output limit reached (100 KB).");
      send(type, decoders[type].decode(buffer, { stream: true }));
      return buffer.length;
    };
    python.setStdout({ write });
    python.setStderr({ write: buffer => write(buffer, "stderr") });
    python.setStdin({ isatty: true, stdin: () => {
      send("input");
      // A synchronous request blocks only this worker while the page remains usable.
      const request = new XMLHttpRequest();
      request.open("POST", TERMINAL_URL, false);
      request.setRequestHeader("Content-Type", "application/json");
      request.send(JSON.stringify({ session, action: "wait" }));
      if (request.status !== 200) throw Error("Terminal connection lost. Run the code again.");
      const result = JSON.parse(request.responseText);
      if (result.eof) return null;
      send("output", result.value + "\n");
      send("running");
      return result.value;
    }});
    send("running");
    await python.runPythonAsync(code);
    send("done", "Program finished.");
  } catch (error) {
    send("error", error.message || "Unable to run Python.");
  }
};
