/* Hello World! service worker: relays Python input() answers only.
 *
 * The Python worker must block while it waits for input(), so it makes a
 * synchronous request to api/terminal-input. This worker holds that request
 * open until the page sends the learner's answer, replacing the old launcher.
 * It caches nothing and lets every other request through untouched.
 */
const sessions = new Map(); // id -> { inbox: string[], waiter: resolve|null, seen: ms }
const WAIT_MS = 120_000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function session(id) {
  for (const [key, value] of sessions) {
    if (Date.now() - value.seen > 180_000) {
      value.waiter?.(null);
      sessions.delete(key);
    }
  }
  // Created on demand, so a restarted service worker still pairs page and worker.
  if (!sessions.has(id)) sessions.set(id, { inbox: [], waiter: null, seen: Date.now() });
  const entry = sessions.get(id);
  entry.seen = Date.now();
  return entry;
}

async function handle(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const { session: id, action, value } = data || {};
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return json({ error: "Invalid terminal session." }, 400);
  if (action === "open") {
    if (sessions.size >= 16) return json({ error: "Too many running terminals. Stop another run first." }, 400);
    session(id);
    return json({ ok: true });
  }
  if (action === "close") {
    sessions.get(id)?.waiter?.(null);
    sessions.delete(id);
    return json({ ok: true });
  }
  const entry = session(id);
  if (action === "send") {
    if (typeof value !== "string" || value.length > 10_000) return json({ error: "Terminal input is too large." }, 400);
    if (entry.waiter) {
      const resolve = entry.waiter;
      entry.waiter = null;
      resolve(value);
    } else if (entry.inbox.length < 16) entry.inbox.push(value);
    else return json({ error: "Wait for the program to read the previous input." }, 400);
    return json({ ok: true });
  }
  if (action === "wait") {
    if (entry.inbox.length) return json({ value: entry.inbox.shift(), eof: false });
    const answer = await new Promise((resolve) => {
      entry.waiter = resolve;
      setTimeout(() => {
        if (entry.waiter === resolve) {
          entry.waiter = null;
          resolve(null);
        }
      }, WAIT_MS);
    });
    return json(answer === null ? { eof: true } : { value: answer, eof: false });
  }
  return json({ error: "Invalid terminal action." }, 400);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/api/terminal-input"))
    event.respondWith(handle(event.request));
});
