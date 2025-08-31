function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // キャンバスの実サイズと見た目のサイズを出す
    let rect = c.getBoundingClientRect();
    alert(
      `canvas属性サイズ = ${c.width}x${c.height}\n` +
      `canvas表示サイズ = ${Math.round(rect.width)}x${Math.round(rect.height)}\n` +
      `画像サイズ = ${img.width}x${img.height}`
    );

    // 今は描画しない
  };
  img.src=src;
}
