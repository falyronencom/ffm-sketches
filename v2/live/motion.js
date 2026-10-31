
(()=>{'use strict';
const body=document.body,hero=document.querySelector('.stage'),find=document.querySelector('#find'),band=document.querySelector('.band'),toggle=document.querySelector('#motion-toggle'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let enabled=!reduced.matches,scheduled=false;
// Сенсорные экраны (iPhone, Android): без движения из скрипта на каждый кадр прокрутки — на iPhone оно роняло кадры
// первого экрана; угасание заголовка там делает CSS (motion.css), приближение фото и смещение фона Brabus отключены.
const coarse=matchMedia('(pointer: coarse)');
const clamp=n=>Math.max(0,Math.min(1,n));
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}})},{threshold:.08});
document.querySelectorAll('.zph,.ztx,.trow,#collections .big,#samples .big').forEach(e=>{e.classList.add('reveal');observer.observe(e)});
function render(){scheduled=false;if(!enabled||reduced.matches||coarse.matches){hero.style.removeProperty('--hero-scale');hero.style.removeProperty('--hero-opacity');hero.style.removeProperty('--hero-y');band.style.removeProperty('--band-y');return}const h=innerHeight,p=clamp((h-find.getBoundingClientRect().top)/h);hero.style.setProperty('--hero-scale',String(1+(innerWidth<900?.012:.025)*(1-p)));hero.style.setProperty('--hero-opacity',String(1-p*.5));hero.style.setProperty('--hero-y',(-p*28)+'px');const b=band.getBoundingClientRect(),e=clamp((h-b.top)/(h+b.height));band.style.setProperty('--band-y',(47+e*7)+'%')}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(render)}}
function setMotion(value){enabled=value&&!reduced.matches;body.classList.toggle('motion-enabled',enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.innerHTML='<span class="motion-dot" aria-hidden="true"></span><span class="mt-text">Движение: '+(enabled?'вкл.':'выкл.')+'</span>';toggle.setAttribute('aria-label','Движение при прокрутке: '+(enabled?'включено':'выключено'));toggle.disabled=reduced.matches;schedule()}
toggle.addEventListener('click',()=>setMotion(!enabled));reduced.addEventListener('change',()=>setMotion(!reduced.matches));addEventListener('scroll',schedule,{passive:true});coarse.addEventListener('change',schedule);addEventListener('resize',schedule,{passive:true});document.querySelector('.to-top').addEventListener('click',()=>scrollTo({top:0,behavior:enabled?'smooth':'instant'}));setMotion(enabled);
const menu=document.querySelector('.mobile-menu'),menuButton=document.querySelector('#menu-button');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.focus()}
menuButton.addEventListener('click',()=>{menu.hidden=false;menuButton.setAttribute('aria-expanded','true');menu.querySelector('button').focus()});menu.querySelector('button').addEventListener('click',closeMenu);menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(document.querySelector('.ffm-dialog[open]'))return;if(e.key==='Escape'&&!menu.hidden)closeMenu();if(e.key==='Tab'&&!menu.hidden){const f=[...menu.querySelectorAll('button,a[href]')],first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
// Search and category navigation are implemented in catalog-search.js.
// Коллекции живой страницы нет: вместо перехода в старый каталог — подсказка со ссылкой на наброски варианта 2
const toast=document.createElement('div');toast.className='demo-toast';toast.setAttribute('role','status');toast.hidden=true;
toast.innerHTML='<p></p><div class="demo-toast-acts"><a href="../#screens">Открыть наброски</a><button type="button">Закрыть</button></div>';
document.body.append(toast);
const toastText=toast.querySelector('p'),toastClose=toast.querySelector('button');let toastTimer=0;
function showDemo(name){toastText.textContent='Страница коллекции '+name+' — в набросках варианта 2: живой в этой демонстрации сделана только главная.';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},9000)}
document.addEventListener('click',e=>{const a=e.target.closest('[data-demo]');if(!a)return;e.preventDefault();window.FFMSelection.open(a.dataset.demo, '', a)});
toastClose.addEventListener('click',()=>{toast.hidden=true});
document.addEventListener('keydown',e=>{if(document.querySelector('.ffm-dialog[open]'))return;if(e.key==='Escape'&&!toast.hidden)toast.hidden=true});
})();


