// pictosense/draw.js ——— draw.jsだけで完結（サーバ変更不要） ———

// ======（任意）画面内デバッグHUD：不要ならこの即時関数ごと削除OK ======
(function(){
  if (window.installDebugHUD) return;
  window.installDebugHUD = function(){
    if (window.__dbgHUD) return;
    const s=(t)=>document.createElement(t);
    const hud=s('div');
    hud.style.cssText='position:fixed;right:8px;bottom:8px;width:88vw;max-width:520px;height:40vh;max-height:50vh;z-index:2147483647;background:#111;color:#eee;font:12px/1.4 -apple-system,system-ui,monospace;border:1px solid #444;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden';
    const head=s('div'); head.style.cssText='display:flex;gap:8px;align-items:center;padding:6px 8px;background:#1b1b1b;border-bottom:1px solid #333';
    const title=s('div'); title.textContent='📋 Debug HUD'; title.style.flex='1';
    const btn=(label,fn)=>{const b=s('button'); b.textContent=label; b.style.cssText='background:#2a2a2a;color:#fff;border:1px solid #444;border-radius:6px;padding:4px 8px'; b.onclick=fn; return b;};
    const body=s('div'); body.style.cssText='flex:1;overflow:auto;padding:6px 8px;white-space:pre-wrap;word-break:break-word';
    const logs=[];
    function push(type,msg){
      const t=new Date().toISOString().split('T')[1].split('Z')[0];
      const line=`[${t}] ${type}: ${msg}`;
      logs.push(line);
      const el=s('div'); el.textContent=line;
      el.style.color= type==='error'?'#ff8888':(type==='warn'?'#ffd27f':(type==='sock'?'#8bd5ff':'#eaeaea'));
      body.appendChild(el); body.scrollTop=body.scrollHeight;
    }
    const copyAll=async()=>{try{await navigator.clipboard.writeText(logs.join('\n'));push('log','(copied)')}catch(e){push('error','copy failed: '+e)}};
    const clear=()=>{logs.length=0;body.innerHTML='';};
    head.appendChild(title); head.appendChild(btn('Copy',copyAll)); head.appendChild(btn('Clear',clear)); head.appendChild(btn('Hide',()=>hud.style.display='none'));
    hud.appendChild(head); hud.appendChild(body); document.body.appendChild(hud);
    const orig={ log:console.log, warn:console.warn, error:console.error };
    ['log','warn','error'].forEach(k=>{
      console[k]=function(...a){ try{ orig[k].apply(console,a) }catch{}
        const msg=a.map(x=>{ try{return typeof x==='string'?x:JSON.stringify(x)}catch{return String(x)} }).join(' ');
        push(k,msg);
      };
    });
    window.addEventListener('error',e=>push('error',e.message+' @'+e.filename+':'+e.lineno));
    window.addEventListener('unhandledrejection',e=>push('error','unhandledrejection: '+(e.reason&&e.reason.message||e.reason)));
    if (window.socket && typeof socket.on==='function'){
      try{
        socket.onAny((ev,...a)=>push('sock','on:'+ev+' '+(a.length?JSON.stringify(a):'')));
        ['connect','disconnect','connect_error','reconnect','reconnect_attempt'].forEach(ev=>{
          try{ socket.on(ev,(...a)=>push('sock',ev+' '+(a.length?JSON.stringify(a):''))); }catch{}
        });
        push('sock','connected? '+socket.connected+' id='+socket.id);
      }catch(e){ push('error','socket hook failed: '+e.message); }
    }
    window.__dbgHUD={ show:()=>hud.style.display='flex', hide:()=>hud.style.display='none' };
    console.log('[HUD] ready');
  };
})();
try{ installDebugHUD(); }catch{}

// ====== ユーティリティ ======
function blobToDataURL(blob){
  return new Promise((res, rej)=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result);
    r.onerror=rej;
    r.readAsDataURL(blob);
  });
}
function listVisibleCanvases(){
  const cs=Array.from(document.querySelectorAll('canvas'));
  const visibles=cs.map(c=>{ const r=c.getBoundingClientRect(); return {c, area:Math.max(0,r.width)*Math.max(0,r.height)}; })
                   .filter(x=>x.area>50*50)
                   .sort((a,b)=>b.area-a.area);
  return visibles.map(v=>v.c);
}
function pickVisibleCanvas(){ return listVisibleCanvases()[0] || null; }
function ensureOverlay(base){
  let overlay=document.getElementById('px_overlay_canvas');
  const position=()=>{
    const r=base.getBoundingClientRect();
    overlay.style.position='absolute';
    overlay.style.pointerEvents='none';
    overlay.style.zIndex='2147483647';
    overlay.style.left=(r.left+window.scrollX)+'px';
    overlay.style.top =(r.top +window.scrollY)+'px';
    overlay.style.width =r.width +'px';
    overlay.style.height=r.height+'px';
    const dpr=window.devicePixelRatio||1;
    overlay.width =Math.max(1,Math.round(r.width *dpr));
    overlay.height=Math.max(1,Math.round(r.height*dpr));
  };
  if(!overlay){
    overlay=document.createElement('canvas');
    overlay.id='px_overlay_canvas';
    document.body.appendChild(overlay);
    position();
    window.addEventListener('scroll',position,{passive:true});
    window.addEventListener('resize',position);
  }else position();
  return overlay;
}
async function compressDataURL(dataURL, quality=0.65, maxSide=1600){
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataURL)) return dataURL;
  const img=new Image();
  await new Promise((r,j)=>{ img.onload=r; img.onerror=j; img.src=dataURL; });
  let w=img.naturalWidth, h=img.naturalHeight;
  const scale=Math.min(1, maxSide/Math.max(w,h));
  if(scale<1){ w=Math.round(w*scale); h=Math.round(h*scale); }
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  c.getContext('2d').drawImage(img,0,0,w,h);
  const out=c.toDataURL('image/jpeg', quality);
  console.log('[share] size ~', Math.round(out.length/1024), 'KB');
  return out;
}

// ====== 共有（サーバ変更なし版）：複数イベント名へ同報送信 ======
const EVENT_CANDIDATES_SEND = ['image','overlay:image','draw:image','stroke:image','line','paint','share'];
const EVENT_CANDIDATES_RECV = ['image','overlay:image','draw:image','stroke:image','line','paint','share'];
function multiEmit(payload){
  if(!window.socket || typeof socket.emit!=='function' || !socket.connected){
    console.warn('[share] socket not connected'); return;
  }
  // senderId を付けて「自己受信」を無視できるようにする
  payload.senderId = socket.id || null;
  for(const ev of EVENT_CANDIDATES_SEND){
    try{ socket.emit(ev, payload); console.log('[share] emit:', ev);}catch(e){ console.warn('[share] emit fail', ev, e); }
  }
}

// ====== 受信（複数イベント名すべて購読、自己受信は無視） ======
(function setupReceivers(){
  if(!window.socket || typeof socket.on!=='function') return;
  const onRecv = ({data, rect, target, senderId})=>{
    try{
      // 自分が送ったものなら何もしない（サーバが自分にブロードキャストする構成でも安全）
      if(senderId && socket.id && senderId===socket.id){ return; }

      const base = pickCanvasByVisibleIndex(target?.visibleIndex ?? 0) || pickVisibleCanvas();
      if(!base) return;
      const overlay = ensureOverlay(base);
      const ctx = overlay.getContext('2d');
      const img = new Image();
      img.onload = ()=>{
        const r = overlay.getBoundingClientRect();
        const x = rect.bx * r.width;
        const y = rect.by * r.height;
        const w = rect.bw * r.width;
        const h = rect.bh * r.height;
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0,r.width,r.height);
        ctx.drawImage(img, x/dpr, y/dpr, w/dpr, h/dpr);
        ctx.restore();
      };
      img.src = data;
    }catch(e){ console.error('[recv] error', e); }
  };
  function pickCanvasByVisibleIndex(idx=0){
    const vs=listVisibleCanvases();
    return vs[idx] || vs[0] || null;
  }
  for(const ev of EVENT_CANDIDATES_RECV){
    try{ socket.on(ev, onRecv); console.log('[recv] listen:', ev);}catch(e){ console.warn('[recv] bind fail', ev, e); }
  }
})();

// ====== フォールバック：擬似描画 ======
function emulateStrokeFromOverlay(overlay, base, opt){
  const step = Math.max(2, opt?.step ?? 8);
  const thr  = Math.min(255, Math.max(0, opt?.threshold ?? 160));
  const maxRuns = opt?.maxRuns ?? 3000;
  const cssW=overlay.clientWidth, cssH=overlay.clientHeight;
  const dpr=window.devicePixelRatio||1;
  const tmp=document.createElement('canvas');
  tmp.width=Math.max(1,Math.round(cssW*dpr));
  tmp.height=Math.max(1,Math.round(cssH*dpr));
  const tctx=tmp.getContext('2d');
  tctx.drawImage(overlay,0,0,tmp.width,tmp.height);
  const img=tctx.getImageData(0,0,tmp.width,tmp.height).data;
  let runs=0;
  for(let y=0;y<cssH && runs<maxRuns;y+=step){
    let drawing=false, x0=0;
    for(let x=0;x<cssW;x+=step){
      const px=Math.min(tmp.width-1,Math.floor(x*dpr));
      const py=Math.min(tmp.height-1,Math.floor(y*dpr));
      const o=(py*tmp.width+px)*4;
      const a=img[o+3];
      const isInk=a>=thr;
      if(isInk && !drawing){ drawing=true; x0=x; }
      if((!isInk && drawing) || (isInk && x+step>=cssW)){
        const x1=isInk?x+step:x;
        dispatchStrokeRun(base,x0,y,x1,y,step);
        runs++; if(runs>=maxRuns) break;
        drawing=false;
      }
    }
  }
  console.log(`[share] emulateStroke runs=${runs} step=${step} thr=${thr}`);
}
function dispatchStrokeRun(canvas, x0,y0,x1,y1, step){
  const rect=canvas.getBoundingClientRect();
  const toClient=(cx,cy)=>({
    clientX: rect.left + cx*(rect.width/canvas.clientWidth),
    clientY: rect.top  + cy*(rect.height/canvas.clientHeight),
    bubbles:true, cancelable:true
  });
  const makeEvt=(type,cx,cy)=>{ try{return new PointerEvent(type,toClient(cx,cy));}
    catch{return new MouseEvent(type.replace('pointer','mouse'),toClient(cx,cy));}
  };
  const down=(cx,cy)=>canvas.dispatchEvent(makeEvt('pointerdown',cx,cy));
  const move=(cx,cy)=>canvas.dispatchEvent(makeEvt('pointermove',cx,cy));
  const up  =(cx,cy)=>canvas.dispatchEvent(makeEvt('pointerup',  cx,cy));
  down(x0,y0);
  const len=Math.max(1,Math.floor((x1-x0)/step));
  for(let i=1;i<=len;i++) move(x0+i*step,y0);
  up(x1,y1);
}

// ====== 画像をオーバーレイに表示 → 共有 or フォールバック ======
function showOnOverlay(dataURL){
  const base=pickVisibleCanvas();
  if(!base) return alert('キャンバスが見つかりません');

  const overlay=ensureOverlay(base);
  const ctx=overlay.getContext('2d');
  const img=new Image();
  img.onload=()=>{
    const cssW=overlay.clientWidth, cssH=overlay.clientHeight;
    const baseFit=Math.min(cssW/img.width, cssH/img.height);
    const OVERSCALE=1;
    const scaleDisplay=baseFit*OVERSCALE;
    const w=img.width*scaleDisplay, h=img.height*scaleDisplay;
    const x=(cssW-w)/2, y=(cssH-h)/2;
    const dpr=window.devicePixelRatio||1;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,cssW,cssH);
    ctx.drawImage(img,x,y,w,h);

    (async ()=>{
      try{
        const vis=listVisibleCanvases();
        const visibleIndex=Math.max(0, vis.indexOf(base));
        const rect=overlay.getBoundingClientRect();
        const baseRect=base.getBoundingClientRect();
        const norm={
          bx:(rect.left-baseRect.left)/baseRect.width,
          by:(rect.top -baseRect.top )/baseRect.height,
          bw: rect.width/baseRect.width,
          bh: rect.height/baseRect.height
        };
        const tiny=await compressDataURL(overlay.toDataURL('image/png'), 0.65, 1600);
        const payload={ type:'image', data:tiny, rect:norm, target:{ visibleIndex } };

        if(window.socket && socket.connected){
          multiEmit(payload);               // サーバ変更なしで多イベント送信
          console.log('[share] sent (multi events)');
        }else{
          console.warn('[share] no socket, fallback');
          emulateStrokeFromOverlay(overlay, base, { step:8, threshold:160, maxRuns:3000 });
        }
      }catch(e){
        console.warn('[share] send error, fallback', e);
        emulateStrokeFromOverlay(overlay, base, { step:8, threshold:160, maxRuns:3000 });
      }
    })();
  };
  img.onerror=()=>alert('画像の読み込みに失敗しました');
  img.src=dataURL;
}

// ====== エントリ ======
window.startUpload = function () {
  const input=document.createElement('input');
  input.type='file';
  input.accept='image/*';
  input.onchange=(e)=>{
    const file=e.target.files && e.target.files[0];
    if(!file) return;
    const isHEIC=(file.type==='image/heic') || /\.heic$/i.test(file.name) || file.type==='application/octet-stream';
    if(isHEIC){
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload=()=>heic2any({ blob:file, toType:'image/jpeg' })
        .then(out=>blobToDataURL(out).then(showOnOverlay))
        .catch(()=>alert('HEIC変換に失敗しました'));
      document.body.appendChild(s);
    }else{
      const r=new FileReader();
      r.onload=ev=>showOnOverlay(ev.target.result);
      r.readAsDataURL(file);
    }
  };
  input.click();
};
