/**
 * app.js - Main UI orchestrator for Misoto Generator v5.0
 */
'use strict';

const DEFAULT_LINKS = [
    { id: 'dl_1', name: 'Instagram', url: 'https://www.instagram.com/misoto._/', icon: 'fab fa-instagram', iconUrl: '', color: '#E1306C', desc: '@misoto._', badge: '', badgeColor: '#00ff00', clicks: 0, showClicks: false },
    { id: 'dl_2', name: 'TikTok', url: 'https://www.tiktok.com/@misoto', icon: 'fab fa-tiktok', iconUrl: '', color: '#ffffff', desc: '@misoto', badge: '', badgeColor: '#00ff00', clicks: 0, showClicks: false },
    { id: 'dl_3', name: 'Discord', url: '#', icon: 'fab fa-discord', iconUrl: '', color: '#5865F2', desc: 'misoto_', badge: '', badgeColor: '#00ff00', clicks: 0, showClicks: false },
    { id: 'dl_4', name: 'Spotify', url: 'https://open.spotify.com/user/31fa7yqasf7zfznihgu7vn5lweiy', icon: 'fab fa-spotify', iconUrl: '', color: '#1DB954', desc: 'PLAYLISTS', badge: '', badgeColor: '#00ff00', clicks: 0, showClicks: false },
    { id: 'dl_5', name: 'Reddit', url: 'https://www.reddit.com/user/misoto_/', icon: 'fab fa-reddit', iconUrl: '', color: '#FF4500', desc: 'u/misoto_', badge: '', badgeColor: '#00ff00', clicks: 0, showClicks: false },
];

const COLOR_CONTROLS = [
    { id: 'primaryColor' },
    { id: 'secondaryColor' },
    { id: 'bgColor' },
    { id: 'cardColor' },
    { id: 'textColor' },
    {
        id: 'wallpaperFilterColor',
        afterInput: () => setWallpaperFilter('custom', { live: true }),
        afterChange: () => setWallpaperFilter('custom', { live: true }),
    },
];

const RANGE_CONTROLS = [
    { id: 'nameSize', format: (value) => `${value}rem` },
    { id: 'wallpaperOpacity' },
    { id: 'wallpaperBlur', format: (value) => `${value}px` },
    {
        id: 'wallpaperFilterStrength',
        afterInput: (value) => {
            if (value > 0 && _currentWallpaperFilter() === 'none') {
                setWallpaperFilter('custom', { live: true, explicitStrength: value });
            }
        },
        afterChange: (value) => {
            if (value > 0 && _currentWallpaperFilter() === 'none') {
                setWallpaperFilter('custom', { live: true, explicitStrength: value });
            }
        },
    },
    { id: 'avatarSize', format: (value) => `${value}px` },
    { id: 'cardWidth', format: (value) => `${value}px` },
    { id: 'cardBlur', format: (value) => `${value}px` },
    { id: 'cardOpacity' },
    { id: 'cardMinHeight', format: (value) => value === 0 ? 'Auto' : `${value}px` },
    { id: 'linkSpacing', format: (value) => `${value}px` },
    { id: 'linkRadius', format: (value) => `${value}px` },
    { id: 'bgWallpaperOpacity' },
    { id: 'bgWallpaperBlur', format: (value) => `${value}px` },
];

const TEXT_CONTROLS = [
    { id: 'username', transform: (value) => value.toUpperCase().slice(0, 20) },
    { id: 'bioText' },
    { id: 'cardHeaderText' },
    { id: 'footerText' },
    { id: 'audioStreamLabel' },
];

const SELECT_CONTROLS = [
    { id: 'fontFamily', onChange: (_, element) => FontManager.syncSelectPreview(element) },
    { id: 'fontFamilyName', onChange: (_, element) => FontManager.syncSelectPreview(element) },
    { id: 'fontFamilyLinkName', onChange: (_, element) => FontManager.syncSelectPreview(element) },
    { id: 'fontFamilyLinkDesc', onChange: (_, element) => FontManager.syncSelectPreview(element) },
    { id: 'fontFamilyCardTitle', onChange: (_, element) => FontManager.syncSelectPreview(element) },
    { id: 'fontFamilyFooter', onChange: (_, element) => FontManager.syncSelectPreview(element) },
    { id: 'avatarShape' },
    { id: 'avatarBorderStyle' },
    { id: 'avatarEffect' },
    { id: 'linksLayout' },
    { id: 'linkStyle' },
    { id: 'linkAnimation' },
    { id: 'hoverEffect' },
    { id: 'waveformStyle' },
    {
        id: 'wallpaperFilter',
        customHandler(value) {
            setWallpaperFilter(value, { live: false });
        },
    },
    { id: 'mouseTrail' },
    { id: 'bgWallpaperSize' },
];

const CHECKBOX_CONTROLS = [
    'scanlinesEffect',
    'auraEffect',
    'glitchEffect',
    'borderGlow',
    'typingEffect',
    'particlesEffect',
    'rainEffect',
    'matrixEffect',
    'musicLoop',
    'showCardHeader',
    'showFooter',
    'showClock',
    'showBio',
    'sonicWaveEffect',
];

const SIMPLE_COLOR_CONTROLS = [
    { id: 'particleColor' },
    { id: 'matrixColor', fallback: '#00ff00' },
    { id: 'mouseTrailColor' },
];

const IMAGE_UPLOAD_CONTROLS = [
    { zoneId: 'profileUploadZone', stateKey: 'profile', previewBoxId: 'profilePreviewBox', previewImgId: 'profilePreviewImg', removeId: 'removeProfile', maxMB: 5, types: ['image/jpeg', 'image/png', 'image/gif'] },
    { zoneId: 'wallpaperUploadZone', stateKey: 'wallpaper', previewBoxId: 'wallpaperPreviewBox', previewImgId: 'wallpaperPreviewImg', removeId: 'removeWallpaper', maxMB: 10, types: ['image/jpeg', 'image/png', 'image/gif'] },
    { zoneId: 'bgWallpaperUploadZone', stateKey: 'bgWallpaper', previewBoxId: 'bgWallpaperPreviewBox', previewImgId: 'bgWallpaperPreviewImg', removeId: 'removeBgWallpaper', maxMB: 10, types: ['image/jpeg', 'image/png', 'image/gif'] },
];

const RANGE_CONTROL_MAP = new Map(RANGE_CONTROLS.map((control) => [control.id, control]));

function getById(id) {
    return document.getElementById(id);
}

function bindColorControl(control) {
    const picker = getById(control.id);
    const hex = getById(control.hexId || `${control.id}Hex`);
    const stateKey = control.key || control.id;

    if (picker) {
        picker.addEventListener('input', (event) => {
            const value = event.target.value;
            if (hex) hex.value = value;
            State.setConfigLive(stateKey, value);
            control.afterInput?.(value, event.target);
        });

        picker.addEventListener('change', (event) => {
            control.afterChange?.(event.target.value, event.target);
            State.commitHistory();
        });
    }

    if (hex) {
        hex.addEventListener('input', (event) => {
            const value = _normalizeHex(event.target.value);
            if (!value) return;
            if (picker) picker.value = value;
            event.target.value = value;
            State.setConfigLive(stateKey, value);
            control.afterInput?.(value, event.target);
        });

        hex.addEventListener('change', (event) => {
            const value = _normalizeHex(event.target.value);
            if (!value) return;
            if (picker) picker.value = value;
            event.target.value = value;
            control.afterChange?.(value, event.target);
            State.commitHistory();
        });
    }
}

function bindRangeControl(control) {
    const input = getById(control.id);
    if (!input) return;

    input.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        _setRangeUi(control.id, value);
        State.setConfigLive(control.key || control.id, value);
        control.afterInput?.(value, event.target);
    });

    input.addEventListener('change', (event) => {
        const value = parseFloat(event.target.value);
        control.afterChange?.(value, event.target);
        State.commitHistory();
    });
}

function bindTextControl(control) {
    const input = getById(control.id);
    if (!input) return;

    input.addEventListener('input', (event) => {
        const value = control.transform ? control.transform(event.target.value) : event.target.value;
        if (control.transform) event.target.value = value;
        State.setConfigLive(control.key || control.id, value);
    });

    input.addEventListener('change', () => State.commitHistory());
}

function bindSelectControl(control) {
    const element = getById(control.id);
    if (!element) return;

    element.addEventListener('change', (event) => {
        const value = event.target.value;
        if (control.customHandler) {
            control.customHandler(value, event.target);
        } else {
            State.setConfig(control.key || control.id, value);
        }
        control.onChange?.(value, event.target);
    });
}

function bindCheckboxControl(id) {
    const element = getById(id);
    if (!element) return;
    element.addEventListener('change', (event) => State.setConfig(id, event.target.checked));
}

function bindSimpleColorControl(control) {
    const input = getById(control.id);
    if (!input) return;

    input.addEventListener('input', (event) => {
        State.setConfigLive(control.key || control.id, event.target.value);
    });

    input.addEventListener('change', () => State.commitHistory());
}

function wireUploadImage({ zoneId, stateKey, previewBoxId, previewImgId, removeId, maxMB, types }) {
    const previewBox = getById(previewBoxId);
    const previewImg = getById(previewImgId);
    const zone = getById(zoneId);

    UploadZone.setup(zoneId, {
        maxMB,
        types,
        onFile(file, dataUrl) {
            State.setMedia(stateKey, dataUrl);
            if (previewImg) previewImg.src = dataUrl;
            if (previewBox) previewBox.classList.remove('hidden');
            if (zone) zone.classList.add('hidden');
            Notify.success('Imagem carregada', file.name);
        },
    });

    getById(removeId)?.addEventListener('click', () => {
        confirmAction('Remover esta imagem?', () => {
            State.setMedia(stateKey, null);
            if (previewBox) previewBox.classList.add('hidden');
            if (zone) zone.classList.remove('hidden');
            if (previewImg) previewImg.src = '';
        });
    });
}

function syncUIFromState() {
    const cfg = State.getConfig();
    const media = State.getMedia();

    COLOR_CONTROLS.forEach((control) => {
        const value = cfg[control.key || control.id];
        const picker = getById(control.id);
        const hex = getById(control.hexId || `${control.id}Hex`);
        if (picker && value) picker.value = value;
        if (hex && value) hex.value = value;
    });

    RANGE_CONTROLS.forEach((control) => {
        const value = cfg[control.key || control.id];
        _setRangeUi(control.id, value);
    });

    TEXT_CONTROLS.forEach((control) => {
        const input = getById(control.id);
        if (input) input.value = cfg[control.key || control.id] || '';
    });

    SELECT_CONTROLS.forEach((control) => {
        const element = getById(control.id);
        if (!element) return;
        const value = cfg[control.key || control.id];
        if (value !== undefined && value !== null) element.value = value;
    });

    SIMPLE_COLOR_CONTROLS.forEach((control) => {
        const input = getById(control.id);
        if (!input) return;
        input.value = cfg[control.key || control.id] || control.fallback || '#9d00ff';
    });

    CHECKBOX_CONTROLS.forEach((id) => {
        const element = getById(id);
        if (element) element.checked = Boolean(cfg[id]);
    });

    if (media.customFont) {
        FontManager.ensureCustomFontFace(media.customFont);
        FontManager.showCustomFontOption(media.customFontName);
    } else {
        FontManager.clearCustomFontFace();
        FontManager.hideCustomFontOption();
    }

    document.querySelectorAll('select[data-font-picker="true"]').forEach((element) => {
        FontManager.syncSelectPreview(element);
    });
}

function isMobileLayout() {
    return window.innerWidth <= 768;
}

function initPanelDrag() {
    const panel = getById('controlPanel');
    const handle = getById('panelHandle');
    if (!panel || !handle) return;

    // ── Mobile: sem drag, painel controlado pela tab bar ──
    if (isMobileLayout()) {
        return;
    }

    // ── Desktop: drag to reposition ──
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let panelWidth = 0;
    let panelHeight = 0;

    handle.style.touchAction = 'none';

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        originLeft = rect.left;
        originTop = rect.top;
        panelWidth = rect.width;
        panelHeight = rect.height;
        panel.style.transition = 'none';
        document.body.style.userSelect = 'none';
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    handle.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointerId) return;
        const nextLeft = Math.max(0, Math.min(window.innerWidth - panelWidth, originLeft + (event.clientX - startX)));
        const nextTop = Math.max(0, Math.min(window.innerHeight - panelHeight, originTop + (event.clientY - startY)));
        panel.style.left = `${nextLeft}px`;
        panel.style.top = `${nextTop}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    });

    const finishDrag = () => {
        if (activePointerId === null) return;
        activePointerId = null;
        panel.style.transition = '';
        document.body.style.userSelect = '';
    };

    handle.addEventListener('pointerup', (event) => {
        if (event.pointerId !== activePointerId) return;
        finishDrag();
    });
    handle.addEventListener('pointercancel', finishDrag);
    handle.addEventListener('lostpointercapture', finishDrag);
}

function initMobile() {
    // Ajustar --vh para viewport real no mobile (fix iOS safari)
    function adjustVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    adjustVH();
    window.addEventListener('resize', adjustVH);
    window.addEventListener('orientationchange', () => setTimeout(adjustVH, 200));

    if (!isMobileLayout()) return;

    // ── Tab bar: alternar entre Preview e Painel ──
    const tabPreview = getById('tabPreview');
    const tabPanel   = getById('tabPanel');
    const panel      = getById('controlPanel');
    const iframe     = getById('previewFrame');
    if (!tabPreview || !tabPanel || !panel || !iframe) return;

    function showTab(tab) {
        if (tab === 'panel') {
            panel.classList.remove('mobile-hidden');
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            tabPanel.classList.add('active');
            tabPreview.classList.remove('active');
        } else {
            panel.classList.add('mobile-hidden');
            iframe.style.opacity = '1';
            iframe.style.pointerEvents = '';
            tabPreview.classList.add('active');
            tabPanel.classList.remove('active');
        }
    }

    // Começa mostrando o preview
    showTab('preview');

    tabPreview.addEventListener('click', () => showTab('preview'));
    tabPanel.addEventListener('click',   () => showTab('panel'));

    // Quando o usuário exporta, voltar ao preview
    document.addEventListener('exportDone', () => showTab('preview'));
}


function setWallpaperFilter(type, { live = false, explicitStrength } = {}) {
    const select = getById('wallpaperFilter');
    const currentStrength = explicitStrength !== undefined
        ? explicitStrength
        : parseFloat(getById('wallpaperFilterStrength')?.value || State.getConfig().wallpaperFilterStrength || 0);

    const patch = { wallpaperFilter: type };

    if (type !== 'none') {
        const nextStrength = currentStrength > 0
            ? currentStrength
            : (type === 'custom' ? 0.65 : 1);
        patch.wallpaperFilterStrength = nextStrength;
        _setRangeUi('wallpaperFilterStrength', nextStrength);
    }

    if (select && select.value !== type) select.value = type;

    if (live) {
        State.setConfigBatchLive(patch);
    } else {
        State.setConfigBatch(patch);
    }
}

function initFontUpload() {
    const fontZone = getById('fontUploadZone');
    const fontInput = fontZone?.querySelector('.upload-input');
    if (fontInput) {
        fontZone.addEventListener('click', (event) => {
            if (event.target !== fontInput) fontInput.click();
        });

        fontInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                Notify.error('Arquivo muito grande', 'Max 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                State.setMedia('customFont', loadEvent.target.result, { customFontName: file.name });
                FontManager.ensureCustomFontFace(loadEvent.target.result);
                getById('fontPreviewBox')?.classList.remove('hidden');
                fontZone.classList.add('hidden');
                const nameElement = getById('fontFileName');
                if (nameElement) nameElement.textContent = file.name;
                FontManager.showCustomFontOption(file.name);

                const fontSelect = getById('fontFamily');
                if (fontSelect) {
                    fontSelect.value = FontManager.CUSTOM_VALUE;
                    FontManager.syncSelectPreview(fontSelect);
                    State.setConfig('fontFamily', FontManager.CUSTOM_VALUE);
                }

                Notify.success('Fonte carregada', file.name);
            };

            reader.readAsDataURL(file);
            event.target.value = '';
        });
    }

    getById('removeFont')?.addEventListener('click', () => {
        confirmAction('Remover a fonte personalizada?', () => {
            State.setMedia('customFont', null, { customFontName: null });
            FontManager.clearCustomFontFace();
            getById('fontPreviewBox')?.classList.add('hidden');
            fontZone?.classList.remove('hidden');
            FontManager.hideCustomFontOption();

            const fontSelect = getById('fontFamily');
            if (fontSelect) {
                fontSelect.value = FontManager.DEFAULT_VALUE;
                FontManager.syncSelectPreview(fontSelect);
                State.setConfig('fontFamily', FontManager.DEFAULT_VALUE);
            }

            Notify.info('Fonte removida', '');
        });
    });
}

function initMusicUpload() {
    UploadZone.setup('musicUploadZone', {
        maxMB: 15,
        types: ['audio/mpeg'],
        onFile(file, dataUrl) {
            State.setMedia('music', dataUrl, { musicName: file.name });
            Player.load(dataUrl);
            getById('musicLoadedBox')?.classList.remove('hidden');
            getById('musicUploadZone')?.classList.add('hidden');
            const nameElement = getById('musicFileName');
            if (nameElement) nameElement.textContent = file.name;
            Notify.success('Musica carregada', file.name);
        },
    });

    getById('removeMusic')?.addEventListener('click', () => {
        confirmAction('Remover a musica?', () => {
            State.setMedia('music', null, { musicName: null });
            Player.unload();
            getById('musicLoadedBox')?.classList.add('hidden');
            getById('musicUploadZone')?.classList.remove('hidden');
            Notify.info('Musica removida', '');
        });
    });
}

function initHistoryControls() {
    const undoButton = getById('undoBtn');
    const redoButton = getById('redoBtn');

    const refreshHistory = () => {
        if (undoButton) undoButton.disabled = !State.canUndo();
        if (redoButton) redoButton.disabled = !State.canRedo();
    };

    undoButton?.addEventListener('click', () => {
        if (!State.undo()) return;
        syncUIFromState();
        Notify.info('Desfeito', '');
    });

    redoButton?.addEventListener('click', () => {
        if (!State.redo()) return;
        syncUIFromState();
        Notify.info('Refeito', '');
    });

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'z') {
            event.preventDefault();
            if (State.undo()) {
                syncUIFromState();
                Notify.info('Desfeito', '');
            }
        }

        if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
            event.preventDefault();
            if (State.redo()) {
                syncUIFromState();
                Notify.info('Refeito', '');
            }
        }
    });

    State.onChange(refreshHistory);
    refreshHistory();
}

function initResetControl() {
    getById('resetBtn')?.addEventListener('click', () => {
        confirmAction('Restaurar TODAS as configuracoes? Esta acao nao pode ser desfeita.', () => {
            State.reset();
            Player.unload();
            syncUIFromState();

            ['profilePreviewBox', 'wallpaperPreviewBox', 'bgWallpaperPreviewBox', 'musicLoadedBox', 'fontPreviewBox']
                .forEach((id) => getById(id)?.classList.add('hidden'));

            ['profileUploadZone', 'wallpaperUploadZone', 'bgWallpaperUploadZone', 'musicUploadZone', 'fontUploadZone']
                .forEach((id) => getById(id)?.classList.remove('hidden'));

            FontManager.hideCustomFontOption();
            Notify.info('Resetado', 'Configuracoes restauradas');
        });
    });
}

function initJsonControls() {
    getById('exportJsonBtn')?.addEventListener('click', () => {
        const json = State.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'misoto-config.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Notify.success('Config exportada', 'misoto-config.json');
    });

    getById('importJsonInput')?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            try {
                State.importJSON(loadEvent.target.result);
                syncUIFromState();
                Notify.success('Config importada', file.name);
            } catch (error) {
                Notify.error('Erro ao importar', error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });
}

function initPanelToggle() {
    getById('panelToggleBtn')?.addEventListener('click', () => {
        const panel = getById('controlPanel');
        if (!panel) return;
        panel.classList.toggle('collapsed');
        const toggleButton = getById('panelToggleBtn');
        if (!toggleButton) return;
        toggleButton.innerHTML = panel.classList.contains('collapsed')
            ? '<i class="fas fa-sliders-h"></i>'
            : '<i class="fas fa-times"></i>';
    });

    // Mobile: tap fora do painel fecha
    document.addEventListener('click', (e) => {
        if (!isMobileLayout()) return;
        const panel = getById('controlPanel');
        const toggleBtn = getById('panelToggleBtn');
        if (!panel || panel.classList.contains('collapsed')) return;
        if (!panel.contains(e.target) && !toggleBtn?.contains(e.target)) {
            panel.classList.add('collapsed');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-sliders-h"></i>';
        }
    });
}

function _bindAllControls() {
    COLOR_CONTROLS.forEach(bindColorControl);
    RANGE_CONTROLS.forEach(bindRangeControl);
    TEXT_CONTROLS.forEach(bindTextControl);
    SELECT_CONTROLS.forEach(bindSelectControl);
    CHECKBOX_CONTROLS.forEach(bindCheckboxControl);
    SIMPLE_COLOR_CONTROLS.forEach(bindSimpleColorControl);
    IMAGE_UPLOAD_CONTROLS.forEach(wireUploadImage);
}

function _normalizeHex(value) {
    let nextValue = String(value || '').trim();
    if (!nextValue) return null;
    if (!nextValue.startsWith('#')) nextValue = `#${nextValue}`;
    return /^#[0-9A-Fa-f]{6}$/.test(nextValue) ? nextValue : null;
}

function _setRangeUi(id, value) {
    const control = RANGE_CONTROL_MAP.get(id);
    const input = getById(id);
    if (!input) return;

    const numericValue = Number.isFinite(parseFloat(value))
        ? parseFloat(value)
        : parseFloat(input.min || 0);

    input.value = numericValue;
    const valueLabel = getById(`${id}Value`);
    if (valueLabel) {
        valueLabel.textContent = control?.format ? control.format(numericValue) : numericValue;
    }
}

function _currentWallpaperFilter() {
    return getById('wallpaperFilter')?.value || State.getConfig().wallpaperFilter || 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    Notify.init();
    PanelSections.init();
    FontManager.init();
    Player.init();
    Themes.init();

    State.init(DEFAULT_LINKS);

    _bindAllControls();
    initFontUpload();
    initMusicUpload();

    LinksManager.init();
    FloatingManager.init();
    Preview.init();
    Exporter.init();

    initHistoryControls();
    initResetControl();
    initJsonControls();
    initPanelToggle();
    initPanelDrag();
    initMobile();

    document.addEventListener('themeApplied', syncUIFromState);
    window.addEventListener('beforeunload', () => State.save());

    syncUIFromState();

    Notify.success('Misoto v5.0', 'Bem-vindo! Tudo pronto.', 3000);
    console.log('%cMisoto Generator v5.0', 'color:#9d00ff;font-weight:bold;font-size:16px');
});
