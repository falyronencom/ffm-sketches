(() => {
  'use strict';
  const input=document.querySelector('#fabric-search'),results=document.querySelector('#search-results'),message=document.querySelector('#search-message');
  const data=window.FFM_COLLECTIONS;
  const letters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
  const norm=s=>[...s.toLowerCase()].map(c=>letters[c]??c).join('').replace(/y/g,'i').trim();
  const same=(a,b)=>String(a).replace(/^0+/,'')===String(b).replace(/^0+/,'');
  const count=n=>`${n} ${n%10===1&&n%100!==11?'оттенок':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'оттенка':'оттенков'}`;
  for(const a of document.querySelectorAll('#find .lns a')){
    a.href='#catalog';a.dataset.catalog=a.dataset.catalog||a.textContent.trim();
    a.setAttribute('aria-haspopup','dialog');a.setAttribute('aria-controls','ffm-catalog');
  }
  input.setAttribute('aria-controls','search-results');
  function search(){
    const raw=input.value.trim();results.replaceChildren();message.replaceChildren();message.hidden=true;results.hidden=!raw;
    if(!raw)return [];
    const [,text,num]=raw.match(/^(.*?)\s*(\d+)?$/),q=norm(text);
    const matches=data.filter(c=>(!q||norm(c.name+' '+c.cat).includes(q))&&(!num||c.shades.some(s=>same(s.label,num))));
    for(const c of matches.slice(0,8)){
      const shade=num?c.shades.find(s=>same(s.label,num)):null;
      const li=document.createElement('li'),a=document.createElement('a'),name=document.createElement('b'),hint=document.createElement('span');
      a.href='#collection';a.dataset.collection=c.name;if(shade)a.dataset.shade=shade.label;
      name.textContent=c.name+(shade?' '+shade.label:'');hint.textContent=c.cat+(shade?'':' · '+count(c.shades.length));
      a.append(name,hint);li.append(a);results.append(li);
    }
    if(!matches.length){
      results.hidden=true;message.hidden=false;
      message.textContent=(num?'Оттенок':'Коллекцию')+' «'+raw+'» не нашли. Проверьте название и номер или выберите вид ткани ниже.';
    }else if(matches.length>8){
      message.hidden=false;message.append('Найдено коллекций: '+matches.length+'. ');
      const all=document.createElement('a');all.href='#catalog';all.dataset.catalog='all';all.dataset.catalogQuery=raw;all.textContent='Показать все результаты ↗︎';message.append(all);
    }
    return matches;
  }
  input.addEventListener('input',search);
  input.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('a')?.focus();}
    if(e.key==='Escape'){results.hidden=true;message.hidden=true;}
  });
  document.querySelector('#search-form').addEventListener('submit',e=>{
    e.preventDefault();const matches=search();
    if(matches.length===1){const hit=results.querySelector('a');window.FFMSelection.open(hit.dataset.collection,hit.dataset.shade,input);}
    else if(matches.length>1)window.FFMSelection.openCatalog('all',input,input.value.trim());
  });
  document.querySelectorAll('a[href="#find"]').forEach(a=>a.addEventListener('click',()=>setTimeout(()=>input.focus({preventScroll:true}),matchMedia('(prefers-reduced-motion: reduce)').matches?0:550)));
})();
