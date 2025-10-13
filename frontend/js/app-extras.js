(function(){
  // ---- Simple Sound Engine using WebAudio (with graceful fallback) ----
  const SoundEngine = {
    _ctx: null,
    _enabled: true,
    _muted: false,
    _volFx: 0.75,
    _volMusic: 0.6,
    _musicNode: null,
    _inited: false,
    _buffers: {},
    _sampleBase: '/files/audio/',

    _ensureCtx(){
      if (this._ctx) return;
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {}
    },

    async init(){
      if (this._inited) return;
      this._inited = true;
      this._ensureCtx();
      // Load persisted settings
      this._enabled = localStorage.getItem('enableSound') !== 'false';
      this._muted = localStorage.getItem('muteAll') === 'true';
      const fx = Number(localStorage.getItem('soundVolume')); if (!Number.isNaN(fx)) this._volFx = fx/100;
      const mu = Number(localStorage.getItem('musicVolume')); if (!Number.isNaN(mu)) this._volMusic = mu/100;
      this._preloadSamples();
    },

    setFromControls(){
      this._enabled = document.getElementById('enableSound')?.checked ?? this._enabled;
      this._muted = document.getElementById('muteAll')?.checked ?? this._muted;
      const fx = Number(document.getElementById('soundVolume')?.value);
      if (!Number.isNaN(fx)) this._volFx = fx/100;
      const mu = Number(document.getElementById('musicVolume')?.value);
      if (!Number.isNaN(mu)) this._volMusic = mu/100;
    },

    play(type){
      if (!this._enabled || this._muted) return;
      this._ensureCtx();
      if (!this._ctx) return;
      try {
        const buf = this._buffers[type];
        if (buf) {
          const src = this._ctx.createBufferSource();
          src.buffer = buf;
          const gain = this._ctx.createGain();
          gain.gain.value = this._volFx;
          src.connect(gain).connect(this._ctx.destination);
          src.start();
        } else {
          // Synth fallback
          const now = this._ctx.currentTime;
          const osc = this._ctx.createOscillator();
          const gain = this._ctx.createGain();
          let freq = 440, dur = 0.08, curve = 'sine';
          if (type === 'send') { freq = 660; dur = 0.07; curve = 'triangle'; }
          else if (type === 'receive') { freq = 520; dur = 0.10; curve = 'sine'; }
          else if (type === 'ui') { freq = 400; dur = 0.05; curve = 'square'; }
          osc.type = curve;
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(this._volFx * 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          osc.connect(gain).connect(this._ctx.destination);
          osc.start(now);
          osc.stop(now + dur + 0.02);
        }
      } catch {}
    },

    startMusic(){
      if (this._muted || localStorage.getItem('enableMusic') !== 'true') return;
      this._ensureCtx();
      if (!this._ctx || this._musicNode) return;
      if (this._buffers['bg']) {
        const src = this._ctx.createBufferSource();
        src.buffer = this._buffers['bg'];
        src.loop = true;
        const gain = this._ctx.createGain();
        gain.gain.value = this._volMusic;
        src.connect(gain).connect(this._ctx.destination);
        src.start();
        this._musicNode = src;
        return;
      }
      // Subtle noise pad fallback
      const bufferSize = 2 * this._ctx.sampleRate;
      const noiseBuffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i=0;i<bufferSize;i++) output[i] = (Math.random()*2 - 1) * 0.02;
      const noise = this._ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const filter = this._ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = this._ctx.createGain();
      gain.gain.value = this._volMusic * 0.2;
      noise.connect(filter).connect(gain).connect(this._ctx.destination);
      noise.start();
      this._musicNode = noise;
    },

    stopMusic(){
      try { this._musicNode?.stop(); } catch {}
      this._musicNode = null;
    },

    async _preloadSamples(){
      if (!this._ctx) return;
      const files = {
        send: 'send.mp3',
        receive: 'receive.mp3',
        ui: 'ui.mp3',
        bg: 'bg.mp3',
      };
      const entries = Object.entries(files);
      await Promise.all(entries.map(async ([key, name]) => {
        const url = this._sampleBase + name;
        try {
          const resp = await fetch(url, { method: 'GET' });
          if (!resp.ok) return;
          const arr = await resp.arrayBuffer();
          const buf = await this._ctx.decodeAudioData(arr.slice(0));
          this._buffers[key] = buf;
        } catch {}
      }));
    }
  };

  // ---- Profile Effects ----
  function applyAvatarEffect(effect){
    const avatar = document.getElementById('avatarImage');
    const wrapper = document.querySelector('.avatar-wrapper');
    if (!avatar || !wrapper) return;
    const effects = [
      'avatar-effect-none','avatar-effect-glow','avatar-effect-pulse','avatar-effect-ring','avatar-effect-sparkle'
    ];
    avatar.classList.remove(...effects);
    wrapper.classList.remove(...effects);
    switch(effect){
      case 'glow':
        avatar.classList.add('avatar-effect-glow'); break;
      case 'pulse':
        avatar.classList.add('avatar-effect-pulse'); break;
      case 'ring':
        wrapper.classList.add('avatar-effect-ring'); break;
      case 'sparkle':
        wrapper.classList.add('avatar-effect-sparkle'); break;
      default:
        avatar.classList.add('avatar-effect-none');
    }
  }

  function initProfileEffects(){
    const select = document.getElementById('profileEffectSelect');
    const saved = localStorage.getItem('profileEffect') || 'none';
    if (select) select.value = saved;
    applyAvatarEffect(saved);
    if (select) {
      select.addEventListener('change', function(){
        const val = this.value;
        localStorage.setItem('profileEffect', val);
        if (typeof persistSettings === 'function') {
          persistSettings({ profileEffect: val });
        }
        applyAvatarEffect(val);
        SoundEngine.play('ui');
      });
    }
  }

  // ---- Icon fill on active (post-feather replace safety) ----
  function applyActiveIconFill(){
    // Nothing required here; CSS handles it. But ensure feather ran.
    try { if (window.feather) feather.replace(); } catch {}
  }

  // ---- Wire up events ----
  function wireEvents(){
    // Ensure sound engine gets initialized on first interaction
    const activateAudio = () => {
      SoundEngine.init();
      SoundEngine.setFromControls();
      SoundEngine.startMusic();
      document.removeEventListener('click', activateAudio, { capture: true });
    };
    document.addEventListener('click', activateAudio, { capture: true, once: true });

    // Chat send buttons
    document.querySelectorAll('.chat-send-btn').forEach(btn => {
      btn.addEventListener('click', () => SoundEngine.play('send'));
    });

    // Navbar clicks
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        SoundEngine.play('ui');
        // small defer to ensure active class applied before feather styles
        setTimeout(applyActiveIconFill, 0);
      });
    });

    // Socket events for incoming messages
    const tryAttachSocket = () => {
      const s = window.socket;
      if (!s || s.__zyloSoundPatched) return;
      try {
        s.on('receive_message', () => SoundEngine.play('receive'));
        s.on('receive_group_message', () => SoundEngine.play('receive'));
        s.__zyloSoundPatched = true;
      } catch {}
    };
    tryAttachSocket();
    // Re-try a few times in case socket is late
    let attempts = 0;
    const iv = setInterval(() => { attempts++; tryAttachSocket(); if (attempts > 10) clearInterval(iv); }, 500);

    // React to settings controls changing at runtime
    ['soundVolume','musicVolume','muteAll','enableSound','enableMusic'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        SoundEngine.setFromControls();
        if (id === 'enableMusic' || id === 'musicVolume' || id === 'muteAll'){
          SoundEngine.stopMusic();
          SoundEngine.startMusic();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initProfileEffects();
    wireEvents();
    applyActiveIconFill();
  });
})();
