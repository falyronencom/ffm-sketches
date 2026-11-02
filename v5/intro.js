(() => {
  'use strict';
  function init(app) {
    const root=document.documentElement,policy=window.ALBUM_INTRO_POLICY;
    const $=s=>document.querySelector(s);
    const rig=$('#book-rig'),album=$('.album'),position=$('#book-position');
    const shell=$('#intro-cover-shell'),cover=$('#intro-cover'),copy=$('#intro-copy'),skipButton=$('#intro-skip'),openButton=$('#intro-open'),curtain=$('#intro-curtain');
    const contactShadow=$('#intro-contact-shadow'),contactEdge=$('#intro-contact-edge');
    const controls=[$('.scene-tools'),$('.album-navigation'),$('.gesture-hint'),$('#mobile-save'),$('#edge-tabs')];
    const brand=$('.scene-brand'),small=matchMedia('(max-width:899px)'),coarse=matchMedia('(any-pointer:coarse)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
    cover.style.backgroundImage=`url("${app.cover}")`;
    const sources=[...new Set(app.sources)];
    Promise.allSettled(sources.map(source=>{const image=new Image();image.src=source;return image.decode();})).then(results=>{root.dataset.albumPreloaded=results.every(r=>r.status==='fulfilled')?'ready':'partial';});
    try{sessionStorage.setItem(policy.key,'1');}catch{}
    if(!policy.show){
      if(policy.reduced){const fade=album.animate([{opacity:0},{opacity:1}],{duration:300,easing:'ease-out'});fade.finished.catch(()=>{});}
      return;
    }

    let status='closed',entry=[],opening=[],timers=new Set(),turn=null,scale=.58;
    const planar=()=>small.matches||coarse.matches||navigator.maxTouchPoints>0;
    const pose=(s=scale,raise=0)=>`translateY(${raise}px) rotateX(${planar()?0:50}deg) rotateY(0deg) rotateZ(-8deg) scale(${s})`;
    function track(animation,list){list.push(animation);animation.finished.catch(()=>{});return animation;}
    function cancel(list){for(const a of list.splice(0))a.cancel();}
    function schedule(ms,fn){const id=setTimeout(()=>{timers.delete(id);if(status==='opening')fn();},ms);timers.add(id);}
    function entryDone(){root.classList.add('intro-ready');curtain.hidden=true;cancel(entry);}
    function placeClosed(){
      window.ALBUM_SCENE.setIntroMode('closed');
      root.classList.toggle('intro-planar',planar());
      scale=.58;root.style.setProperty('--intro-scale',scale);album.style.setProperty('--intro-shift-y','0px');
      let rect=shell.getBoundingClientRect();const gap=24,copyHeight=copy.getBoundingClientRect().height;
      const available=Math.max(130,innerHeight-82-24-gap-copyHeight);
      if(rect.height>available){scale*=available/rect.height;root.style.setProperty('--intro-scale',scale);rect=shell.getBoundingClientRect();}
      const total=rect.height+gap+copyHeight,top=Math.max(82,(innerHeight-total)/2);
      const shift=top-rect.top;
      album.style.setProperty('--intro-shift-y',shift+'px');
      root.style.setProperty('--intro-copy-top',(top+rect.height+gap)+'px');
    }
    function complete(immediate=false,target=0){
      if(status==='done')return;
      status='done';for(const id of timers)clearTimeout(id);timers.clear();
      if(turn){turn.scene.remove();turn.animation.cancel();turn=null;}
      root.classList.remove('intro-active','intro-ready','intro-uncover','intro-cover-settled','intro-reveal-controls','intro-planar');delete root.dataset.intro;
      shell.hidden=copy.hidden=skipButton.hidden=curtain.hidden=true;
      for(const control of controls)control.inert=false;
      brand.removeAttribute('tabindex');brand.removeAttribute('aria-hidden');
      app.book.removeAttribute('aria-busy');app.spread.inert=false;
      cancel(entry);cancel(opening);
      root.style.removeProperty('--intro-scale');root.style.removeProperty('--intro-copy-top');album.style.removeProperty('--intro-shift-y');
      window.ALBUM_SCENE.setIntroMode(null);
      app.complete(target,immediate);app.book.focus({preventScroll:true});
    }
    function hideSkip(){
      skipButton.inert=true;
      const fade=track(skipButton.animate([{opacity:1},{opacity:0}],{duration:150,fill:'both'}),opening);
      fade.finished.then(()=>{skipButton.hidden=true;}).catch(()=>{});
      return fade;
    }
    function skipIntro(){
      if(status==='done'||status==='skipping')return;
      entryDone();status='skipping';root.dataset.intro='skipping';
      openButton.disabled=true;
      for(const id of timers)clearTimeout(id);timers.clear();
      track(copy.animate([{opacity:1},{opacity:0}],{duration:150,fill:'both'}),opening);
      hideSkip().finished.then(()=>complete(true)).catch(()=>{});
    }
    function open(){
      if(status!=='closed')return;
      entryDone();status='opening';root.dataset.intro='opening';openButton.disabled=true;shell.tabIndex=-1;
      window.ALBUM_SCENE.setIntroMode('opening');
      track(copy.animate([{opacity:1},{opacity:0}],{duration:150,fill:'both'}),opening);
      hideSkip();
      const liftEase='cubic-bezier(.2,.8,.2,1.05)';
      const lift={delay:120,duration:800,easing:liftEase,fill:'both'};
      track(rig.animate([{transform:pose()},{transform:'translateY(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)'}],lift),opening);
      track(album.animate([{transform:getComputedStyle(album).transform},{transform:'translateY(0px)'}],lift),opening);
      track(shell.animate([{boxShadow:'0 8px 14px -8px #000b'},{boxShadow:'0 45px 70px -15px #000b'}],lift),opening);
      track(contactShadow.animate([{filter:'blur(18px)',opacity:1,transform:'scaleX(1)'},{filter:'blur(28px)',opacity:.25,transform:'scaleX(1.18)'}],lift),opening);
      track(contactEdge.animate([{opacity:.9},{opacity:0}],{delay:120,duration:480,fill:'both'}),opening);
      // Centre the hidden spread while lifting it, before the cover swings left.
      // Scaling up at the old -25% offset could put the spine beyond the viewport.
      track(position.animate([{transform:small.matches?'translateX(0px)':'translateX(-25%)'},{transform:'translateX(0px)'}],lift),opening);
      schedule(150,()=>{copy.hidden=true;});
      schedule(600,()=>{
        root.classList.add('intro-uncover');
        const mobile=planar();
        turn=app.coverTurn(cover,{mobile,duration:1100,easing:mobile?'cubic-bezier(.32,.05,.2,1)':'cubic-bezier(.25,.08,.75,1)'});
        turn.scene.classList.add('intro-cover-turn');
        shell.hidden=true;app.book.setAttribute('aria-busy','true');
        const currentTurn=turn;currentTurn.animation.play();
        currentTurn.animation.finished.then(()=>{if(turn===currentTurn){root.classList.add('intro-cover-settled');currentTurn.scene.remove();currentTurn.animation.cancel();turn=null;app.book.removeAttribute('aria-busy');}}).catch(()=>{});
      });
      schedule(1200,()=>app.firstScene({duration:700}));
      schedule(1700,()=>{
        root.classList.add('intro-reveal-controls');
        for(const control of controls)track(control.animate([{opacity:0},{opacity:1}],{duration:400,easing:'ease-out',fill:'both'}),opening);
      });
      schedule(2100,()=>complete());
    }

    shell.hidden=copy.hidden=skipButton.hidden=curtain.hidden=false;
    app.spread.inert=true;for(const control of controls)control.inert=true;
    brand.tabIndex=-1;brand.setAttribute('aria-hidden','true');
    app.firstScene({duration:0});placeClosed();
    track(curtain.animate([{opacity:1},{opacity:0}],{duration:600,easing:'ease-out',fill:'both'}),entry);
    track(rig.animate([{transform:pose(Math.max(.1,scale-.04),-40),opacity:0},{transform:pose(),opacity:1}],{delay:300,duration:800,easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'}),entry);
    track(shell.animate([{boxShadow:'0 35px 50px -15px #0004'},{boxShadow:'0 8px 14px -8px #000b'}],{delay:300,duration:800,fill:'both'}),entry);
    track(contactShadow.animate([{filter:'blur(32px)',opacity:.25},{filter:'blur(18px)',opacity:1}],{delay:300,duration:800,fill:'both'}),entry);
    track(contactEdge.animate([{opacity:.1},{opacity:.9}],{delay:300,duration:800,fill:'both'}),entry);
    [...copy.children].forEach((el,i)=>track(el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0px)'}],{delay:1100+i*120,duration:400,easing:'ease-out',fill:'both'}),entry));
    Promise.allSettled(entry.map(a=>a.finished)).then(()=>{if(status==='closed')entryDone();});
    shell.addEventListener('click',open);openButton.addEventListener('click',open);skipButton.addEventListener('click',skipIntro);
    document.addEventListener('keydown',e=>{
      if(status==='done')return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();complete(true);}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.target===skipButton)skipIntro();else open();}
    },true);
    window.addEventListener('hashchange',()=>{
      if(status==='done')return;
      const target=app.pageForHash(location.hash);
      if(target>0)complete(true,target);
    });
    window.addEventListener('resize',()=>{if(status==='closed'){entryDone();placeClosed();}else if(status==='opening'||status==='skipping')complete(true);});
    reduced.addEventListener('change',e=>{if(e.matches&&status!=='done')complete(true);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&(status==='opening'||status==='skipping'))complete(true);});
  }
  window.ALBUM_INTRO={init};
})();
