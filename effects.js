// Efeitos de movimento: logo em partículas, campo de ondas 3D, contadores e parallax.
// Todos param quando saem da tela e respeitam "reduzir movimento" do sistema.
(function () {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = window.matchMedia('(max-width: 760px)').matches;

  // Chama cb(true/false) quando o elemento entra/sai da tela
  function onVisible(el, cb, threshold = 0) {
    const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold });
    io.observe(el);
  }

  /* ------------------------------------------------------------------
   * Logo JF3 em partículas (adaptado de "SVG Particle — Originkit").
   * Os pontos vagueiam soltos e se juntam no formato do logo quando ele
   * aparece na tela; o cursor (ou o dedo) empurra os pontos ao redor.
   * ------------------------------------------------------------------ */
  function particleLogo(canvas) {
    const ctx = canvas.getContext('2d');
    const gap = Number(canvas.dataset.gap || 3);
    const radius = Number(canvas.dataset.radius || 50);
    const FORCE = 10;
    const DUR = 1400;
    let W = 0, H = 0, dpr = 1, buf = null, particles = [];
    let state = 'roam', t0 = 0, k = 0, raf = 0, visible = false;
    const mouse = { x: -1e5, y: -1e5, active: false };
    const smooth = { x: -1e5, y: -1e5 };
    let prev = null, speed = 0;

    const img = new Image();
    img.onload = build;
    img.src = canvas.dataset.particles;
    new ResizeObserver(() => img.complete && build()).observe(canvas);

    function build() {
      const r = canvas.getBoundingClientRect();
      W = Math.round(r.width);
      H = Math.round(r.height);
      if (!W || !H || !img.naturalWidth) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      buf = ctx.createImageData(canvas.width, canvas.height);

      // Desenha o logo centralizado (contain) e amostra os pixels opacos
      const s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const oc = off.getContext('2d');
      oc.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      const px = oc.getImageData(0, 0, W, H).data;

      particles = [];
      for (let y = 0; y < H; y += gap) {
        for (let x = 0; x < W; x += gap) {
          const i = (y * W + x) * 4;
          if (px[i + 3] < 40) continue;
          const rx = Math.random() * W, ry = Math.random() * H;
          particles.push({
            hx: x, hy: y, rx, ry, sx: rx, sy: ry, dx: rx, dy: ry,
            vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
            tx: Math.random() * W, ty: Math.random() * H,
            px: 0, py: 0, near: false,
            c: Math.min(255, px[i] + 30), a: px[i + 3],
          });
        }
      }
      if (REDUCE) {
        state = 'formed';
        k = 1;
        particles.forEach((p) => { p.dx = p.hx; p.dy = p.hy; });
        draw();
        return;
      }
      state = 'roam';
      if (visible) setTimeout(assemble, 300);
      start();
    }

    function assemble() {
      if (state !== 'roam' || !particles.length) return;
      particles.forEach((p) => { p.sx = p.dx; p.sy = p.dy; });
      state = 'assembling';
      t0 = performance.now();
    }

    function scatter() {
      particles.forEach((p) => {
        p.rx = p.dx;
        p.ry = p.dy;
        p.tx = Math.random() * W;
        p.ty = Math.random() * H;
      });
      state = 'roam';
      k = 0;
    }

    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

    function step(now) {
      if (state === 'assembling') {
        k = ease(Math.min(1, (now - t0) / DUR));
        if (k >= 1) state = 'formed';
      }
      const hit = speed;
      speed *= 0.88;
      if (mouse.active) {
        if (smooth.x < -9e4) { smooth.x = mouse.x; smooth.y = mouse.y; }
        const l = Math.max(0.08, 0.3 - hit * 0.006);
        smooth.x += (mouse.x - smooth.x) * l;
        smooth.y += (mouse.y - smooth.y) * l;
      } else {
        smooth.x = smooth.y = -1e5;
      }
      for (const p of particles) {
        let bx, by;
        if (state === 'roam') {
          const tx = p.tx - p.rx, ty = p.ty - p.ry;
          if (tx * tx + ty * ty < 9) { p.tx = Math.random() * W; p.ty = Math.random() * H; }
          p.vx = p.vx * 0.98 + tx * 0.003;
          p.vy = p.vy * 0.98 + ty * 0.003;
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > 1.5) { p.vx = (p.vx / sp) * 1.5; p.vy = (p.vy / sp) * 1.5; }
          p.rx += p.vx;
          p.ry += p.vy;
          bx = p.rx; by = p.ry;
        } else if (state === 'assembling') {
          bx = p.sx + (p.hx - p.sx) * k;
          by = p.sy + (p.hy - p.sy) * k;
        } else {
          bx = p.hx; by = p.hy;
        }
        // Repulsão em volta do cursor
        p.near = false;
        if (mouse.active) {
          const ex = bx - smooth.x, ey = by - smooth.y, d2 = ex * ex + ey * ey;
          if (d2 > 0 && d2 < radius * radius) {
            const d = Math.sqrt(d2), nx = ex / d, ny = ey / d, fall = 1 - d / radius;
            p.px += nx * fall * hit * FORCE * 0.05;
            p.py += ny * fall * hit * FORCE * 0.05;
            p.px += (nx * (radius - d) - p.px) * 0.06;
            p.py += (ny * (radius - d) - p.py) * 0.06;
            p.near = true;
          }
        }
        if (!p.near) { p.px *= 0.97; p.py *= 0.97; }
        p.dx = bx + p.px;
        p.dy = by + p.py;
      }
    }

    function draw() {
      const PW = canvas.width, PH = canvas.height, d = buf.data;
      d.fill(0);
      const ps = Math.max(2, Math.round(1.6 * dpr)), half = ps / 2;
      const alpha = state === 'roam' ? 0.45 : 0.45 + 0.55 * k;
      for (const p of particles) {
        const x0 = Math.round(p.dx * dpr) - (ps >> 1), y0 = Math.round(p.dy * dpr) - (ps >> 1);
        const a = Math.round(p.a * alpha);
        for (let yy = 0; yy < ps; yy++) {
          const iy = y0 + yy;
          if (iy < 0 || iy >= PH) continue;
          for (let xx = 0; xx < ps; xx++) {
            const ix = x0 + xx;
            if (ix < 0 || ix >= PW) continue;
            if (ps > 2) {
              const ddx = xx - half + 0.5, ddy = yy - half + 0.5;
              if (ddx * ddx + ddy * ddy > half * half) continue;
            }
            const i = (iy * PW + ix) * 4;
            d[i] = d[i + 1] = d[i + 2] = p.c;
            d[i + 3] = a;
          }
        }
      }
      ctx.putImageData(buf, 0, 0);
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      step(now);
      draw();
    }
    function start() { if (!raf && visible && !REDUCE && particles.length) raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    onVisible(canvas, (v) => {
      visible = v;
      if (v) { start(); setTimeout(() => visible && assemble(), 300); }
      else { stop(); if (particles.length && !REDUCE) scatter(); }
    }, 0.25);

    function pointer(e) {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) * W) / r.width;
      const y = ((e.clientY - r.top) * H) / r.height;
      if (prev) speed = Math.hypot(x - prev.x, y - prev.y);
      prev = { x, y };
      mouse.x = x; mouse.y = y; mouse.active = true;
      assemble();
    }
    function leave() { mouse.active = false; prev = null; }
    canvas.addEventListener('pointermove', pointer);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', leave);
    canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') leave(); });
  }

  /* ------------------------------------------------------------------
   * Campo de ondas 3D (adaptado de "Scroll Wave Field — Originkit").
   * Uma malha de pontos sobre ondas senoidais vista em perspectiva, que
   * flui em direção à câmera. O cursor levanta a superfície e segurar o
   * clique acelera o fluxo. Shaders mantidos do original.
   * ------------------------------------------------------------------ */
  const FIELD_W = 3600, FIELD_D = 7000, CAM_Z0 = 700, FOV = 60, TAU = Math.PI * 2;
  const CAM_Y_FULL = 550, CAM_REF_AREA = 1200 * 800, CURSOR_FOLLOW = 7;

  const VERT = `
precision highp float;
attribute vec2 aGrid;
attribute vec2 aSeed;
uniform vec2 uRes; uniform float uFocal; uniform float uTime; uniform float uAmp;
uniform float uScatter; uniform float uFreq; uniform vec2 uDir; uniform float uFlow;
uniform float uDepth; uniform float uCamY; uniform float uCamZ; uniform float uPitch;
uniform float uRoll; uniform float uDot; uniform float uColorCount; uniform vec2 uJit;
uniform vec3 uColors[8]; uniform vec3 uCursor; uniform float uCurR; uniform float uCurS;
uniform float uHover;
varying vec3 vCol; varying float vA; varying float vHot;
vec3 pickColor(float sel) {
  float idx = floor(sel * uColorCount);
  vec3 c = uColors[0];
  for (int i = 1; i < 8; i++) {
    if (float(i) >= uColorCount) break;
    if (float(i) == idx) c = uColors[i];
  }
  return c;
}
float surf(vec2 q) {
  return sin(q.x) * 0.55 + sin(q.x * 0.55 + q.y * 1.15) * 0.30 + sin(q.y * 0.75) * 0.22;
}
void main() {
  vec2 w = aGrid + (aSeed - 0.5) * uJit;
  w.y = uCamZ + mod(w.y - uFlow - uCamZ, uDepth);
  float h3 = fract(sin(dot(aSeed, vec2(91.37, 47.13))) * 12345.678);
  float h = surf(w * uFreq - uDir * uTime) * uAmp + (h3 - 0.5) * uScatter;
  float cd = length(w - uCursor.xy);
  float g = exp(-(cd * cd) / (uCurR * uCurR)) * uCursor.z;
  h += g * uCurS;
  float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;
  vec3 p = vec3(w.x, h - uCamY, w.y - uCamZ);
  float c = cos(uPitch); float s = sin(uPitch);
  float ry = p.y * c + p.z * s;
  float rz = -p.y * s + p.z * c;
  if (rz < 40.0) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0;
    vCol = uColors[0]; vA = 0.0; vHot = 0.0; return;
  }
  float cr = cos(uRoll); float sr = sin(uRoll);
  float rx = p.x * cr - ry * sr;
  float ryr = p.x * sr + ry * cr;
  gl_Position = vec4((rx * uFocal / rz) / (uRes.x * 0.5), (ryr * uFocal / rz) / (uRes.y * 0.5), 0.0, 1.0);
  float rad = max(uDot * uFocal / rz, 0.55);
  gl_PointSize = clamp(rad * 2.0 * (1.0 + g2 * uHover * 0.20), 1.0, 220.0);
  float bri = 0.28 + h3 * 0.72;
  vec2 bq = w * vec2(0.0040, 0.0032) - uDir * uTime * 0.30;
  float band = sin(bq.x) + sin(bq.y);
  float sel = fract((band + 2.0) * 0.25 + (aSeed.y - 0.5) * 0.55);
  vCol = pickColor(sel);
  float lum = dot(vCol, vec3(0.299, 0.587, 0.114));
  vHot = (0.25 + 0.75 * lum) * bri * bri * 0.7 + g2 * uHover * 0.55;
  float fog = (1.0 - smoothstep(2800.0, 6400.0, rz)) * smoothstep(70.0, 240.0, rz);
  vA = bri * fog * (1.0 + g2 * uHover * 0.55);
}`;

  const FRAG = `
precision highp float;
varying vec3 vCol; varying float vA; varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = (1.0 - smoothstep(0.90, 1.0, d)) * vA;
  vec3 col = vCol + vec3(1.0) * pow(1.0 - d, 10.0) * vHot * 0.9;
  gl_FragColor = vec4(col * a, a);
}`;

  function hexToRgb(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function waveField(canvas) {
    const host = canvas.parentElement;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false });
    if (!gl) return; // sem WebGL: fica o fundo em gradiente da faixa

    // Ajustes do original, com cores da marca (azul-marinho e prata)
    const L = {
      colors: ['#4c5fd6', '#c9ced8', '#2b3a8c'],
      density: SMALL ? 85 : 145, dotSize: 2, scatter: 108, cameraHeight: 50,
      waveHeight: 200, waveLength: 2070, waveSpeed: 250,
      tiltStart: 12, rollStart: 0, cursorRadius: 25, cursorLift: 45,
    };
    const flowSpeed = L.waveSpeed * (260 / 160);
    const hoverGlow = Math.min(400, Math.abs(L.cursorLift) * (100 / 45));

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn('Ondas (shader):', gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('Ondas (link):', gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);

    const aGrid = gl.getAttribLocation(prog, 'aGrid');
    const aSeed = gl.getAttribLocation(prog, 'aSeed');
    const U = {};
    ['uRes', 'uFocal', 'uTime', 'uAmp', 'uScatter', 'uFreq', 'uDir', 'uFlow', 'uDepth', 'uCamY', 'uCamZ',
      'uPitch', 'uRoll', 'uDot', 'uColorCount', 'uJit', 'uCursor', 'uCurR', 'uCurS', 'uHover']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    U.uColors = gl.getUniformLocation(prog, 'uColors[0]');

    // Malha de pontos (posições fixas + sementes aleatórias estáveis)
    const cols = Math.max(8, Math.round(L.density)), rows = Math.max(8, Math.round(L.density * 2));
    const count = cols * rows;
    const spacingX = FIELD_W / (cols - 1), spacingZ = FIELD_D / (rows - 1);
    const grid = new Float32Array(count * 2), seed = new Float32Array(count * 2);
    const rnd = mulberry32(0x5eed);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[i * 2] = -FIELD_W / 2 + (c + 0.5) * spacingX;
        grid[i * 2 + 1] = r * spacingZ;
        seed[i * 2] = rnd();
        seed[i * 2 + 1] = rnd();
        i++;
      }
    }
    const gridBuf = gl.createBuffer(), seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);

    const pal = new Float32Array(24);
    L.colors.forEach((h, n) => pal.set(hexToRgb(h), n * 3));

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // aditivo: pontos sobrepostos brilham

    let cssW = 0, cssH = 0, dpr = 1, areaScale = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, SMALL ? 1.25 : 1.5);
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      areaScale = cssW && cssH ? Math.min(2.5, Math.max(0.5, Math.sqrt((cssW * cssH) / CAM_REF_AREA))) : 1;
      const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    };
    resize();
    new ResizeObserver(resize).observe(canvas);

    // Cursor: posição suavizada + "hover" e "clique" com entrada/saída suaves
    const pt = { x: 0, y: 0, sx: 0, sy: 0, active: 0, target: 0, press: 0, pressTarget: 0 };
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      pt.x = e.clientX - r.left;
      pt.y = e.clientY - r.top;
      pt.target = 1;
    });
    host.addEventListener('pointerleave', () => { pt.target = 0; pt.pressTarget = 0; });
    host.addEventListener('pointerdown', () => { pt.pressTarget = 1; });
    window.addEventListener('pointerup', () => { pt.pressTarget = 0; });

    const groundHit = (mx, my, wDev, hDev, focal, pitch, roll, camY, camZ) => {
      const px = mx * dpr - wDev / 2, py = -(my * dpr - hDev / 2);
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const sx = px * cr + py * sr, sy = -px * sr + py * cr;
      const dx = sx / focal, dy = sy / focal;
      const c = Math.cos(pitch), s = Math.sin(pitch);
      const wy = dy * c - s, wz = dy * s + c;
      if (wy > -1e-4) return null;
      const t = -camY / wy;
      return { x: dx * t, z: camZ + wz * t };
    };

    let raf = 0, last = performance.now(), phase = 0, flow = 0, hitX = 0, hitZ = -1e6;

    function render(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (cssW <= 0 || cssH <= 0) { resize(); if (cssW <= 0 || cssH <= 0) return; }

      const kk = 1 - Math.exp(-dt * 6);
      pt.active += (pt.target - pt.active) * kk;
      pt.press += (pt.pressTarget - pt.press) * kk;
      const speedMul = 1 + pt.press;
      if (pt.active < 0.002) { pt.sx = pt.x; pt.sy = pt.y; }
      else {
        const f = 1 - Math.exp(-dt * CURSOR_FOLLOW);
        pt.sx += (pt.x - pt.sx) * f;
        pt.sy += (pt.y - pt.sy) * f;
      }
      phase += dt * (L.waveSpeed / 100) * speedMul;
      flow = (flow + dt * flowSpeed * speedMul) % FIELD_D;

      const pitch = (L.tiltStart * Math.PI) / 180;
      const roll = (-L.rollStart * Math.PI) / 180;
      const camY = (L.cameraHeight / 100) * CAM_Y_FULL * areaScale;
      const wDev = canvas.width, hDev = canvas.height;
      const focal = hDev / (2 * Math.tan(((FOV / 2) * Math.PI) / 180));

      if (pt.active <= 0.001) { hitX = 0; hitZ = -1e6; }
      else {
        const hit = groundHit(pt.sx, pt.sy, wDev, hDev, focal, pitch, roll, camY, CAM_Z0);
        if (hit) { hitX = hit.x; hitZ = hit.z; } else if (hitZ === -1e6) { hitX = 0; hitZ = FIELD_D; }
      }

      gl.uniform2f(U.uRes, wDev, hDev);
      gl.uniform1f(U.uFocal, focal);
      gl.uniform1f(U.uTime, phase);
      gl.uniform1f(U.uAmp, L.waveHeight);
      gl.uniform1f(U.uScatter, L.scatter);
      gl.uniform1f(U.uFreq, TAU / L.waveLength);
      gl.uniform2f(U.uDir, 0, -1);
      gl.uniform1f(U.uFlow, flow);
      gl.uniform1f(U.uDepth, FIELD_D);
      gl.uniform1f(U.uCamY, camY);
      gl.uniform1f(U.uCamZ, CAM_Z0);
      gl.uniform1f(U.uPitch, pitch);
      gl.uniform1f(U.uRoll, roll);
      gl.uniform1f(U.uDot, L.dotSize);
      gl.uniform1f(U.uColorCount, L.colors.length);
      gl.uniform2f(U.uJit, spacingX * 0.25, spacingZ * 0.7);
      gl.uniform3fv(U.uColors, pal);
      gl.uniform3f(U.uCursor, hitX, hitZ, pt.active);
      gl.uniform1f(U.uCurR, (L.cursorRadius / 100) * (FIELD_W / 2));
      gl.uniform1f(U.uCurS, L.cursorLift);
      gl.uniform1f(U.uHover, hoverGlow / 100);

      gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf);
      gl.enableVertexAttribArray(aGrid);
      gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
      gl.enableVertexAttribArray(aSeed);
      gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    function frame(now) { raf = requestAnimationFrame(frame); render(now); }

    if (REDUCE) { render(performance.now()); return; } // um quadro parado
    onVisible(canvas, (v) => {
      if (v && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!v) { cancelAnimationFrame(raf); raf = 0; }
    });
  }

  /* ---------------------------- Contadores ---------------------------- */
  function countUp(el) {
    const end = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const suffix = el.dataset.suffix || '';
    const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (REDUCE) return;
    let done = false;
    onVisible(el, (v) => {
      if (!v || done) return;
      done = true;
      const t0 = performance.now(), dur = 1600;
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(end * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 0.4);
  }

  /* ----------------------------- Parallax ------------------------------ */
  function parallax(imgs) {
    if (REDUCE || !imgs.length) return;
    const visibleSet = new Set();
    imgs.forEach((img) => onVisible(img.parentElement, (v) => (v ? visibleSet.add(img) : visibleSet.delete(img))));
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      visibleSet.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 aprox.
        img.style.transform = `translate3d(0, ${(-offset * 6).toFixed(2)}%, 0) scale(1.14)`;
      });
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
   * Shine Card (adaptado de "Shine Card — Originkit"): o card inclina em
   * 3D seguindo o cursor, ganha brilho na borda de cima/baixo e tem um
   * campo de pontos metálicos em WebGL que refletem luz em ondas.
   * ------------------------------------------------------------------ */
  const SHINE_FRAG = `
precision highp float;
uniform float u_time; uniform vec2 u_res; uniform float u_waveSpeed; uniform float u_sparkle;
uniform vec2 u_mouse; uniform float u_density; uniform vec3 u_theme; uniform vec3 u_dark;
#define TAU 6.28318530718
#define SQRT3 1.7320508
float hash21(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
vec2 hash22(vec2 p) { float n = hash21(p); return vec2(n, hash21(p + n * 47.0)); }
vec4 hexTile(vec2 p, float scale) {
  p *= scale; vec2 s = vec2(1.0, SQRT3); vec2 halfS = s * 0.5;
  vec2 aBase = floor(p / s); vec2 aLocal = mod(p, s) - halfS;
  vec2 pOff = p - halfS; vec2 bBase = floor(pOff / s); vec2 bLocal = mod(pOff, s) - halfS;
  float pick = step(dot(aLocal, aLocal), dot(bLocal, bLocal));
  return vec4(mix(bLocal, aLocal, pick), mix(bBase + vec2(0.5), aBase, pick));
}
float waveField(vec2 c, float t) {
  float w = sin(dot(c, vec2(0.7, 0.5)) * 3.5 - t * 2.8) * 0.35 + sin(c.x * 4.2 + t * 1.9) * 0.25;
  float r1 = length(c - vec2(-0.3, 0.2)); w += sin(r1 * 6.0 - t * 3.2) * 0.2 * smoothstep(1.2, 0.0, r1);
  w += sin(dot(c, vec2(-0.4, 0.8)) * 2.8 - t * 1.5) * 0.2;
  float r2 = length(c - vec2(0.4, -0.3)); w += sin(r2 * 5.0 - t * 2.4) * 0.15 * smoothstep(1.0, 0.0, r2);
  return w;
}
float dotSpecular(float ta, float td) {
  vec3 N = vec3(sin(ta) * cos(td), sin(ta) * sin(td), cos(ta));
  vec3 R = reflect(-normalize(vec3(0.4, 0.6, 0.9)), N);
  float d = max(dot(R, vec3(0.0, 0.0, 1.0)), 0.0);
  return pow(d, 48.0) + pow(d, 8.0) * 0.15;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
  float t = u_time * u_waveSpeed;
  float dotScale = max(6.0, u_density);
  vec4 hex = hexTile(uv, dotScale);
  vec2 rnd = hash22(hex.zw);
  float sizeVar = 0.85 + rnd.x * 0.3, reflVar = 0.7 + rnd.x * 0.3, phaseOff = rnd.y * TAU;
  float discRadius = 0.42 * sizeVar, dist = length(hex.xy);
  float disc = smoothstep(discRadius, discRadius - 0.06, dist);
  float bevel = smoothstep(discRadius, discRadius - 0.04, dist) - smoothstep(discRadius - 0.04, discRadius - 0.08, dist);
  vec2 wp = hex.zw / dotScale;
  float wave = waveField(wp, t);
  float ta = wave * 0.85 + (rnd.y - 0.5) * 0.15 + sin(t * 3.0 + phaseOff) * 0.04;
  float td = atan(waveField(wp + vec2(0.0, 0.01), t) - wave, waveField(wp + vec2(0.01, 0.0), t) - wave);
  float mouseSpec = 0.0;
  if (u_mouse.x >= 0.0) {
    vec2 mUV = (u_mouse - u_res * 0.5) / min(u_res.x, u_res.y);
    float md = length(uv - mUV);
    vec3 mN = vec3(sin(ta) * cos(td), sin(ta) * sin(td), cos(ta));
    vec3 mR = reflect(-normalize(vec3(mUV.x - uv.x, mUV.y - uv.y, 0.5)), mN);
    mouseSpec = pow(max(dot(mR, vec3(0.0, 0.0, 1.0)), 0.0), 32.0) * exp(-md * md * 10.0) * 1.5;
  }
  float spec = dotSpecular(ta, td) * reflVar * u_sparkle + mouseSpec * reflVar;
  vec3 hot = clamp(u_theme, 0.0, 1.0), flash = mix(hot, vec3(1.0), 0.12);
  vec3 mid = mix(clamp(hot * 0.63 + 0.10, 0.0, 1.0), hot, 0.55);
  float facing = clamp(cos(ta) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(clamp(u_dark, 0.0, 1.0), vec3(0.05), facing * 0.6);
  col += mid * pow(facing, 3.0) * 0.2 * reflVar;
  col += mid * smoothstep(0.0, 0.3, spec) * 0.5 + flash * smoothstep(0.3, 0.8, spec) * 0.8 + hot * smoothstep(0.7, 1.0, spec) * 1.2;
  col += mid * bevel * facing * 0.3;
  col *= disc * (0.85 + 0.15 * dot(normalize(uv + vec2(0.0001)), vec2(0.4, 0.6)));
  col *= 0.6 + 0.4 * (1.0 - smoothstep(0.4, 1.3, length(uv)));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), disc);
}`;

  function shineDots(canvas, opts) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) return;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('Shine (shader):', gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SHINE_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    const U = { time: u('u_time'), res: u('u_res'), speed: u('u_waveSpeed'), sparkle: u('u_sparkle'), mouse: u('u_mouse'), density: u('u_density'), theme: u('u_theme'), dark: u('u_dark') };
    gl.uniform1f(U.speed, opts.waveSpeed);
    gl.uniform1f(U.sparkle, opts.sparkle);
    gl.uniform1f(U.density, opts.density);
    gl.uniform3fv(U.theme, hexToRgb(opts.highlight));
    gl.uniform3fv(U.dark, hexToRgb(opts.unlit));

    const resize = () => {
      const dpr = Math.min((window.devicePixelRatio || 1) * 2, SMALL ? 2 : 3);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(U.res, w, h);
    };
    resize();
    new ResizeObserver(resize).observe(canvas);

    const mouse = { x: -1, y: -1 };
    const card = canvas.parentElement;
    card.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
    });
    card.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1; });

    const draw = (now) => {
      gl.uniform1f(U.time, REDUCE ? 0 : now * 0.001);
      if (mouse.x >= 0) gl.uniform2f(U.mouse, mouse.x * canvas.width, mouse.y * canvas.height);
      else gl.uniform2f(U.mouse, -1, -1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    let raf = 0;
    const tick = (now) => { raf = requestAnimationFrame(tick); draw(now); };
    draw(0);
    if (REDUCE) return;
    onVisible(canvas, (v) => {
      if (v && !raf) raf = requestAnimationFrame(tick);
      else if (!v) { cancelAnimationFrame(raf); raf = 0; }
    });
  }

  function shineCard(card) {
    const dots = card.querySelector('.shine-dots');
    // Pontos prata no lugar do dourado do original, para manter a identidade da marca
    if (dots) shineDots(dots, { waveSpeed: 0.66, sparkle: 8, density: 38, highlight: '#dfe3ea', unlit: '#15171d' });
    if (REDUCE) return;

    const glowTop = card.querySelector('.shine-glow.top');
    const glowBottom = card.querySelector('.shine-glow.bottom');
    const area = card.closest('.hero') || card.parentElement; // o card reage ao cursor em todo o hero
    const AMOUNT = 18, HOVER_SCALE = 1.04;
    const t = { tx: 0, ty: 0, x: 0, y: 0, s: 1, ts: 1 };
    let raf = 0, settled = false;

    const frame = () => {
      t.x += (t.tx - t.x) * 0.12;
      t.y += (t.ty - t.y) * 0.12;
      t.s += (t.ts - t.s) * 0.12;
      card.style.transform = `rotateX(${t.x.toFixed(2)}deg) rotateY(${t.y.toFixed(2)}deg) scale(${t.s.toFixed(4)})`;
      const top = Math.min(1, Math.max(0, -t.x / 15)), bottom = Math.min(1, Math.max(0, t.x / 15));
      glowTop.style.opacity = top * 0.55;
      glowBottom.style.opacity = bottom * 0.55;
      const still = Math.abs(t.tx - t.x) < 0.01 && Math.abs(t.ty - t.y) < 0.01 && Math.abs(t.ts - t.s) < 0.001;
      if (still && settled) { raf = 0; return; }
      settled = still;
      raf = requestAnimationFrame(frame);
    };
    const wake = () => { settled = false; if (!raf) raf = requestAnimationFrame(frame); };

    area.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      const nx = Math.min(1, Math.max(-1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const ny = Math.min(1, Math.max(-1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      t.tx = -ny * AMOUNT * 0.67;
      t.ty = nx * AMOUNT;
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      t.ts = inside ? HOVER_SCALE : 1;
      wake();
    });
    area.addEventListener('pointerleave', () => { t.tx = 0; t.ty = 0; t.ts = 1; wake(); });
    // No toque: inclina para o lado tocado e volta ao soltar
    card.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const r = card.getBoundingClientRect();
      t.tx = -((e.clientY - r.top) / r.height - 0.5) * 2 * AMOUNT * 0.5;
      t.ty = ((e.clientX - r.left) / r.width - 0.5) * 2 * AMOUNT * 0.7;
      t.ts = HOVER_SCALE;
      wake();
    });
    const release = (e) => { if (e.pointerType !== 'mouse') { t.tx = 0; t.ty = 0; t.ts = 1; wake(); } };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  }

  /* ------------------------------------------------------------------
   * Galeria 3D da equipe (adaptado de "Coverflow Gallery — Originkit").
   * Lê os cards de .team-grid[data-coverflow] e monta um carrossel 3D
   * infinito: arrastar (dedo ou mouse), setas, teclado ou clique no card.
   * O nome, a especialidade e a descrição acompanham o card ativo.
   * Sem JavaScript, a grade normal da equipe continua aparecendo.
   * ------------------------------------------------------------------ */
  function coverflow(grid) {
    const people = [...grid.querySelectorAll('.team-card')].map((c) => ({
      src: c.querySelector('img').getAttribute('src'),
      alt: c.querySelector('img').getAttribute('alt') || '',
      tag: c.querySelector('.tag')?.textContent || '',
      name: c.querySelector('h3')?.textContent || '',
      desc: c.querySelector('p')?.textContent || '',
    }));
    if (people.length < 2) return;
    // Repete a lista até ter 8+ cards, para sobrar card dos dois lados no loop
    let slides = [...people];
    while (slides.length < 8) slides = slides.concat(people);
    const n = slides.length, total = people.length;

    const root = document.createElement('div');
    root.className = 'coverflow';
    root.innerHTML = `
      <div class="cf-stage" tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Equipe da JF3. Arraste ou use as setas para navegar.">
        <div class="cf-track">${slides.map((s, i) => `
          <div class="cf-slide" data-i="${i}"><img src="${s.src}" alt="${i < total ? s.alt : ''}" draggable="false"><span class="cf-dim"></span></div>`).join('')}
        </div>
      </div>
      <div class="cf-bottom">
        <div class="cf-info" aria-live="polite"><span class="tag"></span><h3></h3><p></p></div>
        <div class="cf-controls">
          <button class="cf-btn" type="button" data-dir="-1" aria-label="Profissional anterior">←</button>
          <span class="cf-count"></span>
          <button class="cf-btn" type="button" data-dir="1" aria-label="Próximo profissional">→</button>
        </div>
      </div>`;
    grid.replaceWith(root);

    const stage = root.querySelector('.cf-stage');
    const els = [...root.querySelectorAll('.cf-slide')];
    const info = root.querySelector('.cf-info');
    const count = root.querySelector('.cf-count');
    const TILT = 12, SIDE_TILT = 8, DEPTH = 240, SCALE_STEP = 0.16, DIM = 0.4;
    let pos = 0, spacing = 240, shown = -1;

    const wrap = (v) => ((v % n) + n) % n;
    const layout = () => {
      const w = stage.clientWidth;
      const cardW = Math.round(Math.min(400, Math.max(190, w * (w < 600 ? 0.62 : 0.34))));
      const cardH = Math.round(cardW * 1.2);
      spacing = cardW * 0.6;
      root.style.setProperty('--cf-w', `${cardW}px`);
      root.style.setProperty('--cf-card-h', `${cardH}px`);
      root.style.setProperty('--cf-h', `${cardH + 60}px`);
    };
    const render = () => {
      els.forEach((el, i) => {
        let rel = wrap(i - pos);
        if (rel > n / 2) rel -= n;
        const ax = Math.abs(rel);
        const sc = Math.max(0.4, 1 - ax * SCALE_STEP);
        el.style.transform = `translate(-50%, -50%) translateX(${(rel * spacing).toFixed(1)}px) translateZ(${(-ax * DEPTH).toFixed(1)}px) rotateY(${(-rel * TILT).toFixed(2)}deg) rotateZ(${(rel * SIDE_TILT).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        el.style.opacity = Math.max(0, Math.min(1, 2.6 - ax));
        el.style.zIndex = String(100 - Math.round(ax * 10));
        el.firstElementChild.nextElementSibling.style.opacity = Math.min(1, ax) * DIM;
        el.setAttribute('aria-hidden', ax > 0.5 ? 'true' : 'false');
      });
      const active = wrap(Math.round(pos)) % total;
      if (active !== shown) showInfo(active);
    };
    const showInfo = (i) => {
      const first = shown === -1;
      shown = i;
      const p = people[i];
      const apply = () => {
        info.querySelector('.tag').textContent = p.tag;
        info.querySelector('h3').textContent = p.name;
        info.querySelector('p').textContent = p.desc;
        count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        info.classList.remove('swap');
      };
      if (first || REDUCE) { apply(); return; }
      info.classList.add('swap');
      setTimeout(apply, 180);
    };
    // Rolagem automática infinita a cada 4s. Pausa com o mouse em cima, durante o
    // arraste, fora da tela ou com a aba oculta; recomeça a contagem após interação.
    const AUTOPLAY_MS = 4000;
    let timer = 0, hovering = false, inView = false, dragging = false;
    const schedule = () => {
      clearInterval(timer);
      timer = 0;
      if (!REDUCE && inView && !hovering && !dragging && !document.hidden) {
        timer = setInterval(() => go(pos + 1), AUTOPLAY_MS);
      }
    };
    const go = (target, byUser = false) => {
      pos = Math.round(target);
      render();
      if (byUser) schedule();
    };
    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; schedule(); } });
    root.addEventListener('pointerleave', () => { hovering = false; schedule(); });
    onVisible(root, (v) => { inView = v; schedule(); }, 0.3);
    document.addEventListener('visibilitychange', schedule);

    root.querySelectorAll('.cf-btn').forEach((b) => b.addEventListener('click', () => go(pos + Number(b.dataset.dir), true)));
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(pos + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos - 1, true); }
    });

    // Arrastar: o carrossel acompanha o dedo/mouse e encaixa no card mais próximo ao soltar
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, start: pos, moved: false, id: e.pointerId, axis: null };
      dragging = true;
      schedule();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis && Math.hypot(dx, dy) > 6) {
        drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (drag.axis === 'x') {
          try { stage.setPointerCapture(e.pointerId); } catch (_) { /* ponteiro já liberado: segue sem captura */ }
          stage.classList.add('dragging');
        }
      }
      if (drag.axis !== 'x') return;
      drag.moved = true;
      pos = drag.start - dx / spacing;
      render();
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      stage.classList.remove('dragging');
      dragging = false;
      if (drag.moved) {
        const delta = pos - drag.start;
        // um arraste curto já passa um card
        go(Math.abs(delta) > 0.15 && Math.abs(delta) < 0.5 ? drag.start + Math.sign(delta) : pos, true);
      } else if (e.type === 'pointerup') {
        const slide = e.target.closest('.cf-slide');
        if (slide) {
          let rel = wrap(Number(slide.dataset.i) - pos);
          if (rel > n / 2) rel -= n;
          go(pos + (Math.round(rel) === 0 ? 1 : rel), true);
        } else schedule();
      } else schedule();
      drag = null;
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    // soltou fora da galeria: libera a rolagem automática do mesmo jeito
    const releaseOutside = () => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('dragging');
      if (drag && drag.moved) go(pos, true); else schedule();
      drag = null;
    };
    window.addEventListener('pointerup', releaseOutside);
    window.addEventListener('pointercancel', releaseOutside);

    layout();
    render();
    new ResizeObserver(() => { layout(); render(); }).observe(stage);
  }

  document.querySelectorAll('.shine-card').forEach(shineCard);
  document.querySelectorAll('.team-grid[data-coverflow]').forEach(coverflow);
  document.querySelectorAll('canvas[data-particles]').forEach(particleLogo);
  document.querySelectorAll('canvas.wave-canvas').forEach(waveField);
  document.querySelectorAll('[data-count]').forEach(countUp);
  parallax([...document.querySelectorAll('.photo > img')]);
})();
