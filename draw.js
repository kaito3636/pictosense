function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // 基本の縮小率（キャンバスに収まるよう計算）
    let scale=Math.min(c.width/img.width, c.height/img.height);

    // ★さらに手動で縮小（例：1/4にするなら 0.25）
    let manualShrink=0.25;  

    let w=img.width*scale*manualShrink;
    let h=img.height*scale*manualShrink;
    let x=(c.width-w)/2;
    let y=(c.height-h)/2;

    ctx.drawImage(img,x,y,w,h);
  };
  img.src=src;
}
