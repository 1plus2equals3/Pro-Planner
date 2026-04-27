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
    
    if (typeof isRunning !== 'undefined' && !isRunning) setTimerMode(currentMode);
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
    if(typeof isRunning !== 'undefined' && !isRunning) setTimerMode(currentMode);
}

let bgInterval;
function initBackground() {
    const bgContainer = document.getElementById('bgContainer');
    bgContainer.innerHTML = ''; clearInterval(bgInterval);
    const hour = new Date().getHours();
    let gradients = [];

    if (hour >= 6 && hour < 12) {
        gradients = ['linear-gradient(135deg, #1a0b2e, #4b1d52)', 'linear-gradient(135deg, #2b0f4c, #60214f)', 'linear-gradient(135deg, #1f0b38, #59233f)'];
    } else if (hour >= 12 && hour < 18) {
        gradients = ['linear-gradient(135deg, #0f2027, #203a43, #2c5364)', 'linear-gradient(135deg, #141e30, #243b55)', 'linear-gradient(135deg, #0d1b2a, #1b263b)'];
    } else {
        gradients = ['linear-gradient(135deg, #050505, #12001c, #0a001a)', 'linear-gradient(135deg, #000000, #0f0c29, #302b63)', 'linear-gradient(135deg, #050505, #1a001a)'];
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