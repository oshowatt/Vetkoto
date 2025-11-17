// Robust modal helper - ensures form container lives inside modal-content so inputs are clickable

(function () {
  'use strict';

  function isElement(x) { return x && x.nodeType === 1; }

  function moveModalToBody(modal) {
    if (!isElement(modal) || modal.parentNode === document.body) return;
    document.body.appendChild(modal);
  }

  function createOverlay() {
    const o = document.createElement('div');
    o.className = 'overlay';
    o.setAttribute('aria-hidden', 'true');
    o.style.display = 'none';
    return o;
  }

  function createCloseButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-close';
    btn.title = 'Close';
    btn.setAttribute('aria-label', 'Close');
    btn.innerHTML = '✕';
    btn.addEventListener('click', function (e) {
      const modal = e.target.closest('.modal');
      closeModal(modal);
    });
    return btn;
  }

  function openModal(modal) {
    if (!isElement(modal)) return;
    moveModalToBody(modal);

    let overlay = modal.querySelector('.overlay');
    if (!overlay) {
      overlay = createOverlay();
      modal.insertBefore(overlay, modal.firstChild);
    }

    const content = modal.querySelector('.modal-content') || modal;
    if (!content) return;

    if (!content.querySelector('.modal-close')) {
      content.insertBefore(createCloseButton(), content.firstChild);
    }

    // ensure form container exists inside modal-content
    ensureFormContainer(modal);

    overlay.style.display = 'block';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
  }

  function closeModal(modal) {
    if (!isElement(modal)) return;
    const overlay = modal.querySelector('.overlay');
    if (overlay) overlay.style.display = 'none';
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
  }

  // Move existing #entityForm (if present) into modal-content, or create a scoped form + #formFields
  function ensureFormContainer(modal) {
    if (!isElement(modal)) return null;
    const content = modal.querySelector('.modal-content') || modal;
    // if modal already has #entityForm inside, done
    let formInModal = content.querySelector('#entityForm');
    if (formInModal) return formInModal;

    // if a global form exists, move it inside modal-content
    const globalForm = document.getElementById('entityForm');
    if (globalForm) {
      // detach and append into modal content
      try { content.appendChild(globalForm); } catch (e) { /* ignore */ }
      // ensure #formFields exists inside the moved form
      if (!globalForm.querySelector('#formFields')) {
        const f = document.createElement('div'); f.id = 'formFields'; globalForm.appendChild(f);
      }
      // attach click-stop so clicks inside modal don't bubble
      content.addEventListener('click', e => e.stopPropagation(), { passive: false });
      return globalForm;
    }

    // create a modal-local form structure
    const f = document.createElement('form');
    f.id = 'entityForm';
    f.method = 'post';
    const fields = document.createElement('div');
    fields.id = 'formFields';
    f.appendChild(fields);
    content.appendChild(f);

    content.addEventListener('click', e => e.stopPropagation(), { passive: false });
    return f;
  }

  // remove stray "Close" text nodes inside modal content
  function removeStrayCloseText(content) {
    if (!isElement(content)) return;
    Array.from(content.querySelectorAll('*')).forEach(el => {
      if ((el.textContent || '').trim().toLowerCase() === 'close') el.remove();
    });
    for (const node of Array.from(content.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().toLowerCase() === 'close') {
        node.parentNode.removeChild(node);
      }
    }
  }

  function normalizeFooter(modal) {
    const footer = modal.querySelector('.modal-footer');
    if (!footer || footer.dataset.normalized === '1') return;
    const left = document.createElement('div'); left.className = 'left-group';
    const right = document.createElement('div'); right.className = 'right-group';
    const elems = Array.from(footer.querySelectorAll('button, a'));
    elems.forEach(el => el.remove());
    elems.forEach(el => {
      const txt = (el.textContent || '').trim().toLowerCase();
      const cls = (el.className || '').toLowerCase();
      if (txt === 'save' || /save/.test(cls) || /primary/.test(cls)) {
        right.appendChild(el); el.classList.add('primary');
      } else if (txt === 'reset' || /reset/.test(cls) || txt === 'cancel') {
        left.appendChild(el); el.classList.add('reset');
      } else if (txt === 'delete' || /delete/.test(cls) || /danger/.test(cls)) {
        left.appendChild(el); el.classList.add('delete');
      } else left.appendChild(el);
    });
    footer.innerHTML = '';
    footer.appendChild(left);
    footer.appendChild(right);
    footer.dataset.normalized = '1';
  }

  function setupModal(modal) {
    if (!isElement(modal)) return;
    moveModalToBody(modal);
    const content = modal.querySelector('.modal-content') || modal;
    if (!content) return;

    removeStrayCloseText(content);

    if (!modal.querySelector('.overlay')) modal.insertBefore(createOverlay(), modal.firstChild);

    if (!content.querySelector('.modal-close')) content.insertBefore(createCloseButton(), content.firstChild);

    // ensure a form + #formFields inside modal-content (move global form if necessary)
    ensureFormContainer(modal);

    // stop clicks inside modal-content from bubbling to overlay/ document
    content.addEventListener('click', function (e) { e.stopPropagation(); }, { passive: false });

    normalizeFooter(modal);

    if (!modal.hasAttribute('aria-hidden')) {
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
    }

    content.setAttribute('role', content.getAttribute('role') || 'dialog');
    content.setAttribute('aria-modal', 'true');
  }

  function ensureAllModals() {
    document.querySelectorAll('.modal').forEach(setupModal);
  }

  // delegated save handler submits form inside modal
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action="save"], button[data-action="save"], .btn[data-action="save"]');
    if (!btn) return;
    const modal = btn.closest('.modal');
    if (!modal) return;
    e.preventDefault(); e.stopPropagation();
    const form = modal.querySelector('#entityForm') || modal.querySelector('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
    }
    modal.dispatchEvent(new CustomEvent('modal:save', { detail: { modal, button: btn } }));
  }, true);

  // close handlers
  document.addEventListener('click', function (e) {
    const closeEl = e.target.closest('[data-modal-close]');
    if (closeEl) { const modal = closeEl.closest('.modal'); closeModal(modal); return; }
    if (e.target.classList && e.target.classList.contains('overlay')) {
      const modal = e.target.closest('.modal');
      if (modal && modal.dataset.canClose !== 'false') closeModal(modal);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open, .modal[aria-hidden="false"]').forEach(m => {
        if (m.dataset.canClose === 'false') return;
        closeModal(m);
      });
    }
  });

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.matches('.modal')) setupModal(n);
        const inner = n.querySelector && n.querySelector('.modal');
        if (inner) setupModal(inner);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  ensureAllModals();
  document.addEventListener('DOMContentLoaded', ensureAllModals);

  window.VetKotoModal = {
    open: openModal,
    close: closeModal,
    ensureAll: ensureAllModals,
    setup: setupModal
  };

})();