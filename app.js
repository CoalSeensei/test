'use strict';

const copyButton = document.querySelector('[data-copy-btn]');
const copyTarget = document.querySelector('[data-copy-target]');
const toast = document.getElementById('copyToast');
let toastTimer = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  } catch {
    return false;
  }
}

if (copyButton && copyTarget) {
  copyButton.addEventListener('click', async () => {
    const text = copyTarget.textContent.trim();
    const ok = await copyText(text);
    showToast(ok ? '指令已复制' : '复制失败，请手动复制');
  });
}
