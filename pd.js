(function(){
  var url=window.__PX_DATAURL; if(!url){alert('画像なし');return;}
  var cs=[].slice.call(document.querySelectorAll('canvas'))
    .map(function(c){var r=c.getBoundingClientRect();return{c:c,a:r.width*r.height};})
    .filter(function(x){return x.a>2500}).sort(function(a,b){return b.a-a.a});
  if(!cs[0]){alert('canvasなし');return;}
  var c=cs[0].c,ctx=c.getContext('2d'),img=new Image();
  img.onload=function(){
    var cw=c.width,ch=c.height,s=Math.min(cw/img.naturalWidth,ch/img.naturalHeight),
        w=Math.round(img.naturalWidth*s),h=Math.round(img.naturalHeight*s),
        x=Math.round((cw-w)/2),y=Math.round((ch-h)/2);
    ctx.drawImage(img,x,y,w,h);
    try{
      if(window.socket&&socket.emit){
        // ← ピクトセンスの実イベント名に合わせて "draw" を必要なら変更（例: "stroke","line"）
        socket.emit("draw",{type:"image",data:url,x:x,y:y,w:w,h:h});
      }
    }catch(e){}
  };
  img.onerror=function(){alert('読込失敗')};
  img.src=url;
})();
