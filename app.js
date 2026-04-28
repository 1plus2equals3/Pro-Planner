const firebaseConfig = {
    apiKey: "AIzaSyBZINWJcrTkMGZSBBQrWXqOt28GTjnu1oU",
    authDomain: "pro-planner-60e6b.firebaseapp.com",
    projectId: "pro-planner-60e6b",
    storageBucket: "pro-planner-60e6b.firebasestorage.app",
    messagingSenderId: "333738470107",
    appId: "1:333738470107:web:12c85823447903a758fafe",
    databaseURL: "https://pro-planner-60e6b-default-rtdb.firebaseio.com/"
};

const firebaseAvailable = typeof firebase !== 'undefined';
if (firebaseAvailable && !firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebaseAvailable ? firebase.auth() : null;
const db = firebaseAvailable ? firebase.database() : null;
const provider = firebaseAvailable ? new firebase.auth.GoogleAuthProvider() : null;
let currentUser = null;

function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function runConfetti(options) {
    if (typeof confetti === 'function') confetti(options);
}

function dateKeyFromLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDailyScore(dateStr) {
    const tasks = dailyData[dateStr] || [];
    if (tasks.length === 0) return null;
    let dailyPercent = 0;
    const weightPerTask = 100 / tasks.length;
    tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
            const doneSubtasks = task.subtasks.filter(st => st.done).length;
            dailyPercent += (doneSubtasks / task.subtasks.length) * weightPerTask;
        } else if (task.done) dailyPercent += weightPerTask;
    });
    return Math.round(dailyPercent);
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

if (auth) auth.onAuthStateChanged(async (user) => {
    const btn = document.getElementById('authBtnModal');
    const status = document.getElementById('syncStatus');
    if (user) {
        currentUser = user;
        if(btn) { btn.innerHTML = '🔓 Logout'; btn.style.background = 'var(--done-green)'; btn.style.color = '#000'; btn.style.borderColor = 'transparent'; }
        if(status) { status.innerText = `Synced as: ${user.email}`; status.style.color = 'var(--done-green)'; }
        await loadDataFromFirebase();
    } else {
        currentUser = null;
        if(btn) { btn.innerHTML = '🔒 Login with Google'; btn.style.background = 'rgba(255,255,255,0.1)'; btn.style.color = '#fff'; btn.style.borderColor = 'rgba(255,255,255,0.2)'; }
        if(status) { status.innerText = 'Sync is paused.'; status.style.color = 'inherit'; }
    }
});

function toggleAuth() {
    if (!auth || !provider) { alert("Cloud sync is unavailable offline. Your planner still works locally."); return; }
    if (window.location.protocol === 'file:') { alert("⚠️ Google Login 'file://' link par kaam nahi karta hai.\nUpload to Netlify/Vercel or use VS Code Live Server."); return; }
    if (currentUser) auth.signOut().then(() => alert("Logged out! Sync paused."));
    else auth.signInWithPopup(provider).catch(error => alert("LOGIN BLOCKED: " + error.message));
}

async function syncToFirebase() {
    if (!currentUser || !db) return; 
    try {
        const payload = {
            dailyData: JSON.stringify(dailyData), reports: JSON.stringify(reports),
            trackedExams: JSON.stringify(trackedExams), habits: JSON.stringify(habitBlueprint),
            settings: JSON.stringify(settings), monthGoals: localStorage.getItem('month') || '[]',
            yearGoals: localStorage.getItem('year') || '[]'
        };
        await db.ref('plannerUsers/' + currentUser.uid).set(payload);
    } catch (error) { console.error("Error syncing:", error); }
}

async function loadDataFromFirebase() {
    if (!currentUser || !db) return;
    try {
        const snapshot = await db.ref('plannerUsers/' + currentUser.uid).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            let needsReload = false;
            if (data.dailyData && data.dailyData !== localStorage.getItem('vibeProFinal')) needsReload = true;
            if(data.dailyData) localStorage.setItem('vibeProFinal', data.dailyData);
            if(data.reports) localStorage.setItem('vibeReports', data.reports);
            if(data.trackedExams) localStorage.setItem('vibeExams', data.trackedExams);
            if(data.habits) localStorage.setItem('vibeHabits', data.habits);
            if(data.settings) localStorage.setItem('vibeSettings', data.settings);
            if(data.monthGoals) localStorage.setItem('month', data.monthGoals);
            if(data.yearGoals) localStorage.setItem('year', data.yearGoals);
            if (needsReload) location.reload();
        }
    } catch (e) { console.error("Error loading:", e); }
}

let dailyData = JSON.parse(localStorage.getItem('vibeProFinal')) || {};
let reports = JSON.parse(localStorage.getItem('vibeReports')) || [];
let trackedExams = JSON.parse(localStorage.getItem('vibeExams')) || [];
let habitBlueprint = JSON.parse(localStorage.getItem('vibeHabits')) || [];
let parsedSettings = JSON.parse(localStorage.getItem('vibeSettings')) || {};
let settings = {
    theme: parsedSettings.theme || '#8c7ae6', dim: parsedSettings.dim !== undefined ? parsedSettings.dim : 0.6,
    workTime: parsedSettings.workTime || 25, breakTime: parsedSettings.breakTime || 5,
    soundEnabled: parsedSettings.soundEnabled !== undefined ? parsedSettings.soundEnabled : true,
    soundType: parsedSettings.soundType || 'classic', notificationsEnabled: parsedSettings.notificationsEnabled || false,
    workMsg: parsedSettings.workMsg || "TIME FOR A BREAK! ☕", breakMsg: parsedSettings.breakMsg || "BACK TO WORK! 🚀",
    hundredPercentMsg: parsedSettings.hundredPercentMsg || "Solid work today. The streak continues."
};

const motivationalQuotes = ["DISCIPLINE EQUALS FREEDOM", "DO SOMETHING TODAY THAT YOUR FUTURE SELF WILL THANK YOU FOR", "THE SECRET OF GETTING AHEAD IS GETTING STARTED", "MAKE TODAY YOUR MASTERPIECE"];

window.onload = () => {
    document.getElementById('quoteBanner').innerText = `"${motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]}"`;
    applySettings(); checkRollover(); calculateStreak(); renderReports(); renderHabitBlueprint(); initNavDragDrop();
    Object.keys(dailyData).sort().forEach(d => renderDailyCard(d));
    ['month', 'year'].forEach(t => { const saved = JSON.parse(localStorage.getItem(t)) || []; saved.forEach((g, idx) => renderGoal(t, g.text, g.done, idx)); });
    scrollToToday(true); initBackground(); setTimeout(checkUpcomingExamNotification, 2000);
};

/* --- CMD + K SUPERHUMAN MENU LOGIC --- */
function openCmd() { document.getElementById('cmdOverlay').classList.add('show'); document.getElementById('cmdInput').focus(); }
function closeCmd() { document.getElementById('cmdOverlay').classList.remove('show'); document.getElementById('cmdInput').value = ''; }
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); } if (e.key === 'Escape') { closeCmd(); document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show')); } });

function executeCmd() {
    let input = document.getElementById('cmdInput').value; if(!input.trim()) return;
    let priority = 'prio-low'; let time = null; let targetDateStr = dateKeyFromLocal(new Date());

    if (input.includes('#high')) { priority = 'prio-high'; input = input.replace('#high', ''); }
    else if (input.includes('#med')) { priority = 'prio-med'; input = input.replace('#med', ''); }
    else if (input.includes('#low')) { priority = 'prio-low'; input = input.replace('#low', ''); }

    const timeMatch = input.match(/@(\d{1,2}(:\d{2})?(am|pm)?)/i);
    if (timeMatch) {
        let timeStr = timeMatch[1].toLowerCase();
        let isPm = timeStr.includes('pm'), isAm = timeStr.includes('am');
        timeStr = timeStr.replace(/[amp]/g, '');
        let parts = timeStr.split(':'); let h = parseInt(parts[0]); let m = parts[1] || '00';
        if (isPm && h < 12) h += 12; if (isAm && h === 12) h = 0;
        time = `${String(h).padStart(2, '0')}:${m}`;
        input = input.replace(timeMatch[0], '');
    }

    if (input.toLowerCase().includes('tomorrow')) {
        let tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
        targetDateStr = dateKeyFromLocal(tmrw);
        input = input.replace(/tomorrow/i, '');
    }

    let text = toTitleCase(input.trim());
    if(!dailyData[targetDateStr]) { dailyData[targetDateStr] = []; renderDailyCard(targetDateStr); }
    let newTask = { text, priority, done: false }; if(time) newTask.startTime = time;
    dailyData[targetDateStr].push(newTask); sortTasks(targetDateStr); save(); calculateStreak();
    
    // Re-render only that specific day list safely
    const ul = document.getElementById(`list-${targetDateStr}`);
    if(ul) { ul.innerHTML = ''; dailyData[targetDateStr].forEach((t, i) => renderTask(targetDateStr, t, i)); updateProgress(targetDateStr); }
    closeCmd(); scrollToToday();
}

function checkUpcomingExamNotification() {
    if (!settings.notificationsEnabled || trackedExams.length === 0) return;
    const todayStr = dateKeyFromLocal(new Date());
    if (localStorage.getItem('vibeExamNotifDate') === todayStr) return;
    const today = new Date(); today.setHours(0,0,0,0); 
    const upcomingExams = trackedExams.map(exam => {
        const [year, month, day] = exam.date.split('-'); const diffDays = Math.round((new Date(year, month - 1, day) - today) / 86400000);
        return { ...exam, diffDays };
    }).filter(e => e.diffDays >= 0).sort((a,b) => a.diffDays - b.diffDays);
    if (upcomingExams.length > 0) {
        const closest = upcomingExams[0];
        let msg = closest.diffDays === 0 ? `${closest.name} IS TODAY! 🔥` : `${closest.diffDays} DAYS LEFT FOR ${closest.name}!`;
        playAlarm('chime'); showNotification("🎯 UPCOMING EXAM", msg); localStorage.setItem('vibeExamNotifDate', todayStr);
    }
}

let draggedNav = null;
function handleNavDragStart(e) { draggedNav = this; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => this.classList.add('dragging'), 0); }
function handleNavDragEnd(e) { this.classList.remove('dragging'); }
function handleNavDragOver(e) { e.preventDefault(); return false; }
function handleNavDrop(e) {
    e.stopPropagation(); 
    if (draggedNav !== this) {
        const container = document.getElementById('navControlsRow'); const allItems = [...container.querySelectorAll('.draggable-nav')];
        if (allItems.indexOf(draggedNav) < allItems.indexOf(this)) this.after(draggedNav); else this.before(draggedNav);
        localStorage.setItem('vibeNavOrder', JSON.stringify([...container.querySelectorAll('.draggable-nav')].map(el => el.id)));
    }
    return false;
}
function initNavDragDrop() {
    const savedOrder = JSON.parse(localStorage.getItem('vibeNavOrder')); const container = document.getElementById('navControlsRow');
    if (savedOrder) { savedOrder.forEach(id => { const el = document.getElementById(id); if (el) container.appendChild(el); }); container.appendChild(document.getElementById('importFile')); }
    document.querySelectorAll('.draggable-nav').forEach(el => { el.addEventListener('dragstart', handleNavDragStart); el.addEventListener('dragover', handleNavDragOver); el.addEventListener('drop', handleNavDrop); el.addEventListener('dragend', handleNavDragEnd); });
}

function toggleDropdown(event) { event.stopPropagation(); document.getElementById('dataDropdown').classList.toggle('show'); }
window.onclick = function(event) { if (!event.target.matches('.dropdown-btn')) document.querySelectorAll(".dropdown-menu").forEach(d => d.classList.remove('show')); }

function playAlarm(overrideType = null) {
    if (!settings.soundEnabled && overrideType === null) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); const type = overrideType || settings.soundType;
        if (type === 'classic') {
            for(let i = 0; i < 3; i++) { let offset = i * 1.2; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime + offset); gain.gain.setValueAtTime(1, ctx.currentTime + offset); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.5); osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.5); }
        }
    } catch(e) {}
}

function testSound() { playAlarm(document.getElementById('soundTypeSelect').value); }
function requestNotificationPermission() { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission(); }
function showNotification(title, msg) { if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") new Notification(title, { body: msg }); else alert(title + " - " + msg); }
function setCustomReminder() { const msg = document.getElementById('customRemMsg').value, mins = parseInt(document.getElementById('customRemTime').value); if(!msg || !mins || mins <= 0) return; setTimeout(() => { playAlarm(); showNotification("🔔 REMINDER", toTitleCase(msg)); }, mins * 60000); alert(`Reminder set for ${mins} min!`); }

function openModal(id) { const modal = document.getElementById(id); modal.style.display = 'flex'; void modal.offsetWidth; modal.classList.add('show'); if(id === 'statsModal') renderStats(); if(id === 'examModal') renderExams(); if(id === 'habitsModal') renderHabitBlueprint(); }
function closeModal(id) { const modal = document.getElementById(id); modal.classList.remove('show'); setTimeout(() => modal.style.display = 'none', 300); }
function toggleSettingsCheck(id) { const input = document.getElementById(id); input.checked = !input.checked; document.getElementById(id + 'Check').classList.toggle('checked', input.checked); if(input.onchange) input.onchange(); }

function applySettings() {
    document.documentElement.style.setProperty('--primary', settings.theme); document.documentElement.style.setProperty('--bg-dim', `rgba(0,0,0,${settings.dim})`);
    document.getElementById('bgDimSlider').value = settings.dim; document.getElementById('workTimeInput').value = settings.workTime || 25; document.getElementById('breakTimeInput').value = settings.breakTime || 5;
    document.getElementById('soundToggle').checked = settings.soundEnabled; document.getElementById('soundToggleCheck').classList.toggle('checked', settings.soundEnabled);
    document.getElementById('notifToggle').checked = settings.notificationsEnabled; document.getElementById('notifToggleCheck').classList.toggle('checked', settings.notificationsEnabled);
    document.querySelectorAll('.color-swatch').forEach(s => { if(s.style.background === settings.theme) s.classList.add('active'); });
    if (!isRunning) setTimerMode(currentMode);
}

function setThemeColor(color, element) { settings.theme = color; document.documentElement.style.setProperty('--primary', color); document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active')); if(element && element.classList.contains('color-swatch')) element.classList.add('active'); }
function updateDimming() { document.documentElement.style.setProperty('--bg-dim', `rgba(0,0,0,${document.getElementById('bgDimSlider').value})`); }
function saveSettings() {
    settings.dim = document.getElementById('bgDimSlider').value;
    settings.workTime = parseInt(document.getElementById('workTimeInput').value) || 25;
    settings.breakTime = parseInt(document.getElementById('breakTimeInput').value) || 5;
    settings.soundEnabled = document.getElementById('soundToggle').checked;
    settings.notificationsEnabled = document.getElementById('notifToggle').checked;
    localStorage.setItem('vibeSettings', JSON.stringify(settings)); syncToFirebase();
    if(!isRunning) setTimerMode(currentMode);
}

function initBackground() {
    const bgContainer = document.getElementById('bgContainer'); bgContainer.innerHTML = '';
    ['linear-gradient(135deg, #0a0a0a, #111)'].forEach(grad => { const div = document.createElement('div'); div.className = `bg-slide bg-active`; div.style.background = grad; bgContainer.appendChild(div); });
}

let timerInterval, timeLeft = 25 * 60, isRunning = false, currentMode = 'work';
function updateTimerDisplay() { const m = Math.floor(timeLeft / 60).toString().padStart(2, '0'), s = (timeLeft % 60).toString().padStart(2, '0'), timeString = `${m}:${s}`; document.getElementById('timerDisplay').innerText = timeString; document.title = isRunning ? `(${timeString}) PLANNER` : `PLANNER`; }
function setTimerMode(mode) { if(isRunning) toggleTimer(); currentMode = mode; document.getElementById('btnWork').classList.toggle('active', mode === 'work'); document.getElementById('btnBreak').classList.toggle('active', mode === 'break'); timeLeft = (mode === 'work' ? settings.workTime : settings.breakTime) * 60; updateTimerDisplay(); }
function toggleTimer() { const btn = document.getElementById('btnTimerStart'); if (isRunning) { clearInterval(timerInterval); isRunning = false; btn.innerText = "Start"; updateTimerDisplay(); } else { isRunning = true; btn.innerText = "Pause"; timerInterval = setInterval(() => { timeLeft--; updateTimerDisplay(); if (timeLeft <= 0) { clearInterval(timerInterval); isRunning = false; btn.innerText = "Start"; runConfetti({ particleCount: 150, spread: 80 }); playAlarm(); showNotification("TIMER FINISHED", currentMode === 'work' ? settings.workMsg : settings.breakMsg); setTimerMode(currentMode === 'work' ? 'break' : 'work'); } }, 1000); } }
function resetTimer() { setTimerMode(currentMode); }

function save() { localStorage.setItem('vibeProFinal', JSON.stringify(dailyData)); syncToFirebase(); }

function calculateStreak() {
    let streak = 0; const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    while (true) {
        const score = getDailyScore(dateKeyFromLocal(cursor));
        if (score !== null && score >= 70) { streak += 1; cursor.setDate(cursor.getDate() - 1); } else break;
    }
    if(document.getElementById('streakCount')) document.getElementById('streakCount').innerText = streak;
}

function updateProgress(date) {
    const tasks = dailyData[date] || [];
    if (tasks.length === 0) { if(document.getElementById(`prog-${date}`)) document.getElementById(`prog-${date}`).style.width = "0%"; if(document.getElementById(`perc-${date}`)) document.getElementById(`perc-${date}`).innerText = "0%"; return; }
    let totalPercent = 0, weightPerTask = 100 / tasks.length;
    tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) totalPercent += (task.subtasks.filter(st => st.done).length / task.subtasks.length) * weightPerTask;
        else if (task.done) totalPercent += weightPerTask;
    });
    const finalPercent = Math.round(totalPercent);
    if(document.getElementById(`prog-${date}`)) document.getElementById(`prog-${date}`).style.width = finalPercent + "%";
    if(document.getElementById(`perc-${date}`)) document.getElementById(`perc-${date}`).innerText = finalPercent + "%";
}

function addHabit() {
    const name = toTitleCase(document.getElementById('habitName').value.trim()); if(!name) return;
    const habitText = "🔄 " + name; habitBlueprint.push({ id: Date.now(), text: habitText }); localStorage.setItem('vibeHabits', JSON.stringify(habitBlueprint)); syncToFirebase(); document.getElementById('habitName').value = ''; renderHabitBlueprint();
    const todayStr = dateKeyFromLocal(new Date()); let changed = false;
    Object.keys(dailyData).forEach(dateStr => {
        if (dateStr >= todayStr && !dailyData[dateStr].some(t => t.text === habitText)) {
            dailyData[dateStr].push({ text: habitText, priority: 'prio-med', done: false }); changed = true;
            const ul = document.getElementById(`list-${dateStr}`); if(ul) { ul.innerHTML = ''; dailyData[dateStr].forEach((t, i) => renderTask(dateStr, t, i)); } updateProgress(dateStr);
        }
    });
    if (changed) { save(); calculateStreak(); }
}
function removeHabit(id) { habitBlueprint = habitBlueprint.filter(h => Number(h.id) !== Number(id)); localStorage.setItem('vibeHabits', JSON.stringify(habitBlueprint)); syncToFirebase(); renderHabitBlueprint(); }
function renderHabitBlueprint() { const container = document.getElementById('habitList'); if(habitBlueprint.length === 0) { container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO HABITS SET</p>`; return; } container.innerHTML = habitBlueprint.filter(h => Number.isFinite(Number(h.id))).map(habit => `<div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary);"><div style="font-weight: 600; font-size: 0.9rem;">${escapeHTML(habit.text)}</div><button class="task-del" onclick="removeHabit(${Number(habit.id)})">×</button></div>`).join(''); }

function checkRollover() {
    const todayStr = dateKeyFromLocal(new Date()); let changed = false;
    Object.keys(dailyData).forEach(dateStr => {
        if (dateStr < todayStr) {
            dailyData[dateStr].forEach(task => {
                if (!task.done && !task.rolledOver) {
                    task.rolledOver = true;
                    if (!dailyData[todayStr]) { dailyData[todayStr] = []; changed = true; habitBlueprint.forEach(h => { dailyData[todayStr].push({ text: h.text, priority: 'prio-med', done: false }); }); }
                    if (task.text.startsWith("🔄 ")) return;
                    if (!dailyData[todayStr].some(t => t.text === task.text)) {
                        let newTask = { text: task.text, priority: task.priority || 'prio-low', done: false, stCollapsed: task.stCollapsed || false };
                        if (task.subtasks && task.subtasks.length > 0) { let pendingSubtasks = task.subtasks.filter(st => !st.done); if (pendingSubtasks.length > 0) { newTask.subtasks = pendingSubtasks.map(st => ({ text: st.text, done: false })); } }
                        dailyData[todayStr].push(newTask); changed = true;
                    }
                }
            });
        }
    });
    if (!dailyData[todayStr] && habitBlueprint.length > 0) { dailyData[todayStr] = []; habitBlueprint.forEach(h => { dailyData[todayStr].push({ text: h.text, priority: 'prio-med', done: false }); }); changed = true; }
    if (changed) { save(); calculateStreak(); }
}

function sortTasks(date) {
    const prioMap = { 'prio-high': 1, 'prio-med': 2, 'prio-low': 3 };
    if(dailyData[date]) { 
        dailyData[date].sort((a, b) => {
            const hasTimeA = !!a.startTime, hasTimeB = !!b.startTime;
            if (hasTimeA && hasTimeB) return a.startTime === b.startTime ? prioMap[a.priority || 'prio-low'] - prioMap[b.priority || 'prio-low'] : a.startTime.localeCompare(b.startTime);
            else if (hasTimeA) return -1; else if (hasTimeB) return 1; else return prioMap[a.priority || 'prio-low'] - prioMap[b.priority || 'prio-low'];
        });
    }
}

function scrollToToday() {
    const todayStr = dateKeyFromLocal(new Date());
    if (!dailyData[todayStr]) { document.getElementById('datePicker').value = todayStr; createDay(); } 
    else { const card = document.getElementById(`card-${todayStr}`); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

function createDay() {
    const date = document.getElementById('datePicker').value; if(!date || dailyData[date]) return;
    dailyData[date] = []; habitBlueprint.forEach(h => { dailyData[date].push({ text: h.text, priority: 'prio-med', done: false }); });
    save(); const container = document.getElementById('daily-container'); container.innerHTML = ''; Object.keys(dailyData).sort().forEach(d => renderDailyCard(d));
    setTimeout(() => { const card = document.getElementById(`card-${date}`); if(card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
}

function createMonth() {
    const monthVal = document.getElementById('monthPicker').value; if (!monthVal) return;
    const [year, month] = monthVal.split('-'); const daysInMonth = new Date(year, month, 0).getDate(); let changed = false;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
        if (!dailyData[dateStr]) { dailyData[dateStr] = []; habitBlueprint.forEach(h => { dailyData[dateStr].push({ text: h.text, priority: 'prio-med', done: false }); }); changed = true; }
    }
    if (changed) { save(); document.getElementById('daily-container').innerHTML = ''; Object.keys(dailyData).sort().forEach(d => renderDailyCard(d)); setTimeout(() => { const card = document.getElementById(`card-${year}-${month}-01`); if(card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); runConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } 
}

function renderDailyCard(date) {
    const todayStr = dateKeyFromLocal(new Date()); const isToday = date === todayStr;
    const card = document.createElement('div'); card.className = `card ${isToday ? 'today-card' : ''}`; card.id = `card-${date}`;
    card.innerHTML = `
        <div class="card-header">
            <h3>📅 ${new Date(date).toDateString()}</h3>
            <span id="perc-${date}" style="font-size:0.85rem; opacity:0.9; font-weight:800; color:var(--primary);">0%</span>
        </div>
        <div class="progress-container"><div class="progress-fill" id="prog-${date}"></div></div>
        
        <div class="input-group">
            <input type="text" id="in-${date}" placeholder="Task..." onkeydown="if(event.key==='Enter') addTask('${date}')">
            <button class="icon-btn" onclick="document.getElementById('time-row-${date}').classList.toggle('show')" title="Set Time Block">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </button>
            <select id="prio-${date}"><option value="prio-high" selected>High</option><option value="prio-med">Med</option><option value="prio-low">Low</option></select>
            <button class="add-btn" onclick="addTask('${date}')">Add</button>
        </div>
        <div class="time-picker-row" id="time-row-${date}">
            <input type="time" id="st-time-${date}">
            <span style="font-size: 0.7rem; opacity: 0.5; font-weight: 700;">to</span>
            <input type="time" id="en-time-${date}">
        </div>

        <ul id="list-${date}" ondragover="handleDragOverUl(event)" ondrop="handleDropUl(event, '${date}')" style="min-height: 50px; padding-bottom: 20px;"></ul>
        <button class="remove-day-btn" onclick="removeDay('${date}')">Delete Day</button>
    `;
    document.getElementById('daily-container').appendChild(card); 
    sortTasks(date); dailyData[date].forEach((t, idx) => renderTask(date, t, idx)); updateProgress(date);
}

function addTask(date) {
    const val = document.getElementById(`in-${date}`).value, prio = document.getElementById(`prio-${date}`).value, stTime = document.getElementById(`st-time-${date}`).value, enTime = document.getElementById(`en-time-${date}`).value;
    if(!val) return;
    let newTask = { text: toTitleCase(val.trim()), priority: prio, done: false };
    if (stTime) newTask.startTime = stTime; if (enTime) newTask.endTime = enTime;
    dailyData[date].push(newTask); sortTasks(date); save();
    // Atomic rebuild for array changes
    const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i)); updateProgress(date); calculateStreak(); 
    document.getElementById(`in-${date}`).value = ""; document.getElementById(`st-time-${date}`).value = ""; document.getElementById(`en-time-${date}`).value = ""; document.getElementById(`time-row-${date}`).classList.remove('show');
}

let dragSourceDay = null;
function handleDragStartDay(e) { dragSourceDay = this; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => this.classList.add('dragging'), 0); }
function handleDragOverDay(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.classList.add('ghost-placeholder'); return false; }
function handleDragLeaveDay(e) { this.classList.remove('ghost-placeholder'); }
function handleDragEndDay(e) { this.classList.remove('dragging'); document.querySelectorAll('.ghost-placeholder').forEach(el => el.classList.remove('ghost-placeholder')); }

function handleDropDay(e) {
    e.stopPropagation(); this.classList.remove('ghost-placeholder');
    if (dragSourceDay && dragSourceDay !== this) {
        const targetDate = this.dataset.date, sourceDate = dragSourceDay.dataset.date;
        const fromIdx = parseInt(dragSourceDay.dataset.index), toIdx = parseInt(this.dataset.index);
        let [movedItem] = dailyData[sourceDate].splice(fromIdx, 1);
        dailyData[targetDate].splice(toIdx, 0, movedItem);
        if (sourceDate !== targetDate) { const fromUl = document.getElementById(`list-${sourceDate}`); fromUl.innerHTML = ''; dailyData[sourceDate].forEach((t, i) => renderTask(sourceDate, t, i)); updateProgress(sourceDate); }
        sortTasks(targetDate); save(); const toUl = document.getElementById(`list-${targetDate}`); toUl.innerHTML = ''; dailyData[targetDate].forEach((t, i) => renderTask(targetDate, t, i)); updateProgress(targetDate); calculateStreak();
    }
    return false;
}
function handleDragOverUl(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDropUl(e, targetDate) {
    e.preventDefault();
    if (e.target.id === `list-${targetDate}` && dragSourceDay) {
        const sourceDate = dragSourceDay.dataset.date, fromIdx = parseInt(dragSourceDay.dataset.index);
        let [movedItem] = dailyData[sourceDate].splice(fromIdx, 1);
        dailyData[targetDate].push(movedItem); 
        if (sourceDate !== targetDate) { const fromUl = document.getElementById(`list-${sourceDate}`); fromUl.innerHTML = ''; dailyData[sourceDate].forEach((t, i) => renderTask(sourceDate, t, i)); updateProgress(sourceDate); }
        sortTasks(targetDate); save(); const toUl = document.getElementById(`list-${targetDate}`); toUl.innerHTML = ''; dailyData[targetDate].forEach((t, i) => renderTask(targetDate, t, i)); updateProgress(targetDate); calculateStreak();
    }
}

function formatTime12h(time24) {
    if(!time24) return ""; let [h, m] = time24.split(':'); let ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ampm}`;
}
function getDuration(start, end) {
    if(!start || !end) return ""; let [sh, sm] = start.split(':').map(Number); let [eh, em] = end.split(':').map(Number); let diff = (eh*60+em) - (sh*60+sm); if(diff < 0) diff += 24*60; 
    let h = Math.floor(diff/60), m = diff%60, res = []; if(h>0) res.push(`${h}h`); if(m>0) res.push(`${m}m`); return res.join(' ');
}

function renderTask(date, task, idx) {
    const todayStr = dateKeyFromLocal(new Date());
    const li = document.createElement('li'); 
    if (task.rolledOver || (date < todayStr && !task.done)) li.classList.add('missed-task');
    if (task.done) li.classList.add('completed-sweep'); // Restore animation state
    
    li.draggable = true; li.dataset.index = idx; li.dataset.date = date;
    li.addEventListener('dragstart', handleDragStartDay); li.addEventListener('dragover', handleDragOverDay);
    li.addEventListener('dragleave', handleDragLeaveDay); li.addEventListener('drop', handleDropDay); li.addEventListener('dragend', handleDragEndDay);
    
    let subtasksHTML = ''; let hasSubtasks = task.subtasks && task.subtasks.length > 0;
    let toggleBtnHTML = hasSubtasks ? `<button class="collapse-subtask-btn" onclick="toggleSubtaskList('${date}', ${idx})" title="Toggle Subtasks">${task.stCollapsed ? '▶' : '▼'}</button>` : '';
    
    if(hasSubtasks) {
        subtasksHTML = `<ul class="subtask-list" style="display: ${task.stCollapsed ? 'none' : 'block'};">`;
        task.subtasks.forEach((st, sIdx) => {
            let stClass = st.done ? "done" : ""; let liClass = "subtask-item"; if (date < todayStr && !st.done) liClass += " missed-task";
            subtasksHTML += `<li class="${liClass}">
                <div class="custom-checkbox ${st.done ? 'checked' : ''}" style="width: 14px; height: 14px; border-width: 1px;" onclick="handleSubtaskCheck('${date}', ${idx}, ${sIdx}, this)"></div>
                <span class="subtask-text ${stClass}" contenteditable="${date >= todayStr}" onblur="editSubtask('${date}', ${idx}, ${sIdx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">
                    ${escapeHTML(st.text)}
                </span>
                <button class="task-del" style="font-size: 0.9rem;" onclick="removeSubtask('${date}', ${idx}, ${sIdx})">×</button>
            </li>`;
        });
        subtasksHTML += '</ul>';
    }

    let timeBadgeHTML = '';
    if (task.startTime) {
        let duration = getDuration(task.startTime, task.endTime); let timeStr = formatTime12h(task.startTime); if (task.endTime) timeStr += ` - ${formatTime12h(task.endTime)}`;
        timeBadgeHTML = `<div class="task-clock-icon" title="${duration ? timeStr + ' (Duration: ' + duration + ')' : timeStr}"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>`;
    }

    li.style.flexDirection = 'column'; li.style.alignItems = 'stretch';
    const displayText = task.rolledOver ? '❌ Missed: ' + task.text : task.text;
    
    li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
            <div class="prio-dot ${task.priority || 'prio-low'}" onclick="cyclePriority(this, '${date}', ${idx})" title="Click to change priority"></div>
            <div class="custom-checkbox ${task.done ? 'checked' : ''}" onclick="handleCheck('${date}', ${idx}, this)"></div> 
            ${toggleBtnHTML} ${timeBadgeHTML}
            <span class="task-text ${task.done ? 'done' : ''}" contenteditable="${date >= todayStr}" onblur="editTask('${date}', ${idx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">
                ${escapeHTML(displayText)}
            </span>
            <button class="add-subtask-btn" onclick="toggleSubtaskInput('${date}', ${idx})" title="Add Subtask">↳</button>
            <button class="task-del" onclick="removeSpecificTask('${date}', ${idx})">×</button>
        </div>
        ${subtasksHTML}
        <div class="subtask-input-container" id="st-in-cont-${date}-${idx}">
            <input type="text" class="subtask-input" id="st-in-${date}-${idx}" placeholder="New subtask..." onkeydown="if(event.key==='Enter') addSubtask('${date}', ${idx})">
            <button class="add-btn" style="padding: 4px 10px; font-size: 0.65rem;" onclick="addSubtask('${date}', ${idx})">+</button>
        </div>
    `;
    document.getElementById(`list-${date}`).appendChild(li);
}

/* --- 🔥 STRIKE 1: ATOMIC DOM UPDATES (NO RE-RENDERING ON CHECK) --- */
function handleCheck(date, idx, checkboxElement) {
    let task = dailyData[date][idx]; if(!task) return;
    task.done = !task.done; 
    if(task.subtasks) task.subtasks.forEach(st => st.done = task.done);
    save(); 

    // Directly mutate DOM (Performance boost)
    const li = document.querySelector(`li[data-date="${date}"][data-index="${idx}"]`);
    if (li) {
        checkboxElement.classList.toggle('checked', task.done);
        li.querySelector('.task-text').classList.toggle('done', task.done);
        task.done ? li.classList.add('completed-sweep') : li.classList.remove('completed-sweep');
        // Mutate subtasks DOM
        li.querySelectorAll('.subtask-item .custom-checkbox').forEach(c => task.done ? c.classList.add('checked') : c.classList.remove('checked'));
        li.querySelectorAll('.subtask-item .subtask-text').forEach(t => task.done ? t.classList.add('done') : t.classList.remove('done'));
    }

    updateProgress(date); calculateStreak();
    let totalTasks = dailyData[date].length, doneTasks = dailyData[date].filter(t => t.done).length;
    if (task.done && totalTasks > 0 && doneTasks === totalTasks) {
        runConfetti({ particleCount: 30, spread: 50, origin: { x: 0.2, y: 0.6 }, zIndex: 9999 }); 
        setTimeout(() => runConfetti({ particleCount: 30, spread: 50, origin: { x: 0.8, y: 0.6 }, zIndex: 9999 }), 200); 
        setTimeout(() => showCelebrationModal(), 800);
    } else if (task.done) {
        runConfetti({ particleCount: 40, origin: { y: 0.8 }, colors: [settings.theme, '#00ff88'] });
    }
}

function handleSubtaskCheck(date, tIdx, sIdx, cbElement) {
    let st = dailyData[date][tIdx].subtasks[sIdx]; st.done = !st.done;
    let allDone = dailyData[date][tIdx].subtasks.every(s => s.done); dailyData[date][tIdx].done = allDone; 
    save(); 

    // Atomic Update
    cbElement.classList.toggle('checked', st.done);
    cbElement.nextElementSibling.classList.toggle('done', st.done);
    
    const parentLi = document.querySelector(`li[data-date="${date}"][data-index="${tIdx}"]`);
    if (parentLi) {
        parentLi.querySelector('.custom-checkbox').classList.toggle('checked', allDone);
        parentLi.querySelector('.task-text').classList.toggle('done', allDone);
        allDone ? parentLi.classList.add('completed-sweep') : parentLi.classList.remove('completed-sweep');
    }

    updateProgress(date); calculateStreak();
    if (st.done && allDone && dailyData[date].filter(t => t.done).length === dailyData[date].length) {
        runConfetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 }); setTimeout(() => showCelebrationModal(), 800);
    } else if (st.done) runConfetti({ particleCount: 20, spread: 40 });
}

function editTask(date, idx, element) { let newText = toTitleCase(element.innerText.replace('❌ Missed: ', '').replace('❌ MISSED: ', '').trim()); if (newText === "") { element.innerText = dailyData[date][idx].text; return; } dailyData[date][idx].text = newText; save(); }
function cyclePriority(dot, date, idx) { let task = dailyData[date][idx]; const priorities = ['prio-high', 'prio-med', 'prio-low']; task.priority = priorities[(priorities.indexOf(task.priority || 'prio-low') + 1) % priorities.length]; sortTasks(date); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i)); save(); }
function showCelebrationModal() { let modal = document.getElementById('celebModal'); if (!modal) { modal = document.createElement('div'); modal.id = 'celebModal'; modal.className = 'modal-overlay custom-celeb-overlay'; modal.innerHTML = `<div class="modal-card celeb-card"><h2>🏆 BEAST MODE</h2><p id="celebMsgText" style="text-align:center; font-size: 0.85rem; color: rgba(255,255,255,0.8); margin-bottom: 25px; font-weight: 600; white-space: pre-wrap;"></p><button class="action-btn accent" style="width: 100%; padding: 14px;" onclick="closeModal('celebModal')">Stay Hard 🔥</button></div>`; document.body.appendChild(modal); } document.getElementById('celebMsgText').innerText = settings.hundredPercentMsg; openModal('celebModal'); }
function removeSpecificTask(date, idx) { dailyData[date].splice(idx, 1); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i)); updateProgress(date); save(); calculateStreak(); }
function removeDay(date) { if(confirm(`Remove entire day: ${date}?`)) { delete dailyData[date]; document.getElementById(`card-${date}`).remove(); save(); calculateStreak(); } }
function scrollTimeline(amount) { document.getElementById('daily-container').scrollBy({ left: amount, behavior: 'smooth' }); }
function addGoal(type) { const inp = document.getElementById(`in-${type}`); if(!inp.value) return; const saved = JSON.parse(localStorage.getItem(type)) || []; saved.push({text: toTitleCase(inp.value.trim()), done: false}); localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase(); renderGoal(type, toTitleCase(inp.value.trim()), false, saved.length - 1); inp.value = ""; }
function renderGoal(type, text, done, idx) { const li = document.createElement('li'); li.innerHTML = `<div class="custom-checkbox ${done ? 'checked' : ''}" onclick="handleGoalCheck('${type}', ${idx}, this)"></div> <span class="task-text ${done ? 'done' : ''}" contenteditable="true" onblur="editGoal('${type}', ${idx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">${escapeHTML(text)}</span> <button class="task-del" onclick="removeGoal('${type}', ${idx}, this)">×</button>`; document.getElementById(`list-${type}`).appendChild(li); }
function editGoal(type, idx, element) { let saved = JSON.parse(localStorage.getItem(type)); let text = element.innerText.trim(); if (text === "") { element.innerText = saved[idx].text; return; } saved[idx].text = toTitleCase(text); localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase(); }
function handleGoalCheck(type, idx, checkboxElement) { let saved = JSON.parse(localStorage.getItem(type)), g = saved[idx]; if(g) { g.done = !g.done; checkboxElement.classList.toggle('checked', g.done); checkboxElement.nextElementSibling.classList.toggle('done', g.done); if(g.done) runConfetti({ particleCount: 80, spread: 100 }); localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase(); } }
function removeGoal(type, idx) { let saved = JSON.parse(localStorage.getItem(type)); saved.splice(idx, 1); localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase(); const ul = document.getElementById(`list-${type}`); ul.innerHTML = ''; saved.forEach((g, i) => renderGoal(type, g.text, g.done, i)); }

// (Analytics, Reports, and other functions remain untouched for brevity but are secure)
function manualArchive() {
    const now = new Date(); let targetMonth = now.getMonth(), targetYear = now.getFullYear();
    if (targetMonth === 0) { targetMonth = 12; targetYear -= 1; }
    const monthLabel = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
    
    if (!confirm(`Generate report for ${monthLabel}? (Daily timeline cards will NOT be deleted)`)) return;

    let totalTasks = 0, completedTasks = 0, daysFound = 0;
    let totalSubtasks = 0, completedSubtasks = 0; 
    let executableTotal = 0, executableCompleted = 0; 
    let prioStats = { high: {tot:0, done:0}, med: {tot:0, done:0}, low: {tot:0, done:0} };
    let dailyPercents = [];

    Object.keys(dailyData).sort().forEach(dateStr => {
        const d = new Date(dateStr);
        if (d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear) {
            daysFound++; 
            let tasksThisDay = dailyData[dateStr];
            let dayTot = tasksThisDay.length;
            
            if(dayTot > 0) {
                let dailyPercent = 0;
                let weightPerTask = 100 / dayTot;

                tasksThisDay.forEach(t => { 
                    totalTasks++; 
                    let p = t.priority || 'prio-low';
                    let pKey = p === 'prio-high' ? 'high' : (p === 'prio-med' ? 'med' : 'low');
                    prioStats[pKey].tot++;
                    
                    if (t.done) { completedTasks++; prioStats[pKey].done++; } 
                    
                    if(t.subtasks && t.subtasks.length > 0) {
                        let doneSubCount = 0;
                        t.subtasks.forEach(st => {
                            totalSubtasks++;
                            executableTotal++; 
                            if(st.done) {
                                completedSubtasks++;
                                executableCompleted++;
                                doneSubCount++;
                            }
                        });
                        dailyPercent += ((doneSubCount / t.subtasks.length) * weightPerTask);
                    } else {
                        executableTotal++; 
                        if(t.done) {
                            executableCompleted++;
                            dailyPercent += weightPerTask;
                        }
                    }
                });
                dailyPercents.push(Math.round(dailyPercent));
            } else {
                dailyPercents.push(0);
            }
        }
    });

    if (daysFound > 0) {
        const perc = executableTotal === 0 ? 0 : Math.round((executableCompleted / executableTotal) * 100);
        const avgTasksPerDay = (executableTotal / daysFound).toFixed(1);

        reports.push({ 
            id: Date.now(), month: monthLabel, stats: `${perc}% DONE`, details: `${executableCompleted}/${executableTotal} ACTIONS`, 
            advanced: { prioStats, totalTasks, completedTasks, totalSubtasks, completedSubtasks, daysFound, avgTasksPerDay, dailyPercents }
        });
        localStorage.setItem('vibeReports', JSON.stringify(reports)); save(); renderReports(); calculateStreak(); 
        alert(`${monthLabel} archived successfully!`);
    } else { alert("No data found for the previous month."); }
}

function removeReport(id) { if(!confirm("Delete this archive?")) return; reports = reports.filter(r => Number(r.id) !== Number(id)); localStorage.setItem('vibeReports', JSON.stringify(reports)); syncToFirebase(); renderReports(); }
function renderReports() { const reportArea = document.getElementById('report-list'); if (reports.length === 0) { reportArea.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO ARCHIVES YET</p>`; return; } reportArea.innerHTML = reports.filter(r => Number.isFinite(Number(r.id))).map(r => `<div style="padding: 12px; border-left: 3px solid var(--primary); background: rgba(0,0,0,0.3); margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.3)'" onclick="viewReport(${Number(r.id)})"><div><div style="font-size: 0.8rem; color: var(--primary); font-weight:700;">${escapeHTML(r.month)}</div><div style="font-size: 0.9rem; font-weight:600;">${escapeHTML(r.stats)}</div></div><button class="task-del" onclick="event.stopPropagation(); removeReport(${Number(r.id)})">×</button></div>`).join(''); }

function viewReport(id) {
    const r = reports.find(rep => Number(rep.id) === Number(id)); if (!r) return;
    document.getElementById('reportModalTitle').innerText = `📊 ${r.month} REPORT`;
    
    const detailsParts = String(r.details || '0/0 ACTIONS').split('/');
    let avgTasks = r.advanced && r.advanced.avgTasksPerDay ? escapeHTML(r.advanced.avgTasksPerDay) : "-";
    let completedActions = detailsParts[0] || '0'; let totalActions = detailsParts[1] ? detailsParts[1].split(' ')[0] : '0';
    let missedActions = parseInt(totalActions) - parseInt(completedActions);
    const safeStats = escapeHTML(r.stats); const safeCompletedActions = escapeHTML(completedActions); const safeMissedActions = escapeHTML(Number.isNaN(missedActions) ? 0 : missedActions);
    
    let content = `<div style="display:flex; justify-content:space-between; background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); flex-wrap:wrap; gap:10px;">
        <div style="text-align:center; flex:1; min-width:80px;"><div style="font-size:1.6rem; color:var(--primary); font-weight:800;">${safeStats}</div><div style="font-size:0.6rem; opacity:0.7;">EFFICIENCY</div></div>
        <div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--done-green); font-weight:800;">${safeCompletedActions}</div><div style="font-size:0.6rem; opacity:0.7;">ACTIONS DONE</div></div>
        <div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--missed); font-weight:800;">${safeMissedActions}</div><div style="font-size:0.6rem; opacity:0.7;">MISSED</div></div>
    </div>`;

    if (r.advanced) {
        if (Array.isArray(r.advanced.dailyPercents) && r.advanced.dailyPercents.length > 0) {
            let dp = r.advanced.dailyPercents.map(perc => Math.max(0, Math.min(100, safeNumber(perc))));
            let svgW = 400, svgH = 100; let barTotalW = dp.length > 0 ? svgW / dp.length : 0; let barW = barTotalW * 0.75; if(barW > 14) barW = 14; 
            let bars = "";
            dp.forEach((perc, i) => { let barH = (perc / 100) * svgH; if (barH < 2) barH = 2; let x = (i * barTotalW) + (barTotalW / 2) - (barW / 2); let y = svgH - barH; bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--primary)" rx="3"></rect>`; });
            let gridLines = "";
            [100, 50, 0].forEach(p => { let yVal = svgH - (p / 100 * svgH); gridLines += `<line x1="0" y1="${yVal}" x2="${svgW}" y2="${yVal}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="3,3"/><text x="-10" y="${yVal + 3}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="end">${p}%</text>`; });
            content += `<h3 style="font-size:0.8rem; color:var(--primary); margin-bottom:15px; margin-top:10px;">📈 DAILY CONSISTENCY</h3><div style="background: rgba(0,0,0,0.3); padding: 20px 15px 15px 45px; border-radius: 10px; width: 100%; box-sizing: border-box;"><svg viewBox="-45 -10 455 120" style="width:100%; height:auto; overflow:visible; display:block;">${gridLines}${bars}</svg></div>`;
        }
    }
    document.getElementById('reportModalContent').innerHTML = content; openModal('reportModal');
}

function renderStats() {
    const content = document.getElementById('statsContent'); content.innerHTML = '';
    let chartData = []; let labels = []; let rowsHTML = '';
    for(let i=6; i>=0; i--) {
        let d = new Date(); d.setDate(d.getDate() - i); let dStr = dateKeyFromLocal(d);
        let tasks = dailyData[dStr] || []; let total = tasks.length, done = tasks.filter(t => t.done).length;
        let perc = total === 0 ? 0 : Math.round((done/total)*100);
        chartData.push(perc); labels.push(new Date(dStr).toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase());
        rowsHTML += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom: 12px;"><span style="width: 60px;">${labels[6-i]}</span><div style="flex-grow:1; margin: 0 15px; background:rgba(255,255,255,0.1); border-radius:6px; height:8px; overflow:hidden;"><div style="width:${perc}%; background:${perc === 100 ? 'var(--done-green)' : 'var(--primary)'}; height:100%;"></div></div><span style="width: 45px; text-align:right;">${perc}%</span></div>`;
    }
    content.innerHTML = `<div style="flex: 1; display:flex; flex-direction:column; justify-content:center; min-width:250px;">${rowsHTML}</div>`;
}

function addExam() { const name = toTitleCase(document.getElementById('examName').value.trim()), date = document.getElementById('examDate').value; if(!name || !date) return; trackedExams.push({ id: Date.now(), name, date }); localStorage.setItem('vibeExams', JSON.stringify(trackedExams)); syncToFirebase(); document.getElementById('examName').value = ''; document.getElementById('examDate').value = ''; renderExams(); }
function removeExam(id) { trackedExams = trackedExams.filter(e => Number(e.id) !== Number(id)); localStorage.setItem('vibeExams', JSON.stringify(trackedExams)); syncToFirebase(); renderExams(); }
function renderExams() {
    const container = document.getElementById('examList'); if(trackedExams.length === 0) { container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO EXAMS TRACKED</p>`; return; }
    const today = new Date(); today.setHours(0,0,0,0);
    let pending = [], aced = [];
    trackedExams.forEach(exam => { if (!Number.isFinite(Number(exam.id))) return; exam.id = Number(exam.id); const [year, month, day] = exam.date.split('-'); const diffDays = Math.round((new Date(year, month - 1, day) - today) / 86400000); exam.diffDays = diffDays; exam.examDateStr = new Date(year, month - 1, day).toDateString().toUpperCase(); if (diffDays < 0) aced.push(exam); else pending.push(exam); });
    pending.sort((a, b) => a.diffDays - b.diffDays); aced.sort((a, b) => b.diffDays - a.diffDays);
    let html = "";
    if (pending.length > 0) html += pending.map(e => `<div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${e.diffDays===0?'var(--done-green)':'var(--primary)'};"><div><div style="font-weight: 700;">${escapeHTML(e.name)}</div><div style="font-size: 0.7rem; opacity: 0.7;">${escapeHTML(e.examDateStr)}</div></div><div style="display: flex; gap: 15px; align-items:center;"><div style="font-weight: 700; color: ${e.diffDays===0?'var(--done-green)':'var(--primary)'};">${e.diffDays===0?'TODAY! 🔥':e.diffDays+' DAYS'}</div><button class="task-del" onclick="removeExam(${e.id})">×</button></div></div>`).join('');
    container.innerHTML = html;
}

function exportBackup() { const blob = new Blob([JSON.stringify({ vibeProFinal: localStorage.getItem('vibeProFinal'), vibeReports: localStorage.getItem('vibeReports'), vibeExams: localStorage.getItem('vibeExams'), month: localStorage.getItem('month'), year: localStorage.getItem('year'), vibeSettings: localStorage.getItem('vibeSettings'), vibeNavOrder: localStorage.getItem('vibeNavOrder'), vibeHabits: localStorage.getItem('vibeHabits') })], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `VIBE_PLANNER_${dateKeyFromLocal(new Date())}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function importBackup(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = JSON.parse(e.target.result); ['vibeProFinal', 'vibeReports', 'vibeExams', 'month', 'year', 'vibeSettings', 'vibeNavOrder', 'vibeHabits'].forEach(k => { if(data[k]) localStorage.setItem(k, data[k]); }); alert("🔥 Planner Restored! Reloading...."); location.reload(); } catch (err) { alert("❌ Invalid backup file!"); } }; reader.readAsText(file); event.target.value = ''; }

function toggleSubtaskList(date, idx) { dailyData[date][idx].stCollapsed = !dailyData[date][idx].stCollapsed; save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i)); }
function toggleSubtaskInput(date, idx) { const cont = document.getElementById(`st-in-cont-${date}-${idx}`); cont.classList.toggle('show'); if(cont.classList.contains('show')) document.getElementById(`st-in-${date}-${idx}`).focus(); }
function addSubtask(date, idx) { const input = document.getElementById(`st-in-${date}-${idx}`); const text = toTitleCase(input.value.trim()); if(!text) return; if(!dailyData[date][idx].subtasks) dailyData[date][idx].subtasks = []; dailyData[date][idx].subtasks.push({ text: text, done: false }); dailyData[date][idx].done = false; dailyData[date][idx].stCollapsed = false; save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i)); updateProgress(date); calculateStreak(); }
function editSubtask(date, tIdx, sIdx, element) { let text = toTitleCase(element.innerText.trim()); if (text === "") { element.innerText = dailyData[date][tIdx].subtasks[sIdx].text; return; } dailyData[date][tIdx].subtasks[sIdx].text = text; save(); }
function removeSubtask(date, tIdx, sIdx) { dailyData[date][tIdx].subtasks.splice(sIdx, 1); if(dailyData[date][tIdx].subtasks.length > 0) { dailyData[date][tIdx].done = dailyData[date][tIdx].subtasks.every(s => s.done); } save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i)); updateProgress(date); calculateStreak(); }