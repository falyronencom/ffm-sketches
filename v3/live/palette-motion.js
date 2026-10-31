(() => {
  'use strict';
  const wall=document.querySelector('.wall'),image=wall.querySelector('img');
  const D=JSON.parse(document.querySelector('#pal-data').textContent);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)');
  let frame=0,canvas=null,tiles=[],running=false,run=0;
  wall.classList.add('ffm-motion-owned');
  const enabled=()=>document.documentElement.classList.contains('motion')&&!reduced.matches;
  function stop(){
    cancelAnimationFrame(frame);frame=0;running=false;run++;
    canvas?.remove();canvas=null;wall.classList.remove('ffm-animating');wall.classList.add('done');wall.setAttribute('aria-busy','false');
  }
  function play(){
    stop();if(!enabled()||!image.complete||!image.naturalWidth)return;
    let seed=17;
    const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    const {width:W,height:H}=image.getBoundingClientRect(),cols=D.walls.d.cols,rows=D.walls.d.rows,cw=W/cols,ch=H/rows;
    if(!W||!H)return;
    tiles=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      tiles.push({c,r,x:c*cw,y:r*ch,dx:(random()-.5)*cw*1.6,sy:-ch-random()*H*.35,angle:(random()-.5)*.28,delay:(rows-1-r)*34+random()*800,duration:620+random()*180});
    }
    canvas=document.createElement('canvas');canvas.className='ffm-palette-canvas';canvas.setAttribute('aria-hidden','true');
    canvas.dataset.tiles=tiles.length;canvas.style.width=W+'px';canvas.style.height=H+'px';
    const ratio=Math.min(devicePixelRatio||1,coarse.matches?1:1.5);
    canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
    const ctx=canvas.getContext('2d');if(!ctx){canvas=null;return;}
    ctx.scale(ratio,ratio);wall.append(canvas);running=true;wall.classList.add('ffm-animating');wall.dataset.animationMode='scatter';wall.setAttribute('aria-busy','true');
    const id=run,start=performance.now(),total=Math.max(...tiles.map(t=>t.delay+t.duration)),interval=coarse.matches?1000/30:0;
    let last=-Infinity;
    const draw=now=>{
      if(id!==run)return;
      const elapsed=now-start;
      if(elapsed>=total||!enabled()){stop();return;}
      if(now-last>=interval){
        last=now;ctx.clearRect(0,0,W,H);
        for(const tile of tiles){
          const t=Math.max(0,Math.min(1,(elapsed-tile.delay)/tile.duration));if(!t)continue;
          let x=tile.x,y=tile.y,angle=0;
          const fall=Math.min(1,t/.82)**2;
          y=tile.sy+(tile.y-tile.sy)*fall;
          if(t>.82)y-=Math.sin((t-.82)/.18*Math.PI)*Math.min(ch*.13,5);
          x+=tile.dx*(1-t)**3;angle=tile.angle*(1-t)**3;
          const w=cw;
          ctx.save();ctx.globalAlpha=Math.min(1,t*9);ctx.translate(x+w/2,y+ch/2);if(angle)ctx.rotate(angle);
          ctx.drawImage(image,tile.c*image.naturalWidth/cols,tile.r*image.naturalHeight/rows,image.naturalWidth/cols,image.naturalHeight/rows,-w/2,-ch/2,w+.2,ch+.2);ctx.restore();
        }
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
  }
  wall.addEventListener('pointerdown',()=>{if(running)stop();},{passive:true});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
  new MutationObserver(()=>{if(!enabled())stop();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  let previousWidth=0;
  new ResizeObserver(()=>{const width=image.getBoundingClientRect().width;if(previousWidth&&Math.abs(width-previousWidth)>1&&running)stop();previousWidth=width;}).observe(image);
  window.FFMPaletteMotion={play,stop,get state(){return{mode:'scatter',running,elements:tiles.length};}};
})();
