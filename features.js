// --- TIMER LOGIC ---
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

// --- HABITS ---
function addHabit() {
    const name = toTitleCase(document.getElementById('habitName').value.trim());
    if(!name) return;
    const habitText = "🔄 " + name;
    habitBlueprint.push({ id: Date.now(), text: habitText }); 
    localStorage.setItem('vibeHabits', JSON.stringify(habitBlueprint)); syncToFirebase();
    document.getElementById('habitName').value = ''; renderHabitBlueprint();

    const todayStr = new Date().toISOString().split('T')[0];
    let changed = false;

    Object.keys(dailyData).forEach(dateStr => {
        if (dateStr >= todayStr) {
            if (!dailyData[dateStr].some(t => t.text === habitText)) {
                dailyData[dateStr].push({ text: habitText, priority: 'prio-med', done: false });
                changed = true;
                const ul = document.getElementById(`list-${dateStr}`);
                if(ul) { ul.innerHTML = ''; dailyData[dateStr].forEach((t, i) => renderTask(dateStr, t, i)); }
                updateProgress(dateStr);
            }
        }
    });
    if (changed) { save(); calculateStreak(); }
}

function removeHabit(id) {
    habitBlueprint = habitBlueprint.filter(h => h.id !== id); 
    localStorage.setItem('vibeHabits', JSON.stringify(habitBlueprint)); syncToFirebase(); 
    renderHabitBlueprint();
}

function renderHabitBlueprint() {
    const container = document.getElementById('habitList');
    if(habitBlueprint.length === 0) { container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO HABITS SET</p>`; return; }
    container.innerHTML = habitBlueprint.map(habit => `
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary); box-shadow: 0 0 10px rgba(0,0,0,0.5);">
            <div style="font-weight: 900; font-size: 0.9rem;">${habit.text}</div>
            <button class="task-del" onclick="removeHabit(${habit.id})">×</button>
        </div>
    `).join('');
}

// --- EXAMS ---
function checkUpcomingExamNotification() {
    if (!settings.notificationsEnabled || trackedExams.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifDate = localStorage.getItem('vibeExamNotifDate');
    if (lastNotifDate === todayStr) return;

    const today = new Date(); today.setHours(0,0,0,0); 
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

function addExam() {
    const name = toTitleCase(document.getElementById('examName').value.trim());
    const date = document.getElementById('examDate').value;
    if(!name || !date) return;
    trackedExams.push({ id: Date.now(), name, date }); 
    localStorage.setItem('vibeExams', JSON.stringify(trackedExams)); syncToFirebase();
    document.getElementById('examName').value = ''; document.getElementById('examDate').value = ''; 
    renderExams();
}

function removeExam(id) {
    trackedExams = trackedExams.filter(e => e.id !== id); 
    localStorage.setItem('vibeExams', JSON.stringify(trackedExams)); syncToFirebase(); 
    renderExams();
}

function renderExams() {
    const container = document.getElementById('examList');
    if(trackedExams.length === 0) { container.innerHTML = `<p style="text-align:center; opacity:0.5; font-size:0.8rem;">NO EXAMS TRACKED</p>`; return; }
    
    const today = new Date(); today.setHours(0,0,0,0);
    let pending = []; let aced = [];
    trackedExams.forEach(exam => {
        const [year, month, day] = exam.date.split('-');
        const examDate = new Date(year, month - 1, day);
        exam.diffDays = Math.round((examDate - today) / (1000 * 60 * 60 * 24));
        exam.examDateStr = examDate.toDateString().toUpperCase();
        if (exam.diffDays < 0) aced.push(exam); else pending.push(exam);
    });

    pending.sort((a, b) => a.diffDays - b.diffDays); aced.sort((a, b) => b.diffDays - a.diffDays);
    let html = "";
    if (aced.length > 0) {
        html += `<details style="margin-bottom: 20px; outline: none;"><summary style="list-style: none; text-align: center; cursor: pointer; font-size: 1.5rem; filter: drop-shadow(0 0 10px rgba(0,255,136,0.4));">🏆</summary><div style="margin-top: 15px;">`;
        html += aced.map(exam => `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-bottom: 5px; border-radius: 8px; border: 1px solid rgba(0,255,136,0.1); background: rgba(0,255,136,0.05);"><div><div style="font-weight: 900; font-size: 0.8rem; color: var(--done-green);">${exam.name}</div><div style="font-size: 0.65rem; opacity: 0.6;">${exam.examDateStr}</div></div><button class="task-del" style="font-size: 1.2rem; margin:0;" onclick="removeExam(${exam.id})">×</button></div>`).join('');
        html += `</div><div style="border-bottom: 1px dashed rgba(255,255,255,0.1); margin: 15px 0;"></div></details>`;
    }
    if (pending.length > 0) {
        html += pending.map(exam => {
            let dTxt = "", bCol = "var(--primary)";
            if (exam.diffDays > 0) dTxt = `${exam.diffDays} DAYS LEFT`; else if (exam.diffDays === 0) { dTxt = `TODAY! 🔥`; bCol = "var(--done-green)"; }
            return `<div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${bCol}; box-shadow: 0 0 10px rgba(0,0,0,0.5);"><div><div style="font-weight: 900; font-size: 0.9rem;">${exam.name}</div><div style="font-size: 0.7rem; opacity: 0.7;">${exam.examDateStr}</div></div><div style="display: flex; align-items: center; gap: 15px;"><div style="font-weight: 900; font-size: 0.8rem; color: ${bCol}; text-shadow: 0 0 10px ${bCol};">${dTxt}</div><button class="task-del" onclick="removeExam(${exam.id})">×</button></div></div>`;
        }).join('');
    } else if (aced.length === 0) { html += `<p style="text-align:center; opacity:0.5;">NO PENDING EXAMS</p>`; }
    container.innerHTML = html;
}

// --- GOALS ---
function addGoal(type) {
    const inp = document.getElementById(`in-${type}`); if(!inp.value) return;
    const saved = JSON.parse(localStorage.getItem(type)) || [];
    saved.push({text: toTitleCase(inp.value.trim()), done: false}); localStorage.setItem(type, JSON.stringify(saved)); syncToFirebase();
    renderGoal(type, toTitleCase(inp.value.trim()), false, saved.length - 1); inp.value = "";
}

function renderGoal(type, text, done, idx) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="custom-checkbox ${done ? 'checked' : ''}" onclick="handleGoalCheck('${type}', ${idx}, this)"></div><span class="task-text ${done ? 'done' : ''}" contenteditable="true" onblur="editGoal('${type}', ${idx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">${text}</span><button class="task-del" onclick="removeGoal('${type}', ${idx}, this)">×</button>`;
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

// --- REPORTS & STATS ---
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
                let dailyPercent = 0; let weightPerTask = 100 / dayTot;
                tasksThisDay.forEach(t => { 
                    totalTasks++; 
                    let p = t.priority || 'prio-low';
                    let pKey = p === 'prio-high' ? 'high' : (p === 'prio-med' ? 'med' : 'low');
                    prioStats[pKey].tot++;
                    if (t.done) { completedTasks++; prioStats[pKey].done++; } 
                    
                    if(t.subtasks && t.subtasks.length > 0) {
                        let doneSubCount = 0;
                        t.subtasks.forEach(st => {
                            totalSubtasks++; executableTotal++; 
                            if(st.done) { completedSubtasks++; executableCompleted++; doneSubCount++; }
                        });
                        dailyPercent += ((doneSubCount / t.subtasks.length) * weightPerTask);
                    } else {
                        executableTotal++; 
                        if(t.done) { executableCompleted++; dailyPercent += weightPerTask; }
                    }
                });
                dailyPercents.push(Math.round(dailyPercent));
            } else { dailyPercents.push(0); }
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
    reports = reports.filter(r => r.id !== id); localStorage.setItem('vibeReports', JSON.stringify(reports)); syncToFirebase(); renderReports();
}

function renderReports() {
    const reportArea = document.getElementById('report-list');
    if (reports.length === 0) { reportArea.innerHTML = `<p style="font-size:0.7rem; opacity:0.5; text-align:center; margin-top:30px;">NO ARCHIVES YET</p>`; return; }
    reportArea.innerHTML = reports.map(r => `<div style="padding: 12px; border-left: 3px solid var(--primary); background: rgba(0,0,0,0.3); margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.3)'" onclick="viewReport(${r.id})"><div><div style="font-size: 0.8rem; color: var(--primary); font-weight:900;">${r.month}</div><div style="font-size: 0.9rem;">${r.stats}</div><div style="font-size: 0.65rem; opacity: 0.7;">${r.details}</div></div><button class="task-del" onclick="event.stopPropagation(); removeReport(${r.id})">×</button></div>`).join('');
}

function viewReport(id) {
    const r = reports.find(rep => rep.id === id); if (!r) return;
    document.getElementById('reportModalTitle').innerText = `📊 ${r.month} REPORT`;
    let avgTasks = r.advanced && r.advanced.avgTasksPerDay ? r.advanced.avgTasksPerDay : "-";
    let completedActions = r.details.split('/')[0];
    let totalActions = r.details.split('/')[1].split(' ')[0];
    let missedActions = parseInt(totalActions) - parseInt(completedActions);
    
    let content = `<div style="display:flex; justify-content:space-between; background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); flex-wrap:wrap; gap:10px;"><div style="text-align:center; flex:1; min-width:80px;"><div style="font-size:1.6rem; color:var(--primary); font-weight:900;">${r.stats}</div><div style="font-size:0.6rem; opacity:0.7;">EFFICIENCY</div></div><div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--done-green); font-weight:900;">${completedActions}</div><div style="font-size:0.6rem; opacity:0.7;">ACTIONS DONE</div></div><div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--missed); font-weight:900;">${missedActions}</div><div style="font-size:0.6rem; opacity:0.7;">MISSED</div></div><div style="text-align:center; flex:1; min-width:80px; border-left: 1px solid rgba(255,255,255,0.1);"><div style="font-size:1.6rem; color:var(--med); font-weight:900;">${avgTasks}</div><div style="font-size:0.6rem; opacity:0.7;">AVG/DAY</div></div></div>`;

    if (r.advanced) {
        let tSub = r.advanced.totalSubtasks || 0; let cSub = r.advanced.completedSubtasks || 0;
        content += `<div style="display:flex; gap: 10px; margin-bottom: 20px;"><div style="flex:1; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1);"><div style="font-size:0.65rem; opacity:0.7; margin-bottom: 5px; letter-spacing: 1px;">MAIN TASKS</div><div style="font-size:1.2rem; font-weight:900; color:var(--primary);">${r.advanced.completedTasks} <span style="font-size:0.8rem; opacity:0.5;">/ ${r.advanced.totalTasks}</span></div></div><div style="flex:1; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1);"><div style="font-size:0.65rem; opacity:0.7; margin-bottom: 5px; letter-spacing: 1px;">SUBTASKS CRUSHED</div><div style="font-size:1.2rem; font-weight:900; color:var(--done-green);">${cSub} <span style="font-size:0.8rem; opacity:0.5;">/ ${tSub}</span></div></div></div>`;
        const p = r.advanced.prioStats;
        const hPerc = p.high.tot ? Math.round((p.high.done/p.high.tot)*100) : 0;
        const mPerc = p.med.tot ? Math.round((p.med.done/p.med.tot)*100) : 0;
        const lPerc = p.low.tot ? Math.round((p.low.done/p.low.tot)*100) : 0;
        content += `<h3 style="font-size:0.8rem; color:var(--primary); letter-spacing:2px; margin-bottom:10px;">MAIN TASK PRIORITY BREAKDOWN</h3><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;"><div style="background:rgba(255,118,117,0.1); padding:10px; border-radius:8px; border:1px solid rgba(255,118,117,0.3); text-align:center;"><div style="color:var(--high); font-weight:900; margin-bottom:5px;">HIGH</div><div style="font-size:0.9rem;">${p.high.done}/${p.high.tot} <span style="font-size:0.7rem; opacity:0.7;">(${hPerc}%)</span></div></div><div style="background:rgba(253,203,110,0.1); padding:10px; border-radius:8px; border:1px solid rgba(253,203,110,0.3); text-align:center;"><div style="color:var(--med); font-weight:900; margin-bottom:5px;">MED</div><div style="font-size:0.9rem;">${p.med.done}/${p.med.tot} <span style="font-size:0.7rem; opacity:0.7;">(${mPerc}%)</span></div></div><div style="background:rgba(85,239,196,0.1); padding:10px; border-radius:8px; border:1px solid rgba(85,239,196,0.3); text-align:center;"><div style="color:var(--low); font-weight:900; margin-bottom:5px;">LOW</div><div style="font-size:0.9rem;">${p.low.done}/${p.low.tot} <span style="font-size:0.7rem; opacity:0.7;">(${lPerc}%)</span></div></div></div>`;
        if (r.advanced.dailyPercents && r.advanced.dailyPercents.length > 0) {
            let dp = r.advanced.dailyPercents; let svgW = 400, svgH = 100;
            let barTotalW = dp.length > 0 ? svgW / dp.length : 0;
            let barW = barTotalW * 0.75; if(barW > 14) barW = 14; 
            let bars = "";
            dp.forEach((perc, i) => {
                let barH = (perc / 100) * svgH; if (barH < 2) barH = 2; 
                let x = (i * barTotalW) + (barTotalW / 2) - (barW / 2); let y = svgH - barH;
                bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--primary)" rx="3" style="cursor:pointer; transition: all 0.2s ease;" onmouseover="this.setAttribute('fill', 'var(--done-green)')" onmouseout="this.setAttribute('fill', 'var(--primary)')"><title>Day ${i+1}: ${perc}%</title></rect>`;
            });
            let gridLines = "";
            [100, 75, 50, 25, 0].forEach(p => {
                let yVal = svgH - (p / 100 * svgH);
                gridLines += `<line x1="0" y1="${yVal}" x2="${svgW}" y2="${yVal}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="3,3"/><text x="-10" y="${yVal + 3}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="end" font-weight="900">${p}%</text>`;
            });
            content += `<h3 style="font-size:0.8rem; color:var(--primary); letter-spacing:2px; margin-bottom:15px; margin-top:10px;">📈 DAILY CONSISTENCY</h3><div style="background: rgba(0,0,0,0.3); padding: 20px 15px 15px 45px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px; width: 100%; box-sizing: border-box;"><svg viewBox="-45 -10 455 120" style="width:100%; height:auto; overflow:visible; display:block;">${gridLines}${bars}</svg></div>`;
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
        rowsHTML += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom: 12px;"><span style="width: 60px;">${labels[6-i]}</span><div style="flex-grow:1; margin: 0 15px; background:rgba(255,255,255,0.1); border-radius:6px; height:12px; overflow:hidden; min-width: 150px;"><div style="width:${perc}%; background:${perc === 100 ? 'var(--done-green)' : 'var(--primary)'}; height:100%; box-shadow: 0 0 10px ${perc === 100 ? 'var(--done-green)' : 'var(--primary)'};"></div></div><span style="width: 45px; text-align:right;">${perc}%</span></div>`;
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
        gridLines += `<line x1="0" y1="${yVal}" x2="400" y2="${yVal}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="5,5"/><text x="-10" y="${yVal + 4}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="end" font-weight="bold">${p}%</text>`;
    });

    content.innerHTML = `<div style="flex: 1; display:flex; justify-content:center; min-width:300px;"><svg viewBox="-45 0 465 250" style="width:100%; max-width: 450px; overflow:visible;">${gridLines} <line x1="0" y1="20" x2="0" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="2"/> <line x1="0" y1="200" x2="400" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="2"/><path d="${pathD}" stroke="var(--primary)" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 10px var(--primary));"/>${circles} ${xLabels}</svg></div><div style="flex: 1; display:flex; flex-direction:column; justify-content:center; min-width:250px;">${rowsHTML}</div>`;
}