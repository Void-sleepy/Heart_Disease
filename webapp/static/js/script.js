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
