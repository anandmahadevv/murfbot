/* =====================================================
   VoxAI – Main Application Logic
   Multilingual AI Voice Assistant | Murf AI Integration
   ===================================================== */

"use strict";

// ─── Application Configuration ──────────────────────────
const CONFIG = {
  backendUrl: "",          // Root relative path for Vite proxy
  defaultVoiceId: "en-US-natalie",
  defaultLang: "hi-IN",
  autoDetect: true,        // Enable Hinglish detection
  maxChars: 3000,          // Maximum characters for synthesis
  latencyWarning: 500,     // Highlight if synthesis takes too long
};

// ─── State ──────────────────────────────────────────────
const state = {
  apiKey: localStorage.getItem("murf_api_key") || "",
  voices: [],
  currentVoiceId: CONFIG.defaultVoiceId,
  currentLang: CONFIG.defaultLang,
  isGenerating: false,
  isRecording: false,
  isApiKeyConfigured: false, // Whether backend already has key
  requestCount: 0,
  totalChars: 0,
  lastLatency: null,
  conversationHistory: [],
  recognition: null,
  audioCtx: null,
  analyser: null,
  animFrameId: null,
  waveAnimId: null,
};

// ─── DOM Refs ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  langSelect:       $("langSelect"),
  voiceSelect:      $("voiceSelect"),
  modelSelect:      $("modelSelect"),
  styleSelect:      $("styleSelect"),
  statusBadge:      $("statusBadge"),
  speakBtn:         $("speakBtn"),
  speakBtnText:     $("speakBtnText"),
  micBtn:           $("micBtn"),
  clearBtn:         $("clearBtn"),
  textInput:        $("textInput"),
  charCount:        $("charCount"),
  chatHistory:      $("chatHistory"),
  historyList:      $("historyList"),
  audioPlayer:      $("audioPlayer"),
  audioElement:     $("audioElement"),
  downloadBtn:      $("downloadBtn"),
  replayBtn:        $("replayBtn"),
  playerMeta:       $("playerMeta"),
  detectPill:       $("detectPill"),
  detectIcon:       $("detectIcon"),
  detectLabel:      $("detectLabel"),
  mainOrb:          $("mainOrb"),
  orbStatus:        $("orbStatus"),
  toastContainer:   $("toastContainer"),
  statLatency:      $("statLatency"),
  statRequests:     $("statRequests"),
  statChars:        $("statChars"),
  statLang:         $("statLang"),
  clearHistoryBtn:  $("clearHistoryBtn"),
  waveCanvas:       $("waveCanvas"),
  particleCanvas:   $("particleCanvas"),
};

// ─── Init ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initParticleBackground();
  initIdleWave();
  initSpeechRecognition();
  loadSavedApiKey();
  fetchVoices();
  attachEventListeners();
});

// ─── Event Listeners ─────────────────────────────────────
function attachEventListeners() {
  el.speakBtn.addEventListener("click", handleSpeak);
  el.micBtn.addEventListener("click", toggleRecording);
  el.downloadBtn.addEventListener("click", downloadAudio);
  el.replayBtn.addEventListener("click", () => el.audioElement.play());
  el.clearHistoryBtn.addEventListener("click", clearHistory);
  el.mainOrb.addEventListener("click", () => el.speakBtn.click());

  el.textInput.addEventListener("input", debounce(onTextInput, 400));
  el.textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSpeak();
    }
  });

  el.langSelect.addEventListener("change", () => {
    state.currentLang = el.langSelect.value;
    filterVoicesByLang(el.langSelect.value);
  });

  el.voiceSelect.addEventListener("change", () => {
    state.currentVoiceId = el.voiceSelect.value;
  });

  // Quick phrase buttons
  document.querySelectorAll(".phrase-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.text;
      const lang = btn.dataset.lang;
      el.textInput.value = text;
      if (lang) {
        el.langSelect.value = lang;
        state.currentLang = lang;
        filterVoicesByLang(lang);
      }
      onTextInput();
      el.textInput.focus();
      showToast("Phrase loaded! Click Generate Voice or press Ctrl+Enter", "info");
    });
  });

  // API key on enter
  el.apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveAndConnect();
  });
}

/** Utility: Debounce function to limit execution rate */
function debounce(fn, ms) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ─── Text Input Handler ───────────────────────────────────
async function onTextInput() {
  const text = el.textInput.value;
  const len  = text.length;
  el.charCount.textContent = len;

  if (len > CONFIG.maxChars * 0.9) {
    el.charCount.style.color = "var(--clr-danger)";
  } else if (len > CONFIG.maxChars * 0.7) {
    el.charCount.style.color = "var(--clr-warn)";
  } else {
    el.charCount.style.color = "";
  }

  // Auto language detection
  if (CONFIG.autoDetect && len > 3) {
    const detected = detectLanguageLocal(text);
    updateDetectPill(detected);
  }
}

function detectLanguageLocal(text) {
  const hindiCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
  const total = hindiCount + alphaCount;
  if (total === 0) return { lang: "en-US", label: "English 🇺🇸", icon: "🇺🇸" };
  const ratio = hindiCount / total;
  if (ratio > 0.8)  return { lang: "hi-IN",        label: "Hindi 🇮🇳",        icon: "🇮🇳" };
  if (ratio > 0.1) return { lang: "multilingual",  label: "Multilingual 🌐", icon: "🌐" };
  return { lang: "en-US", label: "English 🇺🇸", icon: "🇺🇸" };
}

function updateDetectPill({ lang, label, icon }) {
  el.detectIcon.textContent  = icon;
  el.detectLabel.textContent = label;
  el.detectPill.classList.add("detected");
  el.statLang.textContent = label.substring(0, 4);
}

// ─── Speak Handler ────────────────────────────────────────
async function handleSpeak() {
  const text = el.textInput.value.trim();
  if (!text) {
    showToast("Please enter some text to convert to speech.", "warn");
    el.textInput.focus();
    return;
  }

  if (state.isGenerating) return;

  const voiceId  = el.voiceSelect.value || CONFIG.defaultVoiceId;
  const language = el.langSelect.value;
  const model    = el.modelSelect.value;
  const style    = el.styleSelect.value;

  setGeneratingState(true);
  showToast("Sending request to Murf AI...", "info");
  const t0 = performance.now();

  try {
    addChatBubble("user", text, language);

    const response = await fetch(`${CONFIG.backendUrl}/api/synthesize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId,
        language,
        model,
        style,
      }),
    });

    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    let result;
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const textError = await response.text();
      throw new Error(`Server returned non-JSON response (${response.status}): ${textError.substring(0, 100)}…`);
    }

    if (!response.ok) {
      throw new Error(result.detail?.errorMessage || result.error || `Server error ${response.status}`);
    }

    const latency = Math.round(performance.now() - t0);
    console.log(`[VoxAI] Synthesis completed in ${latency}ms`);
    state.lastLatency = latency;
    state.requestCount++;
    state.totalChars += text.length;

    updateStats(latency);

    if (result.audioUrl) {
      showAudioPlayer(result.audioUrl, { latency, voiceId, language, model });
      addChatBubble("ai", `✅ Voice generated in ${latency}ms — Click play above!`, language);
      addToHistory(text, { language, voiceId, audioUrl: result.audioUrl });
      setOrbState("speaking", "Playing audio…");
      setTimeout(() => setOrbState("idle", "Ready to speak"), 3000);
      showToast(`Voice generated in ${latency}ms! 🎉`, "success");
    } else {
      throw new Error("No audio URL returned from Murf API. Check your API key and plan.");
    }

  } catch (err) {
    console.error("Speak error:", err);
    const msg = err.message || "Failed to generate voice. Please check your API key and try again.";
    addChatBubble("ai", `❌ Error: ${msg}`, language);
    showToast(msg, "error");
    setOrbState("idle", "Ready to speak");
  } finally {
    setGeneratingState(false);
  }
}

// ─── API Key Management ────────────────────────────────────
function loadSavedApiKey() {
  if (state.apiKey) {
    el.apiKeyInput.value = state.apiKey;
    setConnectionStatus("ok", "API key loaded");
  }
}

// checkBackendConfig() was removed because key is on backend

async function fetchVoices() {
  try {
    const res = await fetch(`${CONFIG.backendUrl}/api/voices`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    state.voices = data.voices || [];
    populateVoiceSelect(state.voices);
    filterVoicesByLang(el.langSelect.value);
  } catch {
    // Use hardcoded fallback
    state.voices = getFallbackVoices();
    populateVoiceSelect(state.voices);
    filterVoicesByLang(el.langSelect.value);
  }
}

function getFallbackVoices() {
  return [
    { voiceId: "en-US-natalie", name: "Natalie – English US (F)", locale: "en-US", gender: "FEMALE" },
    { voiceId: "en-US-marcus",  name: "Marcus – English US (M)",  locale: "en-US", gender: "MALE" },
    { voiceId: "en-IN-isha",    name: "Isha – English India (F)",  locale: "en-IN", gender: "FEMALE" },
    { voiceId: "en-IN-arjun",   name: "Arjun – English India (M)", locale: "en-IN", gender: "MALE" },
    { voiceId: "hi-IN-divya",   name: "Divya – Hindi (F)",         locale: "hi-IN", gender: "FEMALE" },
    { voiceId: "hi-IN-aryan",   name: "Aryan – Hindi (M)",         locale: "hi-IN", gender: "MALE" },
  ];
}

function populateVoiceSelect(voices) {
  el.voiceSelect.innerHTML = "";
  if (!voices || voices.length === 0) {
    el.voiceSelect.innerHTML = '<option value="">No voices found</option>';
    return;
  }
  voices.forEach((v) => {
    const opt   = document.createElement("option");
    opt.value   = v.voiceId;
    opt.dataset.locale = v.locale || "";
    const flag  = localeToFlag(v.locale);
    const gIcon = v.gender === "MALE" ? "♂" : "♀";
    opt.textContent = `${flag} ${v.name || v.voiceId} ${gIcon}`;
    el.voiceSelect.appendChild(opt);
  });
  el.voiceSelect.value = el.voiceSelect.options[0]?.value || "";
  state.currentVoiceId  = el.voiceSelect.value;
}

function filterVoicesByLang(lang) {
  const voices = state.voices;
  el.voiceSelect.innerHTML = "";

  let filtered = voices;

  if (lang === "multilingual") {
    // Show both Hindi and English
    filtered = voices.filter(v =>
      v.locale?.startsWith("hi-") || v.locale?.startsWith("en-IN")
    );
    if (!filtered.length) filtered = voices;
  } else if (lang !== "") {
    // Exact locale match first, then language prefix
    filtered = voices.filter(v => v.locale === lang);
    if (!filtered.length) {
      const prefix = lang.split("-")[0];
      filtered = voices.filter(v => v.locale?.startsWith(prefix));
    }
    if (!filtered.length) filtered = voices;
  }

  filtered.forEach((v) => {
    const opt   = document.createElement("option");
    opt.value   = v.voiceId;
    opt.dataset.locale = v.locale || "";
    const flag  = localeToFlag(v.locale);
    const gIcon = v.gender === "MALE" || v.gender === "male" ? "♂" : "♀";
    opt.textContent = `${flag} ${v.name || v.voiceId} ${gIcon}`;
    el.voiceSelect.appendChild(opt);
  });

  if (el.voiceSelect.options.length === 0) {
    el.voiceSelect.innerHTML = '<option value="">No voices found</option>';
  }

  el.voiceSelect.value = el.voiceSelect.options[0]?.value || "";
  state.currentVoiceId  = el.voiceSelect.value;
}

function localeToFlag(locale) {
  if (!locale) return "🌐";
  if (locale.startsWith("hi-")) return "🇮🇳";
  if (locale === "en-IN")       return "🇮🇳";
  if (locale === "en-US")       return "🇺🇸";
  if (locale === "en-GB")       return "🇬🇧";
  if (locale === "en-AU")       return "🇦🇺";
  return "🌐";
}

// ─── UI State ────────────────────────────────────────────
function setGeneratingState(isGenerating) {
  state.isGenerating = isGenerating;
  el.speakBtn.disabled = isGenerating;

  if (isGenerating) {
    el.speakBtn.classList.add("btn-speaking");
    el.speakBtnText.textContent = "Generating…";
    el.speakBtn.prepend(createElement("span", "spinner"));
    setOrbState("loading", "Generating voice…");
  } else {
    el.speakBtn.classList.remove("btn-speaking");
    el.speakBtnText.textContent = "Generate Voice";
    const spinner = el.speakBtn.querySelector(".spinner");
    if (spinner) spinner.remove();
    setOrbState("idle", "Ready to speak");
  }
}

function setOrbState(state_name, statusText) {
  el.mainOrb.className = "orb";
  if (state_name !== "idle") el.mainOrb.classList.add(state_name);
  el.orbStatus.textContent = statusText;
}

function updateStats(latency) {
  el.statLatency.textContent  = latency;
  el.statRequests.textContent = state.requestCount;
  el.statChars.textContent    = state.totalChars;
}

// ─── Audio Player ─────────────────────────────────────────
function showAudioPlayer(audioUrl, meta) {
  el.audioElement.src = audioUrl;
  el.audioElement.load();
  el.audioPlayer.style.display = "flex";

  el.playerMeta.textContent = [
    `${meta.latency}ms`,
    meta.model,
    localeToFlag(langToLocale(meta.language)) + " " + langLabel(meta.language),
  ].join(" · ");

  el.downloadBtn.onclick = () => downloadAudio(audioUrl, meta.language);

  // Attempt autoplay
  el.audioElement.play().catch(() => {
    showToast("Click the audio player to play 🔊", "info");
  });

  // Visualize if possible
  connectAudioToVisualizer();
}

function downloadAudio(url, lang) {
  const audioUrl = url || el.audioElement.src;
  if (!audioUrl) return;
  const a = document.createElement("a");
  a.href     = audioUrl;
  a.download = `voxai_${lang || "voice"}_${Date.now()}.mp3`;
  a.target   = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function langLabel(l) {
  const map = {
    "en-US": "English",
    "en-IN": "English-IN",
    "hi-IN": "Hindi",
    "multilingual": "Multi",
  };
  return map[l] || l;
}

function langToLocale(l) {
  return l || "en-US";
}

// ─── Chat Bubbles ─────────────────────────────────────────
function addChatBubble(type, text, language) {
  const welcome = el.chatHistory.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type === "user" ? "user-bubble" : "ai-bubble"}`;

  const avatarEmoji  = type === "user" ? "👤" : "🤖";
  const avatarClass  = type === "user" ? "user-avatar" : "ai-avatar";
  const senderName   = type === "user" ? "You" : "VoxAI";
  const now          = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const langTag      = `<span class="bubble-lang-tag">${langLabel(language)}</span>`;

  bubble.innerHTML = `
    <div class="bubble-avatar ${avatarClass}">${avatarEmoji}</div>
    <div class="bubble-content">
      <div class="bubble-header">
        <span class="bubble-name">${senderName}</span>
        <span class="bubble-time">${now}</span>
        ${type === "user" ? langTag : ""}
      </div>
      <div class="bubble-text">${escapeHtml(text)}</div>
    </div>
  `;

  el.chatHistory.appendChild(bubble);
  el.chatHistory.scrollTop = el.chatHistory.scrollHeight;
}

// ─── Conversation History ─────────────────────────────────
function addToHistory(text, meta) {
  state.conversationHistory.unshift({ text, meta, ts: Date.now() });

  const emptyMsg = el.historyList.querySelector(".history-empty");
  if (emptyMsg) emptyMsg.remove();

  const item = document.createElement("div");
  item.className = "history-item";

  const snippet = text.length > 50 ? text.slice(0, 50) + "…" : text;
  const now     = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const flag    = localeToFlag(meta.language);

  item.innerHTML = `
    <div class="history-item-text" title="${escapeHtml(text)}">${escapeHtml(snippet)}</div>
    <div class="history-item-meta">
      <span>${now}</span>
      <span class="history-lang-badge">${flag} ${langLabel(meta.language)}</span>
      <span>${meta.voiceId}</span>
    </div>
  `;

  item.addEventListener("click", () => {
    el.textInput.value = text;
    onTextInput();
    el.langSelect.value = meta.language;
    state.currentLang = meta.language;
    filterVoicesByLang(meta.language);
    if (meta.audioUrl) showAudioPlayer(meta.audioUrl, meta);
  });

  el.historyList.insertBefore(item, el.historyList.firstChild);

  // Limit to 20 items
  while (el.historyList.children.length > 20) {
    el.historyList.removeChild(el.historyList.lastChild);
  }
}

function clearHistory() {
  state.conversationHistory = [];
  el.historyList.innerHTML = '<p class="history-empty">No conversation yet. Start speaking!</p>';
  showToast("History cleared.", "info");
}

function clearInput() {
  el.textInput.value = "";
  el.charCount.textContent = "0";
  el.detectPill.classList.remove("detected");
  el.detectIcon.textContent  = "🌐";
  el.detectLabel.textContent = "Auto-detect";
  el.textInput.focus();
}

// ─── Speech Recognition (STT) ─────────────────────────────
function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    el.micBtn.disabled = true;
    el.micBtn.title    = "Speech recognition not supported in this browser.";
    return;
  }

  // Warn if not a secure context
  if (!window.isSecureContext) {
    console.warn("Speech recognition may require an HTTPS connection to function reliably.");
  }

  state.recognition = new SR();
  state.recognition.continuous     = false;
  state.recognition.interimResults  = true;

  state.recognition.onstart = () => {
    state.isRecording = true;
    el.micBtn.style.color = "var(--clr-danger)";
    el.micBtn.style.borderColor = "var(--clr-danger)";
    setOrbState("recording", "Listening…");
    showToast("Listening… Speak now!", "info");
  };

  state.recognition.onend = () => {
    state.isRecording = false;
    el.micBtn.style.color = "";
    el.micBtn.style.borderColor = "";
    setOrbState("idle", "Ready to speak");
  };

  state.recognition.onresult = (e) => {
    let transcript = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    el.textInput.value = transcript;
    onTextInput();
  };

  state.recognition.onerror = (e) => {
    state.isRecording = false;
    el.micBtn.style.color = "";
    setOrbState("idle", "Ready to speak");
    showToast(`Mic error: ${e.error}`, "error");
  };
}

function toggleRecording() {
  if (!state.recognition) {
    showToast("Speech recognition is not supported in your browser.", "error");
    return;
  }

  // Set language for recognition
  const lang = el.langSelect.value;
  state.recognition.lang = lang === "multilingual" ? "hi-IN" : lang;

  if (state.isRecording) {
    state.recognition.stop();
  } else {
    el.textInput.value = "";
    state.recognition.start();
  }
}

// ─── Audio Visualizer ─────────────────────────────────────
function connectAudioToVisualizer() {
  try {
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      state.analyser = state.audioCtx.createAnalyser();
      state.analyser.fftSize = 256;
    }
    const source = state.audioCtx.createMediaElementSource(el.audioElement);
    source.connect(state.analyser);
    state.analyser.connect(state.audioCtx.destination);
    drawWaveform();
  } catch (e) {
    // Visualizer not critical
  }
}

function drawWaveform() {
  const canvas = el.waveCanvas;
  const ctx    = canvas.getContext("2d");

  // Resize
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const bufLen = state.analyser ? state.analyser.frequencyBinCount : 64;
  const data   = new Uint8Array(bufLen);

  function render() {
    state.animFrameId = requestAnimationFrame(render);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.analyser) {
      state.analyser.getByteFrequencyData(data);
    } else {
      // Idle animation
      for (let i = 0; i < bufLen; i++) {
        data[i] = Math.sin(Date.now() / 800 + i * 0.3) * 20 + 20;
      }
    }

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0,    "rgba(124,58,237,0.8)");
    grad.addColorStop(0.5,  "rgba(6,182,212,0.8)");
    grad.addColorStop(1,    "rgba(124,58,237,0.8)");

    const sliceW = canvas.width / bufLen;
    let x = 0;

    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);

    for (let i = 0; i < bufLen; i++) {
      const v = data[i] / 255;
      const y = (canvas.height / 2) * (1 - v * 0.6);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }

    // Mirror bottom
    for (let i = bufLen - 1; i >= 0; i--) {
      const v = data[i] / 255;
      const y = (canvas.height / 2) * (1 + v * 0.6);
      ctx.lineTo((i * sliceW), y);
    }

    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Line overlay
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = data[i] / 255;
      const y = (canvas.height / 2) * (1 - v * 0.6);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.strokeStyle = "rgba(6,182,212,0.9)";
    ctx.lineWidth   = 2;
    ctx.stroke();
  }

  if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
  render();
}

function initIdleWave() {
  const canvas = el.waveCanvas;
  const ctx    = canvas.getContext("2d");
  let t = 0;

  function idleRender() {
    if (state.animFrameId) return; // Don't override real visualizer
    state.waveAnimId = requestAnimationFrame(idleRender);

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const freq = 6;
    const amp  = canvas.height / 6;
    const cx   = canvas.height / 2;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0,    "rgba(124,58,237,0.5)");
    grad.addColorStop(0.5,  "rgba(6,182,212,0.5)");
    grad.addColorStop(1,    "rgba(124,58,237,0.5)");

    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x++) {
      const y = cx + amp * Math.sin((x / canvas.width) * freq * Math.PI + t) * 0.5
              + amp * 0.3 * Math.sin((x / canvas.width) * freq * 2 * Math.PI - t * 1.4);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    // Bottom mirror
    for (let x = canvas.width; x >= 0; x--) {
      const y = cx - amp * Math.sin((x / canvas.width) * freq * Math.PI + t) * 0.5
              - amp * 0.3 * Math.sin((x / canvas.width) * freq * 2 * Math.PI - t * 1.4);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle   = grad;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x++) {
      const y = cx + amp * Math.sin((x / canvas.width) * freq * Math.PI + t) * 0.5
              + amp * 0.3 * Math.sin((x / canvas.width) * freq * 2 * Math.PI - t * 1.4);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(6,182,212,0.6)";
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    t += 0.025;
  }

  idleRender();
}

// ─── Particle Background ──────────────────────────────────
function initParticleBackground() {
  const canvas = el.particleCanvas;
  const ctx    = canvas.getContext("2d");

  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  // Create particles
  for (let i = 0; i < 80; i++) {
    particles.push({
      x:   Math.random() * (W || window.innerWidth),
      y:   Math.random() * (H || window.innerHeight),
      r:   Math.random() * 2 + 0.5,
      vx:  (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.4 + 0.1),
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5
        ? `rgba(124,58,237,`
        : `rgba(6,182,212,`,
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.alpha += (Math.random() - 0.5) * 0.01;
      p.alpha  = Math.max(0.05, Math.min(0.6, p.alpha));

      if (p.y < 0)  p.y = H;
      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.fill();
    });

    // Draw faint connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${0.05 * (1 - dist / 120)})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  animate();
}

// ─── Toast Notifications ──────────────────────────────────
function showToast(message, type = "info", duration = 4000) {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warn: "⚠️" };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${escapeHtml(message)}</span>`;

  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ─── Utility ──────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createElement(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}
