import * as Y from './vendor/collab.js';
import { WebsocketProvider } from './vendor/collab.js';

const { model, seed } = window.__REPORT__;

/* ---------- 协同文档 ---------- */
const ydoc = new Y.Doc();
const texts = ydoc.getMap('texts');
const mediaArr = ydoc.getArray('collabMedia'); // 已合作板块：多人协同新增的 图片/视频 块
const ROOM = 'sudi-report';
const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
const provider = new WebsocketProvider(`${wsProto}://${location.host}`, ROOM, ydoc, { connect: true });

provider.on('sync', (isSynced) => {
  if (isSynced && texts.size === 0) {
    setTimeout(() => {
      if (texts.size === 0) {
        ydoc.transact(() => {
          seed.forEach(({ key, value }) => {
            const yt = getYText(texts, key);
            if (yt.length === 0) yt.insert(0, value);
          });
        });
      }
    }, 400);
  }
  markSaved();
});
provider.on('status', (e) => {
  if (e.status === 'connected') markSaved();
});

/* ---------- 工具 ---------- */
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
// Yjs v13 已移除 Y.Map.getText，需手动创建/获取 Y.Text
function getYText(map, key) {
  let t = map.get(key);
  if (!(t instanceof Y.Text)) { t = new Y.Text(); map.set(key, t); }
  return t;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const elByKey = {};
function phenDecorate(node, val) {
  const v = (val || '').trim();
  node.classList.toggle('issue', v === '有');
  node.classList.toggle('ok', v === '无');
}
function makeEditable(parent, key, initial, opts = {}) {
  const { tag = 'div', cls = '', ph = '', decorate = null, onInput = null } = opts;
  const node = document.createElement(tag);
  node.className = 'editable ' + cls;
  node.contentEditable = 'true';
  node.spellcheck = false;
  node.dataset.key = key;
  if (ph) node.dataset.ph = ph;
  const yt = getYText(texts, key);
  const setText = (val) => { node.textContent = val; if (decorate) decorate(node, val); };
  setText(yt.length ? yt.toString() : (initial || ''));
  node.addEventListener('input', () => {
    const val = node.innerText;
    yt.doc.transact(() => { yt.delete(0, yt.length); if (val) yt.insert(0, val); });
    if (decorate) decorate(node, val);
    setEditing(key);
    markSaving();
    if (onInput) onInput();
  });
  node.addEventListener('focus', () => setEditing(key));
  node.addEventListener('blur', () => setEditing(null));
  yt.observe(() => {
    if (document.activeElement === node) return;
    const val = yt.toString();
    if (node.innerText !== val) setText(val);
  });
  elByKey[key] = node;
  parent.appendChild(node);
  return node;
}

/* ---------- 渲染各板块 ---------- */
function renderCover(c) {
  const d = el('div', 'cover');
  const emblem = el('img', 'emblem'); emblem.src = 'assets/brand/image6.png'; emblem.alt = '苏迪服饰'; d.appendChild(emblem);
  makeEditable(d, c.brand.key, c.brand.v, { cls: 'brand' });
  const tag = el('div', 'tag'); makeEditable(tag, c.tagline.key, c.tagline.v, {}); d.appendChild(tag);
  if (c.taglineEn) { const en = el('div', 'tag'); en.style.opacity = '.7'; en.style.fontSize = '11px'; en.style.letterSpacing = '2px'; en.textContent = c.taglineEn; d.appendChild(en); }
  const title = el('div', 'title'); makeEditable(title, c.title.key, c.title.v, {}); d.appendChild(title);
  const sub = el('div', 'sub'); makeEditable(sub, c.subtitle.key, c.subtitle.v, {}); d.appendChild(sub);
  const meta = el('div', 'meta');
  [c.dept, c.date, c.scope, c.people].forEach(f => makeEditable(meta, f.key, f.v, { tag: 'div' }));
  d.appendChild(meta);
  return d;
}
function renderTOC(toc) {
  const d = el('div', 'toc');
  toc.forEach((it, i) => {
    const a = el('a', 'toc-item'); a.href = '#sec-' + i;
    const no = el('div', 'no'); no.textContent = it.no; a.appendChild(no);
    const right = el('div');
    makeEditable(right, it.title.key, it.title.v, { cls: 'tt' });
    makeEditable(right, it.desc.key, it.desc.v, { cls: 'dd' });
    a.appendChild(right); d.appendChild(a);
  });
  return d;
}
function renderSection(sec, idx) {
  const wrap = el('div'); wrap.id = 'sec-' + idx;
  const div = el('div', 'divider');
  const dno = el('div', 'dno'); dno.textContent = sec.no; div.appendChild(dno);
  makeEditable(div, sec.title.key, sec.title.v, { cls: 'dt' });
  makeEditable(div, sec.sub.key, sec.sub.v, { cls: 'ds' });
  wrap.appendChild(div);
  sec.blocks.forEach(b => wrap.appendChild(renderBlock(b)));
  if (sec.no === '01') wrap.appendChild(renderCollabMedia());
  return wrap;
}
function renderBlock(b) {
  switch (b.type) {
    case 'brandTable': return renderBrandTable(b);
    case 'compareTable': return renderCompareTable(b);
    case 'text': return renderText(b);
    case 'brandResearch': return renderBrandResearch(b);
    case 'productCard': return renderProductCard(b);
    case 'marketTable': return renderMarketTable(b);
    case 'craftDetail': return renderCraftDetail(b);
    case 'fabricDetail': return renderFabricDetail(b);
    case 'image': return renderImage(b);
    default: return el('div');
  }
}
function renderBrandTable(b) {
  const d = el('div', 'block brand-table');
  const head = el('div', 'block-head');
  makeEditable(head, b.brand.key, b.brand.v, { cls: 'block-brand' });
  makeEditable(head, b.people.key, b.people.v, { cls: 'block-people' });
  d.appendChild(head);

  b.categories.forEach(cat => d.appendChild(renderBrandCategory(cat)));

  const note = el('div', 'note'); makeEditable(note, b.note.key, b.note.v, {}); d.appendChild(note);
  return d;
}
function renderBrandCategory(cat) {
  const card = el('div', 'cat-card');
  const head = el('div', 'cat-head');
  makeEditable(head, cat.name.key, cat.name.v, { cls: 'cat-name' });
  const summary = el('span', 'cat-summary');
  head.appendChild(summary);
  card.appendChild(head);

  const grid = el('div', 'check-grid');
  cat.items.forEach(it => {
    const row = el('div', 'check-row');
    makeEditable(row, it.name.key, it.name.v, { cls: 'check-q' });
    makeEditable(row, it.phen.key, it.phen.v, { cls: 'check-r', decorate: phenDecorate, onInput: () => updateCatSummary(grid, summary) });
    grid.appendChild(row);
  });
  card.appendChild(grid);

  if (cat.cause) {
    const c = el('div', 'cat-note cause');
    const lbl = el('div', 'cat-note-lbl'); lbl.textContent = '原因分析'; c.appendChild(lbl);
    makeEditable(c, cat.cause.key, cat.cause.v, { cls: 'cat-note-body' });
    card.appendChild(c);
  }
  if (cat.action) {
    const a = el('div', 'cat-note action');
    const lbl = el('div', 'cat-note-lbl'); lbl.textContent = '改善对策'; a.appendChild(lbl);
    makeEditable(a, cat.action.key, cat.action.v, { cls: 'cat-note-body' });
    card.appendChild(a);
  }
  if (cat.owner || cat.dl) {
    const meta = el('div', 'cat-meta-row');
    if (cat.owner) {
      const kv = el('span', 'kv-item');
      const k = el('span', 'k'); k.textContent = '负责人'; kv.appendChild(k);
      makeEditable(kv, cat.owner.key, cat.owner.v, { cls: 'v' });
      meta.appendChild(kv);
    }
    if (cat.dl) {
      const kv = el('span', 'kv-item');
      const k = el('span', 'k'); k.textContent = '时间节点'; kv.appendChild(k);
      makeEditable(kv, cat.dl.key, cat.dl.v, { cls: 'v' });
      meta.appendChild(kv);
    }
    card.appendChild(meta);
  }
  updateCatSummary(grid, summary);
  return card;
}
function updateCatSummary(grid, summary) {
  const rows = grid.querySelectorAll('.check-r');
  let total = 0, bad = 0;
  rows.forEach(r => { const v = (r.textContent || '').trim(); if (v) { total++; if (v === '有') bad++; } });
  summary.classList.toggle('all-ok', bad === 0);
  summary.classList.toggle('has-issue', bad > 0);
  summary.textContent = bad === 0 ? `✓ 全部合格（共 ${total} 项）` : `⚠ ${bad} 项问题 · 共 ${total} 项`;
}
function renderCompareTable(b) {
  const d = el('div', 'block');
  const head = el('div', 'block-head');
  makeEditable(head, b.brand.key, b.brand.v, { cls: 'block-brand' });
  makeEditable(head, b.people.key, b.people.v, { cls: 'block-people' });
  d.appendChild(head);
  const intro = el('div', 'note'); intro.style.marginTop = '14px'; makeEditable(intro, b.intro.key, b.intro.v, {}); d.appendChild(intro);
  const tbl = el('table', 'tbl');
  tbl.innerHTML = '<thead><tr><th>调研问题</th><th>亮点/问题</th><th>可借鉴地方</th></tr></thead>';
  const tb = el('tbody');
  b.rows.forEach(r => {
    const tr = el('tr');
    makeEditable(tr, r.q.key, r.q.v, {});
    makeEditable(tr, r.hl.key, r.hl.v, {});
    makeEditable(tr, r.ref.key, r.ref.v, {});
    tb.appendChild(tr);
  });
  tbl.appendChild(tb); d.appendChild(tbl);
  return d;
}
function renderText(b) {
  const d = el('div', 'block text-block');
  makeEditable(d, b.heading.key, b.heading.v, { cls: 'heading' });
  b.paragraphs.forEach(p => makeEditable(d, p.key, p.v, { cls: 'para' }));
  return d;
}
function renderKV(parent, items) {
  const kv = el('div', 'kv');
  items.forEach(s => {
    const cell = el('div');
    makeEditable(cell, s.k.key, s.k.v, { cls: 'k' });
    makeEditable(cell, s.v.key, s.v.v, { cls: 'v' });
    kv.appendChild(cell);
  });
  parent.appendChild(kv);
}
function renderPoints(parent, items) {
  const pts = el('div', 'points');
  items.forEach(p => {
    const pd = el('div', 'point');
    makeEditable(pd, p.k.key, p.k.v, { cls: 'pk' });
    makeEditable(pd, p.v.key, p.v.v, { cls: 'pv' });
    pts.appendChild(pd);
  });
  parent.appendChild(pts);
}
function renderBrandResearch(b) {
  const d = el('div', 'block');
  const head = el('div', 'block-head');
  makeEditable(head, b.name.key, b.name.v, { cls: 'block-brand' });
  d.appendChild(head);
  renderKV(d, b.items);
  const pts = el('div', 'points');
  b.items.forEach(it => {
    const pd = el('div', 'point');
    makeEditable(pd, it.k.key, it.k.v, { cls: 'pk' });
    makeEditable(pd, it.v.key, it.v.v, { cls: 'pv' });
    pts.appendChild(pd);
  });
  d.appendChild(pts);
  return d;
}
function renderProductCard(b) {
  const d = el('div', 'block card');
  makeEditable(d, b.name.key, b.name.v, { cls: 'cname' });
  renderKV(d, b.specs);
  renderPoints(d, b.points);
  if (b.craft) {
    const cd = el('div', 'point'); cd.style.borderLeftColor = 'var(--accent)';
    makeEditable(cd, b.craft.title.key, b.craft.title.v, { cls: 'pk' });
    makeEditable(cd, b.craft.desc.key, b.craft.desc.v, { cls: 'pv' });
    d.appendChild(cd);
  }
  return d;
}
function renderMarketTable(b) {
  const d = el('div', 'block');
  const head = el('div', 'block-head');
  makeEditable(head, b.title.key, b.title.v, { cls: 'block-brand' });
  d.appendChild(head);
  const meta = el('div', 'note');
  [b.period, b.investigator, b.place].forEach(f => makeEditable(meta, f.key, f.v, { tag: 'div' }));
  d.appendChild(meta);
  const tbl = el('table', 'tbl');
  const thead = el('thead'); const hr = el('tr');
  b.columns.forEach(c => { const th = el('th'); th.textContent = c; hr.appendChild(th); });
  thead.appendChild(hr); tbl.appendChild(thead);
  const tb = el('tbody');
  b.rows.forEach(row => {
    const tr = el('tr');
    row.forEach(cell => makeEditable(tr, cell.key, cell.v, {}));
    tb.appendChild(tr);
  });
  tbl.appendChild(tb); d.appendChild(tbl);
  return d;
}
function renderCraftDetail(b) {
  const d = el('div', 'block');
  const head = el('div', 'block-head');
  makeEditable(head, b.name.key, b.name.v, { cls: 'block-brand' });
  d.appendChild(head);
  renderPoints(d, b.points);
  const cost = el('div', 'cat-meta'); makeEditable(cost, b.cost.key, b.cost.v, {}); d.appendChild(cost);
  const land = el('div', 'cat-meta'); makeEditable(land, b.landing.key, b.landing.v, {}); d.appendChild(land);
  return d;
}
function renderFabricDetail(b) {
  const d = el('div', 'block');
  const head = el('div', 'block-head');
  makeEditable(head, b.name.key, b.name.v, { cls: 'block-brand' });
  d.appendChild(head);
  renderKV(d, b.meta);
  const pros = el('div', 'point'); pros.style.borderLeftColor = 'var(--ok)';
  makeEditable(pros, b.name.key + ':pros', '面料优点', { cls: 'pk' });
  makeEditable(pros, b.pros.key, b.pros.v, { cls: 'pv' }); d.appendChild(pros);
  const cons = el('div', 'point'); cons.style.borderLeftColor = 'var(--accent)';
  makeEditable(cons, b.name.key + ':cons', '面料缺点', { cls: 'pk' });
  makeEditable(cons, b.cons.key, b.cons.v, { cls: 'pv' }); d.appendChild(cons);
  const ana = el('div', 'point');
  makeEditable(ana, b.name.key + ':ana', '综合分析', { cls: 'pk' });
  makeEditable(ana, b.analysis.key, b.analysis.v, { cls: 'pv' }); d.appendChild(ana);
  const land = el('div', 'cat-meta'); makeEditable(land, b.landing.key, b.landing.v, {}); d.appendChild(land);
  return d;
}
/* ---------- 媒体（图片/视频）渲染工具 ---------- */
function mediaKind(u) {
  const s = (u || '').trim();
  if (!s) return 'none';
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(s)) return 'video';
  if (/(?:youtube\.com|youtu\.be)/i.test(s)) return 'youtube';
  if (/(?:bilibili\.com|b23\.tv)/i.test(s)) return 'bilibili';
  return 'image';
}
function ytId(u) {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}
function biliId(u) {
  const m = u.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i);
  return m ? m[1] : '';
}
function renderMediaInto(box, url) {
  box.innerHTML = '';
  const u = (url || '').trim();
  const kind = mediaKind(u);
  if (kind === 'none') { const ph = el('div', 'ph'); ph.textContent = '图片 / 视频占位'; box.appendChild(ph); return; }
  if (kind === 'image') { const img = el('img'); img.src = u; img.alt = ''; box.appendChild(img); return; }
  if (kind === 'video') { const v = el('video'); v.src = u; v.controls = true; v.setAttribute('playsinline', ''); box.appendChild(v); return; }
  if (kind === 'youtube') {
    const id = ytId(u);
    if (id) { const f = el('iframe'); f.src = 'https://www.youtube.com/embed/' + id; f.setAttribute('allowfullscreen', ''); f.setAttribute('frameborder', '0'); box.appendChild(f); }
    else { const ph = el('div', 'ph'); ph.textContent = '视频链接无法解析'; box.appendChild(ph); }
    return;
  }
  if (kind === 'bilibili') {
    const id = biliId(u);
    if (id) { const f = el('iframe'); f.src = 'https://player.bilibili.com/player.html?bvid=' + id + '&page=1'; f.setAttribute('allowfullscreen', ''); f.setAttribute('frameborder', '0'); box.appendChild(f); }
    else { const ph = el('div', 'ph'); ph.textContent = 'B站链接需为 /video/BV... 形式'; box.appendChild(ph); }
    return;
  }
}
// 绑定一个 contentEditable 到任意 Y.Text（协同新增块用）
function bindText(node, yt, initial) {
  const setText = (v) => { node.textContent = v; };
  setText(yt.length ? yt.toString() : (initial || ''));
  node.addEventListener('input', () => { const val = node.innerText; yt.doc.transact(() => { yt.delete(0, yt.length); if (val) yt.insert(0, val); }); markSaving(); });
  yt.observe(() => { if (document.activeElement === node) return; const v = yt.toString(); if (node.innerText !== v) setText(v); });
}
function renderImage(b) {
  const d = el('div', 'block media-block');
  const frame = el('div', 'frame');
  const box = el('div', 'media-box'); frame.appendChild(box);
  const cap = el('div', 'ph'); makeEditable(cap, b.caption.key, b.caption.v, {}); frame.appendChild(cap);
  const urlKey = b.caption.key + ':url';
  const urlYt = getYText(texts, urlKey);
  const applyUrl = (v) => { renderMediaInto(box, v); cap.style.display = v ? 'none' : 'block'; };
  applyUrl(urlYt.toString());
  const urlWrap = el('div', 'img-url');
  const inp = el('input'); inp.placeholder = '粘贴图片或视频链接（可选），回车显示'; inp.value = urlYt.toString();
  inp.addEventListener('change', () => {
    const v = inp.value.trim();
    urlYt.doc.transact(() => { urlYt.delete(0, urlYt.length); if (v) urlYt.insert(0, v); });
    applyUrl(v); markSaving();
  });
  urlYt.observe(() => { const v = urlYt.toString(); if (document.activeElement !== inp && inp.value !== v) { inp.value = v; applyUrl(v); } });
  urlWrap.appendChild(inp);
  d.appendChild(frame); d.appendChild(urlWrap);
  return d;
}

/* ---------- 已合作板块：可协同新增的 图片/视频 块 ---------- */
function addMediaBlock() {
  ydoc.transact(() => {
    const m = new Y.Map();
    m.set('caption', new Y.Text());
    m.set('url', new Y.Text());
    mediaArr.push([m]);
  });
}
function renderCollabMediaItem(itemMap) {
  const capYt = itemMap.get('caption');
  const urlYt = itemMap.get('url');
  const block = el('div', 'block media-block added-media');
  const frame = el('div', 'frame');
  const box = el('div', 'media-box'); frame.appendChild(box);
  const applyUrl = (v) => renderMediaInto(box, v);
  applyUrl(urlYt ? urlYt.toString() : '');
  const cap = el('div', 'media-cap-txt'); cap.contentEditable = 'true'; cap.spellcheck = false;
  if (capYt) bindText(cap, capYt, '门店实拍 / 视频（点击编辑说明）');
  const bar = el('div', 'media-bar');
  const inp = el('input'); inp.placeholder = '粘贴图片或视频链接，回车显示'; inp.value = urlYt ? urlYt.toString() : '';
  inp.addEventListener('change', () => { const v = inp.value.trim(); if (urlYt) { urlYt.doc.transact(() => { urlYt.delete(0, urlYt.length); if (v) urlYt.insert(0, v); }); applyUrl(v); markSaving(); } });
  if (urlYt) urlYt.observe(() => { const v = urlYt.toString(); if (document.activeElement !== inp && inp.value !== v) { inp.value = v; applyUrl(v); } });
  const del = el('button', 'media-del'); del.type = 'button'; del.textContent = '删除';
  del.addEventListener('click', () => { let idx = -1; for (let i = 0; i < mediaArr.length; i++) { if (mediaArr.get(i) === itemMap) { idx = i; break; } } if (idx >= 0) mediaArr.delete(idx, 1); });
  bar.appendChild(inp); bar.appendChild(del);
  block.appendChild(frame); block.appendChild(cap); block.appendChild(bar);
  return block;
}
function renderCollabMedia() {
  const container = el('div', 'collab-media');
  const title = el('div', 'collab-media-title'); title.textContent = '图片 / 视频 · 可添加（多人实时同步）'; container.appendChild(title);
  const list = el('div', 'collab-media-list'); container.appendChild(list);
  const addBtn = el('button', 'add-media-btn'); addBtn.type = 'button'; addBtn.textContent = '＋ 添加图片 / 视频';
  addBtn.addEventListener('click', addMediaBlock);
  container.appendChild(addBtn);
  const rebuild = () => { list.innerHTML = ''; for (let i = 0; i < mediaArr.length; i++) { const it = mediaArr.get(i); if (it instanceof Y.Map) list.appendChild(renderCollabMediaItem(it)); } };
  mediaArr.observe(rebuild);
  rebuild();
  return container;
}

/* ---------- 在线状态 + 协作者高亮 ---------- */
const palette = ['#b23a2e', '#2f855a', '#2b6cb0', '#b7791f', '#805ad5', '#d53f8c', '#319795', '#dd6b20'];
function loadUser() {
  try {
    const u = JSON.parse(localStorage.getItem('sudi_user'));
    if (u && u.name) return u;
  } catch (e) {}
  let name = (prompt('请输入你的名字（用于协作标识）：', '') || '').trim();
  if (!name) name = '访客' + Math.floor(Math.random() * 900 + 100);
  const color = palette[Math.floor(Math.random() * palette.length)];
  const u = { name, color };
  try { localStorage.setItem('sudi_user', JSON.stringify(u)); } catch (e) {}
  return u;
}
const me = loadUser();
provider.awareness.setLocalStateField('user', me);
provider.awareness.setLocalStateField('editing', null);
function setEditing(key) { provider.awareness.setLocalStateField('editing', key); }
const presenceEl = document.getElementById('presence');
provider.awareness.on('change', renderPresence);
function renderPresence() {
  const states = provider.awareness.getStates();
  document.querySelectorAll('.remote-editing').forEach(e => { e.classList.remove('remote-editing'); e.style.removeProperty('--rc'); });
  const chips = [];
  states.forEach((s, id) => {
    const u = s.user; if (!u) return;
    const isMe = id === provider.awareness.clientID;
    chips.push(`<span class="chip" style="--cc:${u.color}">${escapeHtml(u.name)}${isMe ? '（我）' : ''}</span>`);
    if (!isMe && s.editing && elByKey[s.editing]) {
      const e = elByKey[s.editing]; e.classList.add('remote-editing'); e.style.setProperty('--rc', u.color);
    }
  });
  presenceEl.innerHTML = chips.join('');
}

/* ---------- 组装页面（同步后再渲染，避免本地空文本覆盖远端已编辑内容） ---------- */
const appEl = document.getElementById('app');
appEl.innerHTML = '<div style="padding:90px;text-align:center;color:#8a8780">正在连接协作服务…</div>';

let rendered = false;
function doSeedIfEmpty() {
  if (texts.size === 0) {
    ydoc.transact(() => {
      seed.forEach(({ key, value }) => {
        const yt = getYText(texts, key);
        if (yt.length === 0) yt.insert(0, value);
      });
    });
  }
}
function renderAll() {
  if (rendered) return;
  const sheet = el('div', 'sheet'); sheet.id = 'top';
  sheet.appendChild(renderCover(model.cover));
  sheet.appendChild(renderTOC(model.toc));
  model.sections.forEach((s, i) => sheet.appendChild(renderSection(s, i)));
  appEl.innerHTML = '';
  appEl.appendChild(sheet);

  const nav = document.getElementById('nav');
  const home = el('a'); home.href = '#top'; home.textContent = '封面'; nav.appendChild(home);
  model.sections.forEach((s, i) => { const a = el('a'); a.href = '#sec-' + i; a.textContent = s.no + ' ' + s.title.v; nav.appendChild(a); });

  renderPresence();
  rendered = true;
}
provider.on('sync', (isSynced) => {
  if (isSynced) { doSeedIfEmpty(); renderAll(); }
  markSaved();
});
// 兜底：若 5s 内未连上协作服务，也先渲染（使用本地模型初始值，可离线查看）
setTimeout(() => { if (!rendered) { doSeedIfEmpty(); renderAll(); } }, 5000);

/* ---------- 保存状态 ---------- */
const ss = document.getElementById('saveState');
let ssTimer = null;
function markSaving() { ss.textContent = '同步中…'; ss.className = 'save-state saving'; clearTimeout(ssTimer); ssTimer = setTimeout(markSaved, 1000); }
function markSaved() { ss.textContent = '已连接 · 已保存'; ss.className = 'save-state saved'; }
markSaved();

/* ---------- 导出 / 导入备份（云端临时硬盘重启也不丢） ---------- */
function exportBackup() {
  try {
    const update = Y.encodeStateAsUpdate(ydoc);
    const blob = new Blob([update], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url; a.download = `苏迪市调报告-备份-${stamp}.ybin`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    ss.textContent = '已导出备份文件'; ss.className = 'save-state saved';
  } catch (e) {
    alert('导出失败：' + e.message);
  }
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const bytes = new Uint8Array(reader.result);
      if (file.name.endsWith('.json')) {
        // 兼容「整份文本」JSON 导出：用 key->value 重建
        const obj = JSON.parse(new TextDecoder().decode(bytes));
        ydoc.transact(() => {
          for (const k in obj) {
            const yt = getYText(texts, k);
            yt.delete(0, yt.length);
            if (obj[k]) yt.insert(0, obj[k]);
          }
        });
      } else {
        Y.applyUpdate(ydoc, bytes);
      }
      if (!rendered) { doSeedIfEmpty(); renderAll(); }
      ss.textContent = '已从备份恢复'; ss.className = 'save-state saved';
      setTimeout(markSaved, 1500);
    } catch (e) {
      alert('导入失败：' + e.message);
    }
  };
  reader.readAsArrayBuffer(file);
}
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const fileImport = document.getElementById('fileImport');
if (btnExport) btnExport.addEventListener('click', exportBackup);
if (btnImport && fileImport) {
  btnImport.addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importBackup(f);
    e.target.value = '';
  });
}
