// Local preview only. Serve the website's public assets on loopback.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(__dirname);
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon'};
const topLevel = new Set(['index.html', 'script.js', 'style.css', 'admin.js', 'sw.js']);
http.createServer((req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1:8123');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const parts = relative.split(/[\\/]/);
    if (parts.some(p => p.startsWith('.')) || (!topLevel.has(relative) && !['lessons','src'].includes(parts[0]))) {
      res.writeHead(404).end(); return;
    }
    const file = fs.realpathSync(path.join(root, relative));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile() || !types[path.extname(file)]) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)], 'Cache-Control':'no-store', 'Referrer-Policy':'strict-origin-when-cross-origin'});
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
}).listen(8123, '127.0.0.1', () => {
  console.log('Study Website: http://127.0.0.1:8123');
  if (process.argv.includes('--open') && process.platform === 'win32') {
    require('node:child_process').spawn('cmd.exe', ['/c', 'start', '', 'http://127.0.0.1:8123'], {windowsHide:true});
  }
})
  .on('error', error => { console.error(error.message); process.exitCode = 1; });
