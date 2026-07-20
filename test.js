
(function(){
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* scroll progress + nav */
  const progress = document.getElementById('progress');
  const nav = document.getElementById('nav');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    progress.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    nav.classList.toggle('scrolled', h.scrollTop > 30);
  }, {passive:true});

  /* reveal on scroll */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));

  if (reduced) return;

  /* cursor glow + dot */
  const glow = document.getElementById('glow');
  const dot = document.getElementById('dot');
  let mx = innerWidth/2, my = innerHeight/2, gx = mx, gy = my;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.opacity = 1;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  }, {passive:true});
  (function loop(){
    gx += (mx - gx) * .07; gy += (my - gy) * .07;
    glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
    requestAnimationFrame(loop);
  })();

  /* magnetic buttons */
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top - r.height/2;
      btn.style.transform = `translate(${x*.18}px, ${y*.22}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

  /* card spotlight follows cursor */
  document.querySelectorAll('.spotlight').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Cinematic Engine ---------- */
  const TOTAL_FRAMES = 54;
  const framesContainer = document.getElementById('cinematic-frames');
  const canvasElement = document.getElementById('cinematic-canvas');
  const cineCtx = canvasElement.getContext('2d', { alpha: false }); // Disable alpha for max performance
  canvasElement.width = 1920;
  canvasElement.height = 1080;

  const loadingScreen = document.getElementById('loading-screen');
  const loadingText = loadingScreen.querySelector('.loading-text');
  const mainContent = document.getElementById('main-content');
  
  const frameImgs = [];
  let loadedCount = 0;

  for(let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(3, '0');
    img.src = `public/ezgif-frame-${frameNum}.jpg`;
    frameImgs.push(img);
    img.onload = () => loadedCount++;
    img.onerror = () => loadedCount++;
  }

  const hasVisited = sessionStorage.getItem('hasVisitedPremium');
  let cinematicInitialized = false;

  function initCinematic() {
    if(cinematicInitialized) return;
    cinematicInitialized = true;
    
    loadingScreen.style.opacity = '0';
    mainContent.classList.add('loaded'); // Trigger fade-in

    setTimeout(() => {
      loadingScreen.style.display = 'none';
      if(window.loaderAnimFrame) cancelAnimationFrame(window.loaderAnimFrame);
    }, 900);

    requestAnimationFrame(cineRenderLoop);
  }

  const loaderCanvas = document.getElementById('loader-canvas');
    const lctx = loaderCanvas.getContext('2d');
    
    function resizeLoader() {
      loaderCanvas.width = window.innerWidth;
      loaderCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeLoader);
    resizeLoader();

    let startTime = null;
    const duration = 4000;
    
    let stars = [];
    let particles = [];
    let phase = 'counting'; // 'counting', 'flash'
    let starsSpawned = false;
    let flashProgress = 0;

    function spawnStars(w, h) {
      const dist = Math.max(w, h) / 1.4;
      stars = [
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 }
      ];
      stars.forEach(s => { s.dist = dist; });
    }

    function createExplosion(x, y) {
      for(let i=0; i<120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 22 + 8;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: Math.random() * 0.02 + 0.01,
          size: Math.random() * 5 + 1.5
        });
      }
    }

    function drawLoader(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      let progress = Math.min(elapsed / duration, 1);
      
      const w = loaderCanvas.width;
      const h = loaderCanvas.height;
      const cx = w / 2;
      const cy = h / 2;

      lctx.globalCompositeOperation = 'source-over';
      lctx.fillStyle = 'rgba(0, 0, 0, 0.28)'; // trailing motion blur effect
      lctx.fillRect(0, 0, w, h);
      
      lctx.globalCompositeOperation = 'screen';

      if (progress < 1) {
        loadingText.textContent = `Loading... ${Math.floor(progress * 100)}%`;
      }

      if (progress >= 0.9 && !starsSpawned) {
        starsSpawned = true;
        spawnStars(w, h);
      }

      if (starsSpawned && progress < 1) {
        const easeIn = 1 - Math.pow(1 - ((progress - 0.9) / 0.1), 3); // accelerate inward

        stars.forEach(s => {
          const currentDist = s.dist * (1 - easeIn);
          const drawX = cx - s.dx * currentDist;
          const drawY = cy - s.dy * currentDist;

          // Trail
          for(let k=0; k<2; k++){
            particles.push({
              x: drawX + (Math.random()-0.5)*12, 
              y: drawY + (Math.random()-0.5)*12,
              vx: -s.dx * (Math.random()*4), 
              vy: -s.dy * (Math.random()*4),
              life: 1, decay: 0.06, size: Math.random()*3+1
            });
          }

          // Draw star head
          lctx.beginPath();
          lctx.arc(drawX, drawY, 5, 0, Math.PI*2);
          lctx.fillStyle = '#FFF';
          lctx.fill();
          
          lctx.beginPath();
          lctx.arc(drawX, drawY, 20, 0, Math.PI*2);
          lctx.fillStyle = 'rgba(91,140,255,0.6)';
          lctx.fill();
        });
      }

      if (progress >= 1 && phase !== 'flash') {
        phase = 'flash';
        loadingText.textContent = `Loading... 100%`;
        loadingText.style.opacity = '0'; // fade text out
        createExplosion(cx, cy);
        
        // Hold flash for a tiny bit, then trigger transition
        setTimeout(() => {
          initCinematic();
        }, 400); 
      }

      if (phase === 'flash') {
        flashProgress += 0.04;
        if (flashProgress < 1.5) {
          const radius = flashProgress * Math.max(w, h);
          const grad = lctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          grad.addColorStop(0, `rgba(255, 255, 255, ${1 - flashProgress/1.5})`);
          grad.addColorStop(0.15, `rgba(91,140,255, ${0.6 * (1 - flashProgress/1.5)})`);
          grad.addColorStop(1, 'transparent');
          lctx.fillStyle = grad;
          lctx.fillRect(0, 0, w, h);
        }
      }

      // Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          lctx.beginPath();
          lctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
          lctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
          lctx.fill();
        }
      }

      if (!cinematicInitialized || flashProgress < 1.5 || particles.length > 0) {
        window.loaderAnimFrame = requestAnimationFrame(drawLoader);
      }
    }
    
    window.loaderAnimFrame = requestAnimationFrame(drawLoader);

  let cineTargetScroll = 0, cineCurrentScroll = 0;
  let cineMouseX = window.innerWidth / 2, cineMouseY = window.innerHeight / 2;
  let cineTargetMouseX = cineMouseX, cineTargetMouseY = cineMouseY;
  let viewportHeight = window.innerHeight;
  let docHeight = document.documentElement.scrollHeight;

  window.addEventListener('resize', () => {
    viewportHeight = window.innerHeight;
    docHeight = document.documentElement.scrollHeight;
    initDust();
  }, {passive:true});

  window.addEventListener('scroll', () => { cineTargetScroll = window.scrollY; }, {passive:true});
  
  const heroBadge = document.querySelector('.hero-badge');
  const heroContent = document.querySelector('.hero-content');
  const heroMeta = document.querySelector('.hero-meta');
  const scrollHint = document.querySelector('.scroll-hint');
  const dynamicGradient = document.getElementById('dynamic-gradient-overlay');
  const parallaxRig = document.getElementById('cinematic-parallax-rig');

  window.addEventListener('mousemove', (e) => {
    cineTargetMouseX = e.clientX;
    cineTargetMouseY = e.clientY;
  }, {passive:true});

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  // Dust Particles
  const canvas = document.getElementById('dust-particles');
  const ctx = canvas.getContext('2d');
  let particles = [];
  function initDust() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    for(let i=0; i<150; i++){
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        dy: -(Math.random() * 0.5 + 0.1),
        dx: Math.random() * 0.4 - 0.2,
        phase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.05
      });
    }
  }
  initDust();

  function drawDust() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.dy;
      p.x += Math.sin(p.phase) * 0.2 + p.dx;
      p.phase += 0.02;
      if(p.y < -10) p.y = canvas.height + 10;
      if(p.x < -10) p.x = canvas.width + 10;
      if(p.x > canvas.width + 10) p.x = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
    });
  }

  function cineRenderLoop() {
    // Lerp scroll and mouse (higher value = snappier, instantly follows mouse wheel)
    cineCurrentScroll = lerp(cineCurrentScroll, cineTargetScroll, 0.15);
    cineMouseX = lerp(cineMouseX, cineTargetMouseX, 0.05);
    cineMouseY = lerp(cineMouseY, cineTargetMouseY, 0.05);

    // Frame calculation: The animation spans the entire length of the page
    let animScrollDistance = Math.max(1, docHeight - viewportHeight);
    let progress = Math.max(0, Math.min(1, cineCurrentScroll / animScrollDistance));
    let frameProgress = progress * (TOTAL_FRAMES - 1);
    let currentFrame = Math.floor(frameProgress);

    // Draw the active frame instantly to the hardware-accelerated canvas ONLY if it changed
    if (frameImgs[currentFrame] && frameImgs[currentFrame].complete) {
      if (window.lastDrawnFrame !== currentFrame) {
        cineCtx.drawImage(frameImgs[currentFrame], 0, 0, 1920, 1080);
        window.lastDrawnFrame = currentFrame;
      }
    }

    // Camera movement - Zoom perfectly from the center without panning up
    let easedProgress = easeInOutCubic(progress);
    let camScale = lerp(1, 1.25, easedProgress);
    framesContainer.style.transform = `scale(${camScale})`;

    // Mouse parallax (max 15px)
    let mxOffset = ((cineMouseX / window.innerWidth) - 0.5) * 30;
    let myOffset = ((cineMouseY / window.innerHeight) - 0.5) * 30;
    parallaxRig.style.transform = `translate3d(${-mxOffset}px, ${-myOffset}px, 0)`;

    // Gradient Overlay - Lightened to reveal the background clearly
    let gradOpMid = lerp(0.40, 0.15, progress);
    dynamicGradient.style.background = `linear-gradient(to right, rgba(0,0,0,0.60), rgba(0,0,0,${gradOpMid}), rgba(0,0,0,0.0))`;

    // Hero content fading - fade out rapidly over the first 35% of viewport scroll
    let heroProg = Math.min(1, Math.max(0, cineCurrentScroll / (window.innerHeight * 0.35)));
    if (heroBadge) {
      heroBadge.style.transform = `translate3d(0, ${-100 * heroProg}px, 0)`;
      heroBadge.style.opacity = 1 - heroProg;
    }
    if (heroContent) {
      heroContent.style.transform = `translate3d(0, ${-250 * heroProg}px, 0)`;
      heroContent.style.opacity = 1 - heroProg;
    }
    if (heroMeta) {
      heroMeta.style.transform = `translate3d(0, ${-150 * heroProg}px, 0)`;
      heroMeta.style.opacity = 1 - heroProg;
    }
    if (scrollHint) {
      scrollHint.style.transform = `translate3d(-50%, ${-100 * heroProg}px, 0)`;
      scrollHint.style.opacity = 1 - heroProg;
    }

    drawDust();
    requestAnimationFrame(cineRenderLoop);
  }
})();
