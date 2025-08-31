function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let cvs=[...document.querySelectorAll('canvas')];
    if(!cvs.length){alert("キャンバスなし");return;}

    // 一番大きいキャンバスを選ぶ
    cvs.sort((a,b)=>(b.width*b.height)-(a.width*a.height));
    let c=cvs[0];

    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // キャンバスと画像の情報を確認
    alert(`canvas=${c.width}x${c.height}, image=${img.width}x${img.height}`);

    // 縦横比を維持して縮小
    let scale=Math.min(c.width/img.width,c.height/img.height);
    let w=img.width*scale, h=img.height*scale;
    let x=(c.width-w)/2, y=(c.height-h)/2;

    alert(`draw=${w}x${h} at (${x},${y})`);

    ctx.drawImage(img,x,y,w,h);
  };
  img.src=src;
}
