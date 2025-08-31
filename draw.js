function drawToCanvas(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // デバッグ表示（サイズ確認）
    alert(
      `canvas=${c.width}x${c.height}\n` +
      `image=${img.width}x${img.height}`
    );

    // スケール計算
    let scaleW=c.width/img.width;
    let scaleH=c.height/img.height;
    let scale=Math.min(scaleW,scaleH,1);

    let w=img.width*scale;
    let h=img.height*scale;
    let x=(c.width-w)/2;
    let y=(c.height-h)/2;

    alert(`scale=${scale}\ndraw=${w}x${h} at (${x},${y})`);

    ctx.drawImage(img,x,y,w,h);
  };
  img.src=src;
}
