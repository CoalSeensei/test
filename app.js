'use strict';

const FOCUS_LEVELS = [
  { key: 'lianqi', name: '炼气期专注', min: 0, max: 30, bonus: 5 },
  { key: 'zhuji', name: '筑基期专注', min: 31, max: 60, bonus: 10 },
  { key: 'jindan', name: '金丹期专注', min: 61, max: 120, bonus: 20 },
  { key: 'yuanying', name: '元婴期专注', min: 121, max: Infinity, bonus: 30 }
];

const BADGES = [
  { key: 'lianqi', name: '炼气徽章', cost: 500, effect: '番茄钟基础奖励 +1 灵石' },
  { key: 'zhuji', name: '筑基徽章', cost: 1000, effect: '待办奖励 +2 灵石' },
  { key: 'jindan', name: '金丹徽章', cost: 2000, effect: '每日专注等级结算额外 +10 灵石' },
  { key: 'yuanying', name: '元婴徽章', cost: 5000, effect: '机缘令牌兑换成本 -20%' }
];

const ARTIFACTS = [
  { key: 'qingzhu', name: '青竹蜂云剑', desc: '灵石收益 +20%', unlock: '触发青竹蜂云剑机缘' },
  { key: 'fenglei', name: '风雷翅', desc: '行止如风（展示图鉴）', unlock: '后续版本开放' },
  { key: 'zhangtian', name: '掌天瓶', desc: '专注时长翻倍（限时）', unlock: '触发掌天瓶机缘' }
];

const SPIRIT_BEASTS = [
  { key: 'shijin', name: '噬金虫', desc: '陪伴修炼', unlock: '机缘碎片满 3 次解锁' },
  { key: 'yinyue', name: '银月', desc: '专注护法（限时）', unlock: '触发银月机缘' }
];

const $ = id => document.getElementById(id);

const dom = {
  taskList: $('taskList'),
  emptyState: $('emptyState'),
  addTaskBtn: $('addTaskBtn'),
  topActions: $('topActions'),
  featurePanel: $('featurePanel'),
  featurePanelTitle: $('featurePanelTitle'),
  featurePanelBody: $('featurePanelBody'),
  featurePanelClose: $('featurePanelClose'),
  categoryFilters: $('categoryFilters'),
  realmFilters: $('realmFilters'),
  logTodayFocus: $('logTodayFocus'),
  logTodayLevel: $('logTodayLevel'),
  logTotalStones: $('logTotalStones'),
  logTodayDone: $('logTodayDone'),
  logHistory: $('logHistory'),
  modalOverlay: $('modalOverlay'),
  modalTitle: $('modalTitle'),
  modalClose: $('modalClose'),
  modalCancel: $('modalCancel'),
  modalSubmit: $('modalSubmit'),
  taskInput: $('taskInput'),
  bindTypeSelect: $('bindTypeSelect'),
  customMinutesWrap: $('customMinutesWrap'),
  customMinutesInput: $('customMinutesInput'),
  taskMenu: $('taskMenu'),
  menuEditBtn: $('menuEditBtn'),
  menuDeleteBtn: $('menuDeleteBtn'),
  pomoPhase: $('pomoPhase'),
  pomoTimer: $('pomoTimer'),
  pomoInfo: $('pomoInfo'),
  pomoStartBtn: $('pomoStartBtn'),
  pomoResetBtn: $('pomoResetBtn'),
  floatingPomoMinutesInput: $('floatingPomoMinutesInput'),
  floatingPomoApplyBtn: $('floatingPomoApplyBtn'),
  toast: $('toast'),
  particles: $('particles')
};

const DB_NAME = 'hanli_xiuxian_db';
const DB_VERSION = 1;
const DB_STORE = 'kv';
const DB_KEY = 'app_state';
const FALLBACK_STORAGE_KEY = 'hanli_xiuxian_idle_v3_fallback';
const DEFAULT_FOCUS_MINUTES = 25;
const MIN_FOCUS_MINUTES = 10;
const MAX_FOCUS_MINUTES = 60;
const MAX_CUSTOM_BIND_MINUTES = 600;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_BUFF_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const LONG_PRESS_DURATION_MS = 520;

let state = {
  tasks: [],
  stones: 0,
  tokens: 0,
  badges: {},
  logs: {},
  lastSettleDate: '',
  focusMinutes: DEFAULT_FOCUS_MINUTES,
  reminderSound: 'sword',
  chanceReminder: true,
  chance: {
    shijinFragment: 0,
    changchunFragment: 0,
    shijinUnlocked: false,
    changchunUnlocked: false,
    silverMoonUntil: 0,
    silverMoonOwned: false,
    rewardBoostUntil: 0,
    rewardBoostOwned: false,
    doubleFocusUntil: 0,
    doubleFocusOwned: false,
    levelBoostDate: ''
  },
  records: {
    chance: [],
    badge: [],
    treasury: []
  },
  pomodoro: {
    secondsLeft: DEFAULT_FOCUS_MINUTES * 60,
    running: false
  },
  filters: {
    category: 'all',
    realm: 'all'
  },
  ui: {
    activePanel: ''
  },
  editingId: null,
  menuTaskId: null
};

let timer = null;
let toastTimer = null;
let longPressTimer = null;
let dbPromise = null;

function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStrValue, days) {
  const d = new Date(`${dateStrValue}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

function ensureLog(dateKey) {
  if (!state.logs[dateKey]) {
    state.logs[dateKey] = { minutes: 0, settled: false, settledBonus: 0 };
  }
  return state.logs[dateKey];
}

function getFocusLevelByMinutes(minutes, dateKey) {
  let idx = 0;
  if (minutes >= 121) idx = 3;
  else if (minutes >= 61) idx = 2;
  else if (minutes >= 31) idx = 1;
  if (state.chance.levelBoostDate === dateKey) idx = Math.min(3, idx + 1);
  return FOCUS_LEVELS[idx];
}

function hasBadge(key) {
  return !!state.badges[key];
}

function getTokenCost() {
  return hasBadge('yuanying') ? 80 : 100;
}

function isBuffActive(until) {
  if (typeof until !== 'number') return false;
  const now = Date.now();
  const maxFuture = now + MAX_BUFF_DURATION_MS;
  return until > now && until <= maxFuture;
}

function rewardMultiplier() {
  return isBuffActive(state.chance.rewardBoostUntil) ? 1.2 : 1;
}

function applyStoneReward(base) {
  const reward = Math.floor(base * rewardMultiplier());
  state.stones += reward;
  return reward;
}

function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2500);
}

function playSound(type) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  if (type === 'talisman') {
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
  } else {
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.35);
  }
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.start(now);
  osc.stop(now + 0.5);
  osc.onended = () => ctx.close();
}

function settleDayIfNeeded() {
  const today = todayStr();
  if (!state.lastSettleDate) {
    state.lastSettleDate = today;
    ensureLog(today);
    return;
  }
  let cursorDate = new Date(`${state.lastSettleDate}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  while (cursorDate < todayDate) {
    const cursor = todayStr(cursorDate);
    const log = ensureLog(cursor);
    if (!log.settled) {
      const level = getFocusLevelByMinutes(log.minutes, cursor);
      let bonus = level.bonus;
      if (hasBadge('jindan')) bonus += 10;
      log.settled = true;
      log.settledBonus = bonus;
      state.stones += bonus;
    }
    cursorDate.setDate(cursorDate.getDate() + 1);
    ensureLog(todayStr(cursorDate));
  }
  state.lastSettleDate = today;
}

function getTodayLog() {
  settleDayIfNeeded();
  return ensureLog(todayStr());
}

function getTodayFocusMinutes() {
  return getTodayLog().minutes;
}

function addFocusMinutes(minutes) {
  const log = getTodayLog();
  log.minutes += minutes;
}

function getTaskRealm(task) {
  if (!task.bindMinutes) return 'fanren';
  if (task.bindMinutes <= 30) return 'lianqi';
  if (task.bindMinutes <= 60) return 'zhuji';
  if (task.bindMinutes <= 120) return 'jindan';
  return 'yuanying';
}

function realmText(realm) {
  if (realm === 'fanren') return '凡人';
  if (realm === 'lianqi') return '炼气';
  if (realm === 'zhuji') return '筑基';
  if (realm === 'jindan') return '金丹';
  return '元婴+';
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusText(status) {
  if (status === 'doing') return '进行中';
  if (status === 'done') return '已完成';
  return '未完成';
}

function bindingText(task) {
  if (!task.bindMinutes) return '不绑定番茄钟';
  const left = Math.max(0, task.bindMinutes - task.progressMinutes);
  return `绑定 ${task.bindMinutes} 分钟（已修炼 ${task.progressMinutes}，剩余 ${left}）`;
}

function formatSeconds(value) {
  const sec = Math.max(0, Math.floor(value));
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function getFilteredTasks() {
  return state.tasks.filter(task => {
    const catOk = state.filters.category === 'all' || task.status === state.filters.category;
    const realmOk = state.filters.realm === 'all' || getTaskRealm(task) === state.filters.realm;
    return catOk && realmOk;
  });
}

function renderTasks() {
  dom.taskList.innerHTML = '';
  const list = getFilteredTasks();
  dom.emptyState.hidden = list.length > 0;
  list.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card status-${task.status}`;
    card.dataset.id = task.id;
    card.innerHTML = `
      <div class="task-check">${task.status === 'done' ? '✓' : task.status === 'doing' ? '◉' : '○'}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="realm-tag">${statusText(task.status)}</span>
          <span class="grade-tag">${realmText(getTaskRealm(task))}</span>
          <span class="grade-tag">${bindingText(task)}</span>
        </div>
      </div>
    `;
    dom.taskList.appendChild(card);
  });
}

function renderLogs() {
  const today = todayStr();
  const todayMinutes = getTodayFocusMinutes();
  const level = getFocusLevelByMinutes(todayMinutes, today);
  const todayDone = state.tasks.filter(t => t.status === 'done' && t.completedDate === today).length;

  dom.logTodayFocus.textContent = `${todayMinutes} 分钟`;
  dom.logTodayLevel.textContent = level.name;
  dom.logTotalStones.textContent = String(state.stones);
  dom.logTodayDone.textContent = String(todayDone);

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(today, -i);
    days.push({ date: d, minutes: state.logs[d]?.minutes || 0 });
  }
  dom.logHistory.innerHTML = days
    .map(item => `<div>${item.date} · ${item.minutes} 分钟</div>`)
    .join('');
}

function panelChanceHtml() {
  const buffs = [];
  if (isBuffActive(state.chance.silverMoonUntil)) buffs.push('银月器灵显化');
  if (isBuffActive(state.chance.rewardBoostUntil)) buffs.push('青竹蜂云剑 +20% 灵石');
  if (isBuffActive(state.chance.doubleFocusUntil)) buffs.push('掌天瓶专注时长翻倍');
  if (state.chance.levelBoostDate === todayStr()) buffs.push('青元剑诀：今日专注等级+1');
  return `
    <div class="feature-stack">
      <p>当前机缘令牌：<strong>${state.tokens}</strong></p>
      <button class="pomodoro-btn primary" data-action="trigger-chance">消耗 1 枚令牌触发机缘</button>
      <p class="small-text">当前加成：${buffs.length ? buffs.join(' ｜ ') : '暂无'}</p>
    </div>
  `;
}

function badgeCardHtml(badge) {
  const unlocked = hasBadge(badge.key);
  return `
    <div class="codex-item ${unlocked ? 'unlocked' : 'locked'}" data-badge="${badge.key}">
      <h5>${badge.name}</h5>
      <p class="small-text">${badge.effect}</p>
      <p class="small-text">${unlocked ? '已解锁' : `解锁条件：${badge.cost} 灵石`}</p>
      <button class="pomodoro-btn" data-action="buy-badge" data-key="${badge.key}" ${unlocked ? 'disabled' : ''}>${unlocked ? '已解锁' : '兑换'}</button>
    </div>
  `;
}

function panelTreasuryHtml() {
  const artifactsHtml = ARTIFACTS.map(a => {
    const unlocked =
      (a.key === 'qingzhu' && state.chance.rewardBoostOwned) ||
      (a.key === 'zhangtian' && state.chance.doubleFocusOwned) ||
      (a.key === 'fenglei' && false);
    return `
      <div class="codex-item ${unlocked ? 'unlocked' : 'locked'}">
        <h5>${a.name}</h5>
        <p class="small-text">${a.desc}</p>
        <p class="small-text">${unlocked ? '已激活/已获得' : `未解锁：${a.unlock}`}</p>
      </div>
    `;
  }).join('');

  const beastsHtml = SPIRIT_BEASTS.map(b => {
    const unlocked =
      (b.key === 'shijin' && state.chance.shijinUnlocked) ||
      (b.key === 'yinyue' && state.chance.silverMoonOwned);
    return `
      <div class="codex-item ${unlocked ? 'unlocked' : 'locked'}">
        <h5>${b.name}</h5>
        <p class="small-text">${b.desc}</p>
        <p class="small-text">${unlocked ? '已解锁，可查看专属 buff' : `未解锁：${b.unlock}`}</p>
      </div>
    `;
  }).join('');

  return `
    <div class="codex-layout">
      <section>
        <h4>徽章图鉴</h4>
        <div class="codex-grid">${BADGES.map(badgeCardHtml).join('')}</div>
      </section>
      <section>
        <h4>法宝图鉴</h4>
        <div class="codex-grid">${artifactsHtml}</div>
      </section>
      <section>
        <h4>灵兽图鉴</h4>
        <div class="codex-grid">${beastsHtml}</div>
      </section>
      <section>
        <h4>令牌兑换区</h4>
        <div class="feature-stack">
          <p>当前令牌：<strong>${state.tokens}</strong></p>
          <p class="small-text">兑换价格：${getTokenCost()} 灵石 / 枚</p>
          <button class="pomodoro-btn primary" data-action="exchange-token">兑换 1 枚机缘令牌</button>
        </div>
      </section>
    </div>
  `;
}

function panelBadgeHtml() {
  return `<div class="codex-grid">${BADGES.map(badgeCardHtml).join('')}</div>`;
}

function renderFeaturePanel() {
  const type = state.ui.activePanel;
  if (!type) {
    dom.featurePanel.hidden = true;
    return;
  }
  dom.featurePanel.hidden = false;
  if (type === 'chance') {
    dom.featurePanelTitle.textContent = '机缘触发';
    dom.featurePanelBody.innerHTML = panelChanceHtml();
  } else if (type === 'treasury') {
    dom.featurePanelTitle.textContent = '修仙宝库图鉴';
    dom.featurePanelBody.innerHTML = panelTreasuryHtml();
  } else {
    dom.featurePanelTitle.textContent = '徽章系统';
    dom.featurePanelBody.innerHTML = panelBadgeHtml();
  }
}

function renderTopButtons() {
  dom.topActions.querySelectorAll('.top-action-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === state.ui.activePanel);
  });
}

function renderSidebarFilters() {
  dom.categoryFilters.querySelectorAll('[data-category]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === state.filters.category);
  });
  dom.realmFilters.querySelectorAll('[data-realm]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.realm === state.filters.realm);
  });
}

function renderPomodoro() {
  const total = state.focusMinutes * 60;
  const left = state.pomodoro.secondsLeft;
  const current = Math.floor((total - left) / 60);
  const remain = Math.ceil(left / 60);
  dom.pomoPhase.textContent = isBuffActive(state.chance.silverMoonUntil) ? '银月护法·专注修炼' : '专注修炼';
  dom.pomoTimer.textContent = formatSeconds(left);
  dom.pomoInfo.textContent = `当前 ${Math.max(0, current)} / 剩余 ${Math.max(0, remain)} 分钟`;
  dom.pomoStartBtn.textContent = state.pomodoro.running ? '暂停' : '开始';
  dom.floatingPomoMinutesInput.value = state.focusMinutes;
}

function renderAll() {
  settleDayIfNeeded();
  renderLogs();
  renderSidebarFilters();
  renderTasks();
  renderTopButtons();
  renderFeaturePanel();
  renderPomodoro();
}

function record(type, payload) {
  state.records[type].push({ at: Date.now(), ...payload });
  if (state.records[type].length > 200) {
    state.records[type] = state.records[type].slice(-200);
  }
}

function getDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('indexeddb_unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('db_open_failed'));
  });
  return dbPromise;
}

async function save() {
  try {
    const db = await getDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(state, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('db_write_failed'));
    });
  } catch (_) {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(state));
  }
}

async function load() {
  let saved = null;
  try {
    const db = await getDb();
    saved = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('db_read_failed'));
    });
  } catch (_) {
    try {
      const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
  }

  if (saved) {
    state = {
      ...state,
      ...saved,
      chance: { ...state.chance, ...(saved.chance || {}) },
      records: {
        chance: saved.records?.chance || [],
        badge: saved.records?.badge || [],
        treasury: saved.records?.treasury || []
      },
      pomodoro: { ...state.pomodoro, ...(saved.pomodoro || {}) },
      filters: { ...state.filters, ...(saved.filters || {}) },
      ui: { activePanel: '' }
    };
  }

  state.pomodoro.running = false;
  state.pomodoro.secondsLeft = Math.min(state.focusMinutes * 60, Math.max(0, state.pomodoro.secondsLeft || state.focusMinutes * 60));
}

async function saveAndRender() {
  await save();
  renderAll();
}

function openModal(taskId = null) {
  state.editingId = taskId;
  const task = taskId ? state.tasks.find(t => t.id === taskId) : null;
  dom.modalTitle.textContent = task ? '编辑历练任务' : '新增历练任务';
  dom.taskInput.value = task?.title || '';
  if (task?.bindMinutes) {
    dom.bindTypeSelect.value = task.bindMinutes === state.focusMinutes ? 'one' : 'custom';
    dom.customMinutesInput.value = task.bindMinutes;
    dom.customMinutesWrap.hidden = dom.bindTypeSelect.value !== 'custom';
  } else {
    dom.bindTypeSelect.value = 'none';
    dom.customMinutesWrap.hidden = true;
  }
  dom.modalOverlay.hidden = false;
  dom.taskInput.focus();
}

function closeModal() {
  dom.modalOverlay.hidden = true;
  state.editingId = null;
}

function getBindMinutesBySelection() {
  if (dom.bindTypeSelect.value === 'none') return 0;
  if (dom.bindTypeSelect.value === 'one') return state.focusMinutes;
  const custom = Number(dom.customMinutesInput.value || 0);
  return Math.min(MAX_CUSTOM_BIND_MINUTES, Math.max(MIN_FOCUS_MINUTES, custom));
}

async function submitTask() {
  const title = dom.taskInput.value.trim();
  if (!title) return showToast('请输入任务名称');
  const bindMinutes = getBindMinutesBySelection();
  if (state.editingId) {
    const task = state.tasks.find(t => t.id === state.editingId);
    if (!task) return;
    task.title = title;
    task.bindMinutes = bindMinutes;
    task.progressMinutes = bindMinutes ? Math.min(task.progressMinutes, bindMinutes) : 0;
  } else {
    state.tasks.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title,
      status: 'todo',
      bindMinutes,
      progressMinutes: 0,
      completedDate: '',
      createdAt: Date.now()
    });
  }
  closeModal();
  showToast('历练任务已保存');
  await saveAndRender();
}

function canComplete(task) {
  return !task.bindMinutes || task.progressMinutes >= task.bindMinutes;
}

function nextStatus(task) {
  if (task.status === 'todo') return 'doing';
  if (task.status === 'doing') return 'done';
  return 'todo';
}

async function cycleTaskStatus(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const target = nextStatus(task);
  if (target === 'done' && !canComplete(task)) {
    return showToast('该任务绑定番茄钟，需完成专注时长后才可完成');
  }
  task.status = target;
  if (target === 'done') {
    task.completedDate = todayStr();
    const base = task.bindMinutes ? 10 : 5;
    const reward = applyStoneReward(base + (hasBadge('zhuji') ? 2 : 0));
    showToast(`历练成功，灵石 +${reward}`);
  }
  if (target === 'todo') {
    task.completedDate = '';
    task.progressMinutes = 0;
  }
  if (target === 'doing') task.completedDate = '';
  await saveAndRender();
}

function startLongPress(taskId, x, y) {
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    state.menuTaskId = taskId;
    dom.taskMenu.style.left = `${x}px`;
    dom.taskMenu.style.top = `${y}px`;
    dom.taskMenu.hidden = false;
  }, LONG_PRESS_DURATION_MS);
}

function stopLongPress() {
  clearTimeout(longPressTimer);
}

function hideTaskMenu() {
  dom.taskMenu.hidden = true;
  state.menuTaskId = null;
}

function tickPomodoro() {
  if (!state.pomodoro.running) return;
  state.pomodoro.secondsLeft -= 1;
  if (state.pomodoro.secondsLeft <= 0) {
    completePomodoro();
    return;
  }
  renderPomodoro();
}

async function completePomodoro() {
  state.pomodoro.running = false;
  clearInterval(timer);
  timer = null;

  const session = state.focusMinutes;
  const focusGain = isBuffActive(state.chance.doubleFocusUntil) ? session * 2 : session;
  addFocusMinutes(focusGain);

  const pomoReward = applyStoneReward(5 + (hasBadge('lianqi') ? 1 : 0));
  let linkedReward = 0;
  const doingBindTask = state.tasks.find(t => t.status === 'doing' && t.bindMinutes && t.progressMinutes < t.bindMinutes);
  if (doingBindTask) {
    doingBindTask.progressMinutes = Math.min(doingBindTask.bindMinutes, doingBindTask.progressMinutes + session);
    linkedReward = applyStoneReward(5);
  }

  state.pomodoro.secondsLeft = state.focusMinutes * 60;
  playSound(state.reminderSound);
  showToast(`闭关完成！番茄钟 +${pomoReward}${linkedReward ? `，绑定奖励 +${linkedReward}` : ''}`);
  await saveAndRender();
}

async function togglePomodoro() {
  if (state.pomodoro.running) {
    state.pomodoro.running = false;
    clearInterval(timer);
    timer = null;
    return saveAndRender();
  }
  state.pomodoro.running = true;
  timer = setInterval(tickPomodoro, 1000);
  await saveAndRender();
}

async function resetPomodoro() {
  state.pomodoro.running = false;
  clearInterval(timer);
  timer = null;
  state.pomodoro.secondsLeft = state.focusMinutes * 60;
  await saveAndRender();
}

async function applyPomodoroMinutes() {
  const val = Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, Number(dom.floatingPomoMinutesInput.value || DEFAULT_FOCUS_MINUTES)));
  state.focusMinutes = val;
  if (!state.pomodoro.running) state.pomodoro.secondsLeft = val * 60;
  showToast(state.pomodoro.running ? '番茄钟时长已更新，将在下次开始时生效' : '番茄钟时长已更新并生效');
  await saveAndRender();
}

async function exchangeToken() {
  const cost = getTokenCost();
  if (state.stones < cost) return showToast('灵石不足，无法兑换机缘令牌');
  state.stones -= cost;
  state.tokens += 1;
  record('treasury', { action: 'exchange-token', cost, amount: 1 });
  showToast('兑换成功，获得 1 枚机缘令牌');
  await saveAndRender();
}

async function triggerChance() {
  if (state.tokens <= 0) return showToast('机缘令牌不足');
  state.tokens -= 1;
  const now = Date.now();
  const pool = [
    () => {
      state.chance.shijinFragment += 1;
      state.chance.shijinFragment = Math.min(3, state.chance.shijinFragment);
      if (state.chance.shijinFragment >= 3) state.chance.shijinUnlocked = true;
      return `获得噬金虫幼虫碎片 x1（${state.chance.shijinFragment}/3）`;
    },
    () => {
      state.chance.silverMoonUntil = now + DAY_MS;
      state.chance.silverMoonOwned = true;
      return '银月器灵体验卡生效 24 小时';
    },
    () => {
      state.chance.rewardBoostUntil = now + DAY_MS;
      state.chance.rewardBoostOwned = true;
      return '青竹蜂云剑体验卡生效 24 小时（灵石 +20%）';
    },
    () => {
      state.chance.doubleFocusUntil = now + HOUR_MS;
      state.chance.doubleFocusOwned = true;
      return '掌天瓶 buff 生效 1 小时（专注时长翻倍）';
    },
    () => {
      state.chance.changchunFragment += 1;
      state.chance.changchunFragment = Math.min(5, state.chance.changchunFragment);
      if (state.chance.changchunFragment >= 5) state.chance.changchunUnlocked = true;
      return `获得长春功碎片 x1（${state.chance.changchunFragment}/5）`;
    },
    () => {
      state.chance.levelBoostDate = todayStr();
      return '青元剑诀体验卡：当日专注等级 +1';
    }
  ];
  const result = pool[Math.floor(Math.random() * pool.length)]();
  record('chance', { action: 'trigger', result });
  if (state.chanceReminder) showToast(`机缘触发：${result}`);
  await saveAndRender();
}

async function purchaseBadge(key) {
  const badge = BADGES.find(b => b.key === key);
  if (!badge || state.badges[key]) return;
  if (state.stones < badge.cost) return showToast('灵石不足，无法兑换该徽章');
  state.stones -= badge.cost;
  state.badges[key] = true;
  record('badge', { action: 'unlock', key, cost: badge.cost });
  showToast(`兑换成功：${badge.name}`);
  await saveAndRender();
}

async function toggleFeaturePanel(type) {
  state.ui.activePanel = state.ui.activePanel === type ? '' : type;
  await saveAndRender();
}

function initEvents() {
  dom.addTaskBtn.addEventListener('click', () => openModal());
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSubmit.addEventListener('click', submitTask);
  dom.modalOverlay.addEventListener('click', e => { if (e.target === dom.modalOverlay) closeModal(); });
  dom.taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitTask(); });
  dom.bindTypeSelect.addEventListener('change', () => {
    dom.customMinutesWrap.hidden = dom.bindTypeSelect.value !== 'custom';
  });

  dom.topActions.addEventListener('click', e => {
    const btn = e.target.closest('.top-action-btn');
    if (!btn) return;
    toggleFeaturePanel(btn.dataset.panel);
  });
  dom.featurePanelClose.addEventListener('click', () => {
    state.ui.activePanel = '';
    renderAll();
  });

  dom.featurePanelBody.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'trigger-chance') triggerChance();
    if (action === 'exchange-token') exchangeToken();
    if (action === 'buy-badge') purchaseBadge(e.target.dataset.key);
  });

  dom.categoryFilters.addEventListener('click', async e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    state.filters.category = btn.dataset.category;
    await saveAndRender();
  });

  dom.realmFilters.addEventListener('click', async e => {
    const btn = e.target.closest('[data-realm]');
    if (!btn) return;
    state.filters.realm = btn.dataset.realm;
    await saveAndRender();
  });

  dom.taskList.addEventListener('click', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    if (!dom.taskMenu.hidden) return hideTaskMenu();
    cycleTaskStatus(card.dataset.id);
  });

  dom.taskList.addEventListener('mousedown', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    startLongPress(card.dataset.id, e.pageX, e.pageY);
  });
  dom.taskList.addEventListener('mouseup', stopLongPress);
  dom.taskList.addEventListener('mouseleave', stopLongPress);

  dom.taskList.addEventListener('touchstart', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const t = e.touches[0];
    startLongPress(card.dataset.id, t.pageX, t.pageY);
  }, { passive: true });
  dom.taskList.addEventListener('touchend', stopLongPress);

  document.addEventListener('click', e => {
    if (!dom.taskMenu.hidden && !dom.taskMenu.contains(e.target)) hideTaskMenu();
  });

  dom.menuEditBtn.addEventListener('click', () => {
    if (!state.menuTaskId) return;
    hideTaskMenu();
    openModal(state.menuTaskId);
  });

  dom.menuDeleteBtn.addEventListener('click', async () => {
    if (!state.menuTaskId) return;
    state.tasks = state.tasks.filter(t => t.id !== state.menuTaskId);
    hideTaskMenu();
    showToast('任务已删除');
    await saveAndRender();
  });

  dom.pomoStartBtn.addEventListener('click', togglePomodoro);
  dom.pomoResetBtn.addEventListener('click', resetPomodoro);
  dom.floatingPomoApplyBtn.addEventListener('click', applyPomodoroMinutes);
}

function initParticles() {
  for (let i = 0; i < 16; i += 1) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 3;
    p.style.cssText = `
      width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${40 + Math.random() * 55}%;
      background:rgba(212,184,135,0.6);box-shadow:0 0 ${size * 3}px rgba(212,184,135,0.6);
      --dur:${6 + Math.random() * 10}s;--delay:${Math.random() * 8}s;
    `;
    dom.particles.appendChild(p);
  }
}

async function init() {
  await load();
  settleDayIfNeeded();
  ensureLog(todayStr());
  initParticles();
  initEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
