// ====== 埋め込みデバッグHUD（iPhoneでもOK／ブックマ不要） ======
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
      const el=s('div');
      el.textContent=line;
      el.style.color= type==='error'?'#ff8888':(type==='warn'?'#ffd27f':(type==='sock'?'#8bd5ff':'#eaeaea'));
      body.appendChild(el);
      body.scrollTop=body.scrollHeight;
    }
    const copyAll=async()=>{try{await navigator.clipboard.writeText(logs.join('\n'));push('log','(copied)')}catch(e){push('error','copy failed: '+e)}};
    const clear=()=>{logs.length=0;body.innerHTML='';};
    head.appendChild(title);
    head.appendChild(btn('Copy',copyAll));
    head.appendChild(btn('Clear',clear));
    head.appendChild(btn('Hide',()=>{hud.style.display='none'}));
    hud.appendChild(head); hud.appendChild(body); document.body.appendChild(hud);

    // console.* をフック（既存コードはそのまま、HUDにも表示）
    const orig={ log:console.log, warn:console.warn, error:console.error };
    ['log','warn','error'].forEach(k=>{
      console[k]=function(...a){
        try{ orig[k].apply(console,a); }catch{}
        try{
          const msg=a.map(x=>{ try{ return typeof x==='string'?x:JSON.stringify(x); }catch{ return String(x); } }).join(' ');
          push(k,msg);
        }catch{}
      };
    });

    // 未捕捉エラーも表示
    window.addEventListener('error',e=>push('error',e.message+' @'+e.filename+':'+e.lineno));
    window.addEventListener('unhandledrejection',e=>push('error','unhandledrejection: '+(e.reason&&e.reason.message||e.reason)));

    // socket があればイベントも可視化
    if (window.socket && typeof socket.on==='function') {
      try{
        socket.onAny((ev,...a)=>push('sock','on:'+ev+' '+(a.length?JSON.stringify(a):'')));
        ['connect','disconnect','connect_error','reconnect','reconnect_attempt'].forEach(ev=>{
          try{ socket.on(ev,(...a)=>push('sock',ev+' '+(a.length?JSON.stringify(a):''))); }catch{}
        });
        push('sock','connected? '+socket.connected+' id='+socket.id);
      }catch(e){ push('error','socket hook failed: '+e.message); }
    }

    window.__dbgHUD = { log: (m)=>push('log', m), show:()=>{hud.style.display='flex'}, hide:()=>{hud.style.display='none'} };
    push('log','Debug HUD ready');
  };
})();
