// ブックマーク側で s.onload=()=>startUpload(); を呼んでね
window.startUpload = function () {
  const pick = document.createElement('input');
  pick.type = 'file';
  pick.accept = 'image/*';
  pick.onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    const isHEIC = (f.type === 'image/heic') || /\.heic$/i.test(f.name);
    if (isHEIC) {
      // 必要な時だけ heic2any をロード
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => heic2any({ blob: f, toType: 'image/jpeg' })
        .then((out) => blobToDataURL(out).then(drawToCanvas))
        .catch(() => alert('HEIC変換に失敗しました'));
      document.body.appendChild(s);
    } else {
      const r = new FileReader();
      r.onload = (ev) => drawToCanvas(ev.target.result);
      r.readAsDataURL(f);
    }
  };
  pick.click();
};

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (ev) => resolve(ev.target.result);
    r.readAsDataURL(blob);
  });
}

// 画面上で実際に見えているキャンバスを優先して取得
function pickCanvas() {
  // 画面中央の要素から最寄りのcanvasを探す（最も「見えている」可能性が高い）
  let center = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  let c = center && (center.tagName === 'CANVAS' ? center : (center.closest ? center.closest('canvas') : null));

  // それでも見つからない/サイズが小さい場合は「表示中(canvas.getBoundingClientRect>0)」の最大を選ぶ
  const visibles = Array.from(document.querySelectorAll('canvas')).filter((cv) => {
    const r = cv.getBoundingClientRect();
    const st = getComputedStyle(cv);
    return r.width > 50 && r.height > 50 && st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0';
  });
  if (!c && visibles.length) {
    visibles.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    });
    c = visibles[0];
  }
  return c || null;
}

function drawToCanvas(src) {
  const img = new Image();
  img.onload = () => {
    const c = pickCanvas();
    if (!c) return alert('キャンバスが見つかりません');

    const ctx = c.getContext('2d');

    // 内部解像度と見た目サイズ
    const rect = c.getBoundingClientRect();
    const toInternalX = c.width / rect.width || 1;   // 例: 1125/375 = 3
    const toInternalY = c.height / rect.height || 1; // 例: 1125/375 = 3

    // 見た目のキャンバスに収まる倍率（拡大しない）
    let scaleDisplay = Math.min(rect.width / img.width, rect.height / img.height, 1);

    // まだ大きく見える場合はここで手動縮小（必要に応じて 0.33 → 0.25 → 0.2 に下げる）
    const MANUAL_SHRINK = 0.33;
    scaleDisplay *= MANUAL_SHRINK;

    // 内部描画サイズへ変換
    const w = img.width * scaleDisplay * toInternalX;
    const h = img.height * scaleDisplay * toInternalY;
    const x = (c.width - w) / 2;
    const y = (c.height - h) / 2;

    // 描画
    ctx.save();
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  };
  img.onerror = () => alert('画像の読み込みに失敗しました');
  img.src = src;
}
