const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const reqPath = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
  const filePath = path.join(__dirname, 'static', reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = err.code === 'ENOENT' ? 404 : 500;
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
    res.setHeader('Content-Type', type);
    res.end(data);
  });
});

server.listen(port, '127.0.0.1');