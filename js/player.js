/**
 * player.js — Music player v5.0 with Web Audio API beat-reactive waveform
 */
'use strict';

const Player = (() => {

    let audio, audioCtx, analyser, dataArray, animFrame;
    let isPlaying = false, isMuted = false, lastVol = 0.7;

    let playBtn, progressBar, currentTimeEl, totalTimeEl, volBtn, volSlider, waveCanvas;

    function init() {
        audio = document.getElementById('globalAudio');
        if (!audio) return;

        playBtn       = document.getElementById('playBtn');
        progressBar   = document.getElementById('musicProgress');
        currentTimeEl = document.getElementById('currentTime');
        totalTimeEl   = document.getElementById('totalTime');
        volBtn        = document.getElementById('volBtn');
        volSlider     = document.getElementById('volSlider');
        waveCanvas    = document.getElementById('waveCanvas');

        audio.volume = lastVol;
        _syncConfig();

        playBtn?.addEventListener('click', togglePlay);
        volBtn?.addEventListener('click', toggleMute);
        volSlider?.addEventListener('input', e => {
            const v = e.target.value / 100;
            audio.volume = v;
            lastVol = v || lastVol;
            isMuted = v === 0;
            _updateVolIcon();
        });
        progressBar?.addEventListener('input', e => {
            if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
        });

        audio.addEventListener('timeupdate',     _updateProgress);
        audio.addEventListener('loadedmetadata', _updateDuration);
        audio.addEventListener('play',  () => { isPlaying = true;  _updatePlayBtn(); _startViz(); });
        audio.addEventListener('pause', () => { isPlaying = false; _updatePlayBtn(); _stopViz(); });
        audio.addEventListener('ended', () => { if (progressBar) progressBar.value = 0; });

        State.onChange((source) => {
            if (['config', 'history', 'reset', 'init'].includes(source)) _syncConfig();
        });
    }

    function _initAudioCtx() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
        } catch(e) {
            console.warn('[Player] Web Audio API not available:', e);
        }
    }

    function load(dataUrl) {
        if (!audio) return;
        audio.pause();
        audio.src = dataUrl;
        _syncConfig();
        audio.load();
        setTimeout(() => {
            audio.play().then(() => {
                _initAudioCtx();
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            }).catch(() => {});
        }, 150);
    }

    function unload() {
        if (!audio) return;
        audio.pause(); audio.src = '';
        isPlaying = false;
        _updatePlayBtn();
        _stopViz();
        _clearCanvas();
        if (progressBar)   progressBar.value = 0;
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (totalTimeEl)   totalTimeEl.textContent   = '0:00';
    }

    function _syncConfig() {
        if (!audio) return;
        const cfg = State.getConfig();
        audio.loop = cfg.musicLoop !== false;
    }

    function togglePlay() {
        if (!audio || !audio.src) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().then(() => {
                _initAudioCtx();
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            }).catch(() => {});
        }
    }

    function toggleMute() {
        if (!audio) return;
        isMuted = !isMuted;
        audio.muted = isMuted;
        if (volSlider) volSlider.value = isMuted ? 0 : lastVol * 100;
        _updateVolIcon();
    }

    function _startViz() {
        if (!waveCanvas) return;
        _drawViz();
    }

    function _stopViz() {
        cancelAnimationFrame(animFrame);
        _clearCanvas();
    }

    function _clearCanvas() {
        if (!waveCanvas) return;
        const ctx = waveCanvas.getContext('2d');
        ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    }

    function _drawViz() {
        if (!waveCanvas || !isPlaying) return;
        animFrame = requestAnimationFrame(_drawViz);

        const cfg = State.getConfig();
        const W = waveCanvas.width, H = waveCanvas.height;
        const ctx = waveCanvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        if (analyser) {
            analyser.getByteFrequencyData(dataArray);
        }

        const acc   = cfg.secondaryColor || '#9d00ff';
        const pri   = cfg.primaryColor   || '#00ff00';
        const style = cfg.waveformStyle  || 'bars';
        const bins  = analyser ? dataArray.length : 32;

        if (style === 'bars') {
            const count   = Math.min(48, bins);
            const barW    = W / count - 1;
            for (let i = 0; i < count; i++) {
                const v = analyser ? (dataArray[Math.floor(i * bins / count)] / 255) : (0.1 + Math.random() * 0.1);
                const h = Math.max(2, v * H);
                const t = 1 - i / count;
                const grad = ctx.createLinearGradient(0, H - h, 0, H);
                grad.addColorStop(0, acc);
                grad.addColorStop(1, pri);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(i * (barW + 1), H - h, barW, h, 2);
                ctx.fill();
            }
        } else if (style === 'wave') {
            ctx.beginPath();
            ctx.strokeStyle = acc;
            ctx.lineWidth = 2;
            const step = W / (bins - 1);
            for (let i = 0; i < bins; i++) {
                const v = analyser ? (dataArray[i] / 255) : (0.5 + Math.sin(i * 0.3 + Date.now() * 0.003) * 0.1);
                const x = i * step, y = H - (v * H);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else if (style === 'dots') {
            const count = Math.min(32, bins);
            for (let i = 0; i < count; i++) {
                const v = analyser ? (dataArray[Math.floor(i * bins / count)] / 255) : (0.2 + Math.random() * 0.2);
                const r = Math.max(2, v * (H / 2));
                const x = (i / (count - 1)) * W;
                const y = H / 2;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = acc;
                ctx.fill();
            }
        } else if (style === 'circles') {
            const avg = analyser
                ? dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255
                : 0.3;
            const r = avg * (Math.min(W, H) * 0.45);
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, Math.max(4, r), 0, Math.PI * 2);
            ctx.strokeStyle = acc;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, Math.max(2, r * 0.6), 0, Math.PI * 2);
            ctx.strokeStyle = pri;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function _updateProgress() {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        if (progressBar) progressBar.value = pct;
        if (currentTimeEl) currentTimeEl.textContent = _fmt(audio.currentTime);
    }

    function _updateDuration() {
        if (totalTimeEl) totalTimeEl.textContent = _fmt(audio.duration);
    }

    function _updatePlayBtn() {
        if (!playBtn) return;
        playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    function _updateVolIcon() {
        if (!volBtn || !audio) return;
        const v = audio.muted ? 0 : audio.volume;
        if (v === 0)      volBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        else if (v < 0.4) volBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        else              volBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }

    function _fmt(s) {
        if (!isFinite(s)) return '0:00';
        return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
    }

    function getAnalyserData() {
        if (!analyser || !isPlaying) return null;
        analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    return { init, load, unload, togglePlay, toggleMute, getAnalyserData };
})();

window.Player = Player;
