// 03.11.2026 — вариант 3: на компьютере (от 1200 точек) стена оттенков — весь первый экран, а подсветка коллекции
// и легенда стены переезжают в панель поверх стены; на меньших экранах остаются на прежнем месте над стеной.
(() => {
  const tag = document.querySelector('.hero-tag'), wall = document.querySelector('.pal-hero .wall');
  const tools = document.querySelector('.ffm-wall-tools'), hint = document.querySelector('.pal-hero .wall-hint');
  const link = tag && tag.querySelector('.hero-link');
  if (!tag || !wall || !tools || !hint || !link) return;
  const wide = matchMedia('(min-width:1200px)');
  const place = () => { if (wide.matches) link.before(tools, hint); else wall.before(tools, hint); };
  place();
  wide.addEventListener('change', place);
})();
