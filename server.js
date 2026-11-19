// 简单投票服务器：静态文件服务 + 投票/票数统计接口
// 运行：node server.js
// 访问：http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
// Glitch 等平台提供持久化目录 .data；本地无该目录时直接用项目根目录
const DATA_DIR = fs.existsSync(path.join(ROOT, '.data'))
  ? path.join(ROOT, '.data')
  : ROOT;
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');
const MAX_VOTES = 3;

// 读取选手清单
const participants = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'participants.json'), 'utf8')
);
const idSet = new Set(participants.map(p => p.id));

function loadVotes() {
  try {
    const raw = fs.readFileSync(VOTES_FILE, 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch (e) {
    return {};
  }
}

function saveVotes(votes) {
  fs.mkdirSync(path.dirname(VOTES_FILE), { recursive: true });
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf8');
}

function buildTally(votes) {
  const counts = {};
  participants.forEach(p => { counts[p.id] = 0; });

  let voterCount = 0;
  for (const voterId in votes) {
    const arr = votes[voterId];
    if (!Array.isArray(arr)) continue;
    voterCount++;
    arr.forEach(id => {
      if (counts[id] !== undefined) counts[id]++;
    });
  }

  const rows = participants.map(p => ({
    id: p.id,
    name: p.name,
    className: p.className,
    count: counts[p.id]
  }));
  rows.sort((a, b) => b.count - a.count);

  return {
    voterCount,
    totalVotes: rows.reduce((s, r) => s + r.count, 0),
    rows
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('无效的 JSON 请求体'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';

  // 防目录穿越：解析后必须位于 ROOT 内
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  // 提交 / 更新 / 清空投票
  if (pathname === '/api/vote' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const voterId = String(body.voterId || '').trim();
      if (!voterId || voterId.length > 80) {
        sendJson(res, 400, { ok: false, error: '缺少有效的 voterId' });
        return;
      }

      const rawVotes = Array.isArray(body.votes) ? body.votes : [];
      const votes = [...new Set(rawVotes.map(String))];

      if (votes.length > MAX_VOTES) {
        sendJson(res, 400, { ok: false, error: '每人最多投 ' + MAX_VOTES + ' 票' });
        return;
      }
      for (const id of votes) {
        if (!idSet.has(id)) {
          sendJson(res, 400, { ok: false, error: '存在无效的选手 id: ' + id });
          return;
        }
      }

      const all = loadVotes();
      // 已投过票的不可修改、不可撤销
      if (all[voterId] && Array.isArray(all[voterId]) && all[voterId].length > 0) {
        sendJson(res, 409, { ok: false, error: '已投过票，不可修改或撤销' });
        return;
      }
      if (votes.length === 0) {
        sendJson(res, 400, { ok: false, error: '请至少投 1 票' });
        return;
      }
      all[voterId] = votes;
      saveVotes(all);

      sendJson(res, 200, { ok: true, tally: buildTally(all) });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  // 票数统计
  if (pathname === '/api/tally' && req.method === 'GET') {
    sendJson(res, 200, buildTally(loadVotes()));
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, pathname);
    return;
  }

  sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
});

server.listen(PORT, () => {
  console.log('投票服务器已启动：http://localhost:' + PORT);
  console.log('选手数量：' + participants.length + '，每人最多 ' + MAX_VOTES + ' 票');
});
