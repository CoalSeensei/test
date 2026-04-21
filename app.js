'use strict';

const QUOTES = [
  '低调发育，苟道永恒。',
  '小命要紧，机缘不强求。',
  '一步一印，慢就是快。',
  '修仙之道，步步为营，切勿急于求成。',
  '宁可错过千次机缘，不可死于一次莽撞。',
  '高筑墙，广积粮，缓称王。'
];

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

const TIMELINE = [
  '【凡人/炼气】01 七玄门 + 墨大夫阴谋｜长春功、青元剑诀残篇',
  '【炼气】02 越国血色禁地试炼｜墨蛟精血、筑基丹材料',
  '【炼气→筑基】03 黄枫谷逃亡荒谷｜掌天瓶残片（小绿瓶）',
  '【筑基】04 落魂山荒野｜噬金虫幼虫',
  '【筑基】05 嘉元城交易冲突｜符宝、阵法基础',
  '【金丹】06 乱星海虚天殿｜九曲灵参、乾蓝冰焰、金阙玉书',
  '【金丹】07 乱星海风希线｜风雷翅图谱',
  '【金丹】08 辛如音托付｜颠倒五行阵、传送阵修复',
  '【元婴】09 坠魔谷｜银月器灵、噬金虫进阶资源',
  '【元婴】10 昆吾山｜封魂咒解药、玄牡化婴大法',
  '【元婴】11 大晋秘境｜阴阳轮回丹、化神资源',
  '【化神】12 人界大战收尾｜完整化神功法、飞升线索',
  '【化神】13 飞升灵界｜灵界基础功法、人族庇护',
  '【炼虚】14 魔金山脉｜玄天斩灵剑碎片',
  '【合体】15 灵界上古秘境｜真灵传承、炼体功法',
  '【大乘】16 积鳞空境｜大乘突破资源、天煞镇狱功',
  '【大乘】17 灵界天劫｜飞升资格、仙基稳固',
  '【真仙】18 北寒仙域｜基础仙法、低级仙材',
  '【金仙】19 掌天瓶觉醒｜时间法则本源',
  '【太乙】20 轮回殿秘境｜轮回法则感悟',
  '【大罗】21 黑土仙域秘境｜道祖级法则本源',
  '【道祖】22 终极秘境诸天战｜成就时间道祖'
];

const $ = id => document.getElementById(id);
const dom = {
  taskList: $('taskList'),
  emptyState: $('emptyState'),
  spiritNum: $('spiritNum'),
  tokenNum: $('tokenNum'),
  activeBuffText: $('activeBuffText'),
  highestBadge: $('highestBadge'),
  focusLevel: $('focusLevel'),
  focusBar: $('focusBar'),
  focusMinutesToday: $('focusMinutesToday'),
  addTaskBtn: $('addTaskBtn'),
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
  settingsBtn: $('settingsBtn'),
  settingsPanel: $('settingsPanel'),
  pomoMinutesInput: $('pomoMinutesInput'),
  pomoSoundSelect: $('pomoSoundSelect'),
  toggleChanceReminder: $('toggleChanceReminder'),
  pomoPhase: $('pomoPhase'),
  pomoTimer: $('pomoTimer'),
  pomoInfo: $('pomoInfo'),
  pomoStartBtn: $('pomoStartBtn'),
  pomoResetBtn: $('pomoResetBtn'),
  exchangeTokenBtn: $('exchangeTokenBtn'),
  triggerChanceBtn: $('triggerChanceBtn'),
  badgePanel: $('badgePanel'),
  logPanel: $('logPanel'),
  timelineList: $('timelineList'),
  quoteText: $('quoteText'),
  quoteBtn: $('quoteBtn'),
  toast: $('toast'),
  particles: $('particles')
};

const STORAGE_KEY = 'hanli_xiuxian_idle_v2';
const MIN_FOCUS_MINUTES = 10;
const MAX_FOCUS_MINUTES = 60;
const MAX_CUSTOM_BIND_MINUTES = 600;
const PROGRESS_BAR_CAP_MINUTES = 120;
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
  focusMinutes: 25,
  reminderSound: 'sword',
  chanceReminder: true,
  chance: {
    shijinFragment: 0,
    changchunFragment: 0,
    shijinUnlocked: false,
    changchunUnlocked: false,
    silverMoonUntil: 0,
    rewardBoostUntil: 0,
    doubleFocusUntil: 0,
    levelBoostDate: ''
  },
  quoteIndex: 0,
  bg: 'tiannan',
  pomodoro: {
    secondsLeft: 25 * 60,
    running: false
  },
  editingId: null,
  menuTaskId: null
};

let timer = null;
let toastTimer = null;
let longPressTimer = null;

function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStrValue, days) {
  const d = new Date(dateStrValue + 'T00:00:00');
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

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state = {
      ...state,
      ...saved,
      chance: { ...state.chance, ...(saved.chance || {}) },
      pomodoro: { ...state.pomodoro, ...(saved.pomodoro || {}) }
    };
  } catch (_) {}
  state.pomodoro.running = false;
  state.pomodoro.secondsLeft = Math.min(state.focusMinutes * 60, Math.max(0, state.pomodoro.secondsLeft || state.focusMinutes * 60));
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
  let cursorDate = new Date(state.lastSettleDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
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

function getWeekFocusMinutes() {
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(todayStr(), -i);
    total += (state.logs[d]?.minutes || 0);
  }
  return total;
}

function addFocusMinutes(minutes) {
  const log = getTodayLog();
  log.minutes += minutes;
}

function getHighestBadge() {
  const order = BADGES.map(b => b.key);
  for (let i = order.length - 1; i >= 0; i -= 1) {
    if (hasBadge(order[i])) return BADGES.find(b => b.key === order[i]);
  }
  return null;
}

function renderHeader() {
  const minutes = getTodayFocusMinutes();
  const level = getFocusLevelByMinutes(minutes, todayStr());
  dom.focusLevel.textContent = level.name;
  dom.focusMinutesToday.textContent = `当日专注 ${minutes} 分钟`;
  dom.focusBar.style.width = `${Math.min(100, Math.round((minutes / PROGRESS_BAR_CAP_MINUTES) * 100))}%`;
  dom.spiritNum.textContent = state.stones;
  dom.tokenNum.textContent = state.tokens;
  const highest = getHighestBadge();
  dom.highestBadge.textContent = highest ? highest.name : '无徽章';
}

function bindingText(task) {
  if (!task.bindMinutes) return '不绑定番茄钟';
  const left = Math.max(0, task.bindMinutes - task.progressMinutes);
  return `绑定 ${task.bindMinutes} 分钟（已修炼 ${task.progressMinutes}，剩余 ${left}）`;
}

function statusText(status) {
  if (status === 'doing') return '进行中';
  if (status === 'done') return '已完成';
  return '未完成';
}

function renderTasks() {
  dom.taskList.innerHTML = '';
  dom.emptyState.hidden = state.tasks.length > 0;
  state.tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card status-${task.status}`;
    card.dataset.id = task.id;
    card.innerHTML = `
      <div class="task-check">${task.status === 'done' ? '✓' : task.status === 'doing' ? '◉' : '○'}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="realm-tag">${statusText(task.status)}</span>
          <span class="grade-tag">${bindingText(task)}</span>
        </div>
      </div>
    `;
    dom.taskList.appendChild(card);
  });
}

function renderLogs() {
  const today = getTodayFocusMinutes();
  const week = getWeekFocusMinutes();
  const keys = Object.keys(state.logs).sort((a, b) => b.localeCompare(a)).slice(0, 7);
  dom.logPanel.innerHTML = `
    <p>今日专注：${today} 分钟</p>
    <p>本周专注：${week} 分钟</p>
    <div class="log-history">${keys.map(k => `<div>${k} · ${state.logs[k].minutes} 分钟</div>`).join('')}</div>
  `;
}

function renderBuffs() {
  const buffs = [];
  if (isBuffActive(state.chance.silverMoonUntil)) buffs.push('银月器灵显化');
  if (isBuffActive(state.chance.rewardBoostUntil)) buffs.push('青竹蜂云剑 +20%灵石');
  if (isBuffActive(state.chance.doubleFocusUntil)) buffs.push('掌天瓶专注时长翻倍');
  if (state.chance.levelBoostDate === todayStr()) buffs.push('青元剑诀：今日专注等级+1');
  if (state.chance.shijinUnlocked) buffs.push('噬金虫陪伴已解锁');
  if (state.chance.changchunUnlocked) buffs.push('长春功徽章已解锁');
  dom.activeBuffText.textContent = buffs.length ? buffs.join(' ｜ ') : '当前无机缘 buff';
}

function renderBadges() {
  dom.badgePanel.innerHTML = BADGES.map(b => {
    const unlocked = hasBadge(b.key);
    return `<div class="badge-item ${unlocked ? 'unlocked' : ''}" data-key="${b.key}">
      <div>${b.name}（${b.cost} 灵石）</div>
      <div class="small-text">${b.effect}</div>
      <button class="pomodoro-btn" ${unlocked ? 'disabled' : ''}>${unlocked ? '已解锁' : '兑换'}</button>
    </div>`;
  }).join('');
}

function renderSettings() {
  dom.pomoMinutesInput.value = state.focusMinutes;
  dom.pomoSoundSelect.value = state.reminderSound;
  dom.toggleChanceReminder.textContent = state.chanceReminder ? '已开启' : '已关闭';
  document.body.dataset.bg = state.bg;
  document.querySelectorAll('.bg-opt').forEach(b => b.classList.toggle('active', b.dataset.bg === state.bg));
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
}

function renderTimeline() {
  dom.timelineList.innerHTML = TIMELINE.map((line, i) => `<div class="timeline-item"><span>${String(i + 1).padStart(2, '0')}</span><p>${line}</p></div>`).join('');
}

function renderAll() {
  settleDayIfNeeded();
  renderHeader();
  renderTasks();
  renderLogs();
  renderBuffs();
  renderBadges();
  renderSettings();
  renderPomodoro();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSeconds(value) {
  const sec = Math.max(0, Math.floor(value));
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function saveAndRender() {
  save();
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

function submitTask() {
  const title = dom.taskInput.value.trim();
  if (!title) return showToast('请输入任务名称');
  const bindMinutes = getBindMinutesBySelection();
  if (state.editingId) {
    const task = state.tasks.find(t => t.id === state.editingId);
    if (!task) return;
    task.title = title;
    task.bindMinutes = bindMinutes;
    task.progressMinutes = Math.min(task.progressMinutes, bindMinutes || task.progressMinutes);
  } else {
    state.tasks.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title,
      status: 'todo',
      bindMinutes,
      progressMinutes: 0,
      createdAt: Date.now()
    });
  }
  closeModal();
  showToast('历练任务已保存');
  saveAndRender();
}

function canComplete(task) {
  return !task.bindMinutes || task.progressMinutes >= task.bindMinutes;
}

function nextStatus(task) {
  if (task.status === 'todo') return 'doing';
  if (task.status === 'doing') return 'done';
  return 'todo';
}

function cycleTaskStatus(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const target = nextStatus(task);
  if (target === 'done' && !canComplete(task)) {
    return showToast('该任务绑定番茄钟，需完成专注时长后才可完成');
  }
  task.status = target;
  if (target === 'done') {
    const base = task.bindMinutes ? 10 : 5;
    const reward = applyStoneReward(base + (hasBadge('zhuji') ? 2 : 0));
    showToast(`历练成功，灵石 +${reward}`);
  }
  if (target === 'todo') task.progressMinutes = 0;
  saveAndRender();
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

function completePomodoro() {
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
  saveAndRender();
}

function togglePomodoro() {
  if (state.pomodoro.running) {
    state.pomodoro.running = false;
    clearInterval(timer);
    timer = null;
    return saveAndRender();
  }
  state.pomodoro.running = true;
  timer = setInterval(tickPomodoro, 1000);
  saveAndRender();
}

function resetPomodoro() {
  state.pomodoro.running = false;
  clearInterval(timer);
  timer = null;
  state.pomodoro.secondsLeft = state.focusMinutes * 60;
  saveAndRender();
}

function exchangeToken() {
  const cost = getTokenCost();
  if (state.stones < cost) return showToast('灵石不足，无法兑换机缘令牌');
  state.stones -= cost;
  state.tokens += 1;
  showToast('兑换成功，获得 1 枚机缘令牌');
  saveAndRender();
}

function triggerChance() {
  if (state.tokens <= 0) return showToast('机缘令牌不足');
  state.tokens -= 1;
  const now = Date.now();
  const pool = [
    () => {
      state.chance.shijinFragment += 1;
      if (state.chance.shijinFragment >= 3) state.chance.shijinUnlocked = true;
      return `获得噬金虫幼虫碎片 x1（${state.chance.shijinFragment}/3）`;
    },
    () => {
      state.chance.silverMoonUntil = now + DAY_MS;
      return '银月器灵体验卡生效 24 小时';
    },
    () => {
      state.chance.rewardBoostUntil = now + DAY_MS;
      return '青竹蜂云剑体验卡生效 24 小时（灵石 +20%）';
    },
    () => {
      state.chance.doubleFocusUntil = now + HOUR_MS;
      return '掌天瓶 buff 生效 1 小时（专注时长翻倍）';
    },
    () => {
      state.chance.changchunFragment += 1;
      if (state.chance.changchunFragment >= 5) state.chance.changchunUnlocked = true;
      return `获得长春功碎片 x1（${state.chance.changchunFragment}/5）`;
    },
    () => {
      state.chance.levelBoostDate = todayStr();
      return '青元剑诀体验卡：当日专注等级 +1';
    }
  ];
  const result = pool[Math.floor(Math.random() * pool.length)]();
  if (state.chanceReminder) showToast(`机缘触发：${result}`);
  saveAndRender();
}

function purchaseBadge(key) {
  const badge = BADGES.find(b => b.key === key);
  if (!badge || state.badges[key]) return;
  if (state.stones < badge.cost) return showToast('灵石不足，无法兑换该徽章');
  state.stones -= badge.cost;
  state.badges[key] = true;
  showToast(`兑换成功：${badge.name}`);
  saveAndRender();
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
  dom.menuDeleteBtn.addEventListener('click', () => {
    if (!state.menuTaskId) return;
    state.tasks = state.tasks.filter(t => t.id !== state.menuTaskId);
    hideTaskMenu();
    showToast('任务已删除');
    saveAndRender();
  });

  dom.settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    dom.settingsPanel.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!dom.settingsPanel.contains(e.target) && e.target !== dom.settingsBtn) {
      dom.settingsPanel.classList.remove('open');
    }
  });

  dom.pomoMinutesInput.addEventListener('change', () => {
    const val = Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, Number(dom.pomoMinutesInput.value || 25)));
    state.focusMinutes = val;
    if (!state.pomodoro.running) state.pomodoro.secondsLeft = val * 60;
    saveAndRender();
    showToast(state.pomodoro.running ? '番茄钟时长已更新，将在下次开始时生效' : '番茄钟时长已更新并生效');
  });

  dom.pomoSoundSelect.addEventListener('change', () => {
    state.reminderSound = dom.pomoSoundSelect.value;
    saveAndRender();
  });

  dom.toggleChanceReminder.addEventListener('click', () => {
    state.chanceReminder = !state.chanceReminder;
    saveAndRender();
  });

  document.querySelectorAll('.bg-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bg = btn.dataset.bg;
      saveAndRender();
    });
  });

  dom.pomoStartBtn.addEventListener('click', togglePomodoro);
  dom.pomoResetBtn.addEventListener('click', resetPomodoro);

  dom.exchangeTokenBtn.addEventListener('click', exchangeToken);
  dom.triggerChanceBtn.addEventListener('click', triggerChance);

  dom.badgePanel.addEventListener('click', e => {
    const item = e.target.closest('.badge-item');
    if (!item) return;
    if (e.target.tagName !== 'BUTTON') return;
    purchaseBadge(item.dataset.key);
  });

  dom.quoteBtn.addEventListener('click', () => {
    state.quoteIndex = (state.quoteIndex + 1) % QUOTES.length;
    dom.quoteText.textContent = QUOTES[state.quoteIndex];
    save();
  });
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

function init() {
  load();
  settleDayIfNeeded();
  ensureLog(todayStr());
  dom.quoteText.textContent = QUOTES[state.quoteIndex] || QUOTES[0];
  renderTimeline();
  initParticles();
  initEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
