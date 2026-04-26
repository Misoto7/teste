/**
 * font-manager.js - built-in font catalog and preview/export helpers
 */
'use strict';

const FontManager = (() => {
    const DEFAULT_VALUE = "'Courier New', monospace";
    const CUSTOM_VALUE = "'CustomFont'";
    const INHERIT_VALUE = '__inherit__';
    const CUSTOM_LABEL = 'Fonte carregada';

    const SYSTEM_GROUPS = [
        {
            label: 'Monospace',
            options: [
                { label: 'Courier New', value: "'Courier New', monospace", preview: "'Courier New', monospace" },
                { label: 'Consolas', value: "'Consolas', monospace", preview: "'Consolas', monospace" },
                { label: 'Monaco', value: "'Monaco', monospace", preview: "'Monaco', monospace" },
                { label: 'Lucida Console', value: "'Lucida Console', monospace", preview: "'Lucida Console', monospace" },
            ],
        },
        {
            label: 'Sans-Serif',
            options: [
                { label: 'Segoe UI', value: "'Segoe UI', sans-serif", preview: "'Segoe UI', sans-serif" },
                { label: 'Arial', value: "'Arial', sans-serif", preview: "'Arial', sans-serif" },
                { label: 'Verdana', value: "'Verdana', sans-serif", preview: "'Verdana', sans-serif" },
                { label: 'Impact', value: "'Impact', sans-serif", preview: "'Impact', sans-serif" },
                { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif", preview: "'Trebuchet MS', sans-serif" },
            ],
        },
        {
            label: 'Serif',
            options: [
                { label: 'Georgia', value: "'Georgia', serif", preview: "'Georgia', serif" },
                { label: 'Garamond', value: "'Garamond', serif", preview: "'Garamond', serif" },
                { label: 'Times New Roman', value: "'Times New Roman', serif", preview: "'Times New Roman', serif" },
            ],
        },
    ];

    const BUNDLED_FONTS = [
        { label: 'Before Collapse', family: 'Before Collapse', value: "'Before Collapse', sans-serif", preview: "'Before Collapse', sans-serif", path: 'assets/fonts/before-collapse.ttf', format: 'truetype' },
        { label: 'Damned', family: 'Damned', value: "'Damned', sans-serif", preview: "'Damned', sans-serif", path: 'assets/fonts/damned.ttf', format: 'truetype' },
        { label: 'Fracture 5758', family: 'Fracture 5758', value: "'Fracture 5758', sans-serif", preview: "'Fracture 5758', sans-serif", path: 'assets/fonts/fracture-5758.ttf', format: 'truetype' },
        { label: 'Air Americana', family: 'Air Americana', value: "'Air Americana', sans-serif", preview: "'Air Americana', sans-serif", path: 'assets/fonts/air-americana.ttf', format: 'truetype' },
        { label: 'Akura Popo', family: 'Akura Popo', value: "'Akura Popo', sans-serif", preview: "'Akura Popo', sans-serif", path: 'assets/fonts/akura-popo.ttf', format: 'truetype' },
        { label: 'Armenia', family: 'Armenia', value: "'Armenia', serif", preview: "'Armenia', serif", path: 'assets/fonts/armenia.ttf', format: 'truetype' },
        { label: 'Barcade 3D', family: 'Barcade 3D', value: "'Barcade 3D', sans-serif", preview: "'Barcade 3D', sans-serif", path: 'assets/fonts/barcade-3d.ttf', format: 'truetype' },
        { label: 'HFF Black Steel', family: 'HFF Black Steel', value: "'HFF Black Steel', sans-serif", preview: "'HFF Black Steel', sans-serif", path: 'assets/fonts/hff-black-steel.ttf', format: 'truetype' },
        { label: 'IBM Logo', family: 'IBM Logo', value: "'IBM Logo', sans-serif", preview: "'IBM Logo', sans-serif", path: 'assets/fonts/ibm-logo.ttf', format: 'truetype' },
        { label: 'Jersey M54', family: 'Jersey M54', value: "'Jersey M54', sans-serif", preview: "'Jersey M54', sans-serif", path: 'assets/fonts/jersey-m54.ttf', format: 'truetype' },
        { label: 'Logotronik', family: 'Logotronik', value: "'Logotronik', sans-serif", preview: "'Logotronik', sans-serif", path: 'assets/fonts/logotronik.ttf', format: 'truetype' },
        { label: 'Minecraftia', family: 'Minecraftia', value: "'Minecraftia', monospace", preview: "'Minecraftia', monospace", path: 'assets/fonts/minecraftia-regular.ttf', format: 'truetype' },
        { label: 'Outrun Future', family: 'Outrun Future', value: "'Outrun Future', sans-serif", preview: "'Outrun Future', sans-serif", path: 'assets/fonts/outrun-future.otf', format: 'opentype' },
        { label: 'Space Age', family: 'Space Age', value: "'Space Age', sans-serif", preview: "'Space Age', sans-serif", path: 'assets/fonts/space-age.ttf', format: 'truetype' },
        { label: 'Technoid', family: 'Technoid', value: "'Technoid', sans-serif", preview: "'Technoid', sans-serif", path: 'assets/fonts/technoid.ttf', format: 'truetype' },
        { label: 'Vandalism', family: 'Vandalism', value: "'Vandalism', sans-serif", preview: "'Vandalism', sans-serif", path: 'assets/fonts/vandalism.otf', format: 'opentype' },
    ];

    const bundledByValue = new Map(BUNDLED_FONTS.map(font => [font.value, font]));
    const dataUrlCache = new Map();
    const pickers = new Map();

    function init() {
        _injectBundledFontFaces();
        document.querySelectorAll('select[data-font-picker="true"]').forEach(select => {
            _rebuildSelect(select);
            _mountCustomPicker(select);
            syncSelectPreview(select);
        });
    }

    function _injectBundledFontFaces() {
        if (document.getElementById('bundledFontFaces')) return;
        const style = document.createElement('style');
        style.id = 'bundledFontFaces';
        style.textContent = BUNDLED_FONTS.map(font => _fontFaceRule(font, font.path)).join('\n');
        document.head.appendChild(style);
    }

    function _rebuildSelect(select) {
        const currentValue = select.value;
        const allowInherit = select.dataset.allowInherit === 'true';
        const customGroup = select.querySelector('[data-custom-font-group]')?.cloneNode(true) || _buildCustomGroup();
        select.innerHTML = '';

        if (allowInherit) {
            select.appendChild(_buildSingleOption('Usar Fonte Base', INHERIT_VALUE, 'inherit'));
        }

        SYSTEM_GROUPS.forEach(group => select.appendChild(_buildGroup(group.label, group.options)));
        select.appendChild(_buildGroup('Fontes Extras', BUNDLED_FONTS));
        select.appendChild(customGroup);
        _styleOptionPreviews(select);
        select.value = currentValue || (allowInherit ? INHERIT_VALUE : DEFAULT_VALUE);
        _renderCustomPicker(select);
    }

    function _buildGroup(label, options) {
        const group = document.createElement('optgroup');
        group.label = label;
        options.forEach(optionCfg => group.appendChild(_buildOption(optionCfg.label, optionCfg.value, optionCfg.preview)));
        return group;
    }

    function _buildSingleOption(label, value, preview) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.dataset.preview = preview;
        return option;
    }

    function _buildOption(label, value, preview) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.dataset.preview = preview;
        option.style.fontFamily = preview;
        return option;
    }

    function _buildCustomGroup() {
        const group = document.createElement('optgroup');
        group.dataset.customFontGroup = 'true';
        group.label = 'Fonte Personalizada';
        group.style.display = 'none';
        group.appendChild(_buildOption(CUSTOM_LABEL, CUSTOM_VALUE, CUSTOM_VALUE));
        return group;
    }

    function _styleOptionPreviews(select) {
        select.classList.add('form-input--font');
        select.querySelectorAll('option').forEach(option => {
            option.style.fontFamily = option.dataset.preview || option.value;
        });
    }

    function _mountCustomPicker(select) {
        if (pickers.has(select.id)) return;

        const root = document.createElement('div');
        root.className = 'font-picker';
        root.innerHTML = `
            <button type="button" class="form-input form-input--font font-picker__button" aria-expanded="false">
                <span class="font-picker__button-text"></span>
                <i class="fas fa-chevron-down font-picker__button-icon"></i>
            </button>
            <div class="font-picker__menu" role="listbox"></div>
        `;

        select.insertAdjacentElement('afterend', root);
        pickers.set(select.id, root);

        root.querySelector('.font-picker__button').addEventListener('click', () => {
            const isOpen = !root.classList.contains('open');
            _setOpen(select, isOpen);
        });

        document.addEventListener('click', (event) => {
            if (!root.contains(event.target)) _setOpen(select, false);
        });

        _renderCustomPicker(select);
    }

    function _renderCustomPicker(select) {
        const root = pickers.get(select.id);
        if (!root) return;

        const menu = root.querySelector('.font-picker__menu');
        menu.innerHTML = '';

        const looseOptions = Array.from(select.children).filter(node => node.tagName === 'OPTION');
        if (looseOptions.length) {
            const section = document.createElement('div');
            section.className = 'font-picker__group';
            looseOptions.forEach(option => section.appendChild(_buildPickerOption(select, option)));
            menu.appendChild(section);
        }

        Array.from(select.children).forEach(group => {
            if (group.tagName !== 'OPTGROUP' || group.style.display === 'none') return;
            const section = document.createElement('div');
            section.className = 'font-picker__group';

            const label = document.createElement('span');
            label.className = 'font-picker__group-label';
            label.textContent = group.label;
            section.appendChild(label);

            Array.from(group.children).forEach(option => section.appendChild(_buildPickerOption(select, option)));
            menu.appendChild(section);
        });

        syncSelectPreview(select);
    }

    function _buildPickerOption(select, option) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'font-picker__option';
        button.dataset.value = option.value;
        button.textContent = option.textContent;
        button.style.fontFamily = option.dataset.preview || option.value;
        button.addEventListener('click', () => {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            _setOpen(select, false);
        });
        return button;
    }

    function syncSelectPreview(select) {
        if (!select) return;
        const root = pickers.get(select.id);
        const selected = select.selectedOptions?.[0];
        select.style.fontFamily = selected?.dataset.preview || selected?.value || DEFAULT_VALUE;
        if (!root) return;

        const label = root.querySelector('.font-picker__button-text');
        if (label) {
            label.textContent = selected?.textContent || 'Selecione uma fonte';
            label.style.fontFamily = selected?.dataset.preview || selected?.value || DEFAULT_VALUE;
        }

        root.querySelectorAll('.font-picker__option').forEach(option => {
            option.classList.toggle('is-active', option.dataset.value === select.value);
        });
    }

    function _setOpen(select, isOpen) {
        const root = pickers.get(select.id);
        if (!root) return;
        root.classList.toggle('open', isOpen);
        root.querySelector('.font-picker__button')?.setAttribute('aria-expanded', String(isOpen));
    }

    function showCustomFontOption(label = CUSTOM_LABEL) {
        document.querySelectorAll('select[data-font-picker="true"]').forEach(select => {
            const group = select.querySelector('[data-custom-font-group]');
            const option = group?.querySelector(`option[value="${CUSTOM_VALUE}"]`);
            if (!group || !option) return;
            group.style.display = '';
            option.textContent = label ? `Fonte carregada: ${label}` : CUSTOM_LABEL;
            option.dataset.preview = CUSTOM_VALUE;
            option.style.fontFamily = CUSTOM_VALUE;
            _renderCustomPicker(select);
        });
    }

    function hideCustomFontOption() {
        document.querySelectorAll('select[data-font-picker="true"]').forEach(select => {
            const group = select.querySelector('[data-custom-font-group]');
            const option = group?.querySelector(`option[value="${CUSTOM_VALUE}"]`);
            if (!group || !option) return;
            group.style.display = 'none';
            option.textContent = CUSTOM_LABEL;
            _renderCustomPicker(select);
        });
    }

    function ensureCustomFontFace(src) {
        if (!src) return;
        let style = document.getElementById('customFontFace');
        if (!style) {
            style = document.createElement('style');
            style.id = 'customFontFace';
            document.head.appendChild(style);
        }
        style.textContent = _fontFaceRule({ family: 'CustomFont', format: _guessFormat(src) }, src);
    }

    function clearCustomFontFace() {
        document.getElementById('customFontFace')?.remove();
    }

    function resolveFontValue(value, fallback = DEFAULT_VALUE) {
        return !value || value === INHERIT_VALUE ? fallback : value;
    }

    function getPreviewFontConfig(values, media) {
        return {
            fontFaceCss: _collectFontFaceCss(values, media, false),
        };
    }

    async function getExportFontConfig(values, media) {
        return {
            fontFaceCss: await _collectFontFaceCss(values, media, true),
        };
    }

    function _collectFontFaceCss(values, media, forExport) {
        const unique = Array.from(new Set(values.filter(Boolean).filter(value => value !== INHERIT_VALUE)));
        if (!forExport) {
            return unique.map(value => {
                if (value === CUSTOM_VALUE && media?.customFont) {
                    return _fontFaceRule({ family: 'CustomFont', format: _guessFormat(media.customFont) }, media.customFont);
                }
                const bundled = bundledByValue.get(value);
                return bundled ? _fontFaceRule(bundled, bundled.path) : '';
            }).filter(Boolean).join('\n');
        }

        const tasks = unique.map(async value => {
            if (value === CUSTOM_VALUE && media?.customFont) {
                return _fontFaceRule({ family: 'CustomFont', format: _guessFormat(media.customFont) }, media.customFont);
            }

            const bundled = bundledByValue.get(value);
            if (!bundled) return '';
            if (!forExport) return _fontFaceRule(bundled, bundled.path);

            try {
                const dataUrl = await _ensureDataUrl(bundled);
                return _fontFaceRule(bundled, dataUrl);
            } catch (error) {
                console.warn('[FontManager] fallback to relative font path:', error);
                return _fontFaceRule(bundled, bundled.path);
            }
        });

        return Promise.all(tasks).then(parts => parts.filter(Boolean).join('\n'));
    }

    async function _ensureDataUrl(font) {
        if (dataUrlCache.has(font.path)) return dataUrlCache.get(font.path);
        const response = await fetch(new URL(font.path, window.location.href));
        if (!response.ok) throw new Error(`Falha ao carregar a fonte "${font.label}".`);
        const blob = await response.blob();
        const dataUrl = await _blobToDataUrl(blob);
        dataUrlCache.set(font.path, dataUrl);
        return dataUrl;
    }

    function _blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Não foi possível converter a fonte para exportação.'));
            reader.readAsDataURL(blob);
        });
    }

    function _fontFaceRule(font, src) {
        const format = font.format ? ` format('${font.format}')` : '';
        return `@font-face{font-family:'${font.family}';src:url('${src}')${format};font-display:swap;}`;
    }

    function _guessFormat(src) {
        const lowered = String(src || '').toLowerCase();
        if (lowered.includes('font/woff2') || lowered.endsWith('.woff2')) return 'woff2';
        if (lowered.includes('font/woff') || lowered.endsWith('.woff')) return 'woff';
        if (lowered.includes('font/otf') || lowered.endsWith('.otf')) return 'opentype';
        return 'truetype';
    }

    return {
        init,
        syncSelectPreview,
        showCustomFontOption,
        hideCustomFontOption,
        ensureCustomFontFace,
        clearCustomFontFace,
        resolveFontValue,
        getPreviewFontConfig,
        getExportFontConfig,
        DEFAULT_VALUE,
        CUSTOM_VALUE,
        INHERIT_VALUE,
    };
})();

window.FontManager = FontManager;
