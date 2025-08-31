// ブックマーク側は s.onload=()=>startUpload();
window.startUpload = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const isHEIC = (file.type === 'image/heic') || /\.heic$/i.test(file.name);
    if (isHEIC) {
      // 必要時のみ heic2any をロードしてJPEG化
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
    const r=new FileReader();
    r.onload = ev => res(ev.target.result);
    r.readAsDataURL(blob);
  });
}

// 画面で一番見えているキャンバスを拾う
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

// 画像をゲームキャンバスの上に重ねた専用キャンバスに描く
function showOnOverlay(dataURL){
  const base = pickVisibleCanvas();
  if (!base) return alert('キャンバスが見つかりません');

  const rect = base.getBoundingClientRect();
  // 既存のオーバーレイを再利用 or 作成
  let overlay = document.getElementById('px_overlay_canvas');
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'px_overlay_canvas';
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none'; // 描画の邪魔をしない
    overlay.style.zIndex = '999999';      // 最前面
    document.body.appendChild(overlay);
    // 画面スクロール/リサイズに追従
    const position = ()=>{
      const r=base.getBoundingClientRect();
      overlay.style.left = (r.left + window.scrollX) + 'px';
      overlay.style.top  = (r.top  + window.scrollY) + 'px';
      overlay.style.width  = r.width + 'px';
      overlay.style.height = r.height + 'px';
      // 内部解像度をCSSに合わせて高DPI対応
      const dpr = window.devicePixelRatio || 1;
      overlay.width  = Math.max(1, Math.round(r.width  * dpr));
      overlay.height = Math.max(1, Math.round(r.height * dpr));
    };
    position();
    window.addEventListener('scroll', position, {passive:true});
    window.addEventListener('resize', position);
  } else {
    // 位置更新
    const r=base.getBoundingClientRect();
    overlay.style.left = (r.left + window.scrollX) + 'px';
    overlay.style.top  = (r.top  + window.scrollY) + 'px';
    overlay.style.width  = r.width + 'px';
    overlay.style.height = r.height + 'px';
    const dpr = window.devicePixelRatio || 1;
    overlay.width  = Math.max(1, Math.round(r.width  * dpr));
    overlay.height = Math.max(1, Math.round(r.height * dpr));
  }

  const ctx = overlay.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1,0,0,1,0,0);       // リセット
  ctx.scale(dpr, dpr);                  // CSSピクセル基準で描けるように

  // 背景は触らない（透明）→ ゲームの絵の上に重ねて見える
  // ctx.clearRect(0,0,overlay.width,overlay.height); // 透過のまま使う

  const img = new Image();
  img.onload = ()=>{
    const cssW = overlay.clientWidth;
    const cssH = overlay.clientHeight;

    // 見た目のキャンバスにフィット（拡大しない）
    let scale = Math.min(cssW / img.width, cssH / img.height, 1);

    // まだ大きく見えるなら 0.25 / 0.2 などに下げてOK
    const MANUAL_SHRINK = 0.33;
    scale *= MANUAL_SHRINK;

    const w = img.width  * scale;
    const h = img.height * scale;
    const x = (cssW - w) / 2;
    const y = (cssH - h) / 2;

    ctx.clearRect(0,0,cssW,cssH);
    ctx.drawImage(img, x, y, w, h);
  };
  img.onerror = ()=>alert('画像の読み込みに失敗しました');
  img.src = dataURL;
}
