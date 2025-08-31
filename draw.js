(function(){
    var i=document.createElement('input');
    i.type='file'; i.accept='image/*';
    i.style.position='fixed'; i.style.left='-9999px';
    document.body.appendChild(i);

    i.onchange=function(ev){
        var f=ev.target.files[0];
        if(!f){document.body.removeChild(i);return;}
        var r=new FileReader();
        r.onload=function(ev){
            var img=new Image();
            img.onload=function(){
                var cvs=[].slice.call(document.querySelectorAll('canvas'));
                if(cvs.length==0){alert('キャンバスがありません');document.body.removeChild(i);return;}
                var ctx=cvs[0].getContext('2d');
                var w=img.width, h=img.height;
                var x=(cvs[0].width-w)/2, y=(cvs[0].height-h)/2;
                ctx.drawImage(img, x, y, w, h);
                document.body.removeChild(i);
            };
            img.src=ev.target.result;
        };
        r.readAsDataURL(f);
    };
    i.click();
})();
