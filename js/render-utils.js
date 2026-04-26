/**
 * render-utils.js - Shared rendering helpers for preview and export
 */
'use strict';

const RenderUtils = (() => {

    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function clamp(value, min, max, fallback = min) {
        const parsed = parseFloat(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.max(min, Math.min(max, parsed));
    }

    function readUnitInterval(value, fallback) {
        return clamp(value, 0, 1, fallback);
    }

    function readInt(value, fallback = 0) {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function hexToRgb(hex) {
        const rgb = _hexToRgbArray(hex);
        return `${rgb[0]},${rgb[1]},${rgb[2]}`;
    }

    function hexToRgba(hex, alpha, fallbackHex = '#0a0a0f') {
        const rgb = _hexToRgbArray(hex || fallbackHex);
        return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${readUnitInterval(alpha, 1)})`;
    }

    function composeCssFilter(parts) {
        return parts.filter(Boolean).join(' ').trim();
    }

    function buildStyle(parts) {
        return parts.filter(Boolean).join(';');
    }

    function buildWallpaperFilterState(cfg, accentColor) {
        const type = cfg.wallpaperFilter || 'none';
        const strength = type === 'none' ? 0 : readUnitInterval(cfg.wallpaperFilterStrength, 0);
        const base = {
            type,
            strength,
            cssFilter: '',
            overlayColor: cfg.wallpaperFilterColor || accentColor,
            overlayOpacity: 0,
            overlayBlendMode: 'color',
            hasEffect: strength > 0,
        };

        if (strength <= 0) return base;

        switch (type) {
            case 'custom':
                return {
                    ...base,
                    overlayOpacity: strength,
                };
            case 'hueRotate':
                return {
                    ...base,
                    cssFilter: composeCssFilter([
                        `hue-rotate(${Math.round(290 * strength)}deg)`,
                        `saturate(${(1 + strength * 0.5).toFixed(3)})`,
                    ]),
                };
            case 'desaturate':
                return {
                    ...base,
                    cssFilter: composeCssFilter([
                        `grayscale(${(0.9 * strength).toFixed(3)})`,
                        `contrast(${(1 - strength * 0.08).toFixed(3)})`,
                    ]),
                };
            case 'warm':
                return {
                    ...base,
                    cssFilter: composeCssFilter([
                        `sepia(${(0.65 * strength).toFixed(3)})`,
                        `saturate(${(1 + strength * 0.35).toFixed(3)})`,
                        `contrast(${(1 + strength * 0.08).toFixed(3)})`,
                    ]),
                };
            case 'cool':
                return {
                    ...base,
                    cssFilter: composeCssFilter([
                        `hue-rotate(${Math.round(180 * strength)}deg)`,
                        `saturate(${(1 + strength * 0.2).toFixed(3)})`,
                        `brightness(${(1 - strength * 0.05).toFixed(3)})`,
                    ]),
                };
            default:
                return base;
        }
    }

    function isGifSrc(src) {
        if (!src) return false;
        return src.startsWith('data:image/gif') || /\.gif(\?|$)/i.test(src);
    }

    function buildFixedWallpaperHtml({
        id = '',
        src,
        size = 'cover',
        opacity = 1,
        blur = 0,
        zIndex = 0,
    }) {
        if (!src) return '';

        const filterCss = composeCssFilter(blur > 0 ? [`blur(${blur}px)`] : []);
        const idAttr = id ? ` id="${id}"` : '';

        // Animated GIFs render more efficiently as <img> with object-fit
        // CSS background-image freezes GIF animation in some WebKit contexts
        if (isGifSrc(src)) {
            const imgStyle = buildStyle([
                'position:fixed',
                'inset:0',
                'width:100%',
                'height:100%',
                `object-fit:${size}`,
                'object-position:center',
                `opacity:${readUnitInterval(opacity, 1)}`,
                filterCss ? `filter:${filterCss}` : '',
                blur > 0 ? 'transform:scale(1.08)' : '',
                'transform-origin:center',
                'pointer-events:none',
                `z-index:${zIndex}`,
            ]);
            return `<img${idAttr} src="${src}" alt="" style="${imgStyle}">`;
        }

        const style = buildStyle([
            'position:fixed',
            'inset:0',
            `background-image:url('${src}')`,
            `background-size:${size}`,
            'background-position:center',
            'background-repeat:no-repeat',
            `opacity:${readUnitInterval(opacity, 1)}`,
            filterCss ? `filter:${filterCss}` : '',
            blur > 0 ? 'transform:scale(1.08)' : '',
            'transform-origin:center',
            'pointer-events:none',
            `z-index:${zIndex}`,
        ]);

        return `<div${idAttr} style="${style}"></div>`;
    }

    function buildCardLayerMarkup({
        cfg,
        media,
        pageBg,
        cardBg,
        accentColor,
        classNames,
        bgWallpaperId,
        wallpaperExtraStyle = '',
    }) {
        const names = {
            shell: 'card-shell',
            layer: 'card-layer',
            backdropBase: 'card-backdrop-base',
            backdropImage: 'card-backdrop-image',
            base: 'card-base',
            wallpaper: 'card-wp',
            filter: 'card-filter',
            ...(classNames || {}),
        };

        const hasCardWallpaper = Boolean(media.wallpaper);
        const hasBgWallpaper = Boolean(media.bgWallpaper);

        const cardOpacity = readUnitInterval(cfg.cardOpacity, 0.88);
        const cardBlur = readInt(cfg.cardBlur, 12);
        const wallpaperOpacity = readUnitInterval(cfg.wallpaperOpacity, 0.35);
        const wallpaperBlur = readInt(cfg.wallpaperBlur, 0);
        const bgWallpaperOpacity = readUnitInterval(cfg.bgWallpaperOpacity, 0.4);
        const bgWallpaperBlur = readInt(cfg.bgWallpaperBlur, 0);
        const bgWallpaperSize = cfg.bgWallpaperSize || 'cover';
        const filterState = buildWallpaperFilterState(cfg, accentColor);

        const wallpaperFilterCss = composeCssFilter([
            wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : '',
            filterState.cssFilter,
        ]);

        const backdropImageFilterCss = composeCssFilter([
            bgWallpaperBlur + cardBlur > 0 ? `blur(${bgWallpaperBlur + cardBlur}px)` : '',
        ]);

        const backdropBaseHtml = `<div class="${names.layer} ${names.backdropBase}" style="background:${pageBg};"></div>`;

        // Use <img> for GIF to preserve animation; <div> background-image for static
        const backdropImageHtml = hasBgWallpaper
            ? (isGifSrc(media.bgWallpaper)
                ? `<img class="${names.layer} ${names.backdropImage}" src="${media.bgWallpaper}" alt="" style="${buildStyle([
                    'width:100%',
                    'height:100%',
                    `object-fit:${bgWallpaperSize}`,
                    'object-position:center',
                    `opacity:${bgWallpaperOpacity}`,
                    backdropImageFilterCss ? `filter:${backdropImageFilterCss}` : '',
                    backdropImageFilterCss ? 'transform:scale(1.08)' : '',
                    'transform-origin:center',
                ])}">`
                : `<div class="${names.layer} ${names.backdropImage}" style="${buildStyle([
                    `background-image:url('${media.bgWallpaper}')`,
                    `background-size:${bgWallpaperSize}`,
                    'background-position:center',
                    'background-repeat:no-repeat',
                    'background-attachment:fixed',
                    `opacity:${bgWallpaperOpacity}`,
                    backdropImageFilterCss ? `filter:${backdropImageFilterCss}` : '',
                    backdropImageFilterCss ? 'transform:scale(1.08)' : '',
                    'transform-origin:center',
                ])}"></div>`)
            : '';

        const baseHtml = `<div class="${names.layer} ${names.base}" style="background:${hexToRgba(cardBg, cardOpacity, pageBg)};"></div>`;

        // Use <img> for GIF card wallpaper to preserve animation
        const wallpaperHtml = hasCardWallpaper
            ? (isGifSrc(media.wallpaper)
                ? `<img class="${names.layer} ${names.wallpaper}" src="${media.wallpaper}" alt="" style="${buildStyle([
                    'width:100%',
                    'height:100%',
                    'object-fit:cover',
                    'object-position:center',
                    `opacity:${wallpaperOpacity}`,
                    wallpaperFilterCss ? `filter:${wallpaperFilterCss}` : '',
                    wallpaperFilterCss ? 'transform:scale(1.08)' : '',
                    'transform-origin:center',
                    wallpaperExtraStyle,
                ])}">`
                : `<div class="${names.layer} ${names.wallpaper}" style="${buildStyle([
                    `background-image:url('${media.wallpaper}')`,
                    'background-size:cover',
                    'background-position:center',
                    'background-repeat:no-repeat',
                    `opacity:${wallpaperOpacity}`,
                    wallpaperFilterCss ? `filter:${wallpaperFilterCss}` : '',
                    wallpaperFilterCss ? 'transform:scale(1.08)' : '',
                    'transform-origin:center',
                    wallpaperExtraStyle,
                ])}"></div>`)
            : '';

        const filterHtml = hasCardWallpaper && filterState.overlayOpacity > 0
            ? `<div class="${names.layer} ${names.filter}" style="${buildStyle([
                `background:${filterState.overlayColor}`,
                `opacity:${filterState.overlayOpacity}`,
                `mix-blend-mode:${filterState.overlayBlendMode}`,
            ])}"></div>`
            : '';

        return {
            bgWallpaperHtml: buildFixedWallpaperHtml({
                id: bgWallpaperId,
                src: media.bgWallpaper,
                size: bgWallpaperSize,
                opacity: bgWallpaperOpacity,
                blur: bgWallpaperBlur,
                zIndex: 0,
            }),
            shellHtml: `<div class="${names.shell}">${backdropBaseHtml}${backdropImageHtml}${baseHtml}${wallpaperHtml}${filterHtml}</div>`,
        };
    }

    function buildFloatsMarkup(floats, { className = 'pg-float', includeDataId = true, pointerEvents = 'none' } = {}) {
        return floats.map((img) => {
            const size = img.size || img.width || 120;
            const width = Math.max(1, Math.round(size * (img.stretchX || 1)));
            const height = Math.max(1, Math.round((size / (img.naturalRatio || 1)) * (img.stretchY || 1)));
            const stackZ = img.overlayCard ? 20 : 9;
            const left = img.positionUnit === 'viewport' ? `${img.x}vw` : `${img.x}px`;
            const top = img.positionUnit === 'viewport' ? `${img.y}vh` : `${img.y}px`;
            const dataId = includeDataId ? ` data-id="${img.id}"` : '';

            return `<img src="${img.src}" class="${className}${img.overlayCard ? ` ${className}--over-card` : ''}"${dataId} style="${buildStyle([
                'position:fixed',
                `left:${left}`,
                `top:${top}`,
                `width:${width}px`,
                `height:${height}px`,
                `opacity:${readUnitInterval(img.opacity, 0.85)}`,
                `transform:rotate(${readInt(img.rotation, 0)}deg)`,
                'transform-origin:center center',
                `z-index:${stackZ}`,
                `pointer-events:${pointerEvents}`,
                'user-select:none',
            ])}">`;
        }).join('');
    }

    function _hexToRgbArray(hex) {
        if (!hex || typeof hex !== 'string') return [10, 10, 15];
        const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!match) return [10, 10, 15];
        return [
            parseInt(match[1], 16),
            parseInt(match[2], 16),
            parseInt(match[3], 16),
        ];
    }

    return {
        escHtml,
        hexToRgb,
        hexToRgba,
        readInt,
        readUnitInterval,
        composeCssFilter,
        isGifSrc,
        buildWallpaperFilterState,
        buildFixedWallpaperHtml,
        buildCardLayerMarkup,
        buildFloatsMarkup,
    };
})();

window.RenderUtils = RenderUtils;
