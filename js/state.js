/**
 * state.js — Single source of truth for Misoto Generator v5.0
 */
'use strict';

const State = (() => {
    const DEFAULTS = {
        primaryColor:    '#00ff00',
        secondaryColor:  '#9d00ff',
        bgColor:         '#0a0a0f',
        cardColor:       '#0a0a0f',
        textColor:       '#e0e0ff',
        fontFamily:      "'Courier New', monospace",
        fontFamilyName:      '__inherit__',
        fontFamilyLinkName:  '__inherit__',
        fontFamilyLinkDesc:  '__inherit__',
        fontFamilyCardTitle: '__inherit__',
        fontFamilyFooter:    '__inherit__',
        nameSize:        2.4,
        bioText:         '',
        wallpaperOpacity: 0.35,
        wallpaperBlur:    0,
        wallpaperFilter:  'none',
        wallpaperFilterColor: '#9d00ff',
        wallpaperFilterStrength: 0,
        wallpaperScope:   'global',
        avatarShape:     'circle',
        avatarSize:      130,
        avatarBorderStyle: 'neon',
        avatarBorderWidth: 4,
        avatarEffect:    'aura',
        cardWidth:       490,
        cardBlur:        12,
        cardOpacity:     0.88,
        cardMinHeight:   0,
        linksLayout:     'list',
        linkSpacing:     10,
        linkRadius:      10,
        linkStyle:       'default',
        scanlinesEffect: true,
        auraEffect:      true,
        glitchEffect:    true,
        borderGlow:      true,
        typingEffect:    true,
        particlesEffect: false,
        particleColor:   '#9d00ff',
        rainEffect:      false,
        matrixEffect:    false,
        matrixColor:     '#00ff00',
        linkAnimation:   'slideLeft',
        hoverEffect:     'slide',
        showCardHeader:  true,
        cardHeaderText:  'SISTEMA::LINKS',
        showFooter:      true,
        footerText:      '',
        showClock:       true,
        showBio:         true,
        musicLoop:       true,
        musicVolume:     70,
        showWaveform:    true,
        waveformStyle:   'bars',
        activeTheme:     'custom',
        precognitionEffect:  false,
        mouseTrail:          'none',
        mouseTrailColor:     '#9d00ff',
        mouseTrailSize:      5,
        mouseTrailIntensity: 5,
        sonicWaveEffect:     false,
        audioStreamLabel:    'AUDIO_STREAM',
        bgWallpaperOpacity:  0.4,
        bgWallpaperBlur:     0,
        bgWallpaperSize:     'cover',
        cardPositionMode:    'default',
        cardPosX:            50,
        cardPosY:            50,
    };

    const STORAGE_KEY = 'misoto_v5';
    let _config  = { ...DEFAULTS };
    let _media   = { profile: null, wallpaper: null, bgWallpaper: null, music: null, musicName: null, customFont: null, customFontName: null };
    let _links   = [];
    let _floats  = [];
    let _history = [];
    let _cursor  = -1;
    const _listeners = new Set();

    function _notify(source) { _listeners.forEach(fn => fn(source)); }

    function _snapshot() {
        return {
            config: { ..._config },
            links:  JSON.parse(JSON.stringify(_links)),
            floats: JSON.parse(JSON.stringify(_floats)),
        };
    }

    function _sameSnapshot(a, b) {
        if (!a || !b) return false;
        return JSON.stringify(a) === JSON.stringify(b);
    }

    const MAX_HISTORY = 50;

    function _pushHistory() {
        const next = _snapshot();
        if (_cursor >= 0 && _sameSnapshot(_history[_cursor], next)) return false;
        // Drop redo branch efficiently
        if (_cursor < _history.length - 1) _history.splice(_cursor + 1);
        _history.push(next);
        _cursor++;
        // Trim oldest entries when limit exceeded
        if (_history.length > MAX_HISTORY) {
            const excess = _history.length - MAX_HISTORY;
            _history.splice(0, excess);
            _cursor -= excess;
        }
        return true;
    }

    function undo() { if (_cursor <= 0) return false; _cursor--; _apply(_history[_cursor]); return true; }
    function redo() { if (_cursor >= _history.length - 1) return false; _cursor++; _apply(_history[_cursor]); return true; }
    function canUndo() { return _cursor > 0; }
    function canRedo() { return _cursor < _history.length - 1; }

    function _apply(snapshot) {
        _config = { ...snapshot.config };
        _links  = JSON.parse(JSON.stringify(snapshot.links));
        _floats = JSON.parse(JSON.stringify(snapshot.floats));
        _notify('history');
    }

    function getConfig()  { return { ..._config }; }
    function getMedia()   { return { ..._media };  }
    function getLinks()   { return _links; }
    function getFloats()  { return _floats; }

    function setConfig(key, value)  {
        if (Object.is(_config[key], value)) return false;
        _config[key] = value;
        _pushHistory();
        _notify('config');
        return true;
    }
    function setConfigLive(key, value) {
        if (Object.is(_config[key], value)) return false;
        _config[key] = value;
        _notify('config');
        return true;
    }
    function setConfigBatch(patch)  {
        let changed = false;
        Object.entries(patch).forEach(([key, value]) => {
            if (!Object.is(_config[key], value)) {
                _config[key] = value;
                changed = true;
            }
        });
        if (!changed) return false;
        _pushHistory();
        _notify('config');
        return true;
    }
    function setConfigBatchLive(patch) {
        let changed = false;
        Object.entries(patch).forEach(([key, value]) => {
            if (!Object.is(_config[key], value)) {
                _config[key] = value;
                changed = true;
            }
        });
        if (!changed) return false;
        _notify('config');
        return true;
    }
    function commitHistory() {
        if (_pushHistory()) _notify('history');
    }
    function setMedia(key, value, extra) {
        let changed = !Object.is(_media[key], value);
        _media[key] = value;
        if (extra) {
            Object.entries(extra).forEach(([extraKey, extraValue]) => {
                if (!Object.is(_media[extraKey], extraValue)) changed = true;
                _media[extraKey] = extraValue;
            });
        }
        if (!changed) return false;
        _notify('media');
        return true;
    }

    function addLink(link)         { _links.push(link); _pushHistory(); _notify('links'); }
    function updateLink(id, patch) { const l = _links.find(l => l.id === id); if (l) Object.assign(l, patch); _pushHistory(); _notify('links'); }
    function updateLinkSilent(id, patch) {
        // Updates state + preview WITHOUT re-rendering the links list (safe during text input)
        const l = _links.find(l => l.id === id);
        if (!l) return;
        Object.assign(l, patch);
        _notify('links-silent');
    }
    function commitLinkHistory() { if (_pushHistory()) _notify('history'); }
    function removeLink(id)        { _links = _links.filter(l => l.id !== id); _pushHistory(); _notify('links'); }
    function reorderLinks(arr)     { _links = arr; _pushHistory(); _notify('links'); }
    function moveLinkUp(id)   { const i = _links.findIndex(l => l.id === id); if (i <= 0) return; [_links[i-1], _links[i]] = [_links[i], _links[i-1]]; _pushHistory(); _notify('links'); }
    function moveLinkDown(id) { const i = _links.findIndex(l => l.id === id); if (i < 0 || i >= _links.length - 1) return; [_links[i], _links[i+1]] = [_links[i+1], _links[i]]; _pushHistory(); _notify('links'); }

    function addFloat(img)          { _floats.push(img); _pushHistory(); _notify('floats'); }
    function updateFloat(id, patch, source = 'floats') {
        const f = _floats.find(f => f.id === id);
        if (!f) return false;
        let changed = false;
        Object.entries(patch).forEach(([key, value]) => {
            if (!Object.is(f[key], value)) {
                f[key] = value;
                changed = true;
            }
        });
        if (!changed) return false;
        _notify(source);
        return true;
    }
    function commitFloat()          { if (_pushHistory()) _notify('history'); }
    function removeFloat(id)        { _floats = _floats.filter(f => f.id !== id); _pushHistory(); _notify('floats'); }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                config: _config,
                links: _links,
                floats: _floats.map(({ src, ...rest }) => rest),
            }));
        } catch(e) {}
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data.config) _config = { ...DEFAULTS, ...data.config };
            if (Array.isArray(data.links)) _links = data.links;
            return true;
        } catch(e) { return false; }
    }

    function reset() {
        _config  = { ...DEFAULTS };
        _media   = { profile: null, wallpaper: null, bgWallpaper: null, music: null, musicName: null, customFont: null, customFontName: null };
        _links   = [];
        _floats  = [];
        _history = [];
        _cursor  = -1;
        localStorage.removeItem(STORAGE_KEY);
        _notify('reset');
    }

    function exportJSON() { return JSON.stringify({ version: '5.0', config: _config, links: _links }, null, 2); }

    function importJSON(jsonStr) {
        const data = JSON.parse(jsonStr);
        if (data.config) _config = { ...DEFAULTS, ...data.config };
        if (Array.isArray(data.links)) _links = data.links;
        _pushHistory();
        _notify('reset');
    }

    function onChange(fn)  { _listeners.add(fn); }
    function offChange(fn) { _listeners.delete(fn); }

    function init(defaultLinks) {
        const loaded = load();
        if (!loaded && defaultLinks) _links = defaultLinks;
        _pushHistory();
        _notify('init');
    }

    return {
        init, reset, save,
        getConfig, getMedia, getLinks, getFloats,
        setConfig, setConfigLive, setConfigBatch, setConfigBatchLive, commitHistory, setMedia,
        addLink, updateLink, updateLinkSilent, commitLinkHistory, removeLink, moveLinkUp, moveLinkDown, reorderLinks,
        addFloat, updateFloat, commitFloat, removeFloat,
        undo, redo, canUndo, canRedo,
        onChange, offChange,
        exportJSON, importJSON,
        DEFAULTS,
    };
})();

window.State = State;
