'use strict';

const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;
      tabButtons.forEach(item => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });

      tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === target);
      });
    });
  });
}

function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const button = item.querySelector('.faq-question');
    if (!button) return;
    button.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
}

function initCopyButtons() {
  const copyButtons = document.querySelectorAll('[data-copy-target]');
  copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const targetId = button.dataset.copyTarget;
      const target = document.getElementById(targetId);
      if (!target) {
        showToast('没有找到可复制的内容');
        return;
      }
      const text = target.innerText.trim();
      try {
        await navigator.clipboard.writeText(text);
        showToast('模板已复制');
      } catch (error) {
        showToast('复制失败，请手动选择');
      }
    });
  });
}

initTabs();
initFaq();
initCopyButtons();
