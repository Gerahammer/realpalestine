// Dev-only static server for local preview. Not part of the deployed site.
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4178;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};
http.createServer((req, res) => {
  let f = decodeURIComponent(req.url.split('?')[0]);
  if (f === '/') f = '/index.html';
  const fp = path.join(ROOT, f);
  fs.readFile(fp, (e, d) => {
    if (e) {
      fs.readFile(path.join(ROOT, '404.html'), (e2, d2) => {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(e2 ? '404' : d2);
      });
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(fp)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(PORT, () => console.log('preview on http://localhost:' + PORT));
