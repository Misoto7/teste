/**
 * ui.js — UI utilities for Misoto Generator v5.0
 */
'use strict';

// ── Notifications ─────────────────────────────────────────────────────────────

const Notify = (() => {
    let container;
    let _current = null;   // elemento visível no momento
    let _removeTimer = null;

    function init() { container = document.getElementById('notificationContainer'); }

    function show(title, msg, type = 'info', duration = 4000) {
        if (!container) return;
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };

        // Se já existe uma notificação, faz slide-out dela antes
        if (_current) {
            clearTimeout(_removeTimer);
            const old = _current;
            old.classList.remove('notif--slide-in');
            old.classList.add('notif--slide-out');
            setTimeout(() => old.remove(), 280);
            _current = null;
        }

        const el = document.createElement('div');
        el.className = `notif notif--${type} notif--slide-in`;
        el.innerHTML = `
            <i class="fas ${icons[type]||icons.info} notif__icon"></i>
            <div class="notif__body">
                <div class="notif__title">${escHtml(title)}</div>
                ${msg ? `<div class="notif__msg">${escHtml(msg)}</div>` : ''}
            </div>
            <button class="notif__close"><i class="fas fa-times"></i></button>
        `;

        const remove = () => {
            if (_current !== el) return;
            el.classList.remove('notif--slide-in');
            el.classList.add('notif--slide-out');
            _current = null;
            setTimeout(() => el.remove(), 280);
        };

        el.querySelector('.notif__close').addEventListener('click', remove);
        container.appendChild(el);
        _current = el;

        if (duration > 0) {
            _removeTimer = setTimeout(remove, duration);
        }
    }

    return {
        init,
        success: (t, m, d) => show(t, m, 'success', d),
        error:   (t, m, d) => show(t, m, 'error',   d),
        warning: (t, m, d) => show(t, m, 'warning',  d),
        info:    (t, m, d) => show(t, m, 'info',     d),
    };
})();

// ── Loading ────────────────────────────────────────────────────────────────────

const Loading = {
    show() { document.getElementById('loadingOverlay')?.classList.add('active'); },
    hide() { document.getElementById('loadingOverlay')?.classList.remove('active'); },
};

// ── Panel Sections ─────────────────────────────────────────────────────────────

const PanelSections = {
    init() {
        document.querySelectorAll('.section-header').forEach(btn => {
            btn.addEventListener('click', () => this.toggle(btn));
        });
        // Open first section by default
        const first = document.querySelector('.section-header');
        if (first) this.open(first);
    },
    toggle(btn) {
        btn.getAttribute('aria-expanded') === 'true' ? this.close(btn) : this.open(btn);
    },
    open(btn) {
        const body = document.getElementById(btn.getAttribute('aria-controls'));
        if (!body) return;
        btn.setAttribute('aria-expanded', 'true');
        body.classList.add('open');
    },
    close(btn) {
        const body = document.getElementById(btn.getAttribute('aria-controls'));
        if (!body) return;
        btn.setAttribute('aria-expanded', 'false');
        body.classList.remove('open');
    },
};

// ── Upload Zones ───────────────────────────────────────────────────────────────

const UploadZone = {
    setup(zoneId, opts) {
        const zone  = document.getElementById(zoneId);
        if (!zone) return;
        const input = zone.querySelector('.upload-input');
        if (!input) return;
        zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
        zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', ()  => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault(); zone.classList.remove('dragover');
            const file = e.dataTransfer?.files[0];
            if (file) this._handle(file, opts);
        });
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) { this._handle(file, opts); input.value = ''; }
        });
    },
    _handle(file, opts) {
        const { maxMB = 10, types = [], onFile } = opts;
        if (types.length && !types.includes(file.type)) {
            Notify.error('Tipo inválido', `Permitido: ${types.map(t => t.split('/')[1]).join(', ').toUpperCase()}`);
            return;
        }
        if (file.size > maxMB * 1024 * 1024) {
            Notify.error('Arquivo muito grande', `Máximo ${maxMB}MB`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => onFile(file, e.target.result);
        reader.onerror = () => Notify.error('Erro de leitura', 'Falha ao ler o arquivo');
        reader.readAsDataURL(file);
    },
};

// ── Tooltip Manager ────────────────────────────────────────────────────────────

const Tooltip = {
    _el: null,
    init() {
        this._el = document.createElement('div');
        this._el.className = 'tooltip-popup';
        document.body.appendChild(this._el);
        document.querySelectorAll('[data-tip]').forEach(el => {
            el.addEventListener('mouseenter', (e) => this.show(e.target, e.target.dataset.tip));
            el.addEventListener('mouseleave', () => this.hide());
        });
    },
    show(target, text) {
        if (!text) return;
        this._el.textContent = text;
        this._el.classList.add('visible');
        const r = target.getBoundingClientRect();
        this._el.style.left = (r.left + r.width / 2) + 'px';
        this._el.style.top  = (r.top - 36) + 'px';
    },
    hide() { this._el.classList.remove('visible'); },
};

// ── Confirm Modal ──────────────────────────────────────────────────────────────

function confirmAction(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMsg');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    if (!modal) { if (confirm(message)) onConfirm(); return; }
    if (msgEl) msgEl.textContent = message;
    modal.classList.add('open');
    const cleanup = () => modal.classList.remove('open');
    okBtn.onclick = () => { cleanup(); onConfirm(); };
    cancelBtn.onclick = cleanup;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
}

window.Notify       = Notify;
window.Loading      = Loading;
window.PanelSections = PanelSections;
window.UploadZone   = UploadZone;
window.Tooltip      = Tooltip;
window.confirmAction = confirmAction;
window.escHtml      = escHtml;
window.uid          = uid;
