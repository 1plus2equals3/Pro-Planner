let draggedNav = null;

// --- DRAG AND DROP LOGIC FOR HEADER NAV ---
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

// --- BACKUP & RESTORE DATA ---
function exportBackup() {
    const backupData = { 
        vibeProFinal: localStorage.getItem('vibeProFinal'), 
        vibeReports: localStorage.getItem('vibeReports'), 
        vibeExams: localStorage.getItem('vibeExams'), 
        month: localStorage.getItem('month'), 
        year: localStorage.getItem('year'), 
        vibeSettings: localStorage.getItem('vibeSettings'), 
        vibeNavOrder: localStorage.getItem('vibeNavOrder'), 
        vibeHabits: localStorage.getItem('vibeHabits') 
    };
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `VIBE_PLANNER_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
}

function importBackup(event) {
    const file = event.target.files[0]; if (!file) return; 
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            ['vibeProFinal', 'vibeReports', 'vibeExams', 'month', 'year', 'vibeSettings', 'vibeNavOrder', 'vibeHabits'].forEach(k => { 
                if(data[k]) localStorage.setItem(k, data[k]); 
            });
            alert("🔥 Planner Vibe Restored! Reloading...."); 
            location.reload();
        } catch (err) { alert("❌ Invalid backup file!"); }
    }; 
    reader.readAsText(file); 
    event.target.value = '';
}

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault(); 
        scrollToToday();
        const todayStr = new Date().toISOString().split('T')[0];
        const inp = document.getElementById(`in-${todayStr}`); 
        if (inp) inp.focus();
    }
    if (event.key === 'Escape') { 
        document.querySelectorAll('.modal-overlay').forEach(m => { 
            if(m.classList.contains('show')) closeModal(m.id); 
        }); 
    }
});

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered! 🚀', reg))
            .catch(err => console.log('Service Worker failed! ❌', err));
    });
}

// --- APP BOOTSTRAP (INITIALIZATION) ---
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