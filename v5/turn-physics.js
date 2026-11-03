(() => {
  'use strict';
  function frames(degrees,mobile) {
    const peak = 90 / Math.abs(degrees);
    const offsets = [...new Set([0,.5,.6,.8,peak,1])].sort((a,b) => a-b);
    return offsets.map(p => {
      const reveal = p <= peak ? p/peak : (1-p)/(1-peak);
      const landing = p <= .6 ? 0 : p <= .8 ? (p-.6)/.2 : (1-p)/.2;
      const frame = {
        offset:p,
        '--turn-angle':`${degrees*p}deg`,
        '--shade':.65*(1-Math.abs(2*p-1)),
        '--turn-reveal-opacity':.45*reveal,
        '--turn-reveal-width':`${60-50*p}%`,
        '--turn-landing-opacity':.3*landing,
        '--turn-landing-width':`${44*Math.max(0,(p-.6)/.4)}%`,
        '--turn-glint':`${120-140*p}%`
      };
      // The phone leaf stays solid until 60% of the turn, then fades as it passes the edge.
      if (mobile) frame['--turn-opacity'] = p <= .6 ? 1 : (1-p)/.4;
      return frame;
    });
  }
  function decorate(scene,forward,mobile) {
    scene.classList.toggle('turn-scene-mobile',mobile);
    for (const [kind,side] of [['reveal',forward?'right':'left'],['landing',forward?'left':'right']]) {
      const page = document.createElement('div');
      page.className = `turn-shadow-page turn-${kind} ${side}`;
      const band = document.createElement('div');
      band.className = 'turn-shadow-band';
      page.append(band);scene.append(page);
    }
  }
  function create({host,front,back,stationary,forward=true,mobile=false,duration,easing}) {
    const scene=document.createElement('div');
    scene.className='turn-scene';scene.setAttribute('aria-hidden','true');scene.inert=true;
    // A viewpoint 14 page-widths away: at 90° the leaf's near edge grows by ~8% instead of ~30%.
    // The eye sits a little below centre, where the book has less room above the controls than
    // below the logo, so the edge stays clear of both.
    if(!mobile){scene.style.perspective=Math.round(host.clientWidth*7)+'px';scene.style.perspectiveOrigin='50% 58%';}
    const leaf=document.createElement('div');
    leaf.className='turn-leaf'+(mobile?' turn-mobile':forward?'':' reverse');
    if(mobile&&!forward)leaf.style.transformOrigin='right';
    const frontFace=document.createElement('div');frontFace.className='turn-face turn-front';frontFace.append(front);
    leaf.append(frontFace);
    if(!mobile){
      if(stationary){const fixed=document.createElement('div');fixed.className=`turn-static ${forward?'left':'right'}`;fixed.append(stationary);scene.append(fixed);}
      const backFace=document.createElement('div');backFace.className='turn-face turn-back';backFace.append(back);leaf.append(backFace);
    }
    scene.append(leaf);decorate(scene,forward,mobile);host.append(scene);
    const degrees=(forward?-1:1)*(mobile?105:180);
    const timing={duration,easing,fill:'both'};
    let animation;
    if(!mobile)animation=scene.animate(frames(degrees,false),timing);
    else{
      // On a phone the leaf is a clone of the whole page. Inherited custom properties animated on the
      // scene made the browser restyle every element of that clone on every frame (Samsung A72: 7 frames
      // per turn). The leaf now turns and fades with transform and opacity of its own, which the
      // compositor runs; only the two small shadow bands keep the custom properties. The animations
      // share timing and are driven together, so dragging and reversing stay in step.
      const list=frames(degrees,true);
      const leafFrames=list.map(f=>({offset:f.offset,transform:`rotateY(${f['--turn-angle']})`,opacity:f['--turn-opacity']}));
      const shadowFrames=list.map(f=>({offset:f.offset,'--turn-reveal-opacity':f['--turn-reveal-opacity'],'--turn-reveal-width':f['--turn-reveal-width'],'--turn-landing-opacity':f['--turn-landing-opacity'],'--turn-landing-width':f['--turn-landing-width']}));
      animation=together([leaf.animate(leafFrames,timing),...[...scene.querySelectorAll('.turn-shadow-page')].map(p=>p.animate(shadowFrames,timing))]);
    }
    animation.pause();
    return {scene,leaf,animation,duration};
  }
  // Several animations behind the interface of one: time, rate, play, pause, cancel, finished.
  function together(list) {
    const lead=list[0];
    return {
      get currentTime(){return lead.currentTime;},set currentTime(t){for(const a of list)a.currentTime=t;},
      get playbackRate(){return lead.playbackRate;},set playbackRate(r){for(const a of list)a.playbackRate=r;},
      play(){for(const a of list)a.play();},pause(){for(const a of list)a.pause();},cancel(){for(const a of list)a.cancel();},
      get finished(){return lead.finished;}
    };
  }
  window.ALBUM_TURN_PHYSICS = {frames,decorate,create};
})();
