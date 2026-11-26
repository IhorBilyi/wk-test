// Shared script for the secondary pages. Same behaviour as the homepage script, with each part guarded so a page only runs what it has.
(function () {
  const $ = id => document.getElementById(id);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Inline the Figma-exported illustrations so their layers can animate
  const fitIllus = el => {
    const svg = el.querySelector('svg'); if (!svg) return;
    const w = +svg.getAttribute('width'), h = +svg.getAttribute('height'), cw = el.clientWidth, ch = el.clientHeight;
    const s = Math.min(1, Math.max(+(el.dataset.min || 0.8), cw / w)), over = w * s - cw;
    svg.style.translate = 'none';
    svg.style.scale = s;
    svg.style.left = (over > 0 ? -over * +(el.dataset.fx || 0.5) : (cw - w * s) / 2) + 'px';
    svg.style.top = (ch - h * s) / 2 + 'px';
  };
  const iro = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => fitIllus(e.target))) : null;
  document.querySelectorAll('[data-svg]').forEach(el => {
    fetch(el.dataset.svg).then(r => r.ok ? r.text() : '').then(t => {
      el.innerHTML = t;
      if (el.classList.contains('illus')) { fitIllus(el); iro && iro.observe(el); }
    }).catch(() => {});
  });

  // Numbers that count up once (About facts)
  const countUp = el => {
    const to = +el.dataset.count; if (calm || !to) return;
    const t0 = performance.now(), dur = 1100;
    const step = now => { const p = Math.min(1, (now - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  };

  // Play blocks once they scroll 20% into the screen
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-anim');
    const show = el => { el.classList.add('is-in'); io.unobserve(el); setTimeout(() => el.querySelectorAll('[data-count]').forEach(countUp), 250); };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) show(e.target); }), { rootMargin: '0px 0px -20% 0px', threshold: 0 });
    const pending = [...document.querySelectorAll('[data-anim]')];
    pending.forEach(el => io.observe(el));
    const atEnd = () => { if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) pending.forEach(el => { if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight) show(el); }); };
    addEventListener('scroll', atEnd, { passive: true });
  }

  // Scale fixed-size mockups to their column width
  const boxes = document.querySelectorAll('.scale-box');
  const fit = () => boxes.forEach(b => {
    const s = Math.min(1, b.clientWidth / +b.dataset.w);
    b.style.height = (+b.dataset.h * s) + 'px';
    b.firstElementChild.style.transform = 'scale(' + s + ')';
  });
  if (boxes.length) { fit(); if ('ResizeObserver' in window) { const ro = new ResizeObserver(fit); boxes.forEach(b => ro.observe(b)); } else addEventListener('resize', fit); }

  // Nav: border on scroll, mobile menu
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 4);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menuBtn = $('menuBtn'), menu = $('mobileMenu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); });
    menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });
  }

  // Pricing calculator (same tiers as the homepage and waiverking.com/pricing)
  const range = $('formsRange'), num = $('formsNum');
  if (range && num) {
    const T = [[30, 15], [50, 30], [100, 50], [200, 85], [300, 110], [500, 145]], MAX = 500;
    const slider = $('slider'), tiersEl = $('tiers');
    const lo = i => i ? T[i - 1][0] : 0;
    const posToN = p => { const s = Math.min(T.length - 1, Math.floor(p / 100)); return Math.max(1, Math.round(lo(s) + (p - s * 100) / 100 * (T[s][0] - lo(s)))); };
    const nToPos = n => { const s = T.findIndex(t => n <= t[0]); if (s < 0) return 600; return s * 100 + (n - lo(s)) / (T[s][0] - lo(s)) * 100; };
    tiersEl.innerHTML = T.map((t, i) => '<button type="button" class="tier" data-i="' + i + '"><b>$' + t[1] + '</b><small>' + (lo(i) + 1) + '–' + t[0] + '</small></button>').join('');
    const render = (n, from) => {
      n = Math.max(1, Math.round(n) || 1);
      const t = T.findIndex(x => n <= x[0]);
      if (from !== 'num') num.value = n;
      if (from !== 'range') range.value = Math.round(nToPos(Math.min(MAX, n)));
      slider.style.setProperty('--pct', (nToPos(Math.min(MAX, n)) / 6) + '%');
      [...tiersEl.children].forEach((b, i) => b.classList.toggle('on', i === t));
      $('overLabel').textContent = 'Over ' + MAX + ' a month';
      if (t < 0) {
        $('price').textContent = 'Custom'; $('per').textContent = ''; $('unit').textContent = 'Volume discount';
        $('tierName').textContent = MAX + '+ signed forms'; $('nextLabel').textContent = 'Talk to us'; $('nextPrice').textContent = 'Usually same day';
      } else {
        $('price').textContent = '$' + T[t][1]; $('per').textContent = '/ month'; $('unit').textContent = 'Mindbody sync included';
        $('tierName').textContent = (lo(t) + 1) + '–' + T[t][0] + ' signed forms';
        $('nextLabel').textContent = 'Next tier (' + (T[t][0] + 1) + '+)';
        $('nextPrice').textContent = t < T.length - 1 ? '$' + T[t + 1][1] + ' / month' : 'Volume pricing';
      }
    };
    tiersEl.addEventListener('click', e => { const b = e.target.closest('.tier'); if (b) { const i = +b.dataset.i; render(Math.round((lo(i) + T[i][0]) / 2)); } });
    range.addEventListener('input', () => render(posToN(+range.value), 'range'));
    num.addEventListener('input', () => { if (num.value !== '') render(+num.value, 'num'); });
    num.addEventListener('blur', () => render(+num.value));
    render(80);
  }

  // Accordions: each question opens and closes on its own
  document.querySelectorAll('.acc').forEach(acc => acc.addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const item = btn.closest('.qa'), open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  }));

  // Contact form: mockup only, nothing is sent. Checks the required fields, then shows the thank-you state.
  const form = $('ctForm');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [...form.querySelectorAll('[required]')].filter(f => !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)));
    form.querySelectorAll('.bad').forEach(f => f.classList.remove('bad'));
    if (bad.length) {
      bad.forEach(f => f.classList.add('bad')); bad[0].focus();
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      return;
    }
    form.classList.add('sent');
  });
  if (form) form.addEventListener('input', e => e.target.classList.remove('bad'));
})();
