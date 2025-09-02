// pictosense/draw.js ——— draw.jsだけで完結：自動接続・URL設定UI・送受信・圧縮・擬似描画

// ====== 小ユーティリティ ======
const $c = (t)=>document.createElement(t);
const delay = (ms)=>new Promise(r=>setTimeout(r,ms));
const LS = {
  get k(){ return 'px_socket_cfg_v1'; },
  load(){ try{ return JSON.parse(localStorage.getItem(LS.k)||'{}'); }catch{ return {}; } },
  save(o){ try{ localStorage.setItem(LS.k, JSON.stringify(o||{})); }catch{} }
};

// ====== HUD（ログ＋接続設定） ======
(function(){
  if (window.__pxHUD) return;
  const hud = $c('div');
  hud.style.cssText='position:fixed;right:8px;bottom:8px;width:90vw;max-width:560px;height:44vh;z-index:2147483647;color:#eee;font:12px/1.4 -apple-system,system-ui,monospace;display:flex;flex-direction:column;gap:0';
  const head = $c('div'); head.style.cssText='display:flex;gap:8px;align-items:center;background:#1b1b1b;border:1px solid #333;border-bottom:none;border-radius:10px 10px 0 0;padding:6px 8px';
  const title=$c('div'); title.textContent='📋 Pictosense HUD'; title.style.flex='1';
  const btn=(t,fn)=>{ const b=$c('button'); b.textContent=t; b.onclick=fn; b.style.cssText='background:#2a2a2a;color:#fff;border:1px solid #444;border-radius:6px;padding:4px 8px'; return b; };
  const gear=btn('⚙︎',()=>panel.style.display=panel.style.display==='none'?'grid':'none');
  const hide=btn('Hide',()=>wrap.style.display='none');
  head.append(title, gear, hide);

  const wrap = $c('div'); wrap.style.cssText='display:flex;flex-direction:column;border:1px solid #333;border-top:none;border-radius:0 0 10px 10px;background:#111;overflow:hidden;height:100%';
  const panel = $c('div'); panel.style.cssText='display:none;grid-template-columns:1fr auto;gap:6px;padding:8px;border-bottom:1px solid #222';
  const uIn=$c('input'); uIn.placeholder='https://your-socket-host:3000'; uIn.style.cssText='width:100%;background:#0f0f0f;color:#eee;border:1px solid #444;border-radius:6px;padding:6px';
  const rIn=$c('input'); rIn.placeholder='room (optional)'; rIn.style.cssText='width:45%;background:#0f0f0f;color:#eee;border:1px solid #444;border-radius:6px;padding:6px';
  const connectBtn=btn('Connect', async ()=>{
    const url=uIn.value.trim(); const room=rIn.value.trim();
    if (!url) { log('warn','URL is empty'); return; }
    LS.save({url, room});
    await __ensureSocket(true); // force reconnect
  });
  const row = $c('div'); row.style.cssText='display:flex;gap:6px'; row.append(rIn, connectBtn);
  panel.append(uIn, row);

  const body=$c('div'); body.style.cssText='flex:1;overflow:auto;padding:8px 10px;white-space:pre-wrap;word-break:break-word';
  const foot=$c('div'); foot.style.cssText='display:flex;gap:8px;padding:6px 8px;border-top:1px solid #222';
  const copy=btn('Copy',async()=>{ try{ await navigator.clipboard.writeText(__logs.join('\n')); log('log','(copied)'); }catch(e){ log('error','copy failed:'+e); } });
  const clear=btn('Clear',()=>{ __logs.length=0; body.innerHTML=''; });

  wrap.append(panel, body, foot);
  foot.append(copy, clear);
  const root=$c('div'); root.append(head, wrap); document.body.appendChild(root);

  const __logs=[];
  function log(type, ...a){
    const t=new Date().toISOString().split('T')[1].split('Z')[0];
    const msg=a.map(x=>{ try{ return typeof x==='string'?x:JSON.stringify(x); }catch{return String(x);} }).join(' ');
    const line=`[${t}] ${type}: ${msg}`;
    __logs.push(line);
    const el=$c('div'); el.textContent=line;
    el.style.color= type==='error'?'#ff8888':(type==='warn'?'#ffd27f':(type==='sock'?'#8bd5ff':'#eaeaea'));
    body.appendChild(el); body.scrollTop=body.scrollHeight;
  }

  // console フック
  const orig={ log:console.log, warn:console.warn, error:console.error };
  ['log','warn','error'].forEach(k=>{
    console[k]=function(...a){ try{orig[k].apply(console,a);}catch{}; try{log(k,...a);}catch{} };
  });

  // 初期値
  const cfg=LS.load();
  if (cfg.url) uIn.value=cfg.url;
  if (cfg.room) rIn.value=cfg.room;

  window.__pxHUD = { log, setURL:(u)=>uIn.value=u, setRoom:(r)=>rIn.value=r, show:()=>wrap.style.display='block', hide:()=>wrap.style.display='none' };
  log('log','HUD ready');
})();

// ====== Socket クライアント（自動ロード＆接続） ======
async function __loadIO(){
  if (window.io && typeof io==='function') return;
  const s=$c('script'); s.src='https://cdn.socket.io/4.7.2/socket.io.min.js';
  document.head.appendChild(s);
  await new Promise((res,rej)=>{ s.onload=res; s.onerror=()=>rej(new Error('io load failed')); });
}
async function __connect(url, room){
  try{
    await __loadIO();
    if (window.socket && socket.connected && socket.io && socket.io.uri?.startsWith(url)) return true;
    if (window.socket) { try{ socket.disconnect(); }catch{} }
    window.socket = io(url, { transports:['websocket'], query: room?{room}:{}, withCredentials:true });
    return await new Promise((res)=>{
      let to=setTimeout(()=>{ __pxHUD?.log('sock','connect timeout'); res(false); }, 3000);
      socket.on('connect', ()=>{ clearTimeout(to); __pxHUD?.log('sock','connected id='+socket.id); res(true); });
      socket.on('connect_error', (e)=>{ __pxHUD?.log('error','connect_error '+(e?.message||e)); });
    });
  }catch(e){
    __pxHUD?.log('error','connect failed '+(e?.message||e)); return false;
  }
}
// 接続戦略：localStorage > 既存socket > location.origin
async function __ensureSocket(force=false){
  if (!force && window.socket && socket.connected) return true;
  const cfg=LS.load();
  if (cfg.url){
    const ok = await __connect(cfg.url, cfg.room||'');
    if (ok) return true;
  }
  // 既存 socket があるならそれ優先
  if (!force && window.socket && socket.connected) return true;
  // 同一オリジンに試し接続（ページと同じホストに socket.io がある場合）
  try{
    const origin = location.origin;
    const ok = await __connect(origin, cfg.room||'');
    if (ok) return true;
  }catch{}
  __pxHUD?.log('warn','No socket connection. Set URL from HUD (⚙︎) then Connect.');
  return false;
}

// ====== 画像/Canvasユーティリティ ======
function blobToDataURL(blob){
  return new Promise((res, rej)=>{
    const r=new FileReader();
    r.onload = e=>res(e.target.result);
    r.onerror= rej;
    r.readAsDataURL(blob);
  });
}
function listVisibleCanvases(){
  const cs=Array.from(document.querySelectorAll('canvas'));
  const vis=cs.map(c=>{ const r=c.getBoundingClientRect(); return {c, area:Math.max(0,r.width)*Math.max(0,r.height)}; })
              .filter(x=>x.area>50*50)
              .sort((a,b)=>b.area-a.area);
  return vis.map(v=>v.c);
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
  if (!overlay){
    overlay=$c('canvas'); overlay.id='px_overlay_canvas'; document.body.appendChild(overlay);
    position(); window.addEventListener('scroll',position,{passive:true}); window.addEventListener('resize',position);
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
  const c=$c('canvas'); c.width=w; c.height=h;
  c.getContext('2d').drawImage(img,0,0,w,h);
  const out=c.toDataURL('image/jpeg', quality);
  console.log('[share] size ≈', Math.round(out.length/1024), 'KB');
  return out;
}

// ====== 受信（可能性高いイベント名を全購読、自己受信は無視） ======
const EVENT_RECV = ['image','overlay:image','draw:image','stroke:image','line','paint','share'];
(function bindReceivers(){
  const attach=()=>{ if(!window.socket || typeof socket.on!=='function') return;
    const onRecv = ({data, rect, target, senderId})=>{
      try{
        if (senderId && socket.id && senderId===socket.id) return; // 自己受信ガード
        const base = (()=>{
          const vs=listVisibleCanvases();
          return vs[(target?.visibleIndex ?? 0)] || vs[0] || null;
        })();
        if (!base) return;
        const overlay=ensureOverlay(base);
        const ctx=overlay.getContext('2d');
        const img=new Image();
        img.onload=()=>{
          const r=overlay.getBoundingClientRect();
          const x=rect.bx*r.width, y=rect.by*r.height, w=rect.bw*r.width, h=rect.bh*r.height;
          const dpr=window.devicePixelRatio||1;
          ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
          ctx.clearRect(0,0,r.width,r.height);
          ctx.drawImage(img, x/dpr, y/dpr, w/dpr, h/dpr);
          ctx.restore();
        };
        img.src=data;
      }catch(e){ console.error('[recv] err', e); }
    };
    for (const ev of EVENT_RECV){ try{ socket.on(ev,onRecv); console.log('[recv] listen',ev);}catch{} }
  };
  // 初回試行＆接続時に再アタッチ
  (async()=>{ await __ensureSocket(false); attach(); })();
  const iv=setInterval(()=>{ if (window.socket && socket.connected){ attach(); clearInterval(iv);} }, 800);
})();

// ====== 送信（サーバ改変なし：複数イベント名へ同報） ======
const EVENT_SEND = ['image','overlay:image','draw:image','stroke:image','line','paint','share'];
function multiEmit(payload){
  if(!window.socket || typeof socket.emit!=='function' || !socket.connected){
    console.warn('[share] no socket; fallback'); return false;
  }
  payload.senderId = socket.id || null;
  for(const ev of EVENT_SEND){ try{ socket.emit(ev, payload); console.log('[share] emit',ev); }catch(e){ console.warn('emit fail', ev, e); } }
  return true;
}

// ====== フォールバック（線分エミュレーション） ======
function emulateStrokeFromOverlay(overlay, base, opt){
  const step=Math.max(2, opt?.step ?? 8), thr=Math.min(255, Math.max(0, opt?.threshold ?? 160)), maxRuns=opt?.maxRuns ?? 3000;
  const cssW=overlay.clientWidth, cssH=overlay.clientHeight, dpr=window.devicePixelRatio||1;
  const tmp=$c('canvas'); tmp.width=Math.max(1,Math.round(cssW*dpr)); tmp.height=Math.max(1,Math.round(cssH*dpr));
  const tctx=tmp.getContext('2d'); tctx.drawImage(overlay,0,0,tmp.width,tmp.height); const img=tctx.getImageData(0,0,tmp.width,tmp.height).data;
  let runs=0;
  for(let y=0;y<cssH && runs<maxRuns;y+=step){
    let drawing=false, x0=0;
    for(let x=0;x<cssW;x+=step){
      const px=Math.min(tmp.width-1,Math.floor(x*dpr)), py=Math.min(tmp.height-1,Math.floor(y*dpr));
      const o=(py*tmp.width+px)*4, a=img[o+3], isInk=a>=thr;
      if(isInk && !drawing){ drawing=true; x0=x; }
      if((!isInk && drawing) || (isInk && x+step>=cssW)){
        const x1=isInk?x+step:x; dispatchStrokeRun(base,x0,y,x1,y,step); runs++; if(runs>=maxRuns) break; drawing=false;
      }
    }
  }
  console.log(`[share] emulateStroke runs=${runs} step=${step} thr=${thr}`);
}
function dispatchStrokeRun(canvas, x0,y0,x1,y1, step){
  const rect=canvas.getBoundingClientRect();
  const toClient=(cx,cy)=>({ clientX: rect.left + cx*(rect.width/canvas.clientWidth), clientY: rect.top + cy*(rect.height/canvas.clientHeight), bubbles:true, cancelable:true });
  const makeEvt=(type,cx,cy)=>{ try{ return new PointerEvent(type,toClient(cx,cy)); }catch{ return new MouseEvent(type.replace('pointer','mouse'),toClient(cx,cy)); } };
  const down=(cx,cy)=>canvas.dispatchEvent(makeEvt('pointerdown',cx,cy));
  const move=(cx,cy)=>canvas.dispatchEvent(makeEvt('pointermove',cx,cy));
  const up  =(cx,cy)=>canvas.dispatchEvent(makeEvt('pointerup',  cx,cy));
  down(x0,y0); const len=Math.max(1,Math.floor((x1-x0)/step)); for(let i=1;i<=len;i++) move(x0+i*step,y0); up(x1,y1);
}

// ====== メイン：表示→共有 or フォールバック ======
function showOnOverlay(dataURL){
  const base=pickVisibleCanvas();
  if(!base) return alert('キャンバスが見つかりません');
  const overlay=ensureOverlay(base), ctx=overlay.getContext('2d');
  const img=new Image();
  img.onload=()=>{
    const cssW=overlay.clientWidth, cssH=overlay.clientHeight;
    const fit=Math.min(cssW/img.width, cssH/img.height), OVERSCALE=1, s=fit*OVERSCALE;
    const w=img.width*s, h=img.height*s, x=(cssW-w)/2, y=(cssH-h)/2;
    const dpr=window.devicePixelRatio||1;
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr); ctx.clearRect(0,0,cssW,cssH); ctx.drawImage(img,x,y,w,h);

    (async()=>{
      const ensure = await __ensureSocket(false);
      const vis=listVisibleCanvases(); const visibleIndex=Math.max(0, vis.indexOf(base));
      const r=overlay.getBoundingClientRect(), br=base.getBoundingClientRect();
      const norm={ bx:(r.left-br.left)/br.width, by:(r.top-br.top)/br.height, bw:r.width/br.width, bh:r.height/br.height };
      const tiny=await compressDataURL(overlay.toDataURL('image/png'), 0.65, 1600);
      const payload={ type:'image', data:tiny, rect:norm, target:{visibleIndex} };

      if (ensure && multiEmit(payload)){
        console.log('[share] sent via socket');
      } else {
        console.warn('[share] no socket, fallback');
        emulateStrokeFromOverlay(overlay, base, { step:8, threshold:160, maxRuns:3000 });
      }
    })();
  };
  img.onerror=()=>alert('画像の読み込みに失敗しました');
  img.src=dataURL;
}

// ====== エントリ：ブクマから呼ぶ想定 ======
window.startUpload = function () {
  const input=$c('input'); input.type='file'; input.accept='image/*';
  input.onchange=(e)=>{
    const file=e.target.files && e.target.files[0]; if(!file) return;
    const isHEIC=(file.type==='image/heic') || /\.heic$/i.test(file.name) || file.type==='application/octet-stream';
    if (isHEIC){
      const s=$c('script'); s.src='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload=()=>heic2any({blob:file,toType:'image/jpeg'}).then(out=>blobToDataURL(out).then(showOnOverlay)).catch(()=>alert('HEIC変換に失敗しました'));
      document.body.appendChild(s);
    }else{
      const r=new FileReader(); r.onload=ev=>showOnOverlay(ev.target.result); r.readAsDataURL(file);
    }
  };
  input.click();
};
