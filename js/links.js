/**
 * links.js — Link manager for Misoto Generator v5.0
 */
'use strict';

const LinksManager = (() => {

    const ICON_PRESETS = [
        { label: 'Instagram',  icon: 'fab fa-instagram', color: '#E1306C' },
        { label: 'TikTok',     icon: 'fab fa-tiktok',    color: '#ffffff' },
        { label: 'Discord',    icon: 'fab fa-discord',   color: '#5865F2' },
        { label: 'Spotify',    icon: 'fab fa-spotify',   color: '#1DB954' },
        { label: 'Reddit',     icon: 'fab fa-reddit',    color: '#FF4500' },
        { label: 'YouTube',    icon: 'fab fa-youtube',   color: '#FF0000' },
        { label: 'Twitter/X',  icon: 'fab fa-x-twitter', color: '#ffffff' },
        { label: 'Twitch',     icon: 'fab fa-twitch',    color: '#9147FF' },
        { label: 'GitHub',     icon: 'fab fa-github',    color: '#ffffff' },
        { label: 'LinkedIn',   icon: 'fab fa-linkedin',  color: '#0A66C2' },
        { label: 'WhatsApp',   icon: 'fab fa-whatsapp',  color: '#25D366' },
        { label: 'Telegram',   icon: 'fab fa-telegram',  color: '#26A5E4' },
        { label: 'Pinterest',  icon: 'fab fa-pinterest', color: '#E60023' },
        { label: 'BeReal',     icon: 'fas fa-camera',    color: '#ffffff' },
        { label: 'Steam',      icon: 'fab fa-steam',     color: '#b8c7e0' },
        { label: 'Website',    icon: 'fas fa-globe',     color: '#00aaff' },
        { label: 'Email',      icon: 'fas fa-envelope',  color: '#ffaa00' },
        { label: 'Loja',       icon: 'fas fa-shopping-bag', color: '#ff6b6b' },
        { label: 'Outro',      icon: 'fas fa-link',      color: '#9d00ff' },
    ];

    const BADGE_PRESETS = [
        { label: 'Nenhum', value: '' },
        { label: 'NOVO',     value: 'NOVO',     color: '#00ff00' },
        { label: 'PROMO',    value: 'PROMO',    color: '#FFD700' },
        { label: 'HOT',      value: 'HOT',      color: '#FF4500' },
        { label: 'EM BREVE', value: 'EM BREVE', color: '#9d00ff' },
        { label: 'ESGOTADO', value: 'ESGOTADO', color: '#888' },
    ];

    let _dragSrcId = null;

    function _makeDefaultLink() {
        return {
            id:    uid('link'),
            name:  'Novo Link',
            url:   'https://',
            icon:  'fas fa-link',
            iconUrl: '',
            color: '#9d00ff',
            desc:  'ACESSAR LINK',
            badge: '',
            badgeColor: '#00ff00',
            badgeFontColor: '#000000',
            clicks: 0,
            showClicks: false,
        };
    }

    function render() {
        const list = document.getElementById('linksList');
        if (!list) return;
        const links = State.getLinks();
        list.innerHTML = '';
        if (links.length === 0) {
            list.innerHTML = '<p style="color:#555;font-size:.82rem;text-align:center;padding:12px 0;">Nenhum link. Clique em Adicionar Link.</p>';
            return;
        }
        links.forEach((link, idx) => list.appendChild(_buildItem(link, idx, links.length)));
        _initDragDrop(list);
    }

    function _buildItem(link, idx, total) {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.dataset.id = link.id;
        div.draggable  = true;

        const iconOptions = ICON_PRESETS.map(p =>
            `<option value="${p.icon}" data-color="${p.color}" ${p.icon === link.icon && !link.iconUrl ? 'selected' : ''}>${p.label}</option>`
        ).join('');

        const badgeOptions = BADGE_PRESETS.map(b =>
            `<option value="${b.value}" ${b.value === link.badge ? 'selected' : ''}>${b.label}</option>`
        ).join('');

        const hasCustomIcon = Boolean(link.iconUrl && !link.iconUrl.startsWith('http') === false || link.iconUrl);
        const isUploadedIcon = link.iconUrl && link.iconUrl.startsWith('data:');

        div.innerHTML = `
            <div class="link-item-header">
                <span class="link-drag-handle" title="Arrastar para reordenar">⠿</span>
                <input type="color" class="link-color-dot" value="${link.color}" title="Cor">
                <input type="text" class="link-title-input" value="${escHtml(link.name)}" placeholder="Nome" maxlength="30">
                <button class="link-action-btn delete" title="Remover link"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="link-item-body">
                <div class="link-input-row">
                    <i class="fas fa-link" title="URL"></i>
                    <input type="${link.icon === 'fab fa-discord' ? 'text' : 'url'}" class="link-url-input" value="${escHtml(link.url)}" placeholder="${link.icon === 'fab fa-discord' ? 'Username do Discord (ex: usuario#1234)' : 'https://...'}">
                    <button class="copy-url-btn" title="Copiar URL"><i class="fas fa-copy"></i></button>
                </div>
                <div class="link-input-row">
                    <i class="fas fa-align-left" title="Descrição"></i>
                    <input type="text" class="link-desc-input" value="${escHtml(link.desc)}" placeholder="Subtexto" maxlength="40">
                </div>
                <div class="link-input-row">
                    <i class="fas fa-icons" title="Ícone"></i>
                    <select class="link-icon-select form-input" style="padding:6px 10px;flex:1;" ${isUploadedIcon ? 'disabled' : ''}>
                        ${iconOptions}
                    </select>
                </div>
                <div class="link-input-row">
                    <i class="fas fa-image" title="Ícone via URL"></i>
                    <input type="url" class="link-icon-url-input" value="${escHtml(!isUploadedIcon ? (link.iconUrl||'') : '')}" placeholder="URL da imagem (opcional)" ${isUploadedIcon ? 'disabled' : ''}>
                </div>
                <div class="link-input-row link-icon-upload-row">
                    <i class="fas fa-upload" title="Upload de ícone"></i>
                    <label class="link-icon-upload-label">
                        ${isUploadedIcon
                            ? `<img src="${link.iconUrl}" class="link-icon-preview" alt="ícone"> <span>Imagem carregada</span>`
                            : '<span>Upload de imagem como ícone</span>'
                        }
                        <input type="file" class="link-icon-file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" style="display:none;">
                    </label>
                    ${isUploadedIcon ? `<button class="link-icon-remove-btn" title="Remover imagem"><i class="fas fa-times"></i></button>` : ''}
                </div>
                <div class="link-input-row">
                    <i class="fas fa-tag" title="Badge"></i>
                    <select class="link-badge-preset form-input" style="padding:6px 10px;width:110px;flex:0 0 auto;">
                        ${badgeOptions}
                    </select>
                    <input type="text" class="link-badge-custom form-input" value="${escHtml(link.badge)}" placeholder="Texto custom" maxlength="12" style="flex:1;padding:6px 8px;">
                </div>
                <div class="link-input-row">
                    <i class="fas fa-fill-drip" title="Cor de fundo do badge"></i>
                    <label style="font-size:.72rem;color:#888;flex:0 0 auto;">Fundo</label>
                    <input type="color" class="link-badge-color" value="${link.badgeColor||'#00ff00'}" title="Cor de fundo do badge" style="width:36px;height:28px;flex:0 0 auto;">
                    <label style="font-size:.72rem;color:#888;flex:0 0 auto;margin-left:8px;">Fonte</label>
                    <input type="color" class="link-badge-font-color" value="${link.badgeFontColor||'#000000'}" title="Cor da fonte do badge" style="width:36px;height:28px;flex:0 0 auto;">
                </div>
            </div>
        `;

        // Basic events
        div.querySelector('.link-color-dot').addEventListener('input', (e) => State.updateLink(link.id, { color: e.target.value }));
        div.querySelector('.link-title-input').addEventListener('input', (e) => State.updateLinkSilent(link.id, { name: e.target.value }));
        div.querySelector('.link-title-input').addEventListener('change', (e) => State.commitLinkHistory());
        div.querySelector('.link-url-input').addEventListener('input', (e) => State.updateLinkSilent(link.id, { url: e.target.value }));
        div.querySelector('.link-url-input').addEventListener('change', (e) => State.commitLinkHistory());
        div.querySelector('.link-desc-input').addEventListener('input', (e) => State.updateLinkSilent(link.id, { desc: e.target.value }));
        div.querySelector('.link-desc-input').addEventListener('change', (e) => State.commitLinkHistory());
        div.querySelector('.link-badge-preset').addEventListener('change', (e) => {
            const preset = BADGE_PRESETS.find(b => b.value === e.target.value);
            const customInput = div.querySelector('.link-badge-custom');
            if (preset) {
                customInput.value = preset.value;
                const patch = { badge: preset.value };
                if (preset.color) {
                    patch.badgeColor = preset.color;
                    div.querySelector('.link-badge-color').value = preset.color;
                }
                State.updateLink(link.id, patch);
            }
        });
        div.querySelector('.link-badge-custom').addEventListener('input', (e) => {
            State.updateLinkSilent(link.id, { badge: e.target.value });
        });
        div.querySelector('.link-badge-custom').addEventListener('change', () => State.commitLinkHistory());
        div.querySelector('.link-badge-color').addEventListener('input', (e) => State.updateLink(link.id, { badgeColor: e.target.value }));
        div.querySelector('.link-badge-font-color').addEventListener('input', (e) => State.updateLink(link.id, { badgeFontColor: e.target.value }));

        div.querySelector('.link-icon-url-input').addEventListener('input', (e) => {
            State.updateLink(link.id, { iconUrl: e.target.value });
        });

        div.querySelector('.link-icon-select').addEventListener('change', (e) => {
            const sel = e.target;
            const chosen = ICON_PRESETS.find(p => p.icon === sel.value);
            const patch = { icon: sel.value };
            if (chosen) { patch.color = chosen.color; div.querySelector('.link-color-dot').value = chosen.color; }
            // Update URL placeholder to hint Discord usage
            const urlInput = div.querySelector('.link-url-input');
            if (sel.value === 'fab fa-discord') {
                urlInput.placeholder = 'Username do Discord (ex: usuario#1234)';
                urlInput.type = 'text';
            } else {
                urlInput.placeholder = 'https://...';
                urlInput.type = 'url';
            }
            State.updateLink(link.id, patch);
        });

        // Icon file upload
        div.querySelector('.link-icon-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { Notify.error('Arquivo muito grande', 'Máx 2MB para ícones'); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                State.updateLink(link.id, { iconUrl: ev.target.result });
                Notify.success('Ícone carregado', file.name);
            };
            reader.readAsDataURL(file);
        });

        // Remove uploaded icon
        div.querySelector('.link-icon-remove-btn')?.addEventListener('click', () => {
            State.updateLink(link.id, { iconUrl: '' });
        });

        div.querySelector('.copy-url-btn').addEventListener('click', () => {
            const url = div.querySelector('.link-url-input').value;
            navigator.clipboard.writeText(url).then(() => Notify.success('Copiado!', url.slice(0, 40))).catch(() => {});
        });

        div.querySelector('.delete').addEventListener('click', () => {
            confirmAction(`Remover o link "${link.name}"?`, () => {
                State.removeLink(link.id);
                Notify.info('Link removido', link.name);
            });
        });

        return div;
    }

    function _initDragDrop(list) {
        list.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                _dragSrcId = item.dataset.id;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                list.querySelectorAll('.link-item').forEach(i => i.classList.remove('drag-over'));
                const newOrder = [...list.querySelectorAll('.link-item')].map(el => {
                    return State.getLinks().find(l => l.id === el.dataset.id);
                }).filter(Boolean);
                State.reorderLinks(newOrder);
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item.dataset.id === _dragSrcId) return;
                list.querySelectorAll('.link-item').forEach(i => i.classList.remove('drag-over'));
                item.classList.add('drag-over');
                const dragging = list.querySelector(`[data-id="${_dragSrcId}"]`);
                if (!dragging) return;
                const rect = item.getBoundingClientRect();
                const after = e.clientY > rect.top + rect.height / 2;
                list.insertBefore(dragging, after ? item.nextSibling : item);
            });
        });
    }

    function init() {
        document.getElementById('addLinkBtn')?.addEventListener('click', () => {
            if (State.getLinks().length >= 20) {
                Notify.warning('Limite atingido', 'Máximo de 20 links');
                return;
            }
            State.addLink(_makeDefaultLink());
            const btn = document.querySelector('[aria-controls="linksBody"]');
            if (btn && btn.getAttribute('aria-expanded') !== 'true') PanelSections.open(btn);
        });

        State.onChange((src) => {
            // 'links-silent' = text field update; skip re-render to avoid interrupting typing
            if (['links','history','reset','init'].includes(src)) render();
        });

        render();
    }

    return { init, render };
})();

window.LinksManager = LinksManager;
