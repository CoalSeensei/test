/* =========================================================
   韩立的修仙历练簿 – 主逻辑
   ========================================================= */

'use strict';

// ── 常量配置 ──────────────────────────────────────────────

const REALMS = [
  { key: 'lianqi',   name: '炼气期', color: '#7BA05B' },
  { key: 'zhujj',    name: '筑基期', color: '#5B9BD5' },
  { key: 'jindan',   name: '金丹期', color: '#D4AF37' },
  { key: 'yuanying', name: '元婴期', color: '#9370DB' },
  { key: 'huashen',  name: '化神期', color: '#CD5C5C' },
  { key: 'lianxu',   name: '炼虚期', color: '#9D774F' },
  { key: 'heti',     name: '合体期', color: '#9D774F' },
  { key: 'feisheng', name: '飞升',   color: '#E8D7B8' },
];

const GRADES = [
  { key: 'fan',  name: '凡级', color: '#A09070', cult: 10,  stones: 1  },
  { key: 'ling', name: '灵级', color: '#5B9BD5', cult: 20,  stones: 3  },
  { key: 'di',   name: '地级', color: '#9370DB', cult: 35,  stones: 5  },
  { key: 'tian', name: '天级', color: '#C45C43', cult: 50,  stones: 10 },
];

// 修为里程碑（每段 100 修为升一阶）
const CULT_MILESTONES = [
  { threshold: 0,    title: '凡人' },
  { threshold: 100,  title: '炼气初期' },
  { threshold: 200,  title: '炼气中期' },
  { threshold: 300,  title: '炼气后期' },
  { threshold: 400,  title: '筑基初期' },
  { threshold: 550,  title: '筑基中期' },
  { threshold: 700,  title: '筑基后期' },
  { threshold: 900,  title: '金丹初期' },
  { threshold: 1100, title: '金丹中期' },
  { threshold: 1400, title: '金丹后期' },
  { threshold: 1700, title: '元婴初期' },
  { threshold: 2100, title: '元婴中期' },
  { threshold: 2500, title: '元婴后期' },
  { threshold: 3000, title: '化神初期' },
  { threshold: 3600, title: '化神中期' },
  { threshold: 4200, title: '化神后期' },
  { threshold: 5000, title: '炼虚初期' },
  { threshold: 6000, title: '炼虚后期' },
  { threshold: 7500, title: '合体初期' },
  { threshold: 9000, title: '合体后期' },
  { threshold: 11000,title: '大乘期'   },
  { threshold: 15000,title: '渡劫期'   },
  { threshold: 20000,title: '真仙'     },
];

const QUOTES = [
  '低调发育，苟道永恒。',
  '小命要紧，机缘不强求。',
  '能跑则跑，能躲则躲，切勿硬拼。',
  '修仙之道，步步为营，切勿急于求成。',
  '灵根平庸又如何，苟活百年总有机缘。',
  '宁可错过千次机缘，不可死于一次莽撞。',
  '人道是积少成多，厚积薄发。',
  '此事与我无关，我只是个过客。',
  '留得青山在，不怕没柴烧。',
  '今日的退让，是为了明日的突破。',
  '高筑墙，广积粮，缓称王。',
  '修仙非儿戏，每一步都需谨慎。',
  '活着，才是最大的修炼。',
  '借假修真，以有为入无为。',
  '一切皆有因果，莫强求，莫强争。',
];

// ── 状态 ──────────────────────────────────────────────────

let state = {
  tasks:         [],
  cultivation:   0,
  spiritStones:  0,
  realmTitle:    '凡人',
  filterRealm:   'all',
  filterGrade:   'all',
  filterView:    'all',   // all | active | done
  editingId:     null,
  quoteIndex:    0,
  bg:            'tiannan',
};

// ── DOM 引用 ──────────────────────────────────────────────

const $ = id => document.getElementById(id);

const dom = {
  realmList:       $('realmList'),
  gradeFilters:    $('gradeFilters'),
  addTaskBtn:      $('addTaskBtn'),
  taskList:        $('taskList'),
  emptyState:      $('emptyState'),
  mainTitle:       $('mainTitle'),
  statTotal:       $('statTotal'),
  statDone:        $('statDone'),
  statLeft:        $('statLeft'),

  // header
  headerRealm:     $('headerRealm'),
  cultBar:         $('cultBar'),
  cultNum:         $('cultNum'),
  spiritNum:       $('spiritNum'),

  // modal
  modalOverlay:    $('modalOverlay'),
  modal:           $('modal'),
  modalTitle:      $('modalTitle'),
  modalClose:      $('modalClose'),
  modalCancel:     $('modalCancel'),
  modalSubmit:     $('modalSubmit'),
  taskInput:       $('taskInput'),
  realmChips:      $('realmChips'),
  gradeChips:      $('gradeChips'),

  // quote
  quoteText:       $('quoteText'),
  quoteBtn:        $('quoteBtn'),

  // settings
  settingsBtn:     $('settingsBtn'),
  settingsPanel:   $('settingsPanel'),
  resetCultBtn:    $('resetCultBtn'),

  // breakthrough
  btOverlay:       $('btOverlay'),
  btTitle:         $('btTitle'),
  btText:          $('btText'),
  btClose:         $('btClose'),

  // toast
  toast:           $('toast'),

  // view filter
  vfBtns:          document.querySelectorAll('.vf-btn'),

  particles:       $('particles'),
};

// ── 辅助：持久化 ──────────────────────────────────────────

function save() {
  localStorage.setItem('xiuxian_state', JSON.stringify({
    tasks:        state.tasks,
    cultivation:  state.cultivation,
    spiritStones: state.spiritStones,
    bg:           state.bg,
    quoteIndex:   state.quoteIndex,
  }));
}

function load() {
  try {
    const raw = localStorage.getItem('xiuxian_state');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.tasks)       state.tasks        = saved.tasks;
    if (saved.cultivation) state.cultivation  = saved.cultivation;
    if (saved.spiritStones)state.spiritStones = saved.spiritStones;
    if (saved.bg)          state.bg           = saved.bg;
    if (saved.quoteIndex)  state.quoteIndex   = saved.quoteIndex;
  } catch (_) { /* ignore */ }
}

// ── 工具 ──────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function realmByKey(key) {
  return REALMS.find(r => r.key === key) || REALMS[0];
}
function gradeByKey(key) {
  return GRADES.find(g => g.key === key) || GRADES[0];
}

function getRealmTitle(cult) {
  let title = '凡人';
  for (const m of CULT_MILESTONES) {
    if (cult >= m.threshold) title = m.title;
    else break;
  }
  return title;
}

// 计算当前里程碑进度 0-100
function getCultProgress(cult) {
  for (let i = CULT_MILESTONES.length - 1; i >= 0; i--) {
    if (cult >= CULT_MILESTONES[i].threshold) {
      const cur = CULT_MILESTONES[i].threshold;
      const next = CULT_MILESTONES[i + 1] ? CULT_MILESTONES[i + 1].threshold : cur + 100;
      return Math.min(100, Math.round(((cult - cur) / (next - cur)) * 100));
    }
  }
  return 0;
}

// ── 渲染：侧边栏境界列表 ──────────────────────────────────

function renderRealmList() {
  const items = [
    { key: 'all', name: '全部历练', color: '#E8D7B8', dot: '#E8D7B8' },
    ...REALMS.map(r => ({ key: r.key, name: r.name, color: r.color, dot: r.color })),
  ];
  dom.realmList.innerHTML = items.map(r => {
    const cnt = r.key === 'all'
      ? state.tasks.length
      : state.tasks.filter(t => t.realm === r.key).length;
    const active = state.filterRealm === r.key ? 'active' : '';
    return `
      <li class="realm-item ${active}" data-realm="${r.key}">
        <span class="realm-dot" style="background:${r.dot}"></span>
        <span class="realm-name">${r.name}</span>
        <span class="realm-cnt" id="cnt-${r.key}">${cnt}</span>
      </li>`;
  }).join('');

  dom.realmList.querySelectorAll('.realm-item').forEach(el => {
    el.addEventListener('click', () => {
      state.filterRealm = el.dataset.realm;
      renderRealmList();
      renderMainTitle();
      renderTasks();
    });
  });
}

// ── 渲染：品级筛选 ────────────────────────────────────────

function renderGradeFilters() {
  const grades = [{ key: 'all', name: '全部' }, ...GRADES];
  dom.gradeFilters.innerHTML = grades.map(g => {
    const active = state.filterGrade === g.key ? 'active' : '';
    return `<button class="grade-btn ${active}" data-grade="${g.key}">${g.name}</button>`;
  }).join('');

  dom.gradeFilters.querySelectorAll('.grade-btn').forEach(el => {
    el.addEventListener('click', () => {
      state.filterGrade = el.dataset.grade;
      renderGradeFilters();
      renderTasks();
    });
  });
}

// ── 渲染：主标题 ──────────────────────────────────────────

function renderMainTitle() {
  if (state.filterRealm === 'all') {
    dom.mainTitle.textContent = '全部历练';
  } else {
    const r = realmByKey(state.filterRealm);
    dom.mainTitle.textContent = r.name + '·历练任务';
  }
}

// ── 渲染：header 修为信息 ─────────────────────────────────

function renderCultivation() {
  const title = getRealmTitle(state.cultivation);
  state.realmTitle = title;
  const progress = getCultProgress(state.cultivation);
  dom.headerRealm.textContent = title;
  dom.cultBar.style.width = progress + '%';
  dom.cultNum.textContent = '修为 ' + state.cultivation;
  dom.spiritNum.textContent = state.spiritStones;
}

// ── 渲染：统计 ────────────────────────────────────────────

function renderStats() {
  const total = state.tasks.length;
  const done  = state.tasks.filter(t => t.done).length;
  dom.statTotal.textContent = total;
  dom.statDone.textContent  = done;
  dom.statLeft.textContent  = total - done;
}

// ── 渲染：任务列表 ────────────────────────────────────────

function getFilteredTasks() {
  return state.tasks.filter(t => {
    if (state.filterRealm !== 'all' && t.realm !== state.filterRealm) return false;
    if (state.filterGrade !== 'all' && t.grade !== state.filterGrade) return false;
    if (state.filterView === 'active' && t.done) return false;
    if (state.filterView === 'done'   && !t.done) return false;
    return true;
  });
}

function renderTasks() {
  const filtered = getFilteredTasks();
  dom.emptyState.hidden = filtered.length > 0;
  dom.taskList.innerHTML = '';

  filtered.forEach(task => {
    const realm = realmByKey(task.realm);
    const grade = gradeByKey(task.grade);
    const card  = document.createElement('div');
    card.className = 'task-card' + (task.done ? ' done' : '');
    card.dataset.id = task.id;
    card.style.setProperty('--realm-color', realm.color);

    card.innerHTML = `
      <div class="task-check" data-id="${task.id}" title="${task.done ? '标记未完成' : '标记完成'}">
        ${task.done ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escHtml(task.title)}</div>
        <div class="task-meta">
          <span class="realm-tag" style="color:${realm.color}">${realm.name}</span>
          <span class="grade-tag" style="color:${grade.color}">${grade.name}</span>
        </div>
      </div>
      ${task.done ? '<div class="done-seal">已完成</div>' : ''}
      <div class="task-actions">
        <button class="action-btn edit-btn" data-id="${task.id}" title="编辑">✎</button>
        <button class="action-btn del-btn"  data-id="${task.id}" title="删除">✕</button>
      </div>`;

    dom.taskList.appendChild(card);
  });

  // 事件委托（在 taskList 上监听）已在 init 中绑定
  renderStats();
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 任务操作 ──────────────────────────────────────────────

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;

  if (task.done) {
    const grade = gradeByKey(task.grade);
    const prevTitle = getRealmTitle(state.cultivation);

    state.cultivation  += grade.cult;
    state.spiritStones += grade.stones;
    save();

    const newTitle = getRealmTitle(state.cultivation);
    renderCultivation();

    // 修为飘出动画
    const card = dom.taskList.querySelector(`[data-id="${id}"]`);
    if (card) {
      const rect = card.getBoundingClientRect();
      showCultPopup(rect.left + rect.width / 2, rect.top, '+' + grade.cult + ' 修为');
      card.classList.add('completing');
      setTimeout(() => card.classList.remove('completing'), 600);
    }

    // 突破通知
    if (newTitle !== prevTitle) {
      setTimeout(() => showBreakthrough(newTitle), 700);
    }

    showToast('历练完成！灵石 +' + grade.stones);
  } else {
    save();
    showToast('历练已标记为未完成');
  }

  renderRealmList();
  renderTasks();
}

function deleteTask(id) {
  const card = dom.taskList.querySelector(`.task-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => {
      state.tasks = state.tasks.filter(t => t.id !== id);
      save();
      renderRealmList();
      renderTasks();
      showToast('已放弃此历练');
    }, 450);
  } else {
    state.tasks = state.tasks.filter(t => t.id !== id);
    save();
    renderRealmList();
    renderTasks();
  }
}

// ── 弹窗：新增 / 编辑 ─────────────────────────────────────

let modalRealmSel = REALMS[0].key;
let modalGradeSel = GRADES[0].key;

function openModal(taskId) {
  state.editingId = taskId || null;
  const task = taskId ? state.tasks.find(t => t.id === taskId) : null;

  dom.modalTitle.textContent = task ? '修改历练符' : '立此历练符';
  dom.taskInput.value = task ? task.title : '';
  modalRealmSel = task ? task.realm : REALMS[0].key;
  modalGradeSel = task ? task.grade : GRADES[0].key;

  renderModalChips();
  dom.modalOverlay.hidden = false;
  dom.taskInput.focus();
}

function closeModal() {
  dom.modalOverlay.hidden = true;
  state.editingId = null;
  dom.taskInput.value = '';
}

function renderModalChips() {
  dom.realmChips.innerHTML = REALMS.map(r => `
    <span class="chip${modalRealmSel === r.key ? ' selected' : ''}"
          data-realm="${r.key}"
          style="color:${r.color};border-color:${modalRealmSel === r.key ? r.color : 'var(--border)'}">
      ${r.name}
    </span>`).join('');

  dom.gradeChips.innerHTML = GRADES.map(g => `
    <span class="chip${modalGradeSel === g.key ? ' selected' : ''}"
          data-grade="${g.key}"
          style="color:${g.color};border-color:${modalGradeSel === g.key ? g.color : 'var(--border)'}">
      ${g.name}（+${g.cult}修为）
    </span>`).join('');

  dom.realmChips.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      modalRealmSel = el.dataset.realm;
      renderModalChips();
    });
  });
  dom.gradeChips.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      modalGradeSel = el.dataset.grade;
      renderModalChips();
    });
  });
}

function submitModal() {
  const title = dom.taskInput.value.trim();
  if (!title) {
    dom.taskInput.focus();
    dom.taskInput.classList.add('shake');
    setTimeout(() => dom.taskInput.classList.remove('shake'), 500);
    showToast('请输入历练内容！');
    return;
  }

  if (state.editingId) {
    const task = state.tasks.find(t => t.id === state.editingId);
    if (task) {
      task.title = title;
      task.realm = modalRealmSel;
      task.grade = modalGradeSel;
      showToast('历练符已更新');
    }
  } else {
    state.tasks.unshift({
      id:    uid(),
      title: title,
      realm: modalRealmSel,
      grade: modalGradeSel,
      done:  false,
      createdAt: Date.now(),
    });
    showToast('历练任务已立符！');
    randomQuote();
  }

  save();
  closeModal();
  renderRealmList();
  renderTasks();
}

// ── 突破通知 ──────────────────────────────────────────────

function showBreakthrough(title) {
  dom.btTitle.textContent = '境界突破！';
  dom.btText.textContent  = `恭喜韩立晋入 【${title}】！`;
  dom.btOverlay.hidden = false;
}

// ── 修为飘出 ──────────────────────────────────────────────

function showCultPopup(x, y, text) {
  const el = document.createElement('div');
  el.className = 'cult-popup';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// ── Toast ─────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2500);
}

// ── 语录 ─────────────────────────────────────────────────

function randomQuote() {
  const idx = Math.floor(Math.random() * QUOTES.length);
  state.quoteIndex = idx;
  dom.quoteText.style.opacity = '0';
  setTimeout(() => {
    dom.quoteText.textContent = QUOTES[idx];
    dom.quoteText.style.opacity = '1';
  }, 250);
}

// ── 背景粒子（萤火虫效果）─────────────────────────────────

function initParticles() {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 3;
    const colors = ['rgba(143,188,143,0.7)', 'rgba(212,184,135,0.6)', 'rgba(91,155,213,0.5)', 'rgba(212,175,55,0.6)'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${color};
      left:${Math.random() * 100}%;
      top:${40 + Math.random() * 55}%;
      --dur:${6 + Math.random() * 8}s;
      --delay:${Math.random() * 10}s;
      box-shadow: 0 0 ${size * 2}px ${color};
    `;
    dom.particles.appendChild(p);
  }
}

// ── 视图筛选 ──────────────────────────────────────────────

function initViewFilter() {
  dom.vfBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.vfBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterView = btn.dataset.view;
      renderTasks();
    });
  });
}

// ── 设置面板 ──────────────────────────────────────────────

function initSettings() {
  dom.settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    dom.settingsPanel.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!dom.settingsPanel.contains(e.target) && e.target !== dom.settingsBtn) {
      dom.settingsPanel.classList.remove('open');
    }
  });

  document.querySelectorAll('.bg-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bg-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.bg = btn.dataset.bg;
      document.body.dataset.bg = state.bg;
      save();
    });
    if (btn.dataset.bg === state.bg) btn.classList.add('active');
  });

  dom.resetCultBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有修为吗？')) {
      state.cultivation  = 0;
      state.spiritStones = 0;
      save();
      renderCultivation();
      showToast('修为已清空，重新修炼！');
    }
  });
}

// ── 事件委托：任务列表 ────────────────────────────────────

function initTaskListEvents() {
  dom.taskList.addEventListener('click', e => {
    const check = e.target.closest('.task-check');
    const edit  = e.target.closest('.edit-btn');
    const del   = e.target.closest('.del-btn');

    if (check) toggleTask(check.dataset.id);
    if (edit)  openModal(edit.dataset.id);
    if (del)   deleteTask(del.dataset.id);
  });
}

// ── 输入框回车提交 ────────────────────────────────────────

function initModalEvents() {
  dom.addTaskBtn.addEventListener('click', () => openModal());
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSubmit.addEventListener('click', submitModal);
  dom.modalOverlay.addEventListener('click', e => {
    if (e.target === dom.modalOverlay) closeModal();
  });
  dom.taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitModal();
    if (e.key === 'Escape') closeModal();
  });

  dom.btClose.addEventListener('click', () => {
    dom.btOverlay.hidden = true;
  });
}

// ── 全部渲染 ──────────────────────────────────────────────

function renderAll() {
  renderRealmList();
  renderGradeFilters();
  renderMainTitle();
  renderTasks();
  renderCultivation();
  renderStats();
}

// ── 页面加载动画 ──────────────────────────────────────────

function pageLoadAnimation() {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.8s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });
}

// ── 初始化 ────────────────────────────────────────────────

function init() {
  load();

  // 应用背景
  document.body.dataset.bg = state.bg;

  // 渲染
  renderAll();

  // 语录
  dom.quoteText.textContent = QUOTES[state.quoteIndex] || QUOTES[0];
  dom.quoteBtn.addEventListener('click', randomQuote);

  // 粒子
  initParticles();

  // 事件
  initViewFilter();
  initSettings();
  initModalEvents();
  initTaskListEvents();

  // 加载动画
  pageLoadAnimation();
}

// 添加 CSS shake 动画（行内注入）
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .shake { animation: shake 0.4s ease; }
`;
document.head.appendChild(shakeStyle);

document.addEventListener('DOMContentLoaded', init);
