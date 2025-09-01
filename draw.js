(function(){
  const url = window.__PX_DATAURL;
  if (!url) return alert("画像データが見つかりません");

  // キャンバスを探す
  const pickCanvas = () => {
    const list = Array.from(document.querySelectorAll('canvas')).map(c=>{
      const r=c.getBoundingClientRect();
      return {c, area:r.width*r.height};
    }).filter(x=>x.area>2500).sort((a,b)=>b.area-a.area);
    return list[0]?.c || null;
  };

  const base = pickCanvas();
  if (!base) return alert("キャンバスが見つかりません");

  const img = new Image();
  img.onload = () => {
    const ctx = base.getContext('2d');

    // キャンバスサイズにフィットさせる
    const cw = base.width, ch = base.height;
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = Math.round(img.naturalWidth * s);
    const h = Math.round(img.naturalHeight * s);
    const x = Math.round((cw - w) / 2);
    const y = Math.round((ch - h) / 2);

    // ローカル描画
    ctx.drawImage(img, x, y, w, h);

    // ===== ソケット共有 =====
    try {
      if (window.socket && typeof socket.emit === "function") {
        // ピクトセンスの実装に合わせてイベント名を調整
        // 候補: "draw", "stroke", "line"
        socket.emit("draw", {
          type: "image",
          data: url,   // DataURLごと送る（サイト側が対応していれば表示される）
          x, y, w, h
        });
        console.log("[pictosense] socket.emit で共有しました");
      } else {
        console.warn("[pictosense] socket が見つかりませんでした");
      }
    } catch(e){
      console.error("[pictosense] 共有に失敗:", e);
    }
  };
  img.onerror = () => alert("画像読み込みに失敗しました");
  img.src = url;
})();
