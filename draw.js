function drawToCanvas(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // 画像をキャンバス内に収める（縦横比を維持）
    let scaleW=c.width/img.width;
    let scaleH=c.height/img.height;
    let scale=Math.min(scaleW,scaleH,1); // 1を超えない（拡大禁止）

    let w=img.width*scale;
    let h=img.height*scale;
    let x=(c.width-w)/2;
    let y=(c.height-h)/2;

    // デバッグ表示
    console.log(`canvas=${c.width}x${c.height}, img=${img.width}x${img.height}, draw=${w}x${h}`);

    ctx.drawImage(img,x,y,w,h);
  };
  img.src=src;
}
