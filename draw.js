// pictosense/draw.js
// ========== エントリ（ブクマから onload 後に呼ばれる） ==========
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

// ========== 共有（socket優先→擬似描画） ==========
function trySocketShare(dataURL, rect){
  try{
    if (window.socket && typeof socket.emit === 'function') {
      const payload = { type: 'image', data: dataURL, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
      const events = ['line']; // ★実装に合わせて先頭を正解に
      for (const ev of events) {
        try { socket.emit(ev, payload); console.log('[share] socket.emit:', ev); return true; } catch {}
      }
    }
  }catch{}
  return false;
}

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
      const a  = img[o+3]; // alpha
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

    // 収まる倍率（上限クリップしない）
    const baseFit = Math.min(cssW / img.width, cssH / img.height);

    // ★オーバー拡大（ズーム演出）：2,3,4 など好みで
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
    ctx.drawImage(img, x, y, w, h);  // はみ出しはオーバーレイ外で自然にクリップ

    // === 共有（socket優先→擬似描画） ===
    const rect = { x, y, w, h };
    const ok = trySocketShare(dataURL, rect);
    if (!ok) {
      emulateStrokeFromOverlay(overlay, base, { step: 8, threshold: 160, maxRuns: 3000 });
    }
  };
  img.onerror = ()=>alert('画像の読み込みに失敗しました');
  img.src = dataURL;
}
