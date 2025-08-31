function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let cvs=[...document.querySelectorAll('canvas')];
    cvs.sort((a,b)=>(b.width*b.height)-(a.width*a.height));
    let c=cvs[0];
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // 通常のスケール
    let scale=Math.min(c.width/img.width,c.height/img.height);

    // 👇さらに縮小（例: 0.25 = 1/4）
    let manualShrink=0.25;

    let w=img.width*scale*manualShrink;
    let h=img.height*scale*manualShrink;
    let x=(c.width-w)/2;
    let y=(c.height-h)/2;

    alert(`final draw = ${w}x${h} at (${x},${y})`);
    ctx.drawImage(img,x,y,w,h);
  };
  img.src=src;
}
