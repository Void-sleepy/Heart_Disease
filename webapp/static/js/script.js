/* ── HeartGuard — Frontend Logic ──────────────────────────────────────────── */

const form       = document.getElementById('heartForm');
const resultPanel = document.getElementById('resultPanel');
const submitBtn  = document.getElementById('submitBtn');
const resetBtn   = document.getElementById('resetBtn');

// ── Form Submission ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  const payload = collectValues();

  try {
    const res  = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.error) {
      alert('Server error: ' + data.error);
      setLoading(false);
      return;
    }

    showResult(data);
  } catch (err) {
    alert('Could not reach the server. Make sure Flask is running.');
    console.error(err);
  }

  setLoading(false);
});

// ── Collect Form Values ───────────────────────────────────────────────────────
function collectValues() {
  const fields = ['age', 'sex', 'cp', 'trestbps', 'chol',
                  'fbs', 'restecg', 'thalach', 'exang',
                  'oldpeak', 'slope', 'ca', 'thal'];

  const payload = {};
  fields.forEach(f => {
    payload[f] = document.getElementById(f).value;
  });
  return payload;
}

// ── Validate ──────────────────────────────────────────────────────────────────
function validateForm() {
  const inputs  = form.querySelectorAll('input, select');
  let valid = true;

  inputs.forEach(el => {
    el.classList.remove('error');
    if (!el.value || el.value === '') {
      el.classList.add('error');
      valid = false;
    }
  });

  if (!valid) {
    // Scroll to first error
    const first = form.querySelector('.error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

// ── Show Result ───────────────────────────────────────────────────────────────
function showResult(data) {
  const { probability, risk } = data;

  // Gauge
  const circumference = 251.2;   // half-circle arc length (π × r where r≈80)
  const offset = circumference - (probability / 100) * circumference;
  const gaugeFill = document.getElementById('gaugeFill');
  gaugeFill.style.strokeDashoffset = circumference;   // reset first
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = offset;
  });

  // Gauge color
  const colors = { low: '#22c55e', moderate: '#f59e0b', high: '#ff1a2e' };
  gaugeFill.style.stroke = colors[risk] || '#e63946';

  // Probability text
  let current = 0;
  const target = probability;
  const probDisplay = document.getElementById('probDisplay');
  const step = target / 60;

  const counter = setInterval(() => {
    current = Math.min(current + step, target);
    probDisplay.textContent = Math.round(current) + '%';
    if (current >= target) clearInterval(counter);
  }, 16);

  // Badge & text
  const badge = document.getElementById('resultBadge');
  const title = document.getElementById('resultTitle');
  const desc  = document.getElementById('resultDesc');

  badge.className = 'result-badge ' + risk;

  const messages = {
    low: {
      badge: 'Low Risk',
      title: 'Good News — Low Cardiovascular Risk',
      desc:  'Your clinical profile suggests a low probability of heart disease. '
           + 'Maintain a healthy lifestyle with regular exercise, a balanced diet, and routine check-ups.'
    },
    moderate: {
      badge: 'Moderate Risk',
      title: 'Moderate Risk — Action Recommended',
      desc:  'Several markers place you in a moderate-risk category. '
           + 'We recommend scheduling a consultation with a cardiologist for a thorough evaluation and preventive care.'
    },
    high: {
      badge: 'High Risk',
      title: 'High Risk — Please Seek Medical Advice',
      desc:  'Your profile indicates a high likelihood of coronary artery disease. '
           + 'Please contact a healthcare professional promptly for diagnostic testing and appropriate treatment.'
    }
  };

  const m = messages[risk] || messages.high;
  badge.textContent = m.badge;
  title.textContent = m.title;
  desc.textContent  = m.desc;

  // Show panel
  resultPanel.classList.remove('hidden');
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Reset ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  form.reset();
  resultPanel.classList.add('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Remove error highlight on input ──────────────────────────────────────────
form.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('error'));
  el.addEventListener('change', () => el.classList.remove('error'));
});

// ── Loading state ────────────────────────────────────────────────────────────
function setLoading(state) {
  submitBtn.disabled = state;
  submitBtn.textContent = state ? 'Analyzing...' : 'Analyze My Risk';
}

// ── ECG Canvas Animation ──────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('ecgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let samples = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || 360;
    H = canvas.height = canvas.offsetHeight || 90;
    samples = new Float32Array(W);   // reset trace on resize
  }
  resize();
  window.addEventListener('resize', resize);

  // PQRST waveform pattern: [x_fraction, y_value]  (y: +1 = up spike, -1 = down)
  const PATTERN = [
    [0.00,  0.00],
    [0.09,  0.00],
    [0.13,  0.13],  // P wave
    [0.17,  0.00],
    [0.22,  0.00],
    [0.26, -0.14],  // Q dip
    [0.31,  1.00],  // R spike  ← tallest
    [0.34, -0.38],  // S dip
    [0.38,  0.00],
    [0.44,  0.22],  // T wave
    [0.54,  0.22],
    [0.59,  0.00],
    [1.00,  0.00],
  ];

  const CYCLE_PX = 210;   // pixels per one heartbeat cycle
  const SPEED    = 1.6;   // pixels advanced per animation frame
  let   posF     = 0;     // current head position (fractional pixels)

  // BPM readout: derive from CYCLE_PX and SPEED
  // frames/cycle ≈ CYCLE_PX/SPEED  →  BPM = 60 / (frames_per_cycle / 60fps)
  const bpmEl = document.getElementById('monitorHR');
  const BPM   = Math.round(60 / ((CYCLE_PX / SPEED) / 60));
  if (bpmEl) bpmEl.textContent = BPM + ' BPM';

  function ecgY(frac) {
    for (let i = 0; i < PATTERN.length - 1; i++) {
      const [x0, y0] = PATTERN[i];
      const [x1, y1] = PATTERN[i + 1];
      if (frac >= x0 && frac <= x1) {
        const t = (frac - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }
    }
    return 0;
  }

  function toCanvasY(v) {
    return H / 2 - v * H * 0.38;
  }

  function draw() {
    const pos = Math.floor(posF) % W;

    // Store new sample
    samples[pos] = ecgY((posF % CYCLE_PX) / CYCLE_PX);

    // ── Background ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, W, H);

    // ── Grid ────────────────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,26,46,0.07)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += H / 3) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ── Erase band (blank strip just ahead of the head, like a real monitor) ───
    const ERASE = 30;
    ctx.fillStyle = '#060810';
    ctx.fillRect(pos, 0, ERASE, H);

    // ── ECG trace ───────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ctx.strokeStyle = '#ff1a2e';
    ctx.lineWidth   = 2.2;
    ctx.shadowBlur  = 7;
    ctx.shadowColor = 'rgba(255,26,46,0.65)';

    let started = false;
    for (let x = 0; x < W; x++) {
      if (x >= pos && x < pos + ERASE) continue;   // skip erase band
      const y = toCanvasY(samples[x]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else           { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Head dot (bright leading point) ─────────────────────────────────────────
    const headY = toCanvasY(samples[pos]);
    ctx.beginPath();
    ctx.arc(pos, headY, 4, 0, Math.PI * 2);
    ctx.fillStyle  = '#ff8888';
    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#ff1a2e';
    ctx.fill();
    ctx.shadowBlur = 0;

    posF += SPEED;
    requestAnimationFrame(draw);
  }

  draw();
})();
