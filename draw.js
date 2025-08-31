function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // キャンバスの内部サイズと表示サイズを取得
    let rect = c.getBoundingClientRect();
    let scaleFix = rect.width / c.width; // ←補正係数（例: 375/1125 = 0.333）

    // 縮小率（縦横比維持）
    let scale = Math.min(c.width/img.width, c.height/img.height);

    // 補正をかけて「見た目に合うサイズ」にする
    let w = img.width * scale * scaleFix;
    let h = img.height * scale * scaleFix;
    let x = (c.width - w)/2;
    let y = (c.height - h)/2;

    ctx.drawImage(img, x, y, w, h);
  };
  img.src = src;
}
