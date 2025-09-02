// pictosense/draw.js（送信側＆受信側補助まで一体型）

// ========== ユーティリティ ==========
function blobToDataURL(blob){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ev => res(ev.target.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function pickVisibleCanvas(){
  const cs = Array.from(document.querySelectorAll('canvas'));
  const visibles = cs.map(c=>{
    const r=c.getBoundingClientRect();
    return {c, area: Math.max(0,r.width)*Math.max(0,r.height), r};
  }).filter(x=>x.area>50*50);
  if(!visibles.length) return null;
  visibles.sort((a,b)=>b.area-a.area);
  return visibles[0].c;
}

function ensureOverlay(base){
  let overlay = document.getElementById('px_overlay_canvas');
  const position = () => {
    const r = base.getBoundingClientRect();
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '2147483647';
    overlay.style.left   = (r.left + window.scrollX) + 'px';
    overlay.style.top    = (r.top  + window.scrollY) + 'px';
    overlay.style.width  = r.width + 'px';
    overlay.style.height = r.height + 'px';
    const dpr = window.devicePixelRatio || 1;
    overlay.width  = Math.max(1, Math.round(r.width  * dpr));
    overlay.height = Math.max(1, Math.round(r.height * dpr));
  };
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'px_overlay_canvas';
    document.body.appendChild(overlay);
    position();
    window.addEventListener('scroll', position, {passive:true});
    window.addEventListener('resize', position);
  } else {
    position();
  }
  return overlay;
}

async function compressDataURL(dataURL, quality=0.7, maxSide=1600){
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataURL)) return dataURL;
  const img = new Image();
  await new Promise((r, j)=>{ img.onload=r; img.onerror=j; img.src=dataURL; });
  let w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  if (scale < 1) { w = Math.round(w*scale); h = Math.round(h*scale); }
  const c = document.createElement('canvas');
  c.width  = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  const out = c.toDataURL('image/jpeg', quality);
  console.log('[share] size:', Math.round(out.length/1024), 'KB');
  return out;
}

function emitWithAck(ev, payload, timeoutMs=2000){
  return new Promise((resolve) => {
    try {
      if (!window.socket || typeof socket.emit !== 'function' || !socket.connected) {
        console.warn('[share] socket not connected');
        return resolve(false);
      }
      if (typeof socket.timeout === 'function') {
        socket.timeout(timeoutMs).emit(ev, payload, (err, ok) => {
          if (err) console.warn('[share] emit timeout/err:', err);
          resolve(!err && (ok === undefined || ok === true));
        });
      } else if (typeof socket.emitWithAck === 'function') {
        const p = socket.emitWithAck(ev, payload);
        let done = false;
        const t = setTimeout(()=>{ if(!done) resolve(false); }, timeoutMs);
        p.then(()=>{ done=true; clearTimeout(t); resolve(true); })
         .catch((e)=>{ console.warn(e); done=true; clearTimeout(t); resolve(false); });
      } else {
        socket.emit(ev, payload);
        resolve(false); // 成功判定できないのでフォールバック側へ
      }
    } catch (e) {
      console.warn(e);
      resolve(false);
    }
  });
}

async function trySocketShare(dataURL, overlay, base){
  try{
    if (!window.socket || !socket.connected) return false;

    // overlayの位置を base に対して正規化
    const rect = overlay.getBoundingClientRect();
    const baseRect = base.getBoundingClientRect();
    const norm = {
      ox: 0, oy: 0, ow: 1, oh: 1,
      bx: (rect.left  - baseRect.left)  / baseRect.width,
      by: (rect.top   - baseRect.top)   / baseRect.height,
      bw:  rect.width / baseRect.width,
      bh:  rect.height/ baseRect.height
    };

    const tiny = await compressDataURL(dataURL, 0.65, 1600);
    const payload = { type: 'image', data: tiny, rect: norm };

    // ★サーバと合わせたイベント名（送信は image:send に固定）
    const ok = await emitWithAck('image:send', payload, 2000);
    console.log('[share] server ack:', ok);
    return ok;
  }catch(e){
    console.warn(e);
  }
  return false;
}

// ========== フォールバック：擬似描画 ==========
function emulateStrokeFromOverlay(overlay, base, opt){
  const step = Math.max(2, opt?.step ?? 8);
  const thr  = Math.min(255, Math.max(0, opt?.threshold ?? 160));
  const maxRuns = opt?.maxRuns ?? 3000;

  const cssW = overlay.clientWidth, cssH = overlay.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  const tmp = document.createElement('canvas');
  tmp.width  = Math.max(1, Math.round(cssW * dpr));
  tmp.height = Math.max(1, Math.round(cssH * dpr));
  const tctx = tmp.getContext('2d');
  tctx.drawImage(overlay, 0, 0, tmp.width, tmp.height);
  const img = tctx.getImageData(0, 0, tmp.width, tmp.height).data;

  let runs = 0;
  for (let y = 0; y < cssH && runs < maxRuns; y += step) {
    let drawing = false, x0 = 0;
    for (let x = 0; x < cssW; x += step) {
      const px = Math.min(tmp.width -1, Math.floor(x * dpr));
      const py = Math.min(tmp.height-1, Math.floor(y * dpr));
      const o  = (py * tmp.width + px) * 4;
      const a  = img[o+3];
      const isInk = a >= thr;

      if (isInk && !drawing) { drawing = true; x0 = x; }
      if ((!isInk && drawing) || (isInk && x + step >= cssW)) {
        const x1 = isInk ? x + step : x;
        dispatchStrokeRun(base, x0, y, x1, y, step);
        runs++;
        if (runs >= maxRuns) break;
        drawing = false;
      }
    }
  }
  console.log(`[share] emulateStroke runs=${runs} step=${step} thr=${thr}`);
}

function dispatchStrokeRun(canvas, x0, y0, x1, y1, step){
  const rect = canvas.getBoundingClientRect();
  const toClient = (cx, cy) => ({
    clientX: rect.left + cx * (rect.width  / canvas.clientWidth),
    clientY: rect.top  + cy * (rect.height / canvas.clientHeight),
    bubbles: true, cancelable: true
  });
  const makeEvt = (type, cx, cy) => {
    try { return new PointerEvent(type, toClient(cx, cy)); }
    catch { return new MouseEvent(type.replace('pointer','mouse'), toClient(cx, cy)); }
  };
  const down = (cx, cy) => canvas.dispatchEvent(makeEvt('pointerdown', cx, cy));
  const move = (cx, cy) => canvas.dispatchEvent(makeEvt('pointermove', cx, cy));
  const up   = (cx, cy) => canvas.dispatchEvent(makeEvt('pointerup',   cx, cy));

  down(x0, y0);
  const len = Math.max(1, Math.floor((x1 - x0) / step));
  for (let i = 1; i <= len; i++) move(x0 + i*step, y0);
  up(x1, y1);
}

// ========== メイン：オーバーレイ描画＋共有 ==========
function showOnOverlay(dataURL){
  const base = pickVisibleCanvas();
  if (!base) return alert('キャンバスが見つかりません');

  const overlay = ensureOverlay(base);
  const ctx = overlay.getContext('2d');

  const img = new Image();
  img.onload = ()=>{
    const cssW = overlay.clientWidth;
    const cssH = overlay.clientHeight;
    const baseFit = Math.min(cssW / img.width, cssH / img.height);
    const OVERSCALE = 1;
    const scaleDisplay = baseFit * OVERSCALE;
    const w = img.width  * scaleDisplay;
    const h = img.height * scaleDisplay;
    const x = (cssW - w) / 2;
    const y = (cssH - h) / 2;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.drawImage(img, x, y, w, h);

    (async () => {
      const ok = await trySocketShare(overlay.toDataURL('image/png'), overlay, base);
      if (!ok) {
        emulateStrokeFromOverlay(overlay, base, { step: 8, threshold: 160, maxRuns: 3000 });
      }
    })();
  };
  img.onerror = ()=>alert('画像の読み込みに失敗しました');
  img.src = dataURL;
}

// ========== エントリ ==========
window.startUpload = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const isHEIC = (file.type === 'image/heic') || /\.heic$/i.test(file.name) || file.type === 'application/octet-stream';
    if (isHEIC) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => heic2any({ blob: file, toType: 'image/jpeg' })
        .then(out => blobToDataURL(out).then(showOnOverlay))
        .catch(() => alert('HEIC変換に失敗しました'));
      document.body.appendChild(s);
    } else {
      const r = new FileReader();
      r.onload = ev => showOnOverlay(ev.target.result);
      r.readAsDataURL(file);
    }
  };
  input.click();
};
