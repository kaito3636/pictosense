// ブックマーク側：
// javascript:(()=>{let s=document.createElement('script');s.src='https://kaito3636.github.io/pictosense/draw.js?'+Date.now();s.onload=()=>startUpload();document.body.appendChild(s)})();
window.startUpload = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const isHEIC = (file.type === 'image/heic') || /\.heic$/i.test(file.name);
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

function blobToDataURL(blob){
  return new Promise(res=>{
    const r = new FileReader();
    r.onload = ev => res(ev.target.result);
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

function showOnOverlay(dataURL){
  const base = pickVisibleCanvas();
  if (!base) return alert('キャンバスが見つかりません');

  const ensureOverlay = () => {
    let overlay = document.getElementById('px_overlay_canvas');
    const position = () => {
      const r = base.getBoundingClientRect();
      overlay.style.position = 'absolute';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '999999';
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
  };

  const overlay = ensureOverlay();
  const ctx = overlay.getContext('2d');

  const img = new Image();
  img.onload = ()=>{
    const cssW = overlay.clientWidth;
    const cssH = overlay.clientHeight;

    // まずは「収まる」基準倍率（※上限1でクリップしない）
    const baseFit = Math.min(cssW / img.width, cssH / img.height);

    // ★オーバー拡大を許可：3倍（はみ出しは自然にクリップ）
    const OVERSCALE = 3; // ← ここを 2,3,4… に調整
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
  };
  img.onerror = ()=>alert('画像の読み込みに失敗しました');
  img.src = dataURL;
}
