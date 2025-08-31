function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // キャンバスの内部サイズ（属性値）と見た目サイズ（CSS）
    let rect = c.getBoundingClientRect();
    let ratio = rect.width / c.width; 
    // 例: 内部1125, 表示375 → ratio=0.333

    // 縮小率（縦横比維持）
    let scale = Math.min(c.width/img.width, c.height/img.height);

    // 内部サイズに描画するので ratio は掛けない
    let w = img.width * scale;
    let h = img.height * scale;
    let x = (c.width - w)/2;
    let y = (c.height - h)/2;

    // デバッグ表示
    alert(`canvas=${c.width}x${c.height}, rect=${Math.round(rect.width)}x${Math.round(rect.height)}, img=${img.width}x${img.height}, draw=${w}x${h}`);

    ctx.drawImage(img, x, y, w, h);
  };
  img.src = src;
}
