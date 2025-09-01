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
    const cw=base.width,ch=base.height;
    const s=Math.min(cw/img.naturalWidth,ch/img.naturalHeight);
    const w=Math.round(img.naturalWidth*s),h=Math.round(img.naturalHeight*s);
    const x=Math.round((cw-w)/2),y=Math.round((ch-h)/2);
    ctx.drawImage(img,x,y,w,h);

    // socket共有（イベント名は実装に合わせて変更）
    try{
      if(window.socket && typeof socket.emit==="function"){
        socket.emit("draw",{type:"image",data:url,x,y,w,h});
        console.log("[pictosense] 共有送信しました");
      }else{
        console.warn("[pictosense] socket未検出");
      }
    }catch(e){ console.error("共有失敗:",e); }
  };
  img.onerror=()=>alert("画像の読み込みに失敗しました");
  img.src=url;
})();
