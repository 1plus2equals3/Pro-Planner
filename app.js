const firebaseConfig = {
    apiKey: "AIzaSyBZINWJcrTkMGZSBBQrWXqOt28GTjnu1oU",
    authDomain: "pro-planner-60e6b.firebaseapp.com",
    projectId: "pro-planner-60e6b",
    storageBucket: "pro-planner-60e6b.firebasestorage.app",
    messagingSenderId: "333738470107",
    appId: "1:333738470107:web:12c85823447903a758fafe",
    databaseURL: "https://pro-planner-60e6b-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();
let currentUser = null;

function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().split(/\s+/).map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

auth.onAuthStateChanged(async (user) => {
    const btn = document.getElementById('authBtnModal');
    const status = document.getElementById('syncStatus');
    if (user) {
        currentUser = user;
        if(btn) {
            btn.innerHTML = '🔓 LOGOUT';
            btn.style.background = 'var(--done-green)';
            btn.style.color = '#000';
            btn.style.borderColor = 'transparent';
        }
        if(status) {
            status.innerText = `Synced as: ${user.email}`;
            status.style.color = 'var(--done-green)';
        }
        await loadDataFromFirebase();
    } else {
        currentUser = null;
        if(btn) {
            btn.innerHTML = '🔒 LOGIN WITH GOOGLE';
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        }
        if(status) {
            status.innerText = 'Sync is paused.';
            status.style.color = 'inherit';
        }
    }
});

function toggleAuth() {
    if (window.location.protocol === 'file:') {
        alert("⚠️ GOOGLE LOGIN ERROR! ⚠️\n\nGoogle Login 'file://' wale link par kaam nahi karta hai (Firebase isey turant block kar deta hai).\n\nISKO CHALANE KE 2 TAREEKE HAIN:\n1. VS Code me 'Live Server' extension se open karo\n2. Ya fir is HTML file ko Netlify/Vercel par free me upload karke live link chalao.");
        return;
    }
    if (currentUser) {
        auth.signOut().then(() => alert("Logged out! Sync paused."));
    } else {
        auth.signInWithPopup(provider).catch(error => {
            alert("LOGIN BLOCKED: " + error.message + "\n\n(Agar pop-up block ho gaya hai, toh browser address bar se allow karke wapas dabayein!)");
        });
    }
}

async function syncToFirebase() {
    if (!currentUser) return; 
    try {
        const payload = {
            dailyData: JSON.stringify(dailyData),
            reports: JSON.stringify(reports),
            trackedExams: JSON.stringify(trackedExams),
            habits: JSON.stringify(habitBlueprint),
            settings: JSON.stringify(settings),
            monthGoals: localStorage.getItem('month') || '[]',
            yearGoals: localStorage.getItem('year') || '[]'
        };
        await db.ref('plannerUsers/' + currentUser.uid).set(payload);
    } catch (error) { console.error("Error syncing to Firebase:", error); }
}

async function loadDataFromFirebase() {
    if (!currentUser) return;
    try {
        const snapshot = await db.ref('plannerUsers/' + currentUser.uid).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            let needsReload = false;
            if (data.dailyData && data.dailyData !== localStorage.getItem('vibeProFinal')) {
                needsReload = true;
            }
            if(data.dailyData) localStorage.setItem('vibeProFinal', data.dailyData);
            if(data.reports) localStorage.setItem('vibeReports', data.reports);
            if(data.trackedExams) localStorage.setItem('vibeExams', data.trackedExams);
            if(data.habits) localStorage.setItem('vibeHabits', data.habits);
            if(data.settings) localStorage.setItem('vibeSettings', data.settings);
            if(data.monthGoals) localStorage.setItem('month', data.monthGoals);
            if(data.yearGoals) localStorage.setItem('year', data.yearGoals);
            
            if (needsReload) location.reload();
        }
    } catch (e) { console.error("Error loading data:", e); }
}

let dailyData = JSON.parse(localStorage.getItem('vibeProFinal')) || {};
let reports = JSON.parse(localStorage.getItem('vibeReports')) || [];
let trackedExams = JSON.parse(localStorage.getItem('vibeExams')) || [];
let habitBlueprint = JSON.parse(localStorage.getItem('vibeHabits')) || [];

let parsedSettings = JSON.parse(localStorage.getItem('vibeSettings')) || {};
let settings = {
    theme: parsedSettings.theme || '#a29bfe',
    dim: parsedSettings.dim !== undefined ? parsedSettings.dim : 0.6,
    workTime: parsedSettings.workTime || 25,
    breakTime: parsedSettings.breakTime || 5,
    soundEnabled: parsedSettings.soundEnabled !== undefined ? parsedSettings.soundEnabled : true,
    soundType: parsedSettings.soundType || 'classic',
    notificationsEnabled: parsedSettings.notificationsEnabled || false,
    workMsg: parsedSettings.workMsg || "TIME FOR A BREAK! ☕",
    breakMsg: parsedSettings.breakMsg || "BACK TO WORK! 🚀",
    hundredPercentMsg: parsedSettings.hundredPercentMsg || "Solid work today. You did what you promised yourself. Now rest, reset, and bring the same discipline tomorrow. The streak continues."
};

const motivationalQuotes = [
    "DISCIPLINE EQUALS FREEDOM",
    "DO SOMETHING TODAY THAT YOUR FUTURE SELF WILL THANK YOU FOR",
    "THE SECRET OF GETTING AHEAD IS GETTING STARTED",
    "IT ALWAYS SEEMS IMPOSSIBLE UNTIL IT'S DONE",
    "DON'T STOP WHEN YOU'RE TIRED. STOP WHEN YOU'RE DONE",
    "FOCUS ON BEING PRODUCTIVE INSTEAD OF BUSY",
    "SMALL DAILY IMPROVEMENTS ARE THE KEY TO STAGGERING LONG-TERM RESULTS",
    "YOUR ONLY LIMIT IS YOU",
    "MAKE TODAY YOUR MASTERPIECE"
];

window.onload = () => {
    setRandomQuote();
    applySettings();
    checkRollover(); 
    calculateStreak(); 
    renderReports();
    renderHabitBlueprint();
    initNavDragDrop();
    
    const sortedDates = Object.keys(dailyData).sort();
    sortedDates.forEach(d => renderDailyCard(d));
    
    ['month', 'year'].forEach(t => {
        const saved = JSON.parse(localStorage.getItem(t)) || [];
        saved.forEach((g, idx) => renderGoal(t, g.text, g.done, idx));
    });

    scrollToToday(true); 
    initBackground();
    setTimeout(checkUpcomingExamNotification, 2000);

    document.querySelectorAll('.bottom-goals .card').forEach(card => {
        init3DTilt(card);
    });
};

function setRandomQuote() {
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    document.getElementById('quoteBanner').innerText = `"${quote}"`;
}

function init3DTilt(card) {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        card.style.boxShadow = `0 25px 50px rgba(0,0,0,0.8), 0 0 40px var(--primary)`;
        card.style.borderColor = `var(--primary)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = ``;
        card.style.boxShadow = ``;
        card.style.borderColor = ``;
    });
}

function checkUpcomingExamNotification() {
    if (!settings.notificationsEnabled || trackedExams.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifDate = localStorage.getItem('vibeExamNotifDate');
    if (lastNotifDate === todayStr) return;

    const today = new Date(); 
    today.setHours(0,0,0,0); 
    
    const upcomingExams = trackedExams.map(exam => {
        const [year, month, day] = exam.date.split('-');
        const examDate = new Date(year, month - 1, day);
        const diffDays = Math.round((examDate - today) / (1000 * 60 * 60 * 24));
        return { ...exam, diffDays };
    }).filter(e => e.diffDays >= 0).sort((a,b) => a.diffDays - b.diffDays);

    if (upcomingExams.length > 0) {
        const closest = upcomingExams[0];
        let msg = "";
        if (closest.diffDays === 0) msg = `${closest.name} IS TODAY! BEST OF LUCK! 🔥`;
        else if (closest.diffDays === 1) msg = `ONLY 1 DAY LEFT FOR ${closest.name}! BUCKLE UP! 🚀`;
        else msg = `${closest.diffDays} DAYS LEFT FOR ${closest.name}! KEEP HUSTLING! 📚`;

        playAlarm('chime'); showNotification("🎯 UPCOMING EXAM", msg);
        localStorage.setItem('vibeExamNotifDate', todayStr);
    }
}

let draggedNav = null;
function handleNavDragStart(e) { draggedNav = this; e.dataTransfer.effectAllowed = 'move'; this.style.opacity = '0.5'; }
function handleNavDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.style.boxShadow = '0 0 15px var(--primary)'; return false; }
function handleNavDragLeave(e) { this.style.boxShadow = ''; }
function handleNavDragEnd(e) { this.style.opacity = '1'; document.querySelectorAll('.draggable-nav').forEach(el => el.style.boxShadow = ''); }
function handleNavDrop(e) {
    e.stopPropagation(); this.style.boxShadow = '';
    if (draggedNav !== this) {
        const container = document.getElementById('navControlsRow');
        const allItems = [...container.querySelectorAll('.draggable-nav')];
        const draggedIdx = allItems.indexOf(draggedNav);
        const targetIdx = allItems.indexOf(this);
        
        if (draggedIdx < targetIdx) { this.after(draggedNav); } else { this.before(draggedNav); }
        const newOrder = [...container.querySelectorAll('.draggable-nav')].map(el => el.id);
        localStorage.setItem('vibeNavOrder', JSON.stringify(newOrder));
    }
    return false;
}

function initNavDragDrop() {
    const savedOrder = JSON.parse(localStorage.getItem('vibeNavOrder'));
    const container = document.getElementById('navControlsRow');
    if (savedOrder) {
        savedOrder.forEach(id => {
            const el = document.getElementById(id);
            if (el) container.appendChild(el);
        });
        container.appendChild(document.getElementById('importFile'));
    }
    document.querySelectorAll('.draggable-nav').forEach(el => {
        el.addEventListener('dragstart', handleNavDragStart);
        el.addEventListener('dragover', handleNavDragOver);
        el.addEventListener('dragleave', handleNavDragLeave);
        el.addEventListener('drop', handleNavDrop);
        el.addEventListener('dragend', handleNavDragEnd);
    });
}

function toggleDropdown(event) {
    event.stopPropagation();
    document.getElementById('dataDropdown').classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-menu");
        for (var i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
        }
    }
}

function playAlarm(overrideType = null) {
    if (!settings.soundEnabled && overrideType === null) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const type = overrideType || settings.soundType;

        if (type === 'classic') {
            for(let i = 0; i < 3; i++) {
                let offset = i * 1.2;
                const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain();
                osc1.connect(gain1); gain1.connect(ctx.destination);
                osc1.type = 'sine'; osc1.frequency.setValueAtTime(880, ctx.currentTime + offset);
                gain1.gain.setValueAtTime(1, ctx.currentTime + offset); gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.5);
                osc1.start(ctx.currentTime + offset); osc1.stop(ctx.currentTime + offset + 0.5);

                const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
                osc2.connect(gain2); gain2.connect(ctx.destination);
                osc2.type = 'sine'; osc2.frequency.setValueAtTime(880, ctx.currentTime + offset + 0.6);
                gain2.gain.setValueAtTime(1, ctx.currentTime + offset + 0.6); gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 1.1);
                osc2.start(ctx.currentTime + offset + 0.6); osc2.stop(ctx.currentTime + offset + 1.1);
            }
        } else if (type === 'chime') {
            for(let i = 0; i < 3; i++) {
                let offset = i * 1.5;
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.setValueAtTime(1046.50, ctx.currentTime + offset);
                gain.gain.setValueAtTime(1, ctx.currentTime + offset); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 1.5);
                osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 1.5);
            }
        } else if (type === 'digital') {
            for(let burst = 0; burst < 3; burst++) {
                let offset = burst * 0.8;
                for(let i=0; i<3; i++) {
                    const time = ctx.currentTime + offset + (i * 0.15);
                    const osc = ctx.createOscillator(); const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.type = 'square'; osc.frequency.setValueAtTime(800, time);
                    gain.gain.setValueAtTime(0.15, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                    osc.start(time); osc.stop(time + 0.1);
                }
            }
        } else if (type === 'chord') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            for(let repeat = 0; repeat < 3; repeat++) {
                let offset = repeat * 1.0;
                notes.forEach((freq, i) => {
                    const time = ctx.currentTime + offset + (i * 0.12);
                    const osc = ctx.createOscillator(); const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time);
                    gain.gain.setValueAtTime(0.3, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);
                    osc.start(time); osc.stop(time + 0.6);
                });
            }
        }
    } catch(e) { console.log("Audio not supported"); }
}

function testSound() { playAlarm(document.getElementById('soundTypeSelect').value); }

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function showNotification(title, msg) {
    if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: msg });
    } else { alert(title + " - " + msg); }
}

function setCustomReminder() {
    const msg = document.getElementById('customRemMsg').value;
    const mins = parseInt(document.getElementById('customRemTime').value);
    if(!msg || !mins || mins <= 0) { alert("Please enter a valid message and time."); return; }
    setTimeout(() => { playAlarm(); showNotification("🔔 REMINDER", toTitleCase(msg)); }, mins * 60 * 1000);
    document.getElementById('customRemMsg').value = ''; document.getElementById('customRemTime').value = '';
    alert(`Reminder set for ${mins} minute(s) from now!`);
}

function openModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = 'flex'; void modal.offsetWidth; modal.classList.add('show');
    if(id === 'statsModal') renderStats();
    if(id === 'examModal') renderExams();
    if(id === 'habitsModal') renderHabitBlueprint();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('show'); setTimeout(() => modal.style.display = 'none', 300);
}

function toggleSettingsCheck(inputId) {
    const input = document.getElementById(inputId); input.checked = !input.checked;
    document.getElementById(inputId + 'Check').classList.toggle('checked', input.checked);
    if(input.onchange) input.onchange(); 
}

function applySettings() {
    document.documentElement.style.setProperty('--primary', settings.theme);
    document.documentElement.style.setProperty('--bg-dim', `rgba(0,0,0,${settings.dim})`);
    
    document.getElementById('bgDimSlider').value = settings.dim;
    document.getElementById('workTimeInput').value = settings.workTime || 25;
    document.getElementById('breakTimeInput').value = settings.breakTime || 5;
    
    document.getElementById('soundToggle').checked = settings.soundEnabled;
    document.getElementById('soundToggleCheck').classList.toggle('checked', settings.soundEnabled);

    document.getElementById('soundTypeSelect').value = settings.soundType || 'classic';
    
    document.getElementById('notifToggle').checked = settings.notificationsEnabled;
    document.getElementById('notifToggleCheck').classList.toggle('checked', settings.notificationsEnabled);

    document.getElementById('workMsgInput').value = settings.workMsg || "Time For A Break! ☕";
    document.getElementById('breakMsgInput').value = settings.breakMsg || "Back To Work! 🚀";
    
    let hInput = document.getElementById('hundredMsgInput');
    if(hInput) hInput.value = settings.hundredPercentMsg;
    
    document.querySelectorAll('.color-swatch').forEach(s => {
        if(s.style.background === settings.theme) s.classList.add('active');
    });

    document.getElementById('btnWork').innerText = `WORK (${settings.workTime || 25}m)`;
    document.getElementById('btnBreak').innerText = `BREAK (${settings.breakTime || 5}m)`;
    
    if (!isRunning) setTimerMode(currentMode);
}

function setThemeColor(color, element) {
    settings.theme = color; document.documentElement.style.setProperty('--primary', color);
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    if(element && element.classList.contains('color-swatch')) element.classList.add('active');
}

function updateDimming() {
    const val = document.getElementById('bgDimSlider').value;
    document.documentElement.style.setProperty('--bg-dim', `rgba(0,0,0,${val})`);
}

function saveSettings() {
    settings.dim = document.getElementById('bgDimSlider').value;
    
    let newWorkTime = parseInt(document.getElementById('workTimeInput').value);
    let newBreakTime = parseInt(document.getElementById('breakTimeInput').value);
    settings.workTime = newWorkTime > 0 ? newWorkTime : 25;
    settings.breakTime = newBreakTime > 0 ? newBreakTime : 5;
    
    settings.soundEnabled = document.getElementById('soundToggle').checked;
    settings.soundType = document.getElementById('soundTypeSelect').value;
    settings.notificationsEnabled = document.getElementById('notifToggle').checked;
    settings.workMsg = document.getElementById('workMsgInput').value.trim() || "Time For A Break! ☕";
    settings.breakMsg = document.getElementById('breakMsgInput').value.trim() || "Back To Work! 🚀";

    let hInput = document.getElementById('hundredMsgInput');
    if(hInput) settings.hundredPercentMsg = hInput.value.trim() || "Solid work today. You did what you promised yourself. Now rest, reset, and bring the same discipline tomorrow. The streak continues.";

    localStorage.setItem('vibeSettings', JSON.stringify(settings));
    syncToFirebase();

    document.getElementById('btnWork').innerText = `WORK (${settings.workTime}m)`;
    document.getElementById('btnBreak').innerText = `BREAK (${settings.breakTime}m)`;
    if(!isRunning) setTimerMode(currentMode);
}

let bgInterval;
function initBackground() {
    const bgContainer = document.getElementById('bgContainer');
    bgContainer.innerHTML = ''; clearInterval(bgInterval);
    
    const hour = new Date().getHours();
    let gradients = [];

    if (hour >= 6 && hour < 12) {
        gradients = [
            'linear-gradient(135deg, #1a0b2e, #4b1d52)', 
            'linear-gradient(135deg, #2b0f4c, #60214f)',
            'linear-gradient(135deg, #1f0b38, #59233f)'
        ];
    } else if (hour >= 12 && hour < 18) {
        gradients = [
            'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', 
            'linear-gradient(135deg, #141e30, #243b55)',
            'linear-gradient(135deg, #0d1b2a, #1b263b)'
        ];
    } else {
        gradients = [
            'linear-gradient(135deg, #050505, #12001c, #0a001a)', 
            'linear-gradient(135deg, #000000, #0f0c29, #302b63)',
            'linear-gradient(135deg, #050505, #1a001a)'
        ];
    }

    gradients.forEach((grad, i) => {
        const div = document.createElement('div');
        div.className = `bg-slide ${i === 0 ? 'bg-active' : ''}`;
        div.style.background = grad; bgContainer.appendChild(div);
    });
    
    let currentIdx = 0;
    bgInterval = setInterval(() => {
        const slides = document.querySelectorAll('.bg-slide');
        if (slides.length > 1) {
            slides[currentIdx].classList.remove('bg-active');
            currentIdx = (currentIdx + 1) % slides.length;
            slides[currentIdx].classList.add('bg-active');
        }
    }, 20000); 
}

let timerInterval; let timeLeft = 25 * 60; let isRunning = false; let currentMode = 'work';

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    const timeString = `${m}:${s}`;
    document.getElementById('timerDisplay').innerText = timeString;
    if(isRunning) { document.title = `(${timeString}) PLANNER`; } else { document.title = `PLANNER`; }
}

function setTimerMode(mode) {
    if(isRunning) toggleTimer(); 
    currentMode = mode;
    document.getElementById('btnWork').classList.toggle('active', mode === 'work');
    document.getElementById('btnBreak').classList.toggle('active', mode === 'break');
    let wTime = settings.workTime || 25; let bTime = settings.breakTime || 5;
    timeLeft = mode === 'work' ? wTime * 60 : bTime * 60; updateTimerDisplay();
}

function toggleTimer() {
    const btn = document.getElementById('btnTimerStart');
    if (isRunning) {
        clearInterval(timerInterval); isRunning = false; btn.innerText = "START"; updateTimerDisplay();
    } else {
        isRunning = true; btn.innerText = "PAUSE";
        timerInterval = setInterval(() => {
            timeLeft--; updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval); isRunning = false; btn.innerText = "START";
                confetti({ particleCount: 150, spread: 80 }); playAlarm();
                let msg = currentMode === 'work' ? settings.workMsg : settings.breakMsg;
                showNotification("TIMER FINISHED", msg);
                setTimerMode(currentMode === 'work' ? 'break' : 'work');
            }
        }, 1000);
    }
}

function resetTimer() { setTimerMode(currentMode); }

function save() { localStorage.setItem('vibeProFinal', JSON.stringify(dailyData)); syncToFirebase(); }

/* --- 🔥 ULTIMATE STREAK LOGIC: 70% PROPORTIONAL THRESHOLD --- */
function calculateStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    let streak = 0;
    
    const sortedDates = Object.keys(dailyData).sort();

    sortedDates.forEach(dateStr => {
        let tasks = dailyData[dateStr] || []; 
        let totalTasks = tasks.length;
        
        if (dateStr < todayStr || dateStr === todayStr) {
            if (totalTasks > 0) {
                let dailyPercent = 0;
                let weightPerTask = 100 / totalTasks;

                tasks.forEach(task => {
                    if (task.subtasks && task.subtasks.length > 0) {
                        let doneSubtasks = task.subtasks.filter(st => st.done).length;
                        let subtaskRatio = doneSubtasks / task.subtasks.length;
                        dailyPercent += (subtaskRatio * weightPerTask);
                    } else {
                        if (task.done) dailyPercent += weightPerTask;
                    }
                });

                let finalDayScore = Math.round(dailyPercent);

                if (dateStr < todayStr) {
                    if (finalDayScore >= 70) {
                        streak += 1; 
                    } else {
                        streak = 0; 
                    }
                } else if (dateStr === todayStr) {
                    if (finalDayScore >= 70) {
                        streak += 1;
                    }
                }
            } else if (dateStr < todayStr) {
                streak = 0; // Empty day penalty
            }
        }
    });

    const streakElement = document.getElementById('streakCount');
    if(streakElement) streakElement.innerText = streak;
}

/* --- 🔥 UPGRADED: PROPORTIONAL PROGRESS BAR UPDATE --- */
function updateProgress(date) {
    const tasks = dailyData[date] || [];
    
    if (tasks.length === 0) {
        if(document.getElementById(`prog-${date}`)) document.getElementById(`prog-${date}`).style.width = "0%";
        if(document.getElementById(`perc-${date}`)) document.getElementById(`perc-${date}`).innerText = "0%";
        return;
    }

    let totalPercent = 0;
    let weightPerTask = 100 / tasks.length;

    tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
            let doneSubtasks = task.subtasks.filter(st => st.done).length;
            let subtaskRatio = doneSubtasks / task.subtasks.length;
            totalPercent += (subtaskRatio * weightPerTask);
        } else {
            if (task.done) {
                totalPercent += weightPerTask;
            }
        }
    });

    const finalPercent = Math.round(totalPercent);
    if(document.getElementById(`prog-${date}`)) document.getElementById(`prog-${date}`).style.width = finalPercent + "%";
    if(document.getElementById(`perc-${date}`)) document.getElementById(`perc-${date}`).innerText = finalPercent + "%";
}

/* --- 🔥 HABIT BLUEPRINT & AUTO-INJECT LOGIC --- */
function addHabit() {
    const name = toTitleCase(document.getElementById('habitName').value.trim());
    if(!name) return;
    
    // Add "🔄 " prefix to visually distinguish it as a habit
    const habitText = "🔄 " + name;
    habitBlueprint.push({ id: Date.now(), text: habitText }); 
    localStorage.setItem('vibeHabits', JSON.stringify(habitBlueprint)); 
    syncToFirebase();
    document.getElementById('habitName').value = ''; 
    renderHabitBlueprint();

    // Auto-inject to today if today exists
    const todayStr = new Date().toISOString().split('T')[0];
    if(dailyData[todayStr]) {
        if(!dailyData[todayStr].some(t => t.text === habitText)) {
            dailyData[todayStr].push({ text: habitText, priority: 'prio-med', done: false });
            save();
            const ul = document.getElementById(`list-${todayStr}`);
            if(ul) {
                ul.innerHTML = ''; 
                dailyData[todayStr].forEach((t, i) => renderTask(todayStr, t, i));
            }
            updateProgress(todayStr); calculateStreak();
        }
    }
}

function removeHabit(id) {
    habitBlueprint = habitBlueprint.filter(h => h.id !== id); 
    localStorage.setItem('vibeHabits', JSON.stringify(habitBlueprint)); 
    syncToFirebase(); 
    renderHabitBlueprint();
}

function renderHabitBlueprint() {
    const container = document.getElementById('habitList');
    if(habitBlueprint.length === 0) { 
        container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO HABITS SET</p>`; 
        return; 
    }
    container.innerHTML = habitBlueprint.map(habit => `
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary); box-shadow: 0 0 10px rgba(0,0,0,0.5);">
            <div style="font-weight: 900; font-size: 0.9rem;">${habit.text}</div>
            <button class="task-del" onclick="removeHabit(${habit.id})">×</button>
        </div>
    `).join('');
}


/* --- 🔥 UPGRADED: SMART ROLLOVER WITH HABIT INJECTOR --- */
function checkRollover() {
    const todayStr = new Date().toISOString().split('T')[0];
    let changed = false;
    
    // Check past days for incomplete tasks
    Object.keys(dailyData).forEach(dateStr => {
        if (dateStr < todayStr) {
            dailyData[dateStr].forEach(task => {
                if (!task.done && !task.rolledOver) {
                    task.rolledOver = true;
                    
                    if (!dailyData[todayStr]) { 
                        dailyData[todayStr] = []; changed = true; 
                        // Inject habits if this triggers the creation of "today"
                        habitBlueprint.forEach(h => {
                            dailyData[todayStr].push({ text: h.text, priority: 'prio-med', done: false });
                        });
                    }
                    
                    // Don't rollover recurring habits (they are auto-injected anyway, keeps list clean)
                    if (task.text.startsWith("🔄 ")) return;

                    if (!dailyData[todayStr].some(t => t.text === task.text)) {
                        let newTask = { 
                            text: task.text, 
                            priority: task.priority || 'prio-low', 
                            done: false,
                            stCollapsed: task.stCollapsed || false
                        };
                        
                        if (task.subtasks && task.subtasks.length > 0) {
                            let pendingSubtasks = task.subtasks.filter(st => !st.done);
                            if (pendingSubtasks.length > 0) {
                                newTask.subtasks = pendingSubtasks.map(st => ({ text: st.text, done: false }));
                            }
                        }
                        
                        dailyData[todayStr].push(newTask);
                        changed = true;
                    }
                }
            });
        }
    });

    // If today was completely skipped and never initialized above, initialize it here with habits
    if (!dailyData[todayStr] && habitBlueprint.length > 0) {
        dailyData[todayStr] = [];
        habitBlueprint.forEach(h => {
            dailyData[todayStr].push({ text: h.text, priority: 'prio-med', done: false });
        });
        changed = true;
    }
    
    if (changed) { save(); calculateStreak(); }
}

function sortTasks(date) {
    const priorityMap = { 'prio-high': 1, 'prio-med': 2, 'prio-low': 3 };
    if(dailyData[date]) { dailyData[date].sort((a, b) => priorityMap[a.priority || 'prio-low'] - priorityMap[b.priority || 'prio-low']); }
}

function scrollToToday(instant = false) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!dailyData[todayStr]) { 
        document.getElementById('datePicker').value = todayStr; 
        createDay(instant); 
    } else {
        const card = document.getElementById(`card-${todayStr}`);
        if (card) card.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    }
}

function createDay(instant = false) {
    const date = document.getElementById('datePicker').value; if(!date || dailyData[date]) return;
    dailyData[date] = []; 
    
    // Inject Habits into the new day
    habitBlueprint.forEach(h => {
        dailyData[date].push({ text: h.text, priority: 'prio-med', done: false });
    });

    save(); const container = document.getElementById('daily-container');
    container.innerHTML = ''; Object.keys(dailyData).sort().forEach(d => renderDailyCard(d));
    setTimeout(() => { 
        const card = document.getElementById(`card-${date}`);
        if(card) card.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); 
    }, 100);
}

function createMonth() {
    const monthVal = document.getElementById('monthPicker').value; 
    if (!monthVal) { alert("Please select a month first!"); return; }
    const [year, month] = monthVal.split('-'); const daysInMonth = new Date(year, month, 0).getDate(); let changed = false;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
        if (!dailyData[dateStr]) { 
            dailyData[dateStr] = []; 
            // Inject Habits into every day of the month
            habitBlueprint.forEach(h => {
                dailyData[dateStr].push({ text: h.text, priority: 'prio-med', done: false });
            });
            changed = true; 
        }
    }
    if (changed) {
        save(); const container = document.getElementById('daily-container'); container.innerHTML = ''; 
        Object.keys(dailyData).sort().forEach(d => renderDailyCard(d));
        const firstDayStr = `${year}-${month}-01`;
        setTimeout(() => {
            const card = document.getElementById(`card-${firstDayStr}`);
            if(card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); 
    } else { alert("All days for this month are already in your planner!"); }
}

function renderDailyCard(date) {
    const todayStr = new Date().toISOString().split('T')[0]; const isToday = date === todayStr;
    const card = document.createElement('div'); card.className = `card ${isToday ? 'today-card' : ''}`; card.id = `card-${date}`;
    card.innerHTML = `
        <div class="card-header">
            <h3>📅 ${new Date(date).toDateString().toUpperCase()}</h3>
            <span id="perc-${date}" style="font-size:0.85rem; opacity:0.9; font-weight:900; color:var(--primary); text-shadow: 0 0 10px var(--primary);">0%</span>
        </div>
        <div class="progress-container"><div class="progress-fill" id="prog-${date}"></div></div>
        <div class="input-group">
            <input type="text" id="in-${date}" placeholder="TASK..." onkeydown="if(event.key==='Enter') addTask('${date}')">
            <select id="prio-${date}"><option value="prio-high" selected>HIGH</option><option value="prio-med">MED</option><option value="prio-low">LOW</option></select>
            <button class="add-btn" onclick="addTask('${date}')">+</button>
        </div>
        <ul id="list-${date}" ondragover="handleDragOverUl(event)" ondrop="handleDropUl(event, '${date}')" style="min-height: 50px; padding-bottom: 20px;"></ul>
        <button class="remove-day-btn" onclick="removeDay('${date}')">REMOVE DAY</button>
    `;
    document.getElementById('daily-container').appendChild(card); init3DTilt(card);
    sortTasks(date); dailyData[date].forEach((t, idx) => renderTask(date, t, idx)); updateProgress(date);
}

function addTask(date) {
    const val = document.getElementById(`in-${date}`).value, prio = document.getElementById(`prio-${date}`).value; if(!val) return;
    dailyData[date].push({ text: toTitleCase(val.trim()), priority: prio, done: false }); sortTasks(date);
    const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); save(); calculateStreak(); document.getElementById(`in-${date}`).value = "";
}

let dragSourceDay = null;
function handleDragStartDay(e) { dragSourceDay = this; e.dataTransfer.effectAllowed = 'move'; this.style.opacity = '0.4'; }
function handleDragOverDay(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.style.borderTop = '2px solid var(--primary)'; return false; }
function handleDragLeaveDay(e) { this.style.borderTop = ''; }
function handleDragEndDay(e) { this.style.opacity = '1'; document.querySelectorAll('li').forEach(li => li.style.borderTop = ''); }

function handleDropDay(e) {
    e.stopPropagation(); this.style.borderTop = '';
    if (dragSourceDay && dragSourceDay !== this) {
        const targetDate = this.dataset.date;
        const sourceDate = dragSourceDay.dataset.date;
        const fromIdx = parseInt(dragSourceDay.dataset.index);
        const toIdx = parseInt(this.dataset.index);

        let [movedItem] = dailyData[sourceDate].splice(fromIdx, 1);
        dailyData[targetDate].splice(toIdx, 0, movedItem);

        if (sourceDate !== targetDate) {
            const fromUl = document.getElementById(`list-${sourceDate}`);
            fromUl.innerHTML = ''; dailyData[sourceDate].forEach((t, i) => renderTask(sourceDate, t, i));
            updateProgress(sourceDate);
        }

        save();
        const toUl = document.getElementById(`list-${targetDate}`);
        toUl.innerHTML = ''; dailyData[targetDate].forEach((t, i) => renderTask(targetDate, t, i));
        updateProgress(targetDate); calculateStreak();
    }
    return false;
}

function handleDragOverUl(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

function handleDropUl(e, targetDate) {
    e.preventDefault();
    if (e.target.id === `list-${targetDate}` && dragSourceDay) {
        const sourceDate = dragSourceDay.dataset.date;
        const fromIdx = parseInt(dragSourceDay.dataset.index);

        let [movedItem] = dailyData[sourceDate].splice(fromIdx, 1);
        dailyData[targetDate].push(movedItem); 

        if (sourceDate !== targetDate) {
            const fromUl = document.getElementById(`list-${sourceDate}`);
            fromUl.innerHTML = ''; dailyData[sourceDate].forEach((t, i) => renderTask(sourceDate, t, i));
            updateProgress(sourceDate);
        }

        save();
        const toUl = document.getElementById(`list-${targetDate}`);
        toUl.innerHTML = ''; dailyData[targetDate].forEach((t, i) => renderTask(targetDate, t, i));
        updateProgress(targetDate); calculateStreak();
    }
}

function renderTask(date, task, idx) {
    const todayStr = new Date().toISOString().split('T')[0];
    const li = document.createElement('li'); 
    
    if (task.rolledOver || (date < todayStr && !task.done)) li.classList.add('missed-task');
    
    li.draggable = true; li.dataset.index = idx; li.dataset.date = date;
    li.addEventListener('dragstart', handleDragStartDay); li.addEventListener('dragover', handleDragOverDay);
    li.addEventListener('dragleave', handleDragLeaveDay); li.addEventListener('drop', handleDropDay); li.addEventListener('dragend', handleDragEndDay);
    
    let subtasksHTML = '';
    let hasSubtasks = task.subtasks && task.subtasks.length > 0;
    let toggleBtnHTML = hasSubtasks ? `<button class="collapse-subtask-btn" onclick="toggleSubtaskList('${date}', ${idx})" title="Toggle Subtasks">${task.stCollapsed ? '▶' : '▼'}</button>` : '';
    
    if(hasSubtasks) {
        subtasksHTML = `<ul class="subtask-list" style="display: ${task.stCollapsed ? 'none' : 'block'};">`;
        task.subtasks.forEach((st, sIdx) => {
            let stClass = "";
            if (st.done) stClass = "done";
            
            let liClass = "subtask-item";
            if (date < todayStr && !st.done) liClass += " missed-task";

            subtasksHTML += `
                <li class="${liClass}">
                    <div class="custom-checkbox ${st.done ? 'checked' : ''}" style="width: 14px; height: 14px; border-width: 1px;" onclick="handleSubtaskCheck('${date}', ${idx}, ${sIdx})"></div>
                    <span class="subtask-text ${stClass}" contenteditable="${date >= todayStr}" onblur="editSubtask('${date}', ${idx}, ${sIdx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">
                        ${st.text}
                    </span>
                    <button class="task-del" style="font-size: 0.9rem;" onclick="removeSubtask('${date}', ${idx}, ${sIdx})">×</button>
                </li>
            `;
        });
        subtasksHTML += '</ul>';
    }

    li.style.flexDirection = 'column'; li.style.alignItems = 'stretch';
    
    li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
            <div class="prio-dot ${task.priority || 'prio-low'}" onclick="cyclePriority(this, '${date}', ${idx})" title="Click to change priority"></div>
            <div class="custom-checkbox ${task.done ? 'checked' : ''}" onclick="handleCheck('${date}', ${idx}, this)"></div> 
            ${toggleBtnHTML}
            <span class="task-text ${task.done ? 'done' : ''}" contenteditable="${date >= todayStr}" onblur="editTask('${date}', ${idx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">
                ${task.rolledOver ? '❌ Missed: ' + task.text : task.text}
            </span>
            <button class="add-subtask-btn" onclick="toggleSubtaskInput('${date}', ${idx})" title="Add Subtask">↳</button>
            <button class="task-del" onclick="removeSpecificTask('${date}', ${idx}, this)">×</button>
        </div>
        ${subtasksHTML}
        <div class="subtask-input-container" id="st-in-cont-${date}-${idx}">
            <input type="text" class="subtask-input" id="st-in-${date}-${idx}" placeholder="NEW SUBTASK..." onkeydown="if(event.key==='Enter') addSubtask('${date}', ${idx})">
            <button class="add-btn" style="padding: 4px 10px; font-size: 0.65rem;" onclick="addSubtask('${date}', ${idx})">+</button>
        </div>
    `;
    document.getElementById(`list-${date}`).appendChild(li);
}

function editTask(date, idx, element) {
    let newText = toTitleCase(element.innerText.replace('❌ Missed: ', '').replace('❌ MISSED: ', '').trim());
    if (newText === "") { element.innerText = dailyData[date][idx].text; return; }
    dailyData[date][idx].text = newText; save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = '';
    dailyData[date].forEach((t, i) => renderTask(date, t, i));
}

function cyclePriority(dot, date, idx) {
    let task = dailyData[date][idx]; const priorities = ['prio-high', 'prio-med', 'prio-low'];
    let currentIdx = priorities.indexOf(task.priority || 'prio-low'); task.priority = priorities[(currentIdx + 1) % priorities.length];
    sortTasks(date); save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
}

function showCelebrationModal() {
    let modal = document.getElementById('celebModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'celebModal';
        modal.className = 'modal-overlay custom-celeb-overlay';
        modal.innerHTML = `
            <div class="modal-card celeb-card">
                <h2>🏆 BEAST MODE ACTIVATED</h2>
                <p id="celebMsgText" style="text-align:center; font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.8); margin-bottom: 25px; font-weight: 800; letter-spacing: 1px; white-space: pre-wrap;"></p>
                <button class="action-btn accent" style="width: 100%; padding: 14px; font-size: 0.9rem;" onclick="closeModal('celebModal')">STAY HARD 🔥</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('celebMsgText').innerText = settings.hundredPercentMsg;
    openModal('celebModal');
}

function handleCheck(date, idx, checkboxElement) {
    let task = dailyData[date][idx];
    if(task) {
        task.done = !task.done; 
        
        if(task.subtasks) task.subtasks.forEach(st => st.done = task.done);
        
        save(); 
        const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
        updateProgress(date); calculateStreak();

        let totalTasks = dailyData[date].length;
        let doneTasks = dailyData[date].filter(t => t.done).length;

        if (task.done && totalTasks > 0 && doneTasks === totalTasks) {
            confetti({ particleCount: 30, spread: 50, origin: { x: 0.2, y: 0.6 }, zIndex: 9999 }); 
            setTimeout(() => confetti({ particleCount: 30, spread: 50, origin: { x: 0.8, y: 0.6 }, zIndex: 9999 }), 200); 
            setTimeout(() => confetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 }), 400); 
            
            setTimeout(() => {
                showCelebrationModal();
            }, 800);
        } else if (task.done) {
            confetti({ particleCount: 40, origin: { y: 0.8 }, colors: [settings.theme, '#00ff88'] });
        }
    }
}

function removeSpecificTask(date, idx) { 
    dailyData[date].splice(idx, 1); const ul = document.getElementById(`list-${date}`); ul.innerHTML = '';
    dailyData[date].forEach((t, i) => renderTask(date, t, i)); updateProgress(date); save(); calculateStreak(); 
}

function removeDay(date) { 
    if(confirm(`Remove entire day: ${date}?`)) {
        delete dailyData[date]; document.getElementById(`card-${date}`).remove(); save(); calculateStreak(); 
    }
}

function scrollTimeline(amount) { document.getElementById('daily-container').scrollBy({ left: amount, behavior: 'smooth' }); }

function addGoal(type) {
    const inp = document.getElementById(`in-${type}`); if(!inp.value) return;
    const saved = JSON.parse(localStorage.getItem(type)) || [];
    saved.push({text: toTitleCase(inp.value.trim()), done: false}); localStorage.setItem(type, JSON.stringify(saved));
    syncToFirebase();
    renderGoal(type, toTitleCase(inp.value.trim()), false, saved.length - 1); inp.value = "";
}

function renderGoal(type, text, done, idx) {
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="custom-checkbox ${done ? 'checked' : ''}" onclick="handleGoalCheck('${type}', ${idx}, this)"></div> 
        <span class="task-text ${done ? 'done' : ''}" contenteditable="true" onblur="editGoal('${type}', ${idx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">${text}</span>
        <button class="task-del" onclick="removeGoal('${type}', ${idx}, this)">×</button>
    `;
    document.getElementById(`list-${type}`).appendChild(li);
}

function editGoal(type, idx, element) {
    let saved = JSON.parse(localStorage.getItem(type)); let text = element.innerText.trim();
    if (text === "") { element.innerText = saved[idx].text; return; }
    saved[idx].text = toTitleCase(text); localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase();
}

function handleGoalCheck(type, idx, checkboxElement) {
    let saved = JSON.parse(localStorage.getItem(type)), g = saved[idx];
    if(g) {
        g.done = !g.done; checkboxElement.classList.toggle('checked', g.done);
        checkboxElement.nextElementSibling.classList.toggle('done', g.done);
        if(g.done) confetti({ particleCount: 80, spread: 100 }); 
        localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase();
    }
}

function removeGoal(type, idx) { 
    let saved = JSON.parse(localStorage.getItem(type)); saved.splice(idx, 1);
    localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase();
    const ul = document.getElementById(`list-${type}`); ul.innerHTML = '';
    saved.forEach((g, i) => renderGoal(type, g.text, g.done, i));
}

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

function removeReport(id) {
    if(!confirm("Delete this archive?")) return;
    reports = reports.filter(r => r.id !== id); localStorage.setItem('vibeReports', JSON.stringify(reports));
    syncToFirebase(); renderReports();
}

function renderReports() {
    const reportArea = document.getElementById('report-list');
    if (reports.length === 0) { reportArea.innerHTML = `<p style="font-size:0.7rem; opacity:0.5; text-align:center; margin-top:30px;">NO ARCHIVES YET</p>`; return; }
    reportArea.innerHTML = reports.map(r => `
        <div style="padding: 12px; border-left: 3px solid var(--primary); background: rgba(0,0,0,0.3); margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.3)'" onclick="viewReport(${r.id})">
            <div>
                <div style="font-size: 0.8rem; color: var(--primary); font-weight:900;">${r.month}</div>
                <div style="font-size: 0.9rem;">${r.stats}</div>
                <div style="font-size: 0.65rem; opacity: 0.7;">${r.details}</div>
            </div>
            <button class="task-del" onclick="event.stopPropagation(); removeReport(${r.id})">×</button>
        </div>
    `).join('');
}

function viewReport(id) {
    const r = reports.find(rep => rep.id === id); if (!r) return;
    document.getElementById('reportModalTitle').innerText = `📊 ${r.month} REPORT`;
    
    let avgTasks = r.advanced && r.advanced.avgTasksPerDay ? r.advanced.avgTasksPerDay : "-";
    let completedActions = r.details.split('/')[0];
    let totalActions = r.details.split('/')[1].split(' ')[0];
    let missedActions = parseInt(totalActions) - parseInt(completedActions);
    
    let content = `<div style="display:flex; justify-content:space-between; background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); flex-wrap:wrap; gap:10px;">
        <div style="text-align:center; flex:1; min-width:80px;"><div style="font-size:1.6rem; color:var(--primary); font-weight:900;">${r.stats}</div><div style="font-size:0.6rem; opacity:0.7;">EFFICIENCY</div></div>
        <div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--done-green); font-weight:900;">${completedActions}</div><div style="font-size:0.6rem; opacity:0.7;">ACTIONS DONE</div></div>
        <div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--missed); font-weight:900;">${missedActions}</div><div style="font-size:0.6rem; opacity:0.7;">MISSED</div></div>
        <div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--med); font-weight:900;">${avgTasks}</div><div style="font-size:0.6rem; opacity:0.7;">AVG/DAY</div></div>
    </div>`;

    if (r.advanced) {
        let tSub = r.advanced.totalSubtasks || 0;
        let cSub = r.advanced.completedSubtasks || 0;
        
        content += `
        <div style="display:flex; gap: 10px; margin-bottom: 20px;">
            <div style="flex:1; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size:0.65rem; opacity:0.7; margin-bottom: 5px; letter-spacing: 1px;">MAIN TASKS</div>
                <div style="font-size:1.2rem; font-weight:900; color:var(--primary);">${r.advanced.completedTasks} <span style="font-size:0.8rem; opacity:0.5;">/ ${r.advanced.totalTasks}</span></div>
            </div>
            <div style="flex:1; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size:0.65rem; opacity:0.7; margin-bottom: 5px; letter-spacing: 1px;">SUBTASKS CRUSHED</div>
                <div style="font-size:1.2rem; font-weight:900; color:var(--done-green);">${cSub} <span style="font-size:0.8rem; opacity:0.5;">/ ${tSub}</span></div>
            </div>
        </div>`;

        const p = r.advanced.prioStats;
        const hPerc = p.high.tot ? Math.round((p.high.done/p.high.tot)*100) : 0;
        const mPerc = p.med.tot ? Math.round((p.med.done/p.med.tot)*100) : 0;
        const lPerc = p.low.tot ? Math.round((p.low.done/p.low.tot)*100) : 0;
        content += `<h3 style="font-size:0.8rem; color:var(--primary); letter-spacing:2px; margin-bottom:10px;">MAIN TASK PRIORITY BREAKDOWN</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
            <div style="background:rgba(255,118,117,0.1); padding:10px; border-radius:8px; border:1px solid rgba(255,118,117,0.3); text-align:center;">
                <div style="color:var(--high); font-weight:900; margin-bottom:5px;">HIGH</div><div style="font-size:0.9rem;">${p.high.done}/${p.high.tot} <span style="font-size:0.7rem; opacity:0.7;">(${hPerc}%)</span></div>
            </div>
            <div style="background:rgba(253,203,110,0.1); padding:10px; border-radius:8px; border:1px solid rgba(253,203,110,0.3); text-align:center;">
                <div style="color:var(--med); font-weight:900; margin-bottom:5px;">MED</div><div style="font-size:0.9rem;">${p.med.done}/${p.med.tot} <span style="font-size:0.7rem; opacity:0.7;">(${mPerc}%)</span></div>
            </div>
            <div style="background:rgba(85,239,196,0.1); padding:10px; border-radius:8px; border:1px solid rgba(85,239,196,0.3); text-align:center;">
                <div style="color:var(--low); font-weight:900; margin-bottom:5px;">LOW</div><div style="font-size:0.9rem;">${p.low.done}/${p.low.tot} <span style="font-size:0.7rem; opacity:0.7;">(${lPerc}%)</span></div>
            </div>
        </div>`;

        if (r.advanced.dailyPercents && r.advanced.dailyPercents.length > 0) {
            let dp = r.advanced.dailyPercents;
            let svgW = 400, svgH = 100;
            let barTotalW = dp.length > 0 ? svgW / dp.length : 0;
            let barW = barTotalW * 0.75; 
            if(barW > 14) barW = 14; 
            
            let bars = "";
            dp.forEach((perc, i) => {
                let barH = (perc / 100) * svgH;
                if (barH < 2) barH = 2; 
                let x = (i * barTotalW) + (barTotalW / 2) - (barW / 2);
                let y = svgH - barH;
                
                bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--primary)" rx="3" style="cursor:pointer; transition: all 0.2s ease;" onmouseover="this.setAttribute('fill', 'var(--done-green)')" onmouseout="this.setAttribute('fill', 'var(--primary)')"><title>Day ${i+1}: ${perc}%</title></rect>`;
            });

            let gridLines = "";
            [100, 75, 50, 25, 0].forEach(p => {
                let yVal = svgH - (p / 100 * svgH);
                gridLines += `<line x1="0" y1="${yVal}" x2="${svgW}" y2="${yVal}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="3,3"/>`;
                gridLines += `<text x="-10" y="${yVal + 3}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="end" font-weight="900">${p}%</text>`;
            });

            content += `<h3 style="font-size:0.8rem; color:var(--primary); letter-spacing:2px; margin-bottom:15px; margin-top:10px;">📈 DAILY CONSISTENCY</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 20px 15px 15px 45px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px; width: 100%; box-sizing: border-box;">
                <svg viewBox="-45 -10 455 120" style="width:100%; height:auto; overflow:visible; display:block;">
                    ${gridLines}
                    ${bars}
                </svg>
            </div>`;
        }

    } else { content += `<div style="text-align:center; opacity:0.5; font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px;">Advanced stats are only available for months archived after adding the new update.</div>`; }
    
    document.getElementById('reportModalContent').innerHTML = content; openModal('reportModal');
}

function renderStats() {
    const content = document.getElementById('statsContent'); content.innerHTML = '';
    let chartData = []; let labels = []; let rowsHTML = '';
    for(let i=6; i>=0; i--) {
        let d = new Date(); d.setDate(d.getDate() - i); let dStr = d.toISOString().split('T')[0];
        let tasks = dailyData[dStr] || []; let total = tasks.length, done = tasks.filter(t => t.done).length;
        let perc = total === 0 ? 0 : Math.round((done/total)*100);
        chartData.push(perc); labels.push(new Date(dStr).toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase());
        rowsHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom: 12px;">
                <span style="width: 60px;">${labels[6-i]}</span>
                <div style="flex-grow:1; margin: 0 15px; background:rgba(255,255,255,0.1); border-radius:6px; height:12px; overflow:hidden; min-width: 150px;">
                    <div style="width:${perc}%; background:${perc === 100 ? 'var(--done-green)' : 'var(--primary)'}; height:100%; box-shadow: 0 0 10px ${perc === 100 ? 'var(--done-green)' : 'var(--primary)'};"></div>
                </div>
                <span style="width: 45px; text-align:right;">${perc}%</span>
            </div>
        `;
    }
    
    let svgWidth = 400, xStep = svgWidth / 6, pathD = "", circles = "", xLabels = "";
    chartData.forEach((perc, index) => {
        let x = index * xStep; let y = 200 - (perc / 100 * 180); 
        pathD += index === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
        circles += `<circle cx="${x}" cy="${y}" r="6" fill="var(--done-green)" stroke="#111" stroke-width="2" style="filter: drop-shadow(0 0 8px var(--done-green)); cursor: pointer; transition: all 0.3s;" onmouseover="this.setAttribute('r', '10'); this.style.filter='drop-shadow(0 0 15px var(--done-green))'" onmouseout="this.setAttribute('r', '6'); this.style.filter='drop-shadow(0 0 8px var(--done-green))'"/>`;
        xLabels += `<text x="${x}" y="225" fill="rgba(255,255,255,0.8)" font-size="12" text-anchor="middle" font-weight="900">${labels[index]}</text>`;
    });

    let gridLines = "";
    [100, 70, 50, 25, 0].forEach(p => {
        let yVal = 200 - (p / 100 * 180);
        gridLines += `<line x1="0" y1="${yVal}" x2="400" y2="${yVal}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="5,5"/>`;
        gridLines += `<text x="-10" y="${yVal + 4}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="end" font-weight="bold">${p}%</text>`;
    });

    content.innerHTML = `
        <div style="flex: 1; display:flex; justify-content:center; min-width:300px;">
            <svg viewBox="-45 0 465 250" style="width:100%; max-width: 450px; overflow:visible;">
                ${gridLines} <line x1="0" y1="20" x2="0" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="2"/> <line x1="0" y1="200" x2="400" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
                <path d="${pathD}" stroke="var(--primary)" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 10px var(--primary));"/>
                ${circles} ${xLabels}
            </svg>
        </div>
        <div style="flex: 1; display:flex; flex-direction:column; justify-content:center; min-width:250px;">${rowsHTML}</div>
    `;
}

function addExam() {
    const name = toTitleCase(document.getElementById('examName').value.trim());
    const date = document.getElementById('examDate').value;
    if(!name || !date) return;
    trackedExams.push({ id: Date.now(), name, date }); 
    localStorage.setItem('vibeExams', JSON.stringify(trackedExams)); 
    syncToFirebase();
    document.getElementById('examName').value = ''; 
    document.getElementById('examDate').value = ''; 
    renderExams();
}

function removeExam(id) {
    trackedExams = trackedExams.filter(e => e.id !== id); 
    localStorage.setItem('vibeExams', JSON.stringify(trackedExams)); 
    syncToFirebase(); 
    renderExams();
}

function renderExams() {
    const container = document.getElementById('examList');
    if(trackedExams.length === 0) { 
        container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO EXAMS TRACKED</p>`; 
        return; 
    }
    
    const today = new Date(); 
    today.setHours(0,0,0,0);
    
    let pending = [];
    let aced = [];

    trackedExams.forEach(exam => {
        const [year, month, day] = exam.date.split('-');
        const examDate = new Date(year, month - 1, day);
        const diffDays = Math.round((examDate - today) / (1000 * 60 * 60 * 24));
        
        exam.diffDays = diffDays;
        exam.examDateStr = examDate.toDateString().toUpperCase();

        if (diffDays < 0) {
            aced.push(exam);
        } else {
            pending.push(exam);
        }
    });

    pending.sort((a, b) => a.diffDays - b.diffDays);
    aced.sort((a, b) => b.diffDays - a.diffDays);

    let html = "";

    if (aced.length > 0) {
        html += `
        <details style="margin-bottom: 20px; outline: none;">
            <summary style="list-style: none; text-align: center; cursor: pointer; font-size: 1.5rem; filter: drop-shadow(0 0 10px rgba(0,255,136,0.4)); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                🏆
            </summary>
            <div style="margin-top: 15px; animation: fadeIn 0.3s ease;">
                ${aced.map(exam => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-bottom: 5px; border-radius: 8px; border: 1px solid rgba(0,255,136,0.1); background: rgba(0,255,136,0.05);">
                    <div>
                        <div style="font-weight: 900; font-size: 0.8rem; color: var(--done-green);">${exam.name}</div>
                        <div style="font-size: 0.65rem; opacity: 0.6;">${exam.examDateStr}</div>
                    </div>
                    <button class="task-del" style="font-size: 1.2rem; margin:0;" onclick="removeExam(${exam.id})">×</button>
                </div>`).join('')}
            </div>
            <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); margin: 15px 0;"></div>
        </details>`;
    }

    if (pending.length > 0) {
        html += pending.map(exam => {
            let dTxt = "", bCol = "var(--primary)";
            if (exam.diffDays > 0) dTxt = `${exam.diffDays} DAYS LEFT`;
            else if (exam.diffDays === 0) { dTxt = `TODAY! 🔥`; bCol = "var(--done-green)"; }

            return `
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${bCol}; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
                <div><div style="font-weight: 900; font-size: 0.9rem;">${exam.name}</div><div style="font-size: 0.7rem; opacity: 0.7;">${exam.examDateStr}</div></div>
                <div style="display: flex; align-items: center; gap: 15px;"><div style="font-weight: 900; font-size: 0.8rem; color: ${bCol}; text-shadow: 0 0 10px ${bCol};">${dTxt}</div><button class="task-del" onclick="removeExam(${exam.id})">×</button></div>
            </div>`;
        }).join('');
    } else if (aced.length === 0) {
        html += `<p style="text-align:center; opacity:0.5;">NO PENDING EXAMS</p>`;
    }

    container.innerHTML = html;
}

function exportBackup() {
    const backupData = { vibeProFinal: localStorage.getItem('vibeProFinal'), vibeReports: localStorage.getItem('vibeReports'), vibeExams: localStorage.getItem('vibeExams'), month: localStorage.getItem('month'), year: localStorage.getItem('year'), vibeSettings: localStorage.getItem('vibeSettings'), vibeNavOrder: localStorage.getItem('vibeNavOrder'), vibeHabits: localStorage.getItem('vibeHabits') };
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `VIBE_PLANNER_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importBackup(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            ['vibeProFinal', 'vibeReports', 'vibeExams', 'month', 'year', 'vibeSettings', 'vibeNavOrder', 'vibeHabits'].forEach(k => { if(data[k]) localStorage.setItem(k, data[k]); });
            alert("🔥 Planner Vibe Restored! Reloading...."); location.reload();
        } catch (err) { alert("❌ Invalid backup file!"); }
    }; reader.readAsText(file); event.target.value = '';
}

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault(); scrollToToday();
        const todayStr = new Date().toISOString().split('T')[0];
        const inp = document.getElementById(`in-${todayStr}`); if (inp) inp.focus();
    }
    if (event.key === 'Escape') { document.querySelectorAll('.modal-overlay').forEach(m => { if(m.classList.contains('show')) closeModal(m.id); }); }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered! 🚀', reg))
            .catch(err => console.log('Service Worker failed! ❌', err));
    });
}

function toggleSubtaskList(date, idx) {
    let task = dailyData[date][idx];
    task.stCollapsed = !task.stCollapsed;
    save();
    const ul = document.getElementById(`list-${date}`); ul.innerHTML = '';
    dailyData[date].forEach((t, i) => renderTask(date, t, i));
}

function toggleSubtaskInput(date, idx) {
    const cont = document.getElementById(`st-in-cont-${date}-${idx}`);
    cont.classList.toggle('show');
    if(cont.classList.contains('show')) document.getElementById(`st-in-${date}-${idx}`).focus();
}

function addSubtask(date, idx) {
    const input = document.getElementById(`st-in-${date}-${idx}`);
    const text = toTitleCase(input.value.trim()); if(!text) return;
    
    if(!dailyData[date][idx].subtasks) dailyData[date][idx].subtasks = [];
    dailyData[date][idx].subtasks.push({ text: text, done: false });
    dailyData[date][idx].done = false; 
    dailyData[date][idx].stCollapsed = false; 
    
    save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); calculateStreak();
}

function handleSubtaskCheck(date, tIdx, sIdx) {
    let st = dailyData[date][tIdx].subtasks[sIdx];
    st.done = !st.done;
    
    let allDone = dailyData[date][tIdx].subtasks.every(s => s.done);
    dailyData[date][tIdx].done = allDone; 
    
    save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); calculateStreak();

    let totalTasks = dailyData[date].length;
    let doneTasks = dailyData[date].filter(t => t.done).length;

    if (st.done && allDone && totalTasks > 0 && doneTasks === totalTasks) {
        confetti({ particleCount: 30, spread: 50, origin: { x: 0.2, y: 0.6 }, zIndex: 9999 }); 
        setTimeout(() => confetti({ particleCount: 30, spread: 50, origin: { x: 0.8, y: 0.6 }, zIndex: 9999 }), 200); 
        setTimeout(() => confetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 }), 400); 
        
        setTimeout(() => {
            showCelebrationModal();
        }, 800);
    } else if (st.done) {
        confetti({ particleCount: 20, spread: 40 });
    }
}

function editSubtask(date, tIdx, sIdx, element) {
    let text = toTitleCase(element.innerText.trim());
    if (text === "") { element.innerText = dailyData[date][tIdx].subtasks[sIdx].text; return; }
    dailyData[date][tIdx].subtasks[sIdx].text = text; save();
}

function removeSubtask(date, tIdx, sIdx) {
    dailyData[date][tIdx].subtasks.splice(sIdx, 1);
    if(dailyData[date][tIdx].subtasks.length > 0) {
        let allDone = dailyData[date][tIdx].subtasks.every(s => s.done);
        dailyData[date][tIdx].done = allDone;
    }
    save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); calculateStreak();
}