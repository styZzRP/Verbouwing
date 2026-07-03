/* ============================================================
   Project Ons Thuis – mini-server met bestandsdatabase
   ------------------------------------------------------------
   Start met:   node server.js
   Open daarna op elk apparaat in hetzelfde netwerk:
   http://<ip-van-dit-apparaat>:3000

   Alle gegevens worden bewaard in data/ons-thuis-data.json.
   Geen npm-pakketten nodig; alleen Node.js.
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'ons-thuis-data.json');
const PORT = process.env.PORT || 3000;
const MAX_BODY = 10 * 1024 * 1024; // 10 MB is ruim voldoende

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function sendJson(res, body, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function handleApi(req, res) {
  if (req.method === 'GET') {
    fs.readFile(DATA_FILE, (err, buf) => {
      if (err) return sendJson(res, 'null'); // nog geen data: app gebruikt de seed
      sendJson(res, buf);
    });
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { res.writeHead(413); res.end(); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.tasks)) throw new Error('geen planner-data');
      } catch (e) {
        return sendJson(res, JSON.stringify({ error: 'Ongeldige data' }), 400);
      }
      // Atomisch schrijven: eerst naar tijdelijk bestand, dan hernoemen.
      // Zo raakt de database nooit half geschreven bij een stroomstoring.
      const tmp = DATA_FILE + '.tmp';
      fs.writeFile(tmp, text, err => {
        if (err) return sendJson(res, JSON.stringify({ error: String(err) }), 500);
        fs.rename(tmp, DATA_FILE, err2 => {
          if (err2) return sendJson(res, JSON.stringify({ error: String(err2) }), 500);
          sendJson(res, JSON.stringify({ ok: true }));
        });
      });
    });
    return;
  }

  res.writeHead(405, { Allow: 'GET, PUT, POST' });
  res.end();
}

function handleStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const file = path.normalize(path.join(ROOT, urlPath));
  // Nooit buiten de projectmap serveren, en de database zelf niet publiek maken
  if (!file.startsWith(ROOT + path.sep) || file.startsWith(DATA_DIR + path.sep)) {
    res.writeHead(403); res.end('Verboden'); return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Niet gevonden'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/api/data') return handleApi(req, res);
  handleStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🏠 Project Ons Thuis draait!');
  console.log('   Database: ' + DATA_FILE);
  console.log('');
  console.log('   Open op dit apparaat:   http://localhost:' + PORT);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('   Op andere apparaten:    http://' + net.address + ':' + PORT + '   (zelfde wifi)');
      }
    }
  }
});
