// pictosense/draw.js
// ===================== 設定（ここだけ触ればOK） =====================
const SOCKET_EVENT = 'stroke';      // ← 'stroke' がダメなら 'line' → 'drawLine' → 'draw' の順で
const PAYLOAD_MODE = 'points';      // 'points' | 'xyxy' | 'path'
const LINE_WIDTH   = 8;             // 送信ストロークの太さ
const LINE_COLOR   = '#000';        // 送信ストロークの色
const OVERSCALE    = 1;             // オーバーレイの拡大倍率（2,3,4 など）

// ===================== エントリ（ブクマ経由で呼ぶ） =====================
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

// ===================== ユーティリティ =====================
function blobToDataURL(blob){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload  = ev => res(ev.target.result);
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

// ===================== 送信用（socket直送） =====================
function buildPayload(rect, base, overlay){
  // overlay の CSS座標 → 実キャンバス座標へ変換
  const cx = base.width  / overlay.clientWidth;
  const cy = base.height / overlay.clientHeight;

  if (PAYLOAD_MODE === 'xyxy') {
    return {
      x1: Math.round(rect.x * cx),
      y1: Math.round(rect.y * cy),
      x2: Math.round((rect.x + rect.w) * cx),
      y2: Math.round(rect.y * cy),
      size: LINE_WIDTH,
      color: LINE_COLOR
    };
  }
  if (PAYLOAD_MODE === 'path') {
    return {
      path: [
        { x: Math.round(rect.x * cx),           y: Math.round(rect.y * cy) },
        { x: Math.round((rect.x + rect.w) * cx),y: Math.round(rect.y * cy) }
      ],
      width: LINE_WIDTH,
      color: LINE_COLOR
    };
  }
  // 'points'（デフォルト）
  return {
    points: [
      [ Math.round(rect.x * cx),            Math.round(rect.y * cy) ],
      [ Math.round((rect.x + rect.w) * cx), Math.round(rect.y * cy) ]
    ],
    width: LINE_WIDTH,
    color: LINE_COLOR
  };
}

function trySocketShare(rect, base, overlay){
  try{
    if (window.socket && typeof socket.emit === 'function') {
      const payload = buildPayload(rect, base, overlay);
      socket.emit(SOCKET_EVENT, payload);
      console.log('[share] emit:', SOCKET_EVENT, payload);
      return true;
    }
  }catch(e){
    console.log('[share] socket送信失敗', e);
  }
  return false;
}

// ===================== メイン：オーバーレイ描画＋共有 =====================
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

    // オーバー拡大（ズーム風）
    const scaleDisplay = baseFit * OVERSCALE;

    const w = img.width  * scaleDisplay;
    const h = img.height * scaleDisplay;
    const x = (cssW - w) / 2;
    const y = (cssH - h) / 2;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.drawImage(img, x, y, w, h);  // はみ出しは自然にクリップ

    // 共有（socket直送。サイトの描画イベントに合わせる）
    const sent = trySocketShare({ x, y, w, h }, base, overlay);
    if (!sent) {
      console.log('[share] socket未使用/未検出（ローカル表示のみ）');
    }
  };
  img.onerror = ()=>alert('画像の読み込みに失敗しました');
  img.src = dataURL;
}
