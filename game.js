
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const hudMoney = document.getElementById("money");
  const hudLights = document.getElementById("lights");
  const overlay = document.getElementById("overlay");

  // --- HiDPI scaling & robust sizing ---
  let W = 960, H = 540, groundY = H - 100, dpr = 1;
  function fitCanvasToDisplay() {
    let cssW = canvas.clientWidth;
    let cssH = canvas.clientHeight;
    if (!cssW || !cssH) {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width || 960;
      cssH = rect.height || 540;
    }
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const wantW = Math.round(cssW * dpr);
    const wantH = Math.round(cssH * dpr);
    if (canvas.width !== wantW || canvas.height !== wantH) {
      canvas.width = wantW;
      canvas.height = wantH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cssW; H = cssH; groundY = H - 100;
  }
  new ResizeObserver(fitCanvasToDisplay).observe(canvas);
  window.addEventListener("load", fitCanvasToDisplay);
  setTimeout(fitCanvasToDisplay, 0);

  // WORLD SETTINGS
  const lightSpacing = 200;
  const lightsNeeded = 10;
  const numLightsBeforeStore = 11;
  const leftMargin = 260;

  // Player
  const player = { x: 80, y: groundY - 58, w: 36, h: 50, speed: 3.3, facing: 1, money: 0, lightsOn: 0 };

  // Camera
  let camX = 0;

  // Assets
  const faceImg = new Image();
  faceImg.src = (window.GAME_ASSETS && window.GAME_ASSETS.face) || "assets/tyler_face.jpg";
  let faceReady = false;
  faceImg.onload = () => faceReady = true;

  const logoImg = new Image();
  logoImg.src = "assets/lit_logo.png";
  let logoReady = false;
  logoImg.onload = () => logoReady = true;

  // Lights
  const lights = [];
  for (let i = 0; i < numLightsBeforeStore; i++) {
    const x = leftMargin + 140 + i * lightSpacing;
    lights.push({ x, on: false, cordAnim: 0 });
  }
  const storeX = leftMargin + numLightsBeforeStore * lightSpacing + 520;

  // --- ATO Van ---
  const ato = {
    x: leftMargin - 300,
    w: 124,
    h: 56,
    speed: 2.8,
    active: false,
    bubbleTime: 0,
    wheelPhase: 0
  };

  // Input
  const keys = { left: false, right: false, plug: false };
  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") keys.left = true;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = true;
    if (k === "e" || k === "E") keys.plug = true;
    if (k === "r" || k === "R") resetGame();
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") keys.left = false;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = false;
    if (k === "e" || k === "E") keys.plug = false;
  });

  // Overlay helpers
  function showOverlay(html) {
    overlay.classList.add("visible");
    overlay.innerHTML = `<div class="panel">${html}</div>`;
  }
  function hideOverlay() {
    overlay.classList.remove("visible");
    overlay.innerHTML = "";
  }

  // Reset
  function resetGame() {
    fitCanvasToDisplay();
    player.x = 80;
    player.y = groundY - 58;
    player.facing = 1;
    player.money = 0;
    player.lightsOn = 0;
    for (const L of lights) { L.on = false; L.cordAnim = 0; }
    camX = 0;
    // reset ATO van
    ato.x = leftMargin - 300;
    ato.active = false;
    ato.bubbleTime = 0;
    ato.wheelPhase = 0;
    hideOverlay();
    updateHud();
  }

  // HUD
  function updateHud() {
    hudMoney.textContent = `$${player.money}`;
    hudLights.textContent = `Lights: ${player.lightsOn}/${lightsNeeded}`;
  }

  // Draw helpers
  function drawBackground() {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#a6c9ef");
    grd.addColorStop(1, "#d6e8fb");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // distant buildings (parallax)
    ctx.save();
    ctx.translate(-camX * 0.3, 0);
    for (let i = -1; i < 20; i++) {
      const bx = i * 320;
      drawBuilding(bx + 40, H - 240, 180, 180, "#a5b4cf");
      drawBuilding(bx + 220, H - 280, 220, 220, "#b0bfd9");
      drawBuilding(bx + 480, H - 210, 150, 150, "#b8c7e0");
    }
    ctx.restore();

    // street
    ctx.fillStyle = "#5b6b7e";
    ctx.fillRect(0, groundY, W, H - groundY);

    // lane line
    ctx.save();
    ctx.translate(-camX, 0);
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(-10000, groundY + 40);
    ctx.lineTo( 10000, groundY + 40);
    ctx.stroke();
    ctx.restore();
  }

  function drawBuilding(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,.25)";
    for (let i = 10; i < w - 10; i += 24) {
      for (let j = 10; j < h - 10; j += 26) {
        ctx.fillRect(x + i, y + j, 12, 18);
      }
    }
  }

  function drawLamp(l) {
    const x = l.x;            // world coords
    const baseY = groundY;

    ctx.strokeStyle = "#3c3f46";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - 90);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, baseY - 90);
    ctx.lineTo(x + 28, baseY - 110);
    ctx.stroke();

    ctx.fillStyle = l.on ? "#fff8b0" : "#9aa3ad";
    ctx.beginPath();
    ctx.arc(x + 36, baseY - 116, 12, 0, Math.PI * 2);
    ctx.fill();

    if (l.on) {
      const g = ctx.createRadialGradient(x + 36, baseY - 116, 0, x + 36, baseY - 116, 80);
      g.addColorStop(0, "rgba(255,250,200,.9)");
      g.addColorStop(1, "rgba(255,250,200,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + 36, baseY - 116, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#c7cbd3";
    ctx.fillRect(x - 16, baseY - 24, 18, 18);
    ctx.fillStyle = "#7b808a";
    ctx.fillRect(x - 12, baseY - 18, 4, 4);
    ctx.fillRect(x - 6, baseY - 18, 4, 4);

    if (logoReady) {
      const lw = 24, lh = 14;
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(x - lw/2, baseY - 56, lw, lh);
      drawImageCover(logoImg, x - lw/2 + 1, baseY - 56 + 1, lw - 2, lh - 2);
    }

    const near = Math.abs(player.x - l.x) < 48 && !l.on;
    if (near) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(x - 54, baseY - 150, 108, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Press E to plug", x, baseY - 134);
    }

    if (l.cordAnim > 0) {
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, baseY - 15);
      const px = player.x + (player.facing * 14);
      const py = player.y + 30;
      ctx.quadraticCurveTo((x + px)/2, baseY - 50, px, py);
      ctx.stroke();
      l.cordAnim -= 1;
    }
  }

  function drawStore() {
    const x = storeX;
    const y = groundY - 140;
    const w = 280;
    const h = 140;
    ctx.fillStyle = "#2d2f37"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ffd600"; ctx.fillRect(x + 10, y + 10, w - 20, 40);
    ctx.fillStyle = "#111";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("JB HI-FI", x + w/2, y + 30);
    ctx.fillStyle = "#6aa7d9"; ctx.fillRect(x + w/2 - 20, y + 60, 40, 70);
  }

  function drawATOVan() {
    const x = ato.x;
    const y = groundY - ato.h;

    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(x, y, ato.w, ato.h);
    ctx.fillStyle = "#d1d5db"; ctx.fillRect(x + ato.w - 42, y + 6, 36, ato.h - 12);
    ctx.fillStyle = "#93c5fd"; ctx.fillRect(x + ato.w - 36, y + 12, 24, 18);
    ctx.fillStyle = "#1f2937"; ctx.fillRect(x + 42, y + 22, ato.w - 94, 10);
    ctx.fillStyle = "#000"; ctx.font = "bold 16px system-ui, sans-serif"; ctx.fillText("ATO", x + 18, y + 20);

    const w1x = x + 22, w2x = x + ato.w - 42, wy = y + ato.h;
    ctx.fillStyle = "#111827";
    ctx.beginPath(); ctx.arc(w1x, wy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w2x, wy, 12, 0, Math.PI * 2); ctx.fill();

    if (ato.bubbleTime > 0) {
      drawSpeechBubble(x + ato.w + 10, y - 10, 160, 50, "Time to pay the tax man", "right");
      ato.bubbleTime--;
    }
  }

  function drawSpeechBubble(x, y, w, h, text, pointerSide="right") {
    const r = 10;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (pointerSide === "right") { ctx.moveTo(x, y + h/2 - 6); ctx.lineTo(x - 12, y + h/2); ctx.lineTo(x, y + h/2 + 6); }
    else { ctx.moveTo(x + w, y + h/2 - 6); ctx.lineTo(x + w + 12, y + h/2); ctx.lineTo(x + w, y + h/2 + 6); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(text, x + 10, y + 28);
  }

  function drawPlayer() {
    const px = player.x - camX;
    const py = player.y;

    ctx.save(); ctx.translate(px, py); ctx.scale(player.facing, 1);
    roundRect(ctx, -18, 8, 36, 42, 8, "#1e3a8a");
    ctx.fillStyle = "#d2a679"; ctx.fillRect(-18, 30, 36, 8);
    roundRect(ctx, -16, 42, 12, 22, 4, "#22314d");
    roundRect(ctx, 4, 42, 12, 22, 4, "#22314d");
    roundRect(ctx, -18, 62, 16, 10, 3, "#3b2f2a");
    roundRect(ctx, 2, 62, 16, 10, 3, "#3b2f2a");

    const headR = 22, headX = 0, headY = 0;
    ctx.save(); ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    if (faceReady) {
      const size = Math.min(faceImg.width, faceImg.height) * 0.85;
      const sx = (faceImg.width - size) / 2; const sy = (faceImg.height - size) / 2;
      ctx.drawImage(faceImg, sx, sy, size, size, headX - headR, headY - headR, headR*2, headR*2);
    } else { ctx.fillStyle = "#f2c390"; ctx.fillRect(headX - headR, headY - headR, headR*2, headR*2); }
    ctx.restore();

    // hard hat hugging the head curve
    const a0 = Math.PI + 0.35;
    const a1 = -0.35;
    ctx.fillStyle = "#ff8c00ff";
    ctx.beginPath();
    ctx.arc(headX, headY, headR + 4, a0, a1, false);
    ctx.arc(headX, headY, headR - 1, a1, a0, true);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(headX, headY, headR + 2, Math.PI + 0.1, -0.1, false);
    ctx.lineWidth = 4; ctx.strokeStyle = "#ff8c00ff"; ctx.stroke();

    if (logoReady) { drawImageCover(logoImg, -12, 18, 24, 12); }
    else { ctx.fillStyle = "#fff"; ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("LIT", 0, 28); }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  function drawImageCover(img, x, y, w, h) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const ir = iw / ih;
    const r = w / h;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (ir > r) { const targetW = ih * r; sx = (iw - targetW) * 0.5; sw = targetW; }
    else { const targetH = iw / r; sy = (ih - targetH) * 0.5; sh = targetH; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawBillboard(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#3b3f4a"; ctx.fillRect(w/2 - 6, h, 12, 40);
    ctx.fillStyle = "#0b1222"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#91a4c0"; ctx.lineWidth = 2; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    if (logoReady) drawImageCover(logoImg, 10, 10, w - 20, h - 20);
    else { ctx.fillStyle = "#93c5fd"; ctx.font = "bold 18px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("LIT ELECTRICAL", w/2, h/2); }
    ctx.restore();
  }

  function rectsOverlap(a, b) { return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y); }

  function step() {
    if (keys.left) { player.x -= player.speed; player.facing = -1; }
    if (keys.right){ player.x += player.speed; player.facing = 1; }
    player.x = Math.max(0, Math.min(storeX + 200, player.x));

    if (keys.plug) {
      for (const l of lights) {
        const near = Math.abs(player.x - l.x) < 48;
        if (near && !l.on) {
          l.on = true; l.cordAnim = 22;
          const prev = player.lightsOn;
          player.money += 100; player.lightsOn += 1;
          keys.plug = false;
          if (prev === 0 && player.lightsOn === 1 && !ato.active) { ato.active = true; ato.bubbleTime = 240; }
          break;
        }
      }
    }

    camX = player.x - W * 0.45;
    camX = Math.max(0, Math.min(camX, storeX + 300 - W));

    if (ato.active) {
      ato.x += ato.speed;
      const pBox = { x: player.x - player.w/2, y: player.y, w: player.w, h: player.h };
      const vBox = { x: ato.x, y: groundY - ato.h, w: ato.w, h: ato.h };
      if (rectsOverlap(pBox, vBox)) {
        const taken = player.money;
        player.money = 0; updateHud(); ato.active = false;
        showOverlay(`
          <h1>ATO got you!</h1>
          <p>You had <strong>$${taken}</strong>. The ATO took it all. Start again and beat the van.</p>
          <p><button id="restart">Try again</button></p>
        `);
        document.getElementById("restart").onclick = resetGame;
      }
    }

    const closeToStore = (player.x > storeX - 20);
    if (closeToStore) {
      if (player.money >= 1000) {
        showOverlay(`
          <h1>Nice work!</h1>
          <p>You made it to JB Hi-Fi with <strong>$${player.money}</strong> and bought the laptop.</p>
          <p>Lights switched on: <strong>${player.lightsOn}</strong>.</p>
          <p><button id="play-again">Play again</button></p>
        `);
        document.getElementById("play-again").onclick = resetGame;
      } else {
        showOverlay(`
          <h1>Almost there…</h1>
          <p>You reached JB Hi-Fi with <strong>$${player.money}</strong>. You need <strong>$1000</strong> first!</p>
          <p>Turn on more street lights and come back.</p>
          <p><button id="keep-going">Keep going</button></p>
        `);
        document.getElementById("keep-going").onclick = hideOverlay;
      }
    }

    updateHud();
  }

  function render() {
    fitCanvasToDisplay();
    drawBackground();

    ctx.save(); ctx.translate(-camX, 0);
    drawBillboard(leftMargin - 250, groundY - 160, 200, 120);
    const billboardXs = [
      leftMargin + lightSpacing * 1.5 - 100,
      leftMargin + lightSpacing * 4 - 120,
      leftMargin + lightSpacing * 7.5 - 100,
      storeX - 440
    ];
    for (const bx of billboardXs) drawBillboard(bx, groundY - 180, 240, 140);
    for (const l of lights) drawLamp(l);
    drawStore();
    drawATOVan();
    ctx.restore();

    drawPlayer();

    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.fillRect(8, H - 28, W - 16, 20);
    const progress = Math.min(1, player.money / 1000);
    ctx.fillStyle = "#ffd600";
    ctx.fillRect(8, H - 28, (W - 16) * progress, 20);
    ctx.fillStyle = "#000"; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`$${player.money} / $1000`, W/2, H - 14);
  }

  function frame() { step(); render(); requestAnimationFrame(frame); }

  // --- Touch controls binding ---
  function bindHold(btn, onDown, onUp) {
    if (!btn) return;
    const down = (e) => { e.preventDefault(); onDown(); btn.setPointerCapture?.(e.pointerId); };
    const up   = (e) => { e.preventDefault(); onUp(); };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  }
  function setupTouchControls() {
    const btnLeft  = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const btnPlug  = document.getElementById("btn-plug");
    const btnReset = document.getElementById("btn-reset");
    bindHold(btnLeft,  () => keys.left  = true, () => keys.left  = false);
    bindHold(btnRight, () => keys.right = true, () => keys.right = false);
    // Plug should trigger once per tap; we'll set on down and then rely on step() to clear it.
    bindHold(btnPlug,  () => { keys.plug = true; }, () => { keys.plug = false; });
    btnReset?.addEventListener("pointerdown", (e) => { e.preventDefault(); resetGame(); });
  }
  setupTouchControls();

  // Start
  resetGame();
  frame();
})();
