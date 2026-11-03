// 苏迪服饰市调报告 · 实时协同服务
// Express 托管前端 + y-websocket 同步 + 本地文件持久化
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { WebSocketServer } = require('ws');
const Y = require('yjs');
const utils = require('y-websocket/bin/utils');
const { setupWSConnection, setPersistence } = utils;

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const sanitize = (name) => String(name).replace(/[^a-zA-Z0-9_.-]/g, '_');
const fileFor = (docName) => path.join(DATA_DIR, sanitize(docName) + '.bin');
function saveDoc(file, ydoc) {
  try { fs.writeFileSync(file, Y.encodeStateAsUpdate(ydoc)); }
  catch (e) { console.error('[save]', e.message); }
}

// 简单文件持久化：文档首次访问时载入，更新后防抖落盘
setPersistence({
  provider: 'file',
  bindState: async (docName, ydoc) => {
    const file = fileFor(docName);
    if (fs.existsSync(file)) {
      try { const buf = fs.readFileSync(file); if (buf.length) { Y.applyUpdate(ydoc, buf); console.log('[persist] loaded', docName, buf.length, 'bytes'); } }
      catch (e) { console.error('[load]', docName, e.message); }
    } else {
      console.log('[persist] no file for', docName);
    }
    let timer = null;
    ydoc.on('update', () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; saveDoc(file, ydoc); }, 1500);
    });
  },
  writeState: async (docName, ydoc) => { saveDoc(fileFor(docName), ydoc); }
});

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/healthz', (req, res) => res.json({ ok: true, docs: fs.readdirSync(DATA_DIR) }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (conn, req) => setupWSConnection(conn, req, { gc: true }));
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  const lanIPs = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) lanIPs.push(ni.address);
    }
  }
  const bar = '==================================================';
  console.log('\n' + bar);
  console.log('  苏迪市调报告 · 实时协同服务已启动');
  console.log(bar);
  console.log('  本机打开  :  http://localhost:' + PORT);
  console.log('  本机备用  :  http://127.0.0.1:' + PORT);
  if (lanIPs.length) {
    console.log('  发给同事  :  http://' + lanIPs[0] + ':' + PORT + '  (同一 WiFi/局域网)');
    if (lanIPs.length > 1) console.log('  其他地址  :  ' + lanIPs.slice(1).map(ip => 'http://' + ip + ':' + PORT).join('  '));
  } else {
    console.log('  (未检测到局域网地址，同事需与你在同一网络)');
  }
  console.log(bar);
  console.log('  关闭窗口即停止服务。首次运行会自动 npm install。');
  console.log(bar + '\n');
});
