/**
 * themes.js — Preset themes for Misoto Generator v5.0
 */
'use strict';

const Themes = (() => {

    const PRESETS = {
        cyberpunk: {
            name: 'Cyberpunk', icon: '⚡',
            config: {
                primaryColor: '#00fff2', secondaryColor: '#ff00aa', bgColor: '#0a0010',
                textColor: '#e0ffff', fontFamily: "'Courier New', monospace",
                scanlinesEffect: true, auraEffect: true, glitchEffect: true,
                borderGlow: true, particlesEffect: false,
                avatarBorderStyle: 'neon', avatarEffect: 'aura',
            }
        },
        vaporwave: {
            name: 'Vaporwave', icon: '🌸',
            config: {
                primaryColor: '#ff71ce', secondaryColor: '#b967ff', bgColor: '#05002e',
                textColor: '#fffae3', fontFamily: "'Georgia', serif",
                scanlinesEffect: true, auraEffect: true, glitchEffect: false,
                borderGlow: true, particlesEffect: true, particleColor: '#ff71ce',
                avatarBorderStyle: 'gradient', avatarEffect: 'pulse',
            }
        },
        darkMode: {
            name: 'Dark Elite', icon: '🌑',
            config: {
                primaryColor: '#ffffff', secondaryColor: '#444', bgColor: '#000000',
                textColor: '#cccccc', fontFamily: "'Segoe UI', sans-serif",
                scanlinesEffect: false, auraEffect: false, glitchEffect: false,
                borderGlow: false, particlesEffect: false,
                avatarBorderStyle: 'solid', avatarEffect: 'none',
            }
        },
        nature: {
            name: 'Natureza', icon: '🌿',
            config: {
                primaryColor: '#4caf50', secondaryColor: '#81c784', bgColor: '#0a1a0a',
                textColor: '#e8f5e9', fontFamily: "'Garamond', serif",
                scanlinesEffect: false, auraEffect: true, glitchEffect: false,
                borderGlow: true, particlesEffect: true, particleColor: '#4caf50',
                avatarBorderStyle: 'gradient', avatarEffect: 'ring',
            }
        },
        retro: {
            name: 'Retro', icon: '📺',
            config: {
                primaryColor: '#ffcc00', secondaryColor: '#ff6600', bgColor: '#1a0a00',
                textColor: '#fff5cc', fontFamily: "'Courier New', monospace",
                scanlinesEffect: true, auraEffect: false, glitchEffect: true,
                borderGlow: false, particlesEffect: false,
                avatarBorderStyle: 'double', avatarEffect: 'none',
            }
        },
        neonCity: {
            name: 'Neon City', icon: '🌃',
            config: {
                primaryColor: '#00ff41', secondaryColor: '#ff00ff', bgColor: '#020c02',
                textColor: '#00ff41', fontFamily: "'Courier New', monospace",
                scanlinesEffect: true, auraEffect: true, glitchEffect: true,
                borderGlow: true, rainEffect: false, matrixEffect: true,
                avatarBorderStyle: 'neon', avatarEffect: 'glow',
            }
        },
        // ── New themes ────────────────────────────────────────────────────────

        luxury: {
            name: 'Luxo', icon: '👑',
            config: {
                primaryColor: '#d4af37', secondaryColor: '#b8960c', bgColor: '#0a0800',
                textColor: '#f5e6c8', fontFamily: "'Georgia', serif",
                scanlinesEffect: false, auraEffect: true, glitchEffect: false,
                borderGlow: true, particlesEffect: true, particleColor: '#d4af37',
                avatarBorderStyle: 'double', avatarEffect: 'glow',
                cardOpacity: 0.92, linkStyle: 'outlined',
            }
        },
        summer: {
            name: 'Verão', icon: '🌊',
            config: {
                primaryColor: '#ff6b35', secondaryColor: '#ffd166', bgColor: '#001220',
                textColor: '#fff9e6', fontFamily: "'Trebuchet MS', sans-serif",
                scanlinesEffect: false, auraEffect: true, glitchEffect: false,
                borderGlow: true, particlesEffect: true, particleColor: '#ffd166',
                avatarBorderStyle: 'gradient', avatarEffect: 'pulse',
                cardOpacity: 0.85, linkStyle: 'pill',
            }
        },
        winter: {
            name: 'Inverno', icon: '❄️',
            config: {
                primaryColor: '#a8d8ea', secondaryColor: '#7ec8e3', bgColor: '#050d1a',
                textColor: '#e8f4f8', fontFamily: "'Segoe UI', sans-serif",
                scanlinesEffect: false, auraEffect: true, glitchEffect: false,
                borderGlow: true, particlesEffect: true, particleColor: '#a8d8ea',
                avatarBorderStyle: 'neon', avatarEffect: 'aura',
                cardOpacity: 0.80, cardBlur: 20, linkStyle: 'default',
            }
        },
        eighties: {
            name: 'Anos 80', icon: '🕹️',
            config: {
                primaryColor: '#ff2d78', secondaryColor: '#00e5ff', bgColor: '#0d0017',
                textColor: '#ffffff', fontFamily: "'Impact', sans-serif",
                scanlinesEffect: true, auraEffect: true, glitchEffect: true,
                borderGlow: true, particlesEffect: false, matrixEffect: false,
                avatarBorderStyle: 'neon', avatarEffect: 'ring',
                cardOpacity: 0.88, linkStyle: 'outlined',
            }
        },
        futuristic: {
            name: 'Futurista', icon: '🚀',
            config: {
                primaryColor: '#00ffcc', secondaryColor: '#0066ff', bgColor: '#000510',
                textColor: '#ccffff', fontFamily: "'Courier New', monospace",
                scanlinesEffect: true, auraEffect: true, glitchEffect: true,
                borderGlow: true, particlesEffect: true, particleColor: '#00ffcc',
                matrixEffect: false,
                avatarBorderStyle: 'neon', avatarEffect: 'glow',
                cardOpacity: 0.75, cardBlur: 24, linkStyle: 'default',
            }
        },
    };

    function init() {
        const grid = document.getElementById('themesGrid');
        if (!grid) return;
        grid.innerHTML = '';
        Object.entries(PRESETS).forEach(([key, theme]) => {
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.dataset.theme = key;
            btn.innerHTML = `<span class="theme-icon">${theme.icon}</span><span class="theme-name">${theme.name}</span>`;
            btn.addEventListener('click', () => apply(key));
            grid.appendChild(btn);
        });
    }

    function apply(key) {
        const preset = PRESETS[key];
        if (!preset) return;
        const config = { ...preset.config };
        if (!('cardColor' in config) && config.bgColor) config.cardColor = config.bgColor;
        State.setConfigBatch({ ...config, activeTheme: key });
        document.dispatchEvent(new CustomEvent('themeApplied', { detail: config }));
        Notify.success('Tema aplicado', preset.name);
    }

    return { init, apply, PRESETS };
})();

window.Themes = Themes;
