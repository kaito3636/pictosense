(function(){
  const url = window.__PX_DATAURL;
  if (!url) return alert("画像データが見つかりません");

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
    ctx.drawImage(img, 0, 0, base.width, base.height);

    // socketで共有（イベント名はサイトに合わせて調整）
    try {
      if (window.socket && socket.emit) {
        socket.emit("draw", { type:"image", data:url });
      }
    } catch(e) {
      console.log("共有失敗:", e);
    }
  };
  img.src = url;
})();
