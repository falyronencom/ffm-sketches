(() => {
  'use strict';
  const key='ffm-fabric-album.intro-seen.v1';
  function shouldShow({hash,force,seen,reduced}) {
    // ?intro=1 is the demo link: it always shows the intro, also with a collection address.
    const first=!hash||hash.toLowerCase()==='#soderzhanie';
    return !reduced&&(force||(first&&!seen));
  }
  let seen=false;
  try{seen=sessionStorage.getItem(key)==='1';}catch{}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const show=shouldShow({hash:location.hash,force:new URLSearchParams(location.search).get('intro')==='1',seen,reduced});
  if(show){document.documentElement.classList.add('intro-active');document.documentElement.dataset.intro='closed';}
  window.ALBUM_INTRO_POLICY={key,show,reduced,shouldShow};
})();
