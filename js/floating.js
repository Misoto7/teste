/**
 * floating.js - Floating images manager for Misoto Generator v5.0
 */
'use strict';

const FloatingManager = (() => {

    function init() {
        UploadZone.setup('floatUploadZone', {
            maxMB: 5,
            types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            onFile(file, dataUrl) {
                const probe = new Image();
                probe.onload = () => {
                    const naturalWidth = probe.naturalWidth || 120;
                    const naturalHeight = probe.naturalHeight || 120;
                    const naturalRatio = naturalWidth / (naturalHeight || 1);
                    const size = 120;
                    const viewportW = Math.max(window.innerWidth || 1, 1);
                    const viewportH = Math.max(window.innerHeight || 1, 1);

                    State.addFloat({
                        id: uid('float'),
                        src: dataUrl,
                        x: _pxToViewport(12, viewportW),
                        y: _pxToViewport(12, viewportH),
                        size,
                        stretchX: 1,
                        stretchY: 1,
                        opacity: 0.85,
                        rotation: 0,
                        overlayCard: false,
                        naturalRatio,
                        positionUnit: 'viewport',
                    });
                    renderList();
                    Notify.success('Imagem adicionada', file.name);
                };
                probe.src = dataUrl;
            }
        });

        State.onChange((src) => {
            if (['history', 'reset', 'init'].includes(src)) renderList();
        });

        _migrateLegacyFloats();
        renderList();
    }

    function _migrateLegacyFloats() {
        const viewportW = Math.max(window.innerWidth || 1, 1);
        const viewportH = Math.max(window.innerHeight || 1, 1);
        let changed = false;

        State.getFloats().forEach(img => {
            const patch = {};
            if (img.positionUnit === 'viewport') {
                patch.x = _clamp(parseFloat(img.x) || 0, 0, 100);
                patch.y = _clamp(parseFloat(img.y) || 0, 0, 100);
            } else {
                patch.x = _pxToViewport(img.x || 0, viewportW);
                patch.y = _pxToViewport(img.y || 0, viewportH);
                patch.positionUnit = 'viewport';
            }

            const nextSize = img.size || img.width || 120;
            if (!img.size || img.size !== nextSize) patch.size = nextSize;
            if (!img.stretchX) patch.stretchX = 1;
            if (!img.stretchY) patch.stretchY = 1;

            if (!img.naturalRatio && img.width && img.height) {
                patch.naturalRatio = img.width / (img.height || 1);
            }

            if (Object.keys(patch).length > 0) {
                State.updateFloat(img.id, patch, 'floats-live');
                changed = true;
            }
        });

        if (changed) State.commitFloat();
    }

    function renderList() {
        const list = document.getElementById('floatList');
        if (!list) return;
        const floats = State.getFloats();
        list.innerHTML = '';

        if (floats.length === 0) {
            list.innerHTML = '<p style="color:#555;font-size:.82rem;text-align:center;padding:8px 0;">Nenhuma imagem flutuante.</p>';
            return;
        }

        floats.forEach(img => list.appendChild(_buildItem(img)));
    }

    function _buildItem(img) {
        const div = document.createElement('div');
        div.className = 'float-item';
        div.dataset.id = img.id;
        div.innerHTML = `
            <img src="${img.src}" class="float-thumb" alt="">
            <div class="float-controls">
                <div class="float-row">
                    <label>Opacidade</label>
                    <input type="range" min="0" max="1" step="0.05" value="${img.opacity}" class="form-range" data-prop="opacity">
                </div>
                <div class="float-row">
                    <label>Rotação</label>
                    <input type="range" min="-180" max="180" step="1" value="${img.rotation}" class="form-range" data-prop="rotation">
                </div>
                <div class="float-row">
                    <label>Tamanho</label>
                    <input type="range" min="30" max="600" step="5" value="${img.size || 120}" class="form-range" data-prop="size">
                </div>
                <div class="float-row">
                    <label>Eixo X</label>
                    <input type="range" min="0.2" max="3" step="0.05" value="${img.stretchX || 1}" class="form-range" data-prop="stretchX">
                </div>
                <div class="float-row">
                    <label>Eixo Y</label>
                    <input type="range" min="0.2" max="3" step="0.05" value="${img.stretchY || 1}" class="form-range" data-prop="stretchY">
                </div>
                <div class="float-row" style="display:block;font-size:.72rem;color:#8f8fb0;line-height:1.35;">
                    Arraste a imagem na pr&eacute;via para mudar a posi&ccedil;&atilde;o.
                </div>
                <div class="float-row">
                    <label>Sobrepor Card</label>
                    <input type="checkbox" ${img.overlayCard ? 'checked' : ''} data-prop="overlayCard">
                </div>
                <button class="remove-float-btn" title="Remover"><i class="fas fa-trash-alt"></i> Remover</button>
            </div>
        `;

        const thumb = div.querySelector('.float-thumb');
        const updateNaturalRatio = () => {
            const nr = thumb.naturalWidth / (thumb.naturalHeight || 1);
            if (!img.naturalRatio && nr) {
                img.naturalRatio = nr;
                State.updateFloat(img.id, { naturalRatio: nr });
                State.commitFloat();
            }
        };
        thumb.addEventListener('load', updateNaturalRatio);
        if (thumb.complete && thumb.naturalWidth) updateNaturalRatio();

        ['size', 'stretchX', 'stretchY'].forEach(prop => {
            const input = div.querySelector(`[data-prop="${prop}"]`);
            if (!input) return;
            input.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                State.updateFloat(img.id, { [prop]: value });
            });
            input.addEventListener('change', () => State.commitFloat());
        });

        const overlayInput = div.querySelector('[data-prop="overlayCard"]');
        overlayInput.addEventListener('change', (e) => {
            State.updateFloat(img.id, { overlayCard: e.target.checked });
            State.commitFloat();
        });

        div.querySelectorAll('[data-prop="opacity"],[data-prop="rotation"]').forEach(input => {
            input.addEventListener('input', (e) => {
                State.updateFloat(img.id, { [e.target.dataset.prop]: parseFloat(e.target.value) });
            });
            input.addEventListener('change', () => State.commitFloat());
        });

        div.querySelector('.remove-float-btn').addEventListener('click', () => {
            confirmAction('Remover esta imagem flutuante?', () => {
                State.removeFloat(img.id);
                renderList();
            });
        });

        return div;
    }

    function attachPreviewDrag(container, doc) {
        if (!doc) doc = document;
        container.querySelectorAll('.pg-float').forEach(el => {
            if (el.__floatDragBound) return;
            el.__floatDragBound = true;
            el.style.cursor = 'grab';
            el.style.touchAction = 'none';
            let activePointerId = null;
            let startX = 0, startY = 0, startLeft = 0, startTop = 0;

            el.addEventListener('pointerdown', (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();

                const id = el.dataset.id;
                const img = State.getFloats().find(f => f.id === id);
                if (!img) return;

                const rect = el.getBoundingClientRect();
                const computed = doc.defaultView?.getComputedStyle(el);
                activePointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = _readCssPx(computed?.left, rect.left);
                startTop = _readCssPx(computed?.top, rect.top);

                el.style.cursor = 'grabbing';
                el.setPointerCapture(e.pointerId);

                function onMove(me) {
                    if (me.pointerId !== activePointerId) return;

                    const viewportW = doc.documentElement.clientWidth || doc.defaultView.innerWidth;
                    const viewportH = doc.documentElement.clientHeight || doc.defaultView.innerHeight;
                    const dx = me.clientX - startX;
                    const dy = me.clientY - startY;
                    const nextLeft = Math.max(0, Math.min(viewportW - rect.width, startLeft + dx));
                    const nextTop = Math.max(0, Math.min(viewportH - rect.height, startTop + dy));
                    State.updateFloat(id, {
                        x: parseFloat(nextLeft.toFixed(2)),
                        y: parseFloat(nextTop.toFixed(2)),
                        positionUnit: 'px',
                    }, 'floats-live');
                    el.style.left = nextLeft + 'px';
                    el.style.top = nextTop + 'px';
                }

                function finishDrag() {
                    if (activePointerId === null) return;
                    activePointerId = null;
                    el.style.cursor = 'grab';
                    const viewportW = doc.documentElement.clientWidth || doc.defaultView.innerWidth || 1;
                    const viewportH = doc.documentElement.clientHeight || doc.defaultView.innerHeight || 1;
                    const finalLeft = parseFloat(el.style.left);
                    const finalTop = parseFloat(el.style.top);

                    State.updateFloat(id, {
                        x: _pxToViewport(Number.isFinite(finalLeft) ? finalLeft : startLeft, viewportW),
                        y: _pxToViewport(Number.isFinite(finalTop) ? finalTop : startTop, viewportH),
                        positionUnit: 'viewport',
                    }, 'floats-live');
                    State.commitFloat();
                    el.removeEventListener('pointermove', onMove);
                    el.removeEventListener('pointerup', onUp);
                    el.removeEventListener('pointercancel', onUp);
                    el.removeEventListener('lostpointercapture', onUp);
                }

                function onUp(me) {
                    if (me.pointerId !== undefined && me.pointerId !== activePointerId) return;
                    finishDrag();
                }

                el.addEventListener('pointermove', onMove);
                el.addEventListener('pointerup', onUp);
                el.addEventListener('pointercancel', onUp);
                el.addEventListener('lostpointercapture', onUp);
            });
        });
    }

    function _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function _pxToViewport(value, viewportSize) {
        const safeViewport = Math.max(viewportSize || 1, 1);
        return parseFloat((((parseFloat(value) || 0) / safeViewport) * 100).toFixed(4));
    }

    function _readCssPx(value, fallback) {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return { init, renderList, attachPreviewDrag };
})();

window.FloatingManager = FloatingManager;
