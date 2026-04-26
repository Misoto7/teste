/**
 * preview.js — Live preview renderer for Misoto Generator v5.0
 * FIXES:
 *  - No duplicate audio: panel player controls audio only
 *  - Card draggable only in preview (not in export)
 *  - Particle count reactive
 *  - Opacity works correctly
 *  - Avatar effects (pulse/aura/ring/glow) fixed with full keyframe CSS always declared
 *  - Background wallpaper support
 *  - audioStreamLabel editable
 *  - Floating images draggable in preview to set final position
 */
'use strict';

const Preview = (() => {

    let frame, _timer = null, _lastHtml = '';
    // Stream analyser data to preview via postMessage
    let _waveTimer = null;
    let _suppressNextRender = false;

    function init() {
        frame = document.getElementById('previewFrame');
        if (!frame) return;
        State.onChange((src) => {
            if (src === 'floats-live') return;
            schedule();
        });
        schedule();
        // Start streaming waveform data to preview
        _startWaveStream();
    }

    // Pump analyser data into iframe via postMessage (no audio duplication)
    function _startWaveStream() {
        clearInterval(_waveTimer);
        _waveTimer = setInterval(() => {
            try {
                const data = Player.getAnalyserData();
                if (!data || !frame || !frame.contentWindow) return;
                frame.contentWindow.postMessage({ type: 'waveData', data: Array.from(data) }, '*');
            } catch(e) {}
        }, 1000 / 30);
    }

    function schedule() {
        clearTimeout(_timer);
        _timer = setTimeout(render, 100);
    }

    function cancelNextRender() {
        _suppressNextRender = true;
        clearTimeout(_timer);
        // Auto-clear after 200ms in case nothing else triggers
        setTimeout(() => { _suppressNextRender = false; }, 200);
    }

    function render() {
        if (_suppressNextRender) { _suppressNextRender = false; return; }
        if (!frame) return;
        try {
            const html = _buildHTML();
            if (html === _lastHtml) return;
            _lastHtml = html;
            frame.onload = _wirePreviewInteractions;
            frame.srcdoc = html;
        } catch (err) {
            console.error('[Preview] render error:', err);
        }
    }

    function _wirePreviewInteractions() {
        try {
            const previewDoc = frame.contentDocument;
            if (!previewDoc) return;
            const pg = previewDoc.querySelector('.pg');
            if (pg) FloatingManager.attachPreviewDrag(pg, previewDoc);
            _attachCardDragInPreview(previewDoc);
        } catch(e) {}
    }

    // Card drag only inside preview iframe — saves position, suppresses re-render
    function _attachCardDragInPreview(doc) {
        try {
            const card = doc.querySelector('.pg-card');
            if (!card || card.__cardDragBound) return;
            card.__cardDragBound = true;
            let activePointerId = null, startX = 0, startY = 0, origLeft = 0, origTop = 0;
            let cardW = 0, cardH = 0;
            card.style.cursor = 'grab';
            card.style.touchAction = 'none';

            // Restore saved custom position immediately after load
            const cfg0 = State.getConfig();
            if (cfg0.cardPositionMode === 'custom' && cfg0.cardPosX !== undefined) {
                card.style.position  = 'fixed';
                card.style.left      = cfg0.cardPosX + 'vw';
                card.style.top       = cfg0.cardPosY + 'vh';
                card.style.transform = 'none';
                card.style.margin    = '0';
            }

            card.addEventListener('pointerdown', (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

                const rect = card.getBoundingClientRect();
                activePointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;
                origLeft = rect.left;
                origTop = rect.top;
                cardW = rect.width;
                cardH = rect.height;
                card.style.transition = 'none';
                card.style.cursor     = 'grabbing';
                card.style.position   = 'fixed';
                card.style.transform  = 'none';
                card.style.left       = origLeft + 'px';
                card.style.top        = origTop  + 'px';
                card.style.margin     = '0';
                doc.body.style.userSelect = 'none';
                card.setPointerCapture(e.pointerId);
                e.preventDefault();
            });

            card.addEventListener('pointermove', (e) => {
                if (e.pointerId !== activePointerId) return;
                let newL = origLeft + (e.clientX - startX);
                let newT = origTop  + (e.clientY - startY);
                newL = Math.max(0, Math.min(doc.documentElement.clientWidth  - cardW, newL));
                newT = Math.max(0, Math.min(doc.documentElement.clientHeight - cardH, newT));
                card.style.left = newL + 'px';
                card.style.top  = newT + 'px';
            });

            const finishDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                card.style.cursor     = 'grab';
                card.style.transition = '';
                doc.body.style.userSelect = '';

                const finalLeft = parseFloat(card.style.left);
                const finalTop  = parseFloat(card.style.top);
                const W = doc.documentElement.clientWidth;
                const H = doc.documentElement.clientHeight;
                // Save as vw/vh (0-100) so position is viewport-relative
                // and matches correctly in both preview iframe and exported HTML
                const vwX = parseFloat(((finalLeft / W) * 100).toFixed(2));
                const vhY = parseFloat(((finalTop  / H) * 100).toFixed(2));

                // Suppress next re-render so card stays in place
                _suppressNextRender = true;
                State.setConfigBatch({
                    cardPosX: vwX,
                    cardPosY: vhY,
                    cardPositionMode: 'custom',
                });
            };

            card.addEventListener('pointerup', (e) => {
                if (e.pointerId !== activePointerId) return;
                finishDrag();
            });
            card.addEventListener('pointercancel', finishDrag);
            card.addEventListener('lostpointercapture', finishDrag);
        } catch(e) {}
    }

    function _buildHTML() {
        const cfg    = State.getConfig();
        const media  = State.getMedia();
        const links  = State.getLinks();
        const floats = State.getFloats();

        const esc = RenderUtils.escHtml;
        const profileSrc = media.profile || '';

        const avatarBorderCSS = _avatarBorderCSS(cfg);
        const sc = cfg.secondaryColor || '#9d00ff';
        const pri = cfg.primaryColor || '#00ff00';
        const pageBg = cfg.bgColor || '#0a0a0f';
        const cardBg = cfg.cardColor || pageBg;
        const txt = cfg.textColor || '#e0e0ff';

        const avatarShapeCSS = { circle: '50%', square: '4px', rounded: '20px' }[cfg.avatarShape] || '50%';
        const cardW = cfg.cardWidth || 490;
        const cardRgb = RenderUtils.hexToRgb(cardBg);
        const linkR = cfg.linkRadius !== undefined ? cfg.linkRadius : 10;
        const linkGap = cfg.linkSpacing !== undefined ? cfg.linkSpacing : 10;
        const isGrid = cfg.linksLayout === 'grid';

        const isCustomPos = cfg.cardPositionMode === 'custom';
        const cardPosX = cfg.cardPosX !== undefined ? cfg.cardPosX : 50;
        const cardPosY = cfg.cardPosY !== undefined ? cfg.cardPosY : 10;

        const hasWallpaper = Boolean(media.wallpaper);

        const cardMinH = cfg.cardMinHeight !== undefined ? parseInt(cfg.cardMinHeight) : 0;

        const borderGlowCSS = cfg.borderGlow
            ? `box-shadow:0 0 40px rgba(0,0,0,.6),0 0 30px ${sc}80,inset 0 0 20px ${sc}08;`
            : 'box-shadow:0 10px 40px rgba(0,0,0,.6);';

        const linkStyleMap = {
            default:  'background:rgba(0,0,0,.45);border:1px solid;',
            pill:     'background:rgba(0,0,0,.45);border:1px solid;border-radius:999px!important;',
            outlined: 'background:transparent;border:2px solid;'
        };
        const linkBaseCSS = linkStyleMap[cfg.linkStyle] || linkStyleMap.default;

        const linkAnimMap = { slideLeft:'opacity:0;transform:translateX(-24px);', fade:'opacity:0;', bounce:'opacity:0;transform:translateY(-16px);', scale:'opacity:0;transform:scale(.85);', none:'' };
        const linkAnimStart = linkAnimMap[cfg.linkAnimation] || linkAnimMap.slideLeft;

        const linkHoverMap = { slide:`transform:translateX(6px);background:rgba(0,0,0,.65);`, glow:`box-shadow:0 0 16px ${sc}60;background:rgba(0,0,0,.65);`, scale:`transform:scale(1.02);background:rgba(0,0,0,.65);`, none:`background:rgba(0,0,0,.65);` };
        const linkHoverCSS = linkHoverMap[cfg.hoverEffect] || linkHoverMap.slide;

        // Always declare ALL avatar effect keyframes and classes — large radii for visibility
        const avatarEffectCSS = `
@keyframes auraPulse{0%,100%{opacity:.6;transform:scale(.88)}50%{opacity:1;transform:scale(1.12)}}
@keyframes ringPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:.4}}
@keyframes avPulse{0%,100%{transform:scale(.85);opacity:.7}50%{transform:scale(1.15);opacity:1}}
@keyframes glowPulse{0%,100%{opacity:.7;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}
.pg-aura{position:absolute;inset:-40px;border-radius:${avatarShapeCSS};background:radial-gradient(circle,${sc}dd 0%,${sc}88 30%,transparent 70%);filter:blur(18px);animation:auraPulse 3s ease-in-out infinite;opacity:.9;pointer-events:none;z-index:0;}
.pg-ring{position:absolute;inset:-18px;border-radius:${avatarShapeCSS};border:3px solid ${sc};box-shadow:0 0 16px ${sc},0 0 32px ${sc}80,inset 0 0 16px ${sc}40;animation:ringPulse 2.5s ease-in-out infinite;opacity:1;pointer-events:none;z-index:0;}
.pg-pulse{position:absolute;inset:-30px;border-radius:${avatarShapeCSS};background:radial-gradient(circle,${sc}cc 0%,${sc}66 40%,transparent 70%);filter:blur(10px);animation:avPulse 1.8s ease-in-out infinite;pointer-events:none;z-index:0;}
.pg-glow-fx{position:absolute;inset:-35px;border-radius:${avatarShapeCSS};background:radial-gradient(circle,${pri}cc 0%,${sc}99 40%,transparent 75%);filter:blur(14px);animation:glowPulse 3s ease-in-out infinite;pointer-events:none;z-index:0;}`;

        // Avatar effect element — shown only when toggle is on
        const avatarEffectHTML = (() => {
            if (!cfg.auraEffect || cfg.avatarEffect === 'none') return '';
            const map = {
                aura:  `<div class="pg-aura"></div>`,
                ring:  `<div class="pg-ring"></div>`,
                pulse: `<div class="pg-pulse"></div>`,
                glow:  `<div class="pg-glow-fx"></div>`,
            };
            return map[cfg.avatarEffect] || map.aura;
        })();

        const scanlinesCSS = cfg.scanlinesEffect
            ? `.pg-scanlines{position:fixed;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent 0,transparent 2px,rgba(0,0,0,.18) 2px,rgba(0,0,0,.18) 4px);animation:scanMove 12s linear infinite;}@keyframes scanMove{from{background-position:0 0}to{background-position:0 200px}}`
            : '';

        const glitchCSS  = cfg.glitchEffect && hasWallpaper ? `@keyframes glitch{0%,97%,100%{transform:translate(0)}98%{transform:translate(3px,-2px)}99%{transform:translate(-2px,1px)}}` : '';
        const glitchAnim = cfg.glitchEffect && hasWallpaper ? 'animation:glitch 20s linear infinite;' : '';

        const baseFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamily, FontManager.DEFAULT_VALUE) : (cfg.fontFamily || "'Courier New', monospace");
        const nameFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyName, baseFont) : baseFont;
        const linkNameFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyLinkName, baseFont) : baseFont;
        const linkDescFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyLinkDesc, baseFont) : baseFont;
        const cardTitleFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyCardTitle, baseFont) : baseFont;
        const footerFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyFooter, baseFont) : baseFont;
        const fontConfig = window.FontManager
            ? FontManager.getPreviewFontConfig([baseFont, nameFont, linkNameFont, linkDescFont, cardTitleFont, footerFont], media)
            : {
                fontFaceCss: media.customFont ? `@font-face{font-family:'CustomFont';src:url('${media.customFont}');}` : '',
            };

        const waveformStyle  = cfg.waveformStyle || 'bars';

        const matrixScript   = cfg.matrixEffect ? `(function(){var c=document.getElementById('matrixCanvas');if(!c)return;var ctx=c.getContext('2d');c.width=window.innerWidth;c.height=window.innerHeight;var cols=Math.floor(c.width/16);var drops=Array(cols).fill(1);setInterval(function(){ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='${cfg.matrixColor || pri}';ctx.font='14px monospace';for(var i=0;i<drops.length;i++){var t=String.fromCharCode(0x30A0+Math.random()*96);ctx.fillText(t,i*16,drops[i]*16);if(drops[i]*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]++;}},55);})();` : '';

        const particlesScript = cfg.particlesEffect ? `(function(){
var c=document.getElementById('particlesCanvas');
if(!c)return;
var ctx=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
var pts=[];
for(var i=0;i<40;i++){pts.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:Math.random()*3+1});}
function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(function(p){
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0||p.x>c.width)p.vx*=-1;
        if(p.y<0||p.y>c.height)p.vy*=-1;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle='${cfg.particleColor||sc}';ctx.globalAlpha=.6;ctx.fill();ctx.globalAlpha=1;
    });
    requestAnimationFrame(draw);
}
draw();
})();` : '';

        const clockScript    = cfg.showClock ? `(function(){function tick(){var el=document.querySelector('.pg-clock');if(!el)return;el.textContent=new Date().toLocaleTimeString('pt-BR',{hour12:false}).slice(0,5);}tick();setInterval(tick,10000);})();` : '';
        const trailScript    = cfg.mouseTrail && cfg.mouseTrail !== 'none' ? _mouseTrailScript(cfg) : '';
        const sonicScript    = cfg.sonicWaveEffect ? _sonicWaveScript(cfg) : '';
        const waveformScript = _waveformScript(sc, pri, waveformStyle);

        const typingScript = cfg.typingEffect ? `(function(){
function typeEl(el,delay){
    var text=el.dataset.text||'';
    el.style.visibility='visible';el.textContent='';
    var i=0;
    setTimeout(function go(){if(i<text.length){el.textContent+=text[i++];setTimeout(go,Math.random()*18+12);}},delay);
}
document.querySelectorAll('.pg-link-name[data-text]').forEach(function(el,i){typeEl(el,i*90+30);});
document.querySelectorAll('.pg-link-desc[data-text]').forEach(function(el,i){typeEl(el,i*90+120);});
})();` : '';

        const linksHTML = links.length === 0
            ? `<div style="text-align:center;color:#444;padding:20px;font-size:.82rem;">Nenhum link adicionado</div>`
            : links.map((link, i) => {
                const color = link.color || sc;
                const iconContent = link.iconUrl
                    ? `<img src="${esc(link.iconUrl)}" style="width:20px;height:20px;object-fit:contain;">`
                    : `<i class="${esc(link.icon||'fas fa-link')}"></i>`;
                const nameAttr = cfg.typingEffect ? `data-text="${esc(link.name)}" style="color:${color};visibility:hidden;"` : `style="color:${color};"`;
                const descAttr = cfg.typingEffect ? `data-text="${esc(link.desc||'')}" style="visibility:hidden;"` : '';
                return `<div class="pg-link pg-link--${cfg.linkStyle||'default'}" style="border-color:${color};border-radius:${linkR}px;animation-delay:${0.1+i*0.07}s;">
                    <div class="pg-link-icon" style="color:${color};border-color:${color};">${iconContent}</div>
                    <div class="pg-link-body">
                        <div class="pg-link-name" ${nameAttr}>${cfg.typingEffect ? '' : esc(link.name)}</div>
                        <div class="pg-link-desc" ${descAttr}>${cfg.typingEffect ? '' : esc(link.desc||'')}</div>
                    </div>
                    ${link.badge ? `<span class="pg-badge" style="background:${link.badgeColor||'#00ff00'};color:${link.badgeFontColor||'#000000'};">${esc(link.badge)}</span>` : ''}
                    <div class="pg-link-arrow" style="color:${color};">›</div>
                </div>`;
            }).join('');

        const floatsHTML = RenderUtils.buildFloatsMarkup(floats, {
            className: 'pg-float',
            includeDataId: true,
            pointerEvents: 'auto',
        });

        const { bgWallpaperHtml: bgWallpaperHTML, shellHtml: cardShellHTML } = RenderUtils.buildCardLayerMarkup({
            cfg,
            media,
            pageBg,
            cardBg,
            accentColor: sc,
            bgWallpaperId: 'pgBgWp',
            wallpaperExtraStyle: glitchAnim,
            classNames: {
                shell: 'pg-card-shell',
                layer: 'pg-card-layer',
                backdropBase: 'pg-card-backdrop-base',
                backdropImage: 'pg-card-backdrop-image',
                base: 'pg-card-base',
                wallpaper: 'pg-card-wp',
                filter: 'pg-card-filter',
            },
        });

        const audioLabel = esc(cfg.audioStreamLabel || 'AUDIO_STREAM');

        return `<!DOCTYPE html><html lang="pt-br"><head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
${fontConfig.fontFaceCss}
${glitchCSS}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:${pageBg};color:${txt};font-family:${baseFont};min-height:100vh;overflow:hidden;}
.pg{position:relative;min-height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;padding:40px 20px;}
${scanlinesCSS}
${avatarEffectCSS}
#matrixCanvas,#particlesCanvas{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.35;}
#particlesCanvas{opacity:.7;}
.pg-float{position:fixed;cursor:grab;user-select:none;transform-origin:center center;will-change:left,top,transform;}
.pg-float:active{cursor:grabbing;}
.pg-card{max-width:${cardW}px;width:100%;${cardMinH > 0 ? `min-height:${cardMinH}px;` : ''}position:relative;z-index:10;border:1px solid ${sc}40;border-radius:16px;padding:30px;background:transparent;${borderGlowCSS}overflow:hidden;display:flex;flex-direction:column;isolation:isolate;}
.pg-card-shell{position:absolute;inset:0;z-index:0;pointer-events:none;}
.pg-card-layer{position:absolute;inset:0;border-radius:inherit;}
.pg-card > *:not(.pg-card-shell){position:relative;z-index:1;}
.pg-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${sc},${pri},transparent);background-size:200% 100%;animation:borderSlide 5s linear infinite;z-index:2;}
@keyframes borderSlide{from{background-position:-100% 0}to{background-position:200% 0}}
.pg-card-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid ${sc}25;margin-bottom:16px;flex-shrink:0;}
.pg-card-title{font-size:.76rem;font-weight:700;letter-spacing:2px;color:${sc};text-transform:uppercase;font-family:${cardTitleFont};}
.pg-status-dot{width:7px;height:7px;border-radius:50%;background:${sc};box-shadow:0 0 8px ${sc};animation:blink 2.5s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.pg-player{background:rgba(0,0,0,.4);border:1px solid ${sc}20;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-shrink:0;}
.pg-player-label{font-size:.68rem;font-weight:700;letter-spacing:2px;color:${sc};text-transform:uppercase;}
.pg-vis-canvas{display:block;}
.pg-profile{text-align:center;margin-bottom:26px;flex-shrink:0;}
.pg-avatar-wrap{position:relative;width:${cfg.avatarSize||130}px;height:${cfg.avatarSize||130}px;margin:0 auto 14px;}
.pg-avatar{width:${cfg.avatarSize||130}px;height:${cfg.avatarSize||130}px;border-radius:${avatarShapeCSS};overflow:hidden;${avatarBorderCSS}position:relative;z-index:1;}
.pg-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.pg-avatar-placeholder{width:100%;height:100%;background:rgba(${cardRgb},0.5);display:flex;align-items:center;justify-content:center;font-size:2rem;color:${sc}80;}
.pg-username{font-size:${cfg.nameSize||2.4}rem;font-weight:800;text-transform:uppercase;letter-spacing:3px;background:linear-gradient(45deg,${sc},${pri});-webkit-background-clip:text;background-clip:text;color:transparent;font-family:${nameFont};}
.pg-bio{color:${txt};opacity:.7;font-size:.82rem;line-height:1.5;max-width:340px;margin:.6rem auto 0;}
.pg-links{display:${isGrid?'grid':'flex'};${isGrid?'grid-template-columns:1fr 1fr;':'flex-direction:column;'}gap:${linkGap}px;flex:1 1 auto;align-content:start;}
.pg-link{display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:${linkR}px;text-decoration:none;color:${txt};${linkBaseCSS}transition:all .25s;cursor:pointer;${linkAnimStart}animation:linkIn .4s forwards;}
.pg-link:hover{${linkHoverCSS}}
@keyframes linkIn{to{opacity:1;transform:none}}
.pg-link--pill{border-radius:999px!important;}
.pg-link-icon{width:38px;height:38px;border-radius:7px;border:1px solid;display:grid;place-items:center;font-size:1.1rem;background:rgba(0,0,0,.3);flex-shrink:0;}
.pg-link-body{flex:1;min-width:0;}
.pg-link-name{font-size:.84rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;font-family:${linkNameFont};}
.pg-link-desc{font-size:.7rem;opacity:.6;font-family:${linkDescFont};}
.pg-link-arrow{font-size:1rem;transition:transform .2s;}
.pg-link:hover .pg-link-arrow{transform:translateX(4px);}
.pg-badge{font-size:.55rem;font-weight:800;padding:2px 6px;border-radius:4px;text-transform:uppercase;flex-shrink:0;}
.pg-footer{display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid ${sc}20;font-size:.64rem;color:#4444aa;font-family:${footerFont};margin-top:auto;}
</style>
</head><body>
${bgWallpaperHTML}
<div class="pg">
  ${cfg.scanlinesEffect ? '<div class="pg-scanlines"></div>' : ''}
  ${cfg.matrixEffect ? '<canvas id="matrixCanvas"></canvas>' : ''}
  ${cfg.particlesEffect ? '<canvas id="particlesCanvas"></canvas>' : ''}
  ${floatsHTML}
  <div class="pg-card" ${isCustomPos ? `style="position:fixed;left:${cardPosX}vw;top:${cardPosY}vh;transform:none;margin:0;"` : ''}>${cardShellHTML}
    ${cfg.showCardHeader ? `<div class="pg-card-head"><span class="pg-card-title">${esc(cfg.cardHeaderText||'SISTEMA::LINKS')}</span><span class="pg-status-dot"></span></div>` : ''}
    <div class="pg-player">
      <span class="pg-player-label">${audioLabel}</span>
      <div class="pg-vis-wrap"><canvas class="pg-vis-canvas" id="pvWave" width="80" height="22"></canvas></div>
    </div>
    <div class="pg-profile">
      <div class="pg-avatar-wrap">
        ${avatarEffectHTML}
        <div class="pg-avatar" style="${avatarBorderCSS}${_avatarShapeCSS(cfg)}">
          ${profileSrc
            ? `<img src="${profileSrc}" alt="${esc(cfg.username||'MISOTO')}">`
            : `<div class="pg-avatar-placeholder"><i class="fas fa-user"></i></div>`}
        </div>
      </div>
      <div class="pg-username">${esc(cfg.username||'MISOTO')}</div>
      ${cfg.showBio && cfg.bioText ? `<div class="pg-bio">${esc(cfg.bioText)}</div>` : ''}
    </div>
    <div class="pg-links${isGrid?' pg-links--grid':''}" style="gap:${linkGap}px;">${linksHTML}</div>
    ${cfg.showFooter ? `<div class="pg-footer">${cfg.showClock ? `<span class="pg-clock">${new Date().toLocaleTimeString('pt-BR',{hour12:false}).slice(0,5)}</span>` : '<span></span>'}<span>${esc(cfg.footerText||'v5.0')}</span></div>` : ''}
  </div>
</div>
<script>
${clockScript}
${matrixScript}
${particlesScript}
${waveformScript}
${typingScript}
${trailScript}
${sonicScript}
</script>
</body></html>`;
    }

    // ── Waveform receives data via postMessage from parent ─────────────────────
    function _waveformScript(sc, pri, style) {
        return `(function(){
var canvas=document.getElementById('pvWave');
if(!canvas)return;
var ctx=canvas.getContext('2d');
var W=canvas.width,H=canvas.height;
var currentData=new Uint8Array(128);
function drawFrame(data){
    ctx.clearRect(0,0,W,H);
    if('${style}'==='wave'){
        ctx.beginPath();ctx.strokeStyle='${sc}';ctx.lineWidth=1.5;
        for(var i=0;i<data.length;i++){var x=i/data.length*W,y=(1-data[i]/255)*H;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
        ctx.stroke();
    }else if('${style}'==='dots'){
        var count=Math.min(24,data.length);
        for(var i=0;i<count;i++){var v=data[Math.floor(i*data.length/count)]/255;var x=i/count*W+W/count/2;var r=Math.max(1,v*(H/2));ctx.beginPath();ctx.arc(x,H/2,r,0,Math.PI*2);ctx.fillStyle='${sc}';ctx.globalAlpha=0.6+v*0.4;ctx.fill();ctx.globalAlpha=1;}
    }else if('${style}'==='circles'){
        var cx=W/2,cy=H/2,count=6;
        for(var i=0;i<count;i++){var v=data[Math.floor(i*data.length/count)]/255;var r=Math.max(1,v*(H/2-1));ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='${sc}';ctx.globalAlpha=(i%2===0?0.9:0.4)*v;ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;}
    }else{
        var count=Math.min(48,data.length),bw=W/count-1;
        for(var i=0;i<count;i++){var v=data[Math.floor(i*data.length/count)]/255;var h=Math.max(2,v*H);var g=ctx.createLinearGradient(0,H-h,0,H);g.addColorStop(0,'${sc}');g.addColorStop(1,'${pri}');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(i*(bw+1),H-h,bw,h,2);ctx.fill();}
    }
}
// idle animation when no audio data
var idleT=0;
function idleFrame(){
    var fake=new Uint8Array(128);
    for(var i=0;i<fake.length;i++)fake[i]=Math.round(8+Math.sin(idleT+i*0.3)*6);
    idleT+=0.06;
    drawFrame(fake);
}
var idleId=setInterval(idleFrame,40);
window.addEventListener('message',function(e){
    if(e.data&&e.data.type==='waveData'&&e.data.data){
        clearInterval(idleId);idleId=null;
        var arr=new Uint8Array(e.data.data);
        drawFrame(arr);
    }
});
})();`;
    }

    // ── Effect scripts ─────────────────────────────────────────────────────────

    function _mouseTrailScript(cfg) {
        const color = cfg.mouseTrailColor || '#9d00ff';
        const size  = 5;
        const mode  = cfg.mouseTrail;
        return `(function(){
var canvas=document.createElement('canvas');
canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999;';
document.body.appendChild(canvas);
var ctx=canvas.getContext('2d');
canvas.width=window.innerWidth;canvas.height=window.innerHeight;
window.addEventListener('resize',function(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;});
var particles=[];
window.addEventListener('mousemove',function(e){
    var count=${mode==='neon'?1:3};
    for(var i=0;i<count;i++){
        particles.push({x:e.clientX,y:e.clientY,vx:(Math.random()-.5)*${mode==='flame'?3:1.5},vy:(Math.random()-.5)*${mode==='flame'?3:1.5}-(${mode==='flame'?2:0}),life:1,size:${size}*(0.5+Math.random())});
    }
});
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var i=particles.length-1;i>=0;i--){
        var p=particles[i];p.x+=p.vx;p.y+=p.vy;
        p.life-=${mode==='neon'?0.08:0.04};
        if(p.life<=0){particles.splice(i,1);continue;}
        ctx.save();ctx.globalAlpha=p.life;
        ${mode==='stars'  ? `ctx.fillStyle='${color}';ctx.font=(p.size*2)+'px serif';ctx.fillText('✦',p.x,p.y);`
        : mode==='flame'  ? `var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2);g.addColorStop(0,'#fff');g.addColorStop(0.4,'#ff9900');g.addColorStop(1,'rgba(255,50,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.size*2,0,Math.PI*2);ctx.fill();`
        : mode==='neon'   ? `ctx.strokeStyle='${color}';ctx.lineWidth=${size};ctx.shadowColor='${color}';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.stroke();`
                          : `ctx.fillStyle='${color}';ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill();`}
        ctx.restore();
    }
    requestAnimationFrame(draw);
}
draw();
})();`;
    }

    function _sonicWaveScript(cfg) {
        const sc = cfg.secondaryColor || '#9d00ff';
        return `(function(){
var _sonicCanvas=null,_sonicCtx=null,_sonicRaf=null;
function ensureCanvas(){
    if(!_sonicCanvas){
        _sonicCanvas=document.createElement('canvas');
        _sonicCanvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9998;will-change:transform;';
        _sonicCanvas.width=window.innerWidth;_sonicCanvas.height=window.innerHeight;
        _sonicCtx=_sonicCanvas.getContext('2d');
        document.body.appendChild(_sonicCanvas);
    }
}
document.querySelectorAll('.pg-link').forEach(function(link){
    link.addEventListener('click',function(e){
        ensureCanvas();
        if(_sonicRaf){cancelAnimationFrame(_sonicRaf);_sonicCtx.clearRect(0,0,_sonicCanvas.width,_sonicCanvas.height);}
        var x=e.clientX,y=e.clientY,maxR=Math.hypot(_sonicCanvas.width,_sonicCanvas.height),r=0;
        function anim(){
            r+=16;
            var alpha=Math.max(0,1-r/maxR);
            _sonicCtx.clearRect(0,0,_sonicCanvas.width,_sonicCanvas.height);
            _sonicCtx.beginPath();
            _sonicCtx.arc(x,y,r,0,Math.PI*2);
            _sonicCtx.strokeStyle='${sc}';
            _sonicCtx.globalAlpha=alpha*0.7;
            _sonicCtx.lineWidth=2;
            _sonicCtx.stroke();
            _sonicCtx.globalAlpha=1;
            if(r<maxR&&alpha>0){_sonicRaf=requestAnimationFrame(anim);}
            else{_sonicRaf=null;_sonicCtx.clearRect(0,0,_sonicCanvas.width,_sonicCanvas.height);}
        }
        _sonicRaf=requestAnimationFrame(anim);
    });
});
})();`;
    }

    // ── Avatar helpers ─────────────────────────────────────────────────────────

    function _avatarShapeCSS(cfg) {
        return { circle:'border-radius:50%;', square:'border-radius:4px;', rounded:'border-radius:20px;' }[cfg.avatarShape] || 'border-radius:50%;';
    }

    function _avatarBorderCSS(cfg) {
        const w  = cfg.avatarBorderWidth || 4;
        const sc = cfg.secondaryColor || '#9d00ff';
        const pr = cfg.primaryColor   || '#00ff00';
        const styles = {
            solid:    `border:${w}px solid ${sc};box-shadow:0 0 20px ${sc}40;`,
            double:   `border:${w}px double ${sc};box-shadow:0 0 20px ${sc}40;`,
            dashed:   `border:${w}px dashed ${sc};`,
            gradient: `border:${w}px solid transparent;background-clip:padding-box;outline:${w}px solid transparent;box-shadow:0 0 0 ${w}px ${sc},0 0 20px ${sc}80;`,
            neon:     `border:${w}px solid ${sc};box-shadow:0 0 10px ${sc},0 0 30px ${sc}80,inset 0 0 10px ${sc}20;`,
            none:     'border:none;',
        };
        return styles[cfg.avatarBorderStyle] || styles.neon;
    }

    // ── Utilities ──────────────────────────────────────────────────────────────

    return { init, render, schedule, cancelNextRender };
})();

window.Preview = Preview;
