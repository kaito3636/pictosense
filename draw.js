function showOnOverlay(dataURL){
  const base = pickVisibleCanvas();
  if (!base) return alert('キャンバスが見つかりません');

  const img = new Image();
  img.onload = ()=>{
    const ctx = base.getContext('2d');

    // キャンバスサイズに合わせる
    const w = base.width;
    const h = base.height;

    // ローカルに描画（見た目）
    ctx.drawImage(img, 0, 0, w, h);

    // ====== ここから共有処理 ======
    try {
      // ピクセルを分解して送るのは重いので、サンプルでは小さな点に変換
      const STEP = 10; // ドット間隔（調整可）
      for (let y = 0; y < h; y += STEP) {
        for (let x = 0; x < w; x += STEP) {
          // socket.emitでサーバーに「点を描いた」と送信
          socket.emit("draw", {
            x: x,
            y: y,
            color: "#000000", // とりあえず黒
            size: 2
          });
        }
      }
      console.log("画像データをsocket.io経由で送信しました");
    } catch(e) {
      console.error("socket.io送信に失敗:", e);
      alert("共有に失敗しました（socket未検出かも）");
    }
  };
  img.onerror = ()=>alert('画像の読み込みに失敗しました');
  img.src = dataURL;
}
