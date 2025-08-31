// ブックマーク側： s.onload=()=>startUpload();
window.startUpload = function () {
  const pick = document.createElement('input');
  pick.type = 'file';
  pick.accept = 'image/*';
  pick.onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    // HEIC は変換してから進める
    const isHEIC = (f.type === "image/heic") || /\.heic$/i.test(f.name);
    if (isHEIC) {
      if (!window.heic2any) {
        const s = document.createElement('script');
        s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
        s.onload = () => convertHEIC(f);
        document.body.appendChild(s);
      } else {
        convertHEIC(f);
      }
    } else {
      const r = new FileReader();
      r.onload = ev => drawToCanvas(ev.target.result);
      r.readAsDataURL(f);
    }
  };
  pick.click();

  function convertHEIC(file) {
    heic2any({ blob: file, toType: "image/jpeg" })
      .then(out => {
        const r = new FileReader();
        r.onload = ev => drawToCanvas(ev.target.result);
        r.readAsDataURL(out);
      })
      .catch(() => alert("HEIC変換に失敗しました"));
  }
};

function drawToCanvas(src) {
  const img = new Image();
  img.onload = () => {
    // 一番大きい canvas を使う（ピクトセンスは複数あることがある）
    const list = Array.from(document.querySelectorAll('canvas'));
    if (!list.length) return alert("キャンバスが見つかりません");
    list.sort((a,b) => (b.width*b.height) - (a.width*a.height));
    const c = list[0];
    const ctx = c.getContext('2d');

    // 内部サイズと表示サイズ
    const rect = c.getBoundingClientRect();
    const toInternalX = c.width  / rect.width;   // 例: 1125/375 = 3
    const toInternalY = c.height / rect.height;  // 同上

    // 見た目のキャンバスにピッタリ収まる倍率（拡大はしない）
    let scaleDisplay = Math.min(rect.width / img.width, rect.height / img.height, 1);

    // さらに小さく見せたいときはここを調整（例: 0.33 = 1/3）
    const MANUAL_SHRINK = 0.33;  // ←大きすぎるなら 0.25 や 0.2 に下げてOK
    scaleDisplay *= MANUAL_SHRINK;

    // 内部描画サイズへ変換
    const w = img.width  * scaleDisplay * toInternalX;
    const h = img.height * scaleDisplay * toInternalY;
    const x = (c.width  - w) / 2;
    const y = (c.height - h) / 2;

    ctx.clearRect(0,0,c.width,c.height);
    ctx.drawImage(img, x, y, w, h);
  };
  img.src = src;
}
