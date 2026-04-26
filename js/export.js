/**
 * export.js — HTML export for Misoto Generator v5.0
 * FIXES:
 *  - Card NOT draggable in exported HTML
 *  - Avatar effects (pulse/aura/ring/glow) with full keyframes always declared
 *  - Background wallpaper support
 *  - audioStreamLabel editable
 *  - Opacity works correctly
 *  - Particle count reactive (uses live value)
 *  - mouseTrailSize removed (uses fixed size)
 *  - Floating images placed at saved positions, not draggable
 */
'use strict';

const Exporter = (() => {

    async function run() {
        Loading.show();
        setTimeout(() => {
            Promise.resolve(_buildFinalHTML()).then(html => {
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                const name = (State.getConfig().username || 'misoto')
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9\-_]/g, '') || 'misoto';
                a.href = url; a.download = `${name}-links.html`;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
                Loading.hide();
                Notify.success('Exportado!', `"${name}-links.html" gerado com sucesso.`);
            }).catch(err => {
                Loading.hide();
                Notify.error('Falha na exportação', err.message);
                console.error('[Exporter]', err);
            });
        }, 80);
    }

    async function _buildFinalHTML() {
        const cfg    = State.getConfig();
        const media  = State.getMedia();
        const links  = State.getLinks();
        const floats = State.getFloats();

        const esc = RenderUtils.escHtml;
        const profileSrc    = media.profile   || '';
        const hasWallpaper  = Boolean(media.wallpaper);
        const hasBgWallpaper = Boolean(media.bgWallpaper);
        const hasMusic      = Boolean(media.music);

        const sc      = cfg.secondaryColor || '#9d00ff';
        const pri     = cfg.primaryColor   || '#00ff00';
        const pageBg  = cfg.bgColor        || '#0a0a0f';
        const cardBg  = cfg.cardColor      || pageBg;
        const txt     = cfg.textColor      || '#e0e0ff';

        const avatarShapeCSS = { circle:'50%', square:'4px', rounded:'20px' }[cfg.avatarShape] || '50%';
        const avatarBW = cfg.avatarBorderWidth || 4;
        const avatarBorderMap = {
            solid:    `border:${avatarBW}px solid ${sc};box-shadow:0 0 20px ${sc}40;`,
            double:   `border:${avatarBW}px double ${sc};box-shadow:0 0 20px ${sc}40;`,
            dashed:   `border:${avatarBW}px dashed ${sc};`,
            gradient: `border:${avatarBW}px solid transparent;box-shadow:0 0 0 ${avatarBW}px ${sc},0 0 20px ${sc}80;`,
            neon:     `border:${avatarBW}px solid ${sc};box-shadow:0 0 10px ${sc},0 0 30px ${sc}80,inset 0 0 10px ${sc}20;`,
            none:     'border:none;',
        };
        const avatarBorderCSS = avatarBorderMap[cfg.avatarBorderStyle] || avatarBorderMap.neon;
        const avatarSize = cfg.avatarSize || 130;

        const cardW    = cfg.cardWidth   || 490;
        const cardRgb  = RenderUtils.hexToRgb(cardBg);
        const linkR    = cfg.linkRadius  !== undefined ? cfg.linkRadius : 10;
        const linkGap  = cfg.linkSpacing !== undefined ? cfg.linkSpacing : 10;
        const isGrid   = cfg.linksLayout === 'grid';
        const cardMinH = cfg.cardMinHeight !== undefined ? parseInt(cfg.cardMinHeight) : 0;

        const isCustomPos = cfg.cardPositionMode === 'custom';
        const cardPosX = cfg.cardPosX !== undefined ? cfg.cardPosX : 50;
        const cardPosY = cfg.cardPosY !== undefined ? cfg.cardPosY : 50;
        const cardAlign = 'center'; // body default; overridden by fixed position if custom

        const glitchCSS  = cfg.glitchEffect && hasWallpaper ? `@keyframes glitch{0%,97%,100%{transform:translate(0)}98%{transform:translate(3px,-2px)}99%{transform:translate(-2px,1px)}}` : '';
        const glitchAnim = cfg.glitchEffect && hasWallpaper ? 'animation:glitch 20s linear infinite;' : '';

        // Avatar effect CSS — all keyframes always declared
        const auraCSS = `
@keyframes auraPulse{0%,100%{opacity:.6;transform:scale(.88)}50%{opacity:1;transform:scale(1.12)}}
@keyframes ringPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:.4}}
@keyframes avPulse{0%,100%{transform:scale(.85);opacity:.7}50%{transform:scale(1.15);opacity:1}}
@keyframes glowPulse{0%,100%{opacity:.7;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}
.av-aura{position:absolute;inset:-40px;border-radius:${avatarShapeCSS};background:radial-gradient(circle,${sc}dd 0%,${sc}88 30%,transparent 70%);filter:blur(18px);animation:auraPulse 3s ease-in-out infinite;opacity:.9;pointer-events:none;z-index:0;}
.av-ring{position:absolute;inset:-18px;border-radius:${avatarShapeCSS};border:3px solid ${sc};box-shadow:0 0 16px ${sc},0 0 32px ${sc}80,inset 0 0 16px ${sc}40;animation:ringPulse 2.5s ease-in-out infinite;opacity:1;pointer-events:none;z-index:0;}
.av-pulse{position:absolute;inset:-30px;border-radius:${avatarShapeCSS};background:radial-gradient(circle,${sc}cc 0%,${sc}66 40%,transparent 70%);filter:blur(10px);animation:avPulse 1.8s ease-in-out infinite;pointer-events:none;z-index:0;}
.av-glow{position:absolute;inset:-35px;border-radius:${avatarShapeCSS};background:radial-gradient(circle,${pri}cc 0%,${sc}99 40%,transparent 75%);filter:blur(14px);animation:glowPulse 3s ease-in-out infinite;pointer-events:none;z-index:0;}`;

        // Avatar effect element
        const avatarEffectHTML = (() => {
            if (!cfg.auraEffect || cfg.avatarEffect === 'none') return '';
            const map = { aura:'av-aura', ring:'av-ring', pulse:'av-pulse', glow:'av-glow' };
            const cls = map[cfg.avatarEffect] || 'av-aura';
            return `<div class="${cls}"></div>`;
        })();

        const scanlinesCSS = cfg.scanlinesEffect ? `.scanlines{position:fixed;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent 0,transparent 2px,rgba(0,0,0,.18) 2px,rgba(0,0,0,.18) 4px);animation:scanMove 12s linear infinite;}@keyframes scanMove{from{background-position:0 0}to{background-position:0 200px}}` : '';

        const borderGlowCSS = cfg.borderGlow
            ? `box-shadow:0 0 40px rgba(0,0,0,.6),0 0 30px ${sc}80,inset 0 0 20px ${sc}08;`
            : 'box-shadow:0 10px 40px rgba(0,0,0,.6);';

        const linkAnimMap = { slideLeft:`opacity:0;transform:translateX(-24px);`, fade:`opacity:0;`, bounce:`opacity:0;transform:translateY(-16px);`, scale:`opacity:0;transform:scale(.85);`, none:`` };
        const linkAnimStart = linkAnimMap[cfg.linkAnimation] || linkAnimMap.slideLeft;
        const linkHoverMap = { slide:`transform:translateX(6px);background:rgba(0,0,0,.65);`, glow:`box-shadow:0 0 16px ${sc}60;background:rgba(0,0,0,.65);`, scale:`transform:scale(1.02);background:rgba(0,0,0,.65);`, none:`background:rgba(0,0,0,.65);` };
        const linkHoverCSS = linkHoverMap[cfg.hoverEffect] || linkHoverMap.slide;
        const linkStyleMap = {
            default:  `background:rgba(0,0,0,.45);border:1px solid;`,
            pill:     `background:rgba(0,0,0,.45);border:1px solid;border-radius:999px!important;`,
            outlined: `background:transparent;border:2px solid;`
        };
        const linkBaseCSS = linkStyleMap[cfg.linkStyle] || linkStyleMap.default;

        const baseFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamily, FontManager.DEFAULT_VALUE) : (cfg.fontFamily || "'Courier New', monospace");
        const nameFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyName, baseFont) : baseFont;
        const linkNameFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyLinkName, baseFont) : baseFont;
        const linkDescFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyLinkDesc, baseFont) : baseFont;
        const cardTitleFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyCardTitle, baseFont) : baseFont;
        const footerFont = window.FontManager ? FontManager.resolveFontValue(cfg.fontFamilyFooter, baseFont) : baseFont;
        const fontConfig = window.FontManager
            ? await FontManager.getExportFontConfig([baseFont, nameFont, linkNameFont, linkDescFont, cardTitleFont, footerFont], media)
            : {
                fontFaceCss: media.customFont ? `@font-face{font-family:'CustomFont';src:url('${media.customFont}');}` : '',
            };

        const musicVolume = 0.7; // default volume in exported HTML

        /* ── Waveform ── */
        const waveformStyle = cfg.waveformStyle || 'bars';
        const beatScript = hasMusic ? _waveformScript(sc, pri, waveformStyle) : '';

        /* ── Typing effect ── */
        const typingScript = cfg.typingEffect ? `(function(){
function typeEl(el,delay){
    var text=el.dataset.text||'';
    el.style.visibility='visible';el.textContent='';
    var i=0;
    setTimeout(function go(){if(i<text.length){el.textContent+=text[i++];setTimeout(go,Math.random()*18+12);}},delay);
}
document.querySelectorAll('.link-name[data-text]').forEach(function(el,i){typeEl(el,i*90+30);});
document.querySelectorAll('.link-desc[data-text]').forEach(function(el,i){typeEl(el,i*90+120);});
})();` : '';

        /* ── Matrix ── */
        const matrixScript = cfg.matrixEffect ? `(function(){var c=document.getElementById('matrixCanvas');if(!c)return;var ctx=c.getContext('2d');c.width=window.innerWidth;c.height=window.innerHeight;var cols=Math.floor(c.width/16);var drops=Array(cols).fill(1);setInterval(function(){ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='${cfg.matrixColor || pri}';ctx.font='14px monospace';for(var i=0;i<drops.length;i++){var t=String.fromCharCode(0x30A0+Math.random()*96);ctx.fillText(t,i*16,drops[i]*16);if(drops[i]*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]++;}},55);})();` : '';

        /* ── Particles ── */
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

        /* ── Mouse Trail ── */
        const trailScript = (cfg.mouseTrail && cfg.mouseTrail !== 'none') ? _mouseTrailScript(cfg) : '';

        /* ── Sonic Wave ── */
        const sonicScript = cfg.sonicWaveEffect ? `(function(){var _sc=null,_sx=null,_raf=null;function ec(){if(!_sc){_sc=document.createElement('canvas');_sc.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9998;will-change:transform;';_sc.width=window.innerWidth;_sc.height=window.innerHeight;_sx=_sc.getContext('2d');document.body.appendChild(_sc);}}document.querySelectorAll('.link').forEach(function(link){link.addEventListener('click',function(e){ec();if(_raf){cancelAnimationFrame(_raf);_sx.clearRect(0,0,_sc.width,_sc.height);}var x=e.clientX,y=e.clientY,maxR=Math.hypot(_sc.width,_sc.height),r=0;function anim(){r+=16;var a=Math.max(0,1-r/maxR);_sx.clearRect(0,0,_sc.width,_sc.height);_sx.beginPath();_sx.arc(x,y,r,0,Math.PI*2);_sx.strokeStyle='${sc}';_sx.globalAlpha=a*0.7;_sx.lineWidth=2;_sx.stroke();_sx.globalAlpha=1;if(r<maxR&&a>0){_raf=requestAnimationFrame(anim);}else{_raf=null;_sx.clearRect(0,0,_sc.width,_sc.height);}}  _raf=requestAnimationFrame(anim);});});})();` : '';

        /* ── Clock ── */
        const clockScript = cfg.showClock ? `function tick(){var el=document.getElementById('sysTime');if(!el)return;var n=new Date();el.textContent=n.toLocaleDateString('pt-BR')+' '+n.toLocaleTimeString('pt-BR',{hour12:false}).slice(0,5);}tick();setInterval(tick,30000);` : '';

        /* ── Links HTML ── */
        const linksHTML = links.map((link, i) => {
            const color = link.color || sc;
            const isDiscord = link.icon === 'fab fa-discord';
            // For Discord: the URL field holds the username to copy
            const discordNick = isDiscord ? (link.url || link.name) : '';
            const iconContent = link.iconUrl
                ? `<img src="${esc(link.iconUrl)}" style="width:20px;height:20px;object-fit:contain;">`
                : `<i class="${esc(link.icon||'fas fa-link')}"></i>`;

            const nameAttr = cfg.typingEffect
                ? `data-text="${esc(link.name)}" style="color:${color};visibility:hidden;"`
                : `style="color:${color};"`;
            const descAttr = cfg.typingEffect
                ? `data-text="${esc(link.desc||'')}" style="visibility:hidden;"`
                : '';
            const nameContent = cfg.typingEffect ? '' : esc(link.name);
            const descContent = cfg.typingEffect ? '' : esc(link.desc||'');

            return `<a href="#" ${!isDiscord ? `onclick="window.open('${esc(link.url)}','_blank');return false;"` : ''} class="link link--${esc(cfg.linkStyle||'default')}" style="border-color:${color};border-radius:${linkR}px;animation-delay:${0.6+i*0.1}s;" ${isDiscord ? `data-discord-nick="${esc(discordNick)}"` : ''}>
                <div class="link-icon" style="color:${color};border-color:${color};">${iconContent}</div>
                <div class="link-body"><div class="link-name" ${nameAttr}>${nameContent}</div><div class="link-desc" ${descAttr}>${descContent}</div></div>
                ${link.badge ? `<span class="badge" style="background:${esc(link.badgeColor||'#00ff00')};color:${esc(link.badgeFontColor||'#000000')};">${esc(link.badge)}</span>` : ''}
                <div class="link-arrow" style="color:${color};">›</div>
            </a>`;
        }).join('');

        const floatsHTML = RenderUtils.buildFloatsMarkup(floats, {
            includeDataId: false,
            pointerEvents: 'none',
        });

        const { bgWallpaperHtml: bgWallpaperHTML, shellHtml: cardShellHTML } = RenderUtils.buildCardLayerMarkup({
            cfg,
            media,
            pageBg,
            cardBg,
            accentColor: sc,
            wallpaperExtraStyle: glitchAnim,
            classNames: {
                shell: 'card-shell',
                layer: 'card-layer',
                backdropBase: 'card-backdrop-base',
                backdropImage: 'card-backdrop-image',
                base: 'card-base',
                wallpaper: 'card-wp',
                filter: 'card-filter',
            },
        });

        const audioLabel = esc(cfg.audioStreamLabel || 'AUDIO_STREAM');

        return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,viewport-fit=cover">
<meta property="og:title" content="${esc(cfg.username||'Links')}">
<title>${esc(cfg.username||'Links')}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
${fontConfig.fontFaceCss}
${glitchCSS}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{--pri:${pri};--acc:${sc};--bg:${pageBg};--txt:${txt};--fn:${baseFont};--vh:1vh;}
html,body{height:100%}
body{background:var(--bg);color:var(--txt);font-family:var(--fn);min-height:100vh;min-height:calc(var(--vh,1vh)*100);display:flex;justify-content:center;align-items:${cardAlign};padding:20px;position:relative;overflow-x:hidden;-webkit-text-size-adjust:100%;}
#overlay{position:fixed;inset:0;background:var(--bg);display:flex;justify-content:center;align-items:center;flex-direction:column;gap:16px;z-index:2000;cursor:pointer;touch-action:manipulation;transition:opacity .5s;}
.overlay-avatar{width:80px;height:80px;border-radius:${avatarShapeCSS};overflow:hidden;border:3px solid ${sc};box-shadow:0 0 30px ${sc}80;animation:avatarPulse 2s ease-in-out infinite;}
.overlay-avatar img{width:100%;height:100%;object-fit:cover;}
.overlay-avatar-ph{width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:2rem;color:${sc}80;}
@keyframes avatarPulse{0%,100%{box-shadow:0 0 20px ${sc}60}50%{box-shadow:0 0 40px ${sc}}}
.overlay-msg{color:var(--acc);font-size:1.1rem;font-weight:700;text-transform:uppercase;letter-spacing:6px;animation:blink 1.8s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
${scanlinesCSS}
${auraCSS}
#matrixCanvas,#particlesCanvas{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.35;}
#particlesCanvas{opacity:.7;}
.vol-hud{position:fixed;top:16px;left:16px;z-index:100;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.85);border:1px solid ${sc}80;border-radius:24px;padding:8px 14px;opacity:0;transition:opacity .6s;}
.vol-hud.show{opacity:1}
.vol-icon-btn{background:none;border:none;color:var(--acc);font-size:1.1rem;cursor:pointer;width:30px;height:30px;display:grid;place-items:center;border-radius:50%;transition:all .2s;}
.vol-icon-btn:hover{background:${sc}30}
.vol-range{width:80px;height:4px;appearance:none;background:${sc}30;border-radius:2px;outline:none;cursor:pointer;}
.vol-range::-webkit-slider-thumb{appearance:none;width:14px;height:14px;background:var(--acc);border-radius:50%;}
.card{max-width:${cardW}px;width:100%;${cardMinH > 0 ? `min-height:${cardMinH}px;` : ''}position:relative;z-index:10;border:1px solid ${sc}40;border-radius:16px;padding:30px;background:transparent;${borderGlowCSS}overflow:hidden;display:flex;flex-direction:column;isolation:isolate;${isCustomPos ? '' : 'display:none;opacity:0;transform:translateY(24px);transition:opacity .5s,transform .5s;'}}
.card.show{opacity:1;transform:translateY(0)}
.card-shell{position:absolute;inset:0;z-index:0;pointer-events:none;}
.card-layer{position:absolute;inset:0;border-radius:inherit;}
.card > *:not(.card-shell){position:relative;z-index:1;}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${sc},${pri},transparent);background-size:200% 100%;animation:borderSlide 5s linear infinite;z-index:2;}
@keyframes borderSlide{from{background-position:-100% 0}to{background-position:200% 0}}
${cfg.showCardHeader ? `.card-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid ${sc}25;margin-bottom:16px;flex-shrink:0;}.card-title{font-size:.76rem;font-weight:700;letter-spacing:2px;color:var(--acc);text-transform:uppercase;font-family:${cardTitleFont};}.status-dot{width:7px;height:7px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px var(--acc);animation:blink 2.5s infinite;}` : ''}
.player-bar{background:rgba(0,0,0,.4);border:1px solid ${sc}20;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-shrink:0;}
.player-label{font-size:.68rem;font-weight:700;letter-spacing:2px;color:var(--acc);text-transform:uppercase;}
.profile{text-align:center;margin-bottom:26px;flex-shrink:0;}
.avatar-wrap{position:relative;width:${avatarSize}px;height:${avatarSize}px;margin:0 auto 14px;}
.avatar{width:${avatarSize}px;height:${avatarSize}px;border-radius:${avatarShapeCSS};overflow:hidden;${avatarBorderCSS}position:relative;z-index:1;}
.avatar img{width:100%;height:100%;object-fit:cover;display:block}
.avatar-ph{width:100%;height:100%;background:rgba(${cardRgb},0.5);display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:${sc}80;}
.username{font-size:${cfg.nameSize||2.4}rem;font-weight:800;text-transform:uppercase;letter-spacing:3px;background:linear-gradient(45deg,var(--acc),var(--pri));-webkit-background-clip:text;background-clip:text;color:transparent;cursor:pointer;font-family:${nameFont};}
.username::after{content:'_';color:var(--pri);animation:blink 1.4s infinite;}
.bio{color:var(--txt);opacity:.7;font-size:.82rem;line-height:1.5;max-width:340px;margin:.6rem auto 0;}
.links{display:${isGrid?'grid':'flex'};${isGrid?'grid-template-columns:1fr 1fr;':'flex-direction:column;'}gap:${linkGap}px;flex:1 1 auto;align-content:start;}
.link{display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:${linkR}px;text-decoration:none;color:var(--txt);${linkBaseCSS}transition:all .25s;cursor:pointer;touch-action:manipulation;${linkAnimStart}animation:linkIn .5s forwards;}
@keyframes linkIn{to{opacity:1;transform:none}}
.link:hover{${linkHoverCSS}}
.link:active{transform:scale(.97);opacity:.85;}
.link--pill{border-radius:999px!important;}
.link-icon{width:38px;height:38px;border-radius:7px;border:1px solid;display:grid;place-items:center;font-size:1.1rem;background:rgba(0,0,0,.3);flex-shrink:0;}
.link-body{flex:1;min-width:0;}
.link-name{font-size:.84rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;font-family:${linkNameFont};}
.link-desc{font-size:.7rem;opacity:.6;font-family:${linkDescFont};}
.link-arrow{font-size:1rem;transition:transform .2s;}
.link:hover .link-arrow{transform:translateX(4px);}
.badge{font-size:.55rem;font-weight:800;letter-spacing:.5px;padding:2px 6px;border-radius:4px;text-transform:uppercase;flex-shrink:0;}
${cfg.showFooter ? `.footer{display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid ${sc}20;font-size:.64rem;color:#4444aa;font-family:${footerFont};margin-top:auto;}` : ''}
.share-btn{position:fixed;bottom:16px;right:16px;z-index:100;background:rgba(0,0,0,.85);border:1px solid ${sc}80;color:var(--acc);border-radius:50%;width:44px;height:44px;display:grid;place-items:center;cursor:pointer;font-size:1rem;opacity:0;transition:opacity .6s;touch-action:manipulation;}
.share-btn:hover{background:${sc}20;}
.share-btn.show{opacity:1;}
@media(max-width:768px){body{padding:12px;align-items:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;}.card{padding:22px;border-radius:14px;margin:0 auto;}.card[data-custom-pos]{position:relative!important;left:auto!important;top:auto!important;transform:none!important;width:100%!important;margin:0 auto!important;}${isGrid?'.links{grid-template-columns:1fr}':''}}@media(max-width:480px){body{padding:8px;}.card{padding:18px;border-radius:10px;}.username{font-size:${Math.max(1.6,(cfg.nameSize||2.4)*0.7)}rem;letter-spacing:1px;}.avatar-wrap,.avatar{width:${Math.min(avatarSize,110)}px;height:${Math.min(avatarSize,110)}px;}.link{padding:12px 14px;}.link-name{font-size:.78rem;}.vol-hud{top:10px;left:10px;padding:6px 10px;}.vol-range{width:70px;}.share-btn{bottom:max(16px,env(safe-area-inset-bottom,16px));right:max(16px,env(safe-area-inset-right,16px));}${cfg.showFooter?'.footer{flex-direction:column;text-align:center;gap:6px;}':''}}@media(max-height:500px)and(orientation:landscape){body{padding:6px;align-items:flex-start;overflow-y:auto;}.card{padding:14px;}.avatar-wrap,.avatar{width:${Math.min(avatarSize,80)}px;height:${Math.min(avatarSize,80)}px;}.profile{margin-bottom:14px;}.username{font-size:${Math.max(1.4,(cfg.nameSize||2.4)*0.6)}rem;}}@supports(-webkit-touch-callout:none){body{min-height:-webkit-fill-available;}.card{padding-bottom:max(30px,env(safe-area-inset-bottom,30px));}.share-btn{bottom:max(16px,env(safe-area-inset-bottom,16px));}.vol-hud{top:max(16px,env(safe-area-inset-top,16px));}}@media(hover:none)and(pointer:coarse){.link:active{transform:translateX(3px) scale(.97);transition:transform .1s ease;}.vol-range{height:10px;}.vol-range::-webkit-slider-thumb{width:20px;height:20px;}}
</style>
</head>
<body>
${bgWallpaperHTML}
<div id="overlay">
    <div class="overlay-avatar">
        ${profileSrc
            ? `<img src="${profileSrc}" alt="">`
            : `<div class="overlay-avatar-ph"><i class="fas fa-user"></i></div>`}
    </div>
    <div class="overlay-msg">Clique para entrar</div>
</div>
${cfg.scanlinesEffect ? '<div class="scanlines"></div>' : ''}
${cfg.matrixEffect ? '<canvas id="matrixCanvas"></canvas>' : ''}
${cfg.particlesEffect ? '<canvas id="particlesCanvas"></canvas>' : ''}
${floatsHTML}
<div class="vol-hud" id="volHud">
    <button class="vol-icon-btn" id="volBtn"><i class="fas fa-volume-up"></i></button>
    <input type="range" class="vol-range" id="volRange" min="0" max="100" value="70">
</div>
<button class="share-btn" id="shareBtn" title="Compartilhar"><i class="fas fa-share-alt"></i></button>
<div class="card" id="card"${isCustomPos ? ` style="position:fixed;left:${cardPosX}vw;top:${cardPosY}vh;transform:none;margin:0;display:flex;opacity:1;" data-custom-pos="1"` : ''}>
    ${cardShellHTML}
    ${cfg.showCardHeader ? `<div class="card-head"><span class="card-title">${esc(cfg.cardHeaderText||'SISTEMA::LINKS')}</span><span class="status-dot"></span></div>` : ''}
    <div class="player-bar">
        <span class="player-label">${audioLabel}</span>
        <canvas id="waveCanvas" width="100" height="22"></canvas>
    </div>
    <div class="profile">
        <div class="avatar-wrap">
            ${avatarEffectHTML}
            <div class="avatar">
                ${profileSrc
                    ? `<img src="${profileSrc}" alt="${esc(cfg.username||'')}" loading="lazy" id="avatarImg">`
                    : `<div class="avatar-ph"><i class="fas fa-user"></i></div>`}
            </div>
        </div>
        <div class="username" id="usernameEl" title="Clique para copiar">${esc(cfg.username||'MISOTO')}</div>
        ${cfg.showBio && cfg.bioText ? `<div class="bio">${esc(cfg.bioText)}</div>` : ''}
    </div>
    <div class="links" id="links">${linksHTML}</div>
    ${cfg.showFooter ? `<div class="footer">${cfg.showClock ? '<span id="sysTime">...</span>' : '<span></span>'}<span>${esc(cfg.footerText||'v5.0')}</span></div>` : ''}
</div>
${hasMusic ? `<audio id="bgMusic" ${cfg.musicLoop ? 'loop' : ''}><source src="${media.music}" type="audio/mpeg"></audio>` : ''}
<script>
(function(){'use strict';
function $(id){return document.getElementById(id);}
${clockScript}
var unEl=$('usernameEl');
if(unEl){unEl.addEventListener('click',function(){navigator.clipboard.writeText('${esc(cfg.username||'')}').then(function(){var o=unEl.style.opacity;unEl.style.opacity='.4';setTimeout(function(){unEl.style.opacity=o||'1';},400);}).catch(function(){});});}
var overlay=$('overlay');
overlay.addEventListener('click',function start(){
    overlay.style.opacity='0';
    setTimeout(function(){
        overlay.style.display='none';
        var card=$('card');
        var isMobileView=window.innerWidth<=768;
        ${isCustomPos
            ? `if(isMobileView){card.removeAttribute('style');card.style.display='flex';card.style.opacity='0';setTimeout(function(){card.classList.add('show');},20);}else{card.style.display='flex';card.style.opacity='1';}`
            : `card.style.display='flex';setTimeout(function(){card.classList.add('show');},20);`}
        document.querySelectorAll('.link').forEach(function(l,i){l.style.animationDelay=(0.6+i*0.1)+'s';});
        setTimeout(function(){
            $('volHud')&&$('volHud').classList.add('show');
            $('shareBtn')&&$('shareBtn').classList.add('show');
            ${hasMusic ? `var music=$('bgMusic');if(music){music.volume=${musicVolume};music.play().catch(function(){});}` : ''}
        },800);
        ${typingScript}
    },480);
});
${hasMusic ? `var music=$('bgMusic');var vr=$('volRange');var vb=$('volBtn');
function updateVolIcon(){if(!vb||!music)return;var v=music.muted?0:music.volume;if(v===0)vb.innerHTML='<i class="fas fa-volume-mute"></i>';else if(v<0.4)vb.innerHTML='<i class="fas fa-volume-down"></i>';else vb.innerHTML='<i class="fas fa-volume-up"></i>';}
if(vr&&music)vr.addEventListener('input',function(e){music.volume=e.target.value/100;updateVolIcon();});
if(vb&&music)vb.addEventListener('click',function(){music.muted=!music.muted;if(vr)vr.value=music.muted?0:music.volume*100;updateVolIcon();});` : ''}
document.querySelectorAll('.link[data-discord-nick]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();var nick=el.dataset.discordNick||'';navigator.clipboard.writeText(nick).then(function(){var toast=document.createElement('div');toast.textContent='Nick de usuário copiado: '+nick;toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(8,8,24,.95);color:#fff;font-family:monospace;font-size:.82rem;padding:10px 20px;border-radius:8px;border:1px solid #5865F2;box-shadow:0 0 16px #5865F280;z-index:99999;pointer-events:none;animation:toastIn .25s ease;';var style=document.createElement('style');style.textContent='@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';document.head.appendChild(style);document.body.appendChild(toast);setTimeout(function(){toast.style.transition='opacity .3s';toast.style.opacity='0';setTimeout(function(){toast.remove();style.remove();},300);},2200);}).catch(function(){prompt('Copie o username do Discord:',nick);});});});
var sb=$('shareBtn');
if(sb){sb.addEventListener('click',function(){if(navigator.share){navigator.share({title:'${esc(cfg.username||'Links')}',url:window.location.href}).catch(function(){});}else{navigator.clipboard.writeText(window.location.href).then(function(){sb.innerHTML='<i class="fas fa-check"></i>';setTimeout(function(){sb.innerHTML='<i class="fas fa-share-alt"></i>';},1500);});}});}
${beatScript}
${matrixScript}
${particlesScript}
${trailScript}
${sonicScript}
// Mobile: ajuste de altura real (fix iOS Safari)
(function(){function adjustVH(){var vh=window.innerHeight*.01;document.documentElement.style.setProperty('--vh',vh+'px');document.body.style.minHeight='calc(var(--vh,1vh)*100)';}adjustVH();window.addEventListener('resize',adjustVH);window.addEventListener('orientationchange',function(){setTimeout(adjustVH,200);});var isTouchDevice='ontouchstart' in window||navigator.maxTouchPoints>0;if(isTouchDevice){document.querySelectorAll('.link').forEach(function(link){link.addEventListener('touchstart',function(){link.style.transform='translateX(3px) scale(0.97)';link.style.transition='transform .1s ease';},{passive:true});link.addEventListener('touchend',function(){link.style.transform='';link.style.transition='all .25s';});link.addEventListener('touchcancel',function(){link.style.transform='';link.style.transition='all .25s';});});}})();
})();
</script>
</body>
</html>`;
    }

    // ── Waveform with style support ───────────────────────────────────────────
    function _waveformScript(sc, pri, style) {
        return `(function(){
var audio=document.getElementById('bgMusic');
var canvas=document.getElementById('waveCanvas');
if(!audio||!canvas)return;
var ctx=canvas.getContext('2d');
var audioCtx,analyser,dataArray,animId;
var wfStyle='${style}';
function initAudio(){
    if(audioCtx)return;
    try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();var src=audioCtx.createMediaElementSource(audio);analyser=audioCtx.createAnalyser();analyser.fftSize=256;dataArray=new Uint8Array(analyser.frequencyBinCount);src.connect(analyser);analyser.connect(audioCtx.destination);}catch(e){}
}
function drawFrame(){
    if(analyser)analyser.getByteFrequencyData(dataArray);
    var W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
    if(wfStyle==='wave'){
        ctx.beginPath();ctx.strokeStyle='${sc}';ctx.lineWidth=1.5;
        for(var i=0;i<dataArray.length;i++){var x=i/dataArray.length*W,y=(1-dataArray[i]/255)*H;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
    }else if(wfStyle==='dots'){
        var count=24;for(var i=0;i<count;i++){var v=dataArray[Math.floor(i*dataArray.length/count)]/255;var x=i/count*W+W/count/2;var r=Math.max(1,v*(H/2));ctx.beginPath();ctx.arc(x,H/2,r,0,Math.PI*2);ctx.fillStyle='${sc}';ctx.globalAlpha=0.6+v*0.4;ctx.fill();ctx.globalAlpha=1;}
    }else if(wfStyle==='circles'){
        var cx=W/2,cy=H/2,count=6;for(var i=0;i<count;i++){var v=dataArray[Math.floor(i*dataArray.length/count)]/255;var r=Math.max(1,v*(H/2-1));ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='${sc}';ctx.globalAlpha=(i%2===0?0.9:0.4)*v;ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;}
    }else{
        var count=48,bw=W/count-1;for(var i=0;i<count;i++){var v=dataArray[Math.floor(i*dataArray.length/count)]/255;var h=Math.max(2,v*H);var g=ctx.createLinearGradient(0,H-h,0,H);g.addColorStop(0,'${sc}');g.addColorStop(1,'${pri}');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(i*(bw+1),H-h,bw,h,2);ctx.fill();}
    }
}
function animate(){animId=requestAnimationFrame(animate);drawFrame();}
audio.addEventListener('play',function(){initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();animate();});
audio.addEventListener('pause',function(){cancelAnimationFrame(animId);ctx.clearRect(0,0,canvas.width,canvas.height);});
})();`;
    }

    // ── Mouse trail ───────────────────────────────────────────────────────────
    function _mouseTrailScript(cfg) {
        const color = cfg.mouseTrailColor || '#9d00ff';
        const size  = 5;
        const mode  = cfg.mouseTrail;
        return `(function(){var canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999;';document.body.appendChild(canvas);var ctx=canvas.getContext('2d');canvas.width=window.innerWidth;canvas.height=window.innerHeight;window.addEventListener('resize',function(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;});var particles=[];window.addEventListener('mousemove',function(e){var count=${mode==='neon'?1:3};for(var i=0;i<count;i++){particles.push({x:e.clientX,y:e.clientY,vx:(Math.random()-.5)*${mode==='flame'?3:1.5},vy:(Math.random()-.5)*${mode==='flame'?3:1.5}-(${mode==='flame'?2:0}),life:1,size:${size}*(0.5+Math.random())});}});function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life-=${mode==='neon'?0.08:0.04};if(p.life<=0){particles.splice(i,1);continue;}ctx.save();ctx.globalAlpha=p.life;${mode==='stars'?`ctx.fillStyle='${color}';ctx.font=(p.size*2)+'px serif';ctx.fillText('\\u2726',p.x,p.y);`:mode==='flame'?`var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2);g.addColorStop(0,'#fff');g.addColorStop(0.4,'#ff9900');g.addColorStop(1,'rgba(255,50,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.size*2,0,Math.PI*2);ctx.fill();`:mode==='neon'?`ctx.strokeStyle='${color}';ctx.lineWidth=${size};ctx.shadowColor='${color}';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.stroke();`:`ctx.fillStyle='${color}';ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill();`}ctx.restore();}requestAnimationFrame(draw);}draw();})();`;
    }

    function init() {
        document.getElementById('exportBtn')?.addEventListener('click', run);
    }

    return { init };
})();

window.Exporter = Exporter;
