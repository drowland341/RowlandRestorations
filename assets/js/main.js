/* ===========================
   Rowland Restorations - main.js
   =========================== */

// ---- Footer year ----
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// ---- Mobile menu ----
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => links.classList.toggle("show"));
}

// ---- Theme (Light/Dark) ----
const root = document.documentElement;
const THEME_KEY = "rr-theme";
const btn = document.getElementById("theme-toggle");

function applyTheme(theme) {
  root.dataset.theme = theme; // sets [data-theme="light"|"dark"]
  if (btn) {
    const isLight = theme === "light";
    btn.setAttribute("aria-pressed", String(isLight));
    const icon = btn.querySelector(".theme-icon");
    const label = btn.querySelector(".label");
    if (icon) icon.textContent = isLight ? "☀️" : "🌙";
    if (label) label.textContent = isLight ? "Light" : "Dark";
    btn.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
  }
}

const stored = localStorage.getItem(THEME_KEY);
const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
applyTheme(stored || (prefersLight ? "light" : "dark"));

if (btn) {
  btn.addEventListener("click", () => {
    const next = (root.dataset.theme === "light") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

// Follow system changes if the user hasn't chosen manually
if (!stored) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", e => {
    applyTheme(e.matches ? "light" : "dark");
  });
}

/* ==========================================================
   Slider + Lightbox with mobile gestures & accessibility
   ========================================================== */
(function(){
  const sliders = document.querySelectorAll('.slider');
  if (!sliders.length) return;

  // ---------- Reusable lightbox ----------
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <button class="lb-close" aria-label="Close">×</button>
    <button class="lb-prev" aria-label="Previous">‹</button>
    <img alt="">
    <button class="lb-next" aria-label="Next">›</button>
  `;
  document.body.appendChild(lb);

  let lbSet = []; let lbIndex = 0;
  const lbImg = lb.querySelector('img');
  const openLB = () => { lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeLB = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
  const showLB = (i) => { lbIndex = (i + lbSet.length) % lbSet.length; lbImg.src = lbSet[lbIndex]; };

  // Tap image or backdrop to close
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.tagName === 'IMG') closeLB();
  });
  // Keyboard inside lightbox
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') showLB(lbIndex - 1);
    if (e.key === 'ArrowRight') showLB(lbIndex + 1);
  });
  // Swipe in lightbox
  attachSwipe(lb, {
    onLeft : () => showLB(lbIndex + 1),
    onRight: () => showLB(lbIndex - 1),
    axis: 'x'
  });

  // ---------- Sliders ----------
  sliders.forEach(slider => {
    const anchors = Array.from(slider.querySelectorAll('.slides a'));
    if (!anchors.length) return;

    // Make images non-draggable (nicer swipe)
    anchors.forEach(a => { const img = a.querySelector('img'); if (img) img.draggable = false; });

    const slidesEl = slider.querySelector('.slides');
    const prevBtn  = slider.querySelector('.slide-nav.prev');
    const nextBtn  = slider.querySelector('.slide-nav.next');
    const dotsEl   = slider.querySelector('.dots');

    // Dots
    dotsEl.innerHTML = anchors.map((_,i)=>`<button aria-label="Go to slide ${i+1}"></button>`).join('');
    const dots = Array.from(dotsEl.children);

    let i = 0, timer;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const show = (n) => {
      i = (n + anchors.length) % anchors.length;
      anchors.forEach((a,idx)=> a.classList.toggle('active', idx === i));
      dots.forEach((d,idx)=> d.classList.toggle('active', idx === i));
    };

    const start = () => { if (!prefersReduce) timer = setInterval(()=> show(i + 1), 4000); };
    const stop  = () => { if (timer) clearInterval(timer); };

    // Init
    show(0); start();

    // Click nav
    prevBtn.addEventListener('click', ()=> { stop(); show(i - 1); start(); });
    nextBtn.addEventListener('click', ()=> { stop(); show(i + 1); start(); });
    dots.forEach((b,idx)=> b.addEventListener('click', ()=> { stop(); show(idx); start(); }));

    // Pause when tab hidden (battery friendly)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    // Open lightbox with full-res images
    slider.addEventListener('click', e => {
      const a = e.target.closest('.slides a');
      if (!a) return;
      e.preventDefault();
      lbSet = anchors.map(x => x.getAttribute('href'));
      showLB(lbSet.indexOf(a.getAttribute('href')));
      openLB();
    });

    // Touch/drag swipe on the slider itself
    attachSwipe(slidesEl, {
      onLeft : () => { stop(); show(i + 1); start(); },
      onRight: () => { stop(); show(i - 1); start(); },
      axis   : 'x'
    });

    // Pause on hover (desktop)
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
  });

  // ---------- Pointer/touch swipe helper ----------
  function attachSwipe(el, { onLeft, onRight, axis='x' }){
    let startX=0, startY=0, dragging=false, moved=false;

    const threshold = 50;  // px to trigger slide
    const guard = 8;       // px before deciding intent (scroll vs swipe)

    const start = (x, y, e) => {
      startX = x; startY = y; dragging = true; moved = false;
      if (e.pointerId && e.target.setPointerCapture) {
        try { e.target.setPointerCapture(e.pointerId); } catch(_) {}
      }
    };
    const move = (x, y, e) => {
      if (!dragging) return;
      const dx = x - startX; const dy = y - startY;
      if (!moved && Math.hypot(dx,dy) > guard) moved = true;

      // Allow vertical page scroll; block horizontal to keep swipe smooth
      if (Math.abs(dy) > Math.abs(dx)) return;
      e.preventDefault?.();
    };
    const end = (x, y) => {
      if (!dragging) return; dragging = false;
      const dx = x - startX; const dy = y - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold){
        if (dx < 0) onLeft && onLeft(); else onRight && onRight();
      }
    };

    // Pointer Events (modern browsers)
    if (window.PointerEvent){
      el.addEventListener('pointerdown', e => start(e.clientX, e.clientY, e));
      el.addEventListener('pointermove', e => move(e.clientX, e.clientY, e), { passive:false });
      el.addEventListener('pointerup',   e => end(e.clientX, e.clientY));
      el.addEventListener('pointercancel', () => dragging=false);
    } else { // Fallback: Touch Events
      el.addEventListener('touchstart', e => {
        const t = e.touches[0]; start(t.clientX, t.clientY, e);
      }, { passive:true });
      el.addEventListener('touchmove', e => {
        const t = e.touches[0]; move(t.clientX, t.clientY, e);
      }, { passive:false });
      el.addEventListener('touchend', e => {
        const t = e.changedTouches[0]; end(t.clientX, t.clientY);
      });
    }
  }
})();
