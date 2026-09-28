// High-performance, zero-latency Web Audio continuous emergency alarm siren

let audioCtx = null;
let isSirenActive = false;
let isSirenMuted = false;
let loopTimer = null;
let activeAudioNodes = new Set();

function getOrCreateAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Pre-warm the AudioContext eagerly on any user gesture so it is 100% hot and ready
if (typeof window !== 'undefined') {
  const warmUp = () => {
    getOrCreateAudioContext();
  };
  window.addEventListener('pointerdown', warmUp, { passive: true });
  window.addEventListener('keydown', warmUp, { passive: true });
  window.addEventListener('touchstart', warmUp, { passive: true });
  window.addEventListener('click', warmUp, { passive: true });
}

function scheduleSinglePulseRound(ctx) {
  if (!isSirenActive || isSirenMuted) return;

  const now = ctx.currentTime;
  const pulseDuration = 0.10;
  const gap = 0.04;
  const period = pulseDuration + gap;
  const pulses = 4; // 4 rapid high-urgency pulses per round

  const roundGain = ctx.createGain();
  roundGain.gain.setValueAtTime(0.7, now);
  roundGain.connect(ctx.destination);
  activeAudioNodes.add(roundGain);

  for (let i = 0; i < pulses; i++) {
    const start = now + i * period;
    const osc = ctx.createOscillator();
    const pulseGain = ctx.createGain();

    osc.type = 'square';
    // Alternating emergency siren tone: 980Hz and 1260Hz
    osc.frequency.setValueAtTime(i % 2 === 0 ? 980 : 1260, start);

    // Instant attack and clean release
    pulseGain.gain.setValueAtTime(0.7, start);
    pulseGain.gain.setValueAtTime(0.7, start + pulseDuration - 0.015);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, start + pulseDuration);

    osc.connect(pulseGain);
    pulseGain.connect(roundGain);

    osc.start(start);
    osc.stop(start + pulseDuration + 0.005);

    activeAudioNodes.add(osc);
    osc.onended = () => {
      activeAudioNodes.delete(osc);
    };
  }

  // Cleanup round gain after pulses complete
  setTimeout(() => {
    try {
      roundGain.disconnect();
      activeAudioNodes.delete(roundGain);
    } catch {}
  }, (pulses * period + 0.1) * 1000);
}

/**
 * Start buzzing the siren continuously until stopped.
 */
export function startContinuousBuzzer() {
  if (isSirenActive) return;
  isSirenActive = true;
  isSirenMuted = false;

  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const runLoop = () => {
    if (!isSirenActive) return;
    scheduleSinglePulseRound(ctx);

    // Round cycle length is ~750ms
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(() => {
      if (!isSirenActive) {
        clearInterval(loopTimer);
        loopTimer = null;
        return;
      }
      scheduleSinglePulseRound(ctx);
    }, 750);
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(runLoop).catch(() => runLoop());
  } else {
    runLoop();
  }
}

/**
 * Stop the siren immediately and clean up all audio nodes.
 */
export function stopContinuousBuzzer() {
  isSirenActive = false;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }

  // Abruptly silence any currently active oscillators/gain nodes
  activeAudioNodes.forEach((node) => {
    try {
      if (node.stop) node.stop();
      if (node.gain) node.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
      node.disconnect();
    } catch {}
  });
  activeAudioNodes.clear();
}

/**
 * Toggle mute on/off during a critical state without resetting active state.
 */
export function setBuzzerMuted(muted) {
  isSirenMuted = muted;
  if (muted) {
    activeAudioNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    });
    activeAudioNodes.clear();
  }
}

export function isBuzzerActive() {
  return isSirenActive && !isSirenMuted;
}
