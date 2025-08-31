function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let cvs=[...document.querySelectorAll('canvas')];
    cvs.sort((a,b)=>(b.width*b.height)-(a.width*a.height));
    let c=cvs[0];
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // キャンバスの表示サイズと内部サイズ
    let rect = c.getBoundingClientRect();
    let scaleFixX = c.width / rect.width;   // 1125/375 = 3
    let scaleFixY = c.height / rect.height; // 同じく3

    // 「見た目のキャンバス」に収まるように計算
    let scale = Math.min(rect.width/img.width, rect.height/img.height);

    // 実際に描画する時は内部解像度に直す
    let w = img.width * scale * scaleFixX;
    let h = img.height * scale * scaleFixY;
    let x = (c.width - w)/2;
    let y = (c.height - h)/2;

    alert(`canvas表示=${rect.width}x${rect.height}, img=${img.width}x${img.height}, draw内部=${w}x${h}`);

    ctx.drawImage(img, x, y, w, h);
  };
  img.src=src;
}
