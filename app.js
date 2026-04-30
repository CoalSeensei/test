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
      const text = target.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        showToast('模板已复制');
      } catch (error) {
        showToast('复制失败，请手动选择');
      }
    });
  });
}

function initFeedbackForm() {
  const form = document.getElementById('feedbackForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = document.getElementById('feedbackName')?.value.trim();
    const email = document.getElementById('feedbackEmail')?.value.trim();
    const message = document.getElementById('feedbackMessage')?.value.trim();

    const body = `姓名：${name || '-'}\n邮箱：${email || '-'}\n\n反馈：\n${message || '-'}`;
    const subject = encodeURIComponent('Vibecoding 教程站反馈');
    const mailto = `mailto:hello@example.com?subject=${subject}&body=${encodeURIComponent(body)}`;

    try {
      await navigator.clipboard.writeText(body);
      showToast('反馈内容已复制，正在打开邮箱');
    } catch (error) {
      showToast('正在打开邮箱');
    }

    window.location.href = mailto;
  });
}

initTabs();
initFaq();
initCopyButtons();
initFeedbackForm();
