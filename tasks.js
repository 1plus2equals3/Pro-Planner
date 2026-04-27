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
                        dailyPercent += ((doneSubtasks / task.subtasks.length) * weightPerTask);
                    } else {
                        if (task.done) dailyPercent += weightPerTask;
                    }
                });
                let finalDayScore = Math.round(dailyPercent);
                if (dateStr < todayStr) {
                    if (finalDayScore >= 70) streak += 1; else streak = 0;
                } else if (dateStr === todayStr) {
                    if (finalDayScore >= 70) streak += 1;
                }
            } else if (dateStr < todayStr) {
                streak = 0; 
            }
        }
    });
    const streakElement = document.getElementById('streakCount');
    if(streakElement) streakElement.innerText = streak;
}

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
            totalPercent += ((doneSubtasks / task.subtasks.length) * weightPerTask);
        } else {
            if (task.done) totalPercent += weightPerTask;
        }
    });
    const finalPercent = Math.round(totalPercent);
    if(document.getElementById(`prog-${date}`)) document.getElementById(`prog-${date}`).style.width = finalPercent + "%";
    if(document.getElementById(`perc-${date}`)) document.getElementById(`perc-${date}`).innerText = finalPercent + "%";
}

function checkRollover() {
    const todayStr = new Date().toISOString().split('T')[0];
    let changed = false;
    Object.keys(dailyData).forEach(dateStr => {
        if (dateStr < todayStr) {
            dailyData[dateStr].forEach(task => {
                if (!task.done && !task.rolledOver) {
                    task.rolledOver = true;
                    if (!dailyData[todayStr]) { 
                        dailyData[todayStr] = []; changed = true; 
                        habitBlueprint.forEach(h => { dailyData[todayStr].push({ text: h.text, priority: 'prio-med', done: false }); });
                    }
                    if (task.text.startsWith("🔄 ")) return;

                    if (!dailyData[todayStr].some(t => t.text === task.text)) {
                        let newTask = { text: task.text, priority: task.priority || 'prio-low', done: false, stCollapsed: task.stCollapsed || false };
                        if (task.subtasks && task.subtasks.length > 0) {
                            let pendingSubtasks = task.subtasks.filter(st => !st.done);
                            if (pendingSubtasks.length > 0) { newTask.subtasks = pendingSubtasks.map(st => ({ text: st.text, done: false })); }
                        }
                        dailyData[todayStr].push(newTask);
                        changed = true;
                    }
                }
            });
        }
    });

    if (!dailyData[todayStr] && habitBlueprint.length > 0) {
        dailyData[todayStr] = [];
        habitBlueprint.forEach(h => { dailyData[todayStr].push({ text: h.text, priority: 'prio-med', done: false }); });
        changed = true;
    }
    if (changed) { save(); calculateStreak(); }
}

function sortTasks(date) {
    const prioMap = { 'prio-high': 1, 'prio-med': 2, 'prio-low': 3 };
    if(dailyData[date]) { 
        dailyData[date].sort((a, b) => {
            const hasTimeA = !!a.startTime;
            const hasTimeB = !!b.startTime;
            if (hasTimeA && hasTimeB) {
                if (a.startTime === b.startTime) return prioMap[a.priority || 'prio-low'] - prioMap[b.priority || 'prio-low'];
                return a.startTime.localeCompare(b.startTime);
            } else if (hasTimeA) return -1;
              else if (hasTimeB) return 1;
              else return prioMap[a.priority || 'prio-low'] - prioMap[b.priority || 'prio-low'];
        });
    }
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
    habitBlueprint.forEach(h => { dailyData[date].push({ text: h.text, priority: 'prio-med', done: false }); });
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
            habitBlueprint.forEach(h => { dailyData[dateStr].push({ text: h.text, priority: 'prio-med', done: false }); });
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
        <div class="card-header"><h3>📅 ${new Date(date).toDateString().toUpperCase()}</h3><span id="perc-${date}" style="font-size:0.85rem; opacity:0.9; font-weight:900; color:var(--primary); text-shadow: 0 0 10px var(--primary);">0%</span></div>
        <div class="progress-container"><div class="progress-fill" id="prog-${date}"></div></div>
        <div class="input-group">
            <input type="text" id="in-${date}" placeholder="TASK..." onkeydown="if(event.key==='Enter') addTask('${date}')">
            <button class="icon-btn" onclick="document.getElementById('time-row-${date}').classList.toggle('show')" title="Set Time Block"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
            <select id="prio-${date}"><option value="prio-high" selected>HIGH</option><option value="prio-med">MED</option><option value="prio-low">LOW</option></select>
            <button class="add-btn" onclick="addTask('${date}')">+</button>
        </div>
        <div class="time-picker-row" id="time-row-${date}"><input type="time" id="st-time-${date}"><span style="font-size: 0.7rem; opacity: 0.5; font-weight: 900;">TO</span><input type="time" id="en-time-${date}"></div>
        <ul id="list-${date}" ondragover="handleDragOverUl(event)" ondrop="handleDropUl(event, '${date}')" style="min-height: 50px; padding-bottom: 20px;"></ul>
        <button class="remove-day-btn" onclick="removeDay('${date}')">REMOVE DAY</button>
    `;
    document.getElementById('daily-container').appendChild(card); init3DTilt(card);
    sortTasks(date); dailyData[date].forEach((t, idx) => renderTask(date, t, idx)); updateProgress(date);
}

function addTask(date) {
    const val = document.getElementById(`in-${date}`).value;
    const prio = document.getElementById(`prio-${date}`).value; 
    const stTime = document.getElementById(`st-time-${date}`).value;
    const enTime = document.getElementById(`en-time-${date}`).value;
    if(!val) return;
    
    let newTask = { text: toTitleCase(val.trim()), priority: prio, done: false };
    if (stTime) newTask.startTime = stTime;
    if (enTime) newTask.endTime = enTime;

    dailyData[date].push(newTask); sortTasks(date);
    const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; 
    dailyData[date].forEach((t, i) => renderTask(date, t, i));
    
    updateProgress(date); save(); calculateStreak(); 
    document.getElementById(`in-${date}`).value = ""; document.getElementById(`st-time-${date}`).value = ""; document.getElementById(`en-time-${date}`).value = ""; document.getElementById(`time-row-${date}`).classList.remove('show');
}

let dragSourceDay = null;
function handleDragStartDay(e) { dragSourceDay = this; e.dataTransfer.effectAllowed = 'move'; this.style.opacity = '0.4'; }
function handleDragOverDay(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.style.borderTop = '2px solid var(--primary)'; return false; }
function handleDragLeaveDay(e) { this.style.borderTop = ''; }
function handleDragEndDay(e) { this.style.opacity = '1'; document.querySelectorAll('li').forEach(li => li.style.borderTop = ''); }

function handleDropDay(e) {
    e.stopPropagation(); this.style.borderTop = '';
    if (dragSourceDay && dragSourceDay !== this) {
        const targetDate = this.dataset.date; const sourceDate = dragSourceDay.dataset.date;
        const fromIdx = parseInt(dragSourceDay.dataset.index); const toIdx = parseInt(this.dataset.index);
        let [movedItem] = dailyData[sourceDate].splice(fromIdx, 1);
        dailyData[targetDate].splice(toIdx, 0, movedItem);
        if (sourceDate !== targetDate) {
            const fromUl = document.getElementById(`list-${sourceDate}`); fromUl.innerHTML = ''; 
            dailyData[sourceDate].forEach((t, i) => renderTask(sourceDate, t, i)); updateProgress(sourceDate);
        }
        sortTasks(targetDate); save();
        const toUl = document.getElementById(`list-${targetDate}`); toUl.innerHTML = ''; 
        dailyData[targetDate].forEach((t, i) => renderTask(targetDate, t, i));
        updateProgress(targetDate); calculateStreak();
    }
    return false;
}

function handleDragOverUl(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

function handleDropUl(e, targetDate) {
    e.preventDefault();
    if (e.target.id === `list-${targetDate}` && dragSourceDay) {
        const sourceDate = dragSourceDay.dataset.date; const fromIdx = parseInt(dragSourceDay.dataset.index);
        let [movedItem] = dailyData[sourceDate].splice(fromIdx, 1);
        dailyData[targetDate].push(movedItem); 
        if (sourceDate !== targetDate) {
            const fromUl = document.getElementById(`list-${sourceDate}`); fromUl.innerHTML = ''; 
            dailyData[sourceDate].forEach((t, i) => renderTask(sourceDate, t, i)); updateProgress(sourceDate);
        }
        sortTasks(targetDate); save();
        const toUl = document.getElementById(`list-${targetDate}`); toUl.innerHTML = ''; 
        dailyData[targetDate].forEach((t, i) => renderTask(targetDate, t, i));
        updateProgress(targetDate); calculateStreak();
    }
}

function formatTime12h(time24) {
    if(!time24) return "";
    let [h, m] = time24.split(':'); let ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12; return `${h}:${m} ${ampm}`;
}

function getDuration(start, end) {
    if(!start || !end) return "";
    let [sh, sm] = start.split(':').map(Number); let [eh, em] = end.split(':').map(Number);
    let diff = (eh*60+em) - (sh*60+sm);
    if(diff < 0) diff += 24*60; 
    let h = Math.floor(diff/60); let m = diff%60;
    let res = []; if(h>0) res.push(`${h}h`); if(m>0) res.push(`${m}m`); return res.join(' ');
}

function renderTask(date, task, idx) {
    const todayStr = new Date().toISOString().split('T')[0];
    const li = document.createElement('li'); 
    if (task.rolledOver || (date < todayStr && !task.done)) li.classList.add('missed-task');
    li.draggable = true; li.dataset.index = idx; li.dataset.date = date;
    li.addEventListener('dragstart', handleDragStartDay); li.addEventListener('dragover', handleDragOverDay);
    li.addEventListener('dragleave', handleDragLeaveDay); li.addEventListener('drop', handleDropDay); li.addEventListener('dragend', handleDragEndDay);
    
    let subtasksHTML = ''; let hasSubtasks = task.subtasks && task.subtasks.length > 0;
    let toggleBtnHTML = hasSubtasks ? `<button class="collapse-subtask-btn" onclick="toggleSubtaskList('${date}', ${idx})" title="Toggle Subtasks">${task.stCollapsed ? '▶' : '▼'}</button>` : '';
    
    if(hasSubtasks) {
        subtasksHTML = `<ul class="subtask-list" style="display: ${task.stCollapsed ? 'none' : 'block'};">`;
        task.subtasks.forEach((st, sIdx) => {
            let stClass = st.done ? "done" : "";
            let liClass = (date < todayStr && !st.done) ? "subtask-item missed-task" : "subtask-item";
            subtasksHTML += `<li class="${liClass}"><div class="custom-checkbox ${st.done ? 'checked' : ''}" style="width: 14px; height: 14px; border-width: 1px;" onclick="handleSubtaskCheck('${date}', ${idx}, ${sIdx})"></div><span class="subtask-text ${stClass}" contenteditable="${date >= todayStr}" onblur="editSubtask('${date}', ${idx}, ${sIdx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">${st.text}</span><button class="task-del" style="font-size: 0.9rem;" onclick="removeSubtask('${date}', ${idx}, ${sIdx})">×</button></li>`;
        });
        subtasksHTML += '</ul>';
    }

    let timeBadgeHTML = '';
    if (task.startTime) {
        let duration = getDuration(task.startTime, task.endTime);
        let timeStr = formatTime12h(task.startTime);
        if (task.endTime) timeStr += ` - ${formatTime12h(task.endTime)}`;
        let tooltipText = duration ? `${timeStr} (Duration: ${duration})` : timeStr;
        timeBadgeHTML = `<div class="task-clock-icon" title="${tooltipText}"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>`;
    }

    li.style.flexDirection = 'column'; li.style.alignItems = 'stretch';
    li.innerHTML = `<div style="display: flex; align-items: center; gap: 10px; width: 100%;"><div class="prio-dot ${task.priority || 'prio-low'}" onclick="cyclePriority(this, '${date}', ${idx})" title="Click to change priority"></div><div class="custom-checkbox ${task.done ? 'checked' : ''}" onclick="handleCheck('${date}', ${idx}, this)"></div>${toggleBtnHTML}${timeBadgeHTML}<span class="task-text ${task.done ? 'done' : ''}" contenteditable="${date >= todayStr}" onblur="editTask('${date}', ${idx}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">${task.rolledOver ? '❌ Missed: ' + task.text : task.text}</span><button class="add-subtask-btn" onclick="toggleSubtaskInput('${date}', ${idx})" title="Add Subtask">↳</button><button class="task-del" onclick="removeSpecificTask('${date}', ${idx}, this)">×</button></div>${subtasksHTML}<div class="subtask-input-container" id="st-in-cont-${date}-${idx}"><input type="text" class="subtask-input" id="st-in-${date}-${idx}" placeholder="NEW SUBTASK..." onkeydown="if(event.key==='Enter') addSubtask('${date}', ${idx})"><button class="add-btn" style="padding: 4px 10px; font-size: 0.65rem;" onclick="addSubtask('${date}', ${idx})">+</button></div>`;
    document.getElementById(`list-${date}`).appendChild(li);
}

function editTask(date, idx, element) {
    let newText = toTitleCase(element.innerText.replace('❌ Missed: ', '').replace('❌ MISSED: ', '').trim());
    if (newText === "") { element.innerText = dailyData[date][idx].text; return; }
    dailyData[date][idx].text = newText; save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
}

function cyclePriority(dot, date, idx) {
    let task = dailyData[date][idx]; const priorities = ['prio-high', 'prio-med', 'prio-low'];
    let currentIdx = priorities.indexOf(task.priority || 'prio-low'); task.priority = priorities[(currentIdx + 1) % priorities.length];
    sortTasks(date); save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
}

function handleCheck(date, idx, checkboxElement) {
    let task = dailyData[date][idx];
    if(task) {
        task.done = !task.done; 
        if(task.subtasks) task.subtasks.forEach(st => st.done = task.done);
        save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
        updateProgress(date); calculateStreak();
        let totalTasks = dailyData[date].length; let doneTasks = dailyData[date].filter(t => t.done).length;
        if (task.done && totalTasks > 0 && doneTasks === totalTasks) {
            confetti({ particleCount: 30, spread: 50, origin: { x: 0.2, y: 0.6 }, zIndex: 9999 }); 
            setTimeout(() => confetti({ particleCount: 30, spread: 50, origin: { x: 0.8, y: 0.6 }, zIndex: 9999 }), 200); 
            setTimeout(() => confetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 }), 400); 
            setTimeout(() => { showCelebrationModal(); }, 800);
        } else if (task.done) { confetti({ particleCount: 40, origin: { y: 0.8 }, colors: [settings.theme, '#00ff88'] }); }
    }
}

function removeSpecificTask(date, idx) { 
    dailyData[date].splice(idx, 1); const ul = document.getElementById(`list-${date}`); ul.innerHTML = '';
    dailyData[date].forEach((t, i) => renderTask(date, t, i)); updateProgress(date); save(); calculateStreak(); 
}

function removeDay(date) { 
    if(confirm(`Remove entire day: ${date}?`)) { delete dailyData[date]; document.getElementById(`card-${date}`).remove(); save(); calculateStreak(); }
}

function scrollTimeline(amount) { document.getElementById('daily-container').scrollBy({ left: amount, behavior: 'smooth' }); }

function toggleSubtaskList(date, idx) {
    let task = dailyData[date][idx]; task.stCollapsed = !task.stCollapsed; save();
    const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
}

function toggleSubtaskInput(date, idx) {
    const cont = document.getElementById(`st-in-cont-${date}-${idx}`); cont.classList.toggle('show');
    if(cont.classList.contains('show')) document.getElementById(`st-in-${date}-${idx}`).focus();
}

function addSubtask(date, idx) {
    const input = document.getElementById(`st-in-${date}-${idx}`); const text = toTitleCase(input.value.trim()); if(!text) return;
    if(!dailyData[date][idx].subtasks) dailyData[date][idx].subtasks = [];
    dailyData[date][idx].subtasks.push({ text: text, done: false }); dailyData[date][idx].done = false; dailyData[date][idx].stCollapsed = false; 
    save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); calculateStreak();
}

function handleSubtaskCheck(date, tIdx, sIdx) {
    let st = dailyData[date][tIdx].subtasks[sIdx]; st.done = !st.done;
    let allDone = dailyData[date][tIdx].subtasks.every(s => s.done); dailyData[date][tIdx].done = allDone; 
    save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); calculateStreak();
    let totalTasks = dailyData[date].length; let doneTasks = dailyData[date].filter(t => t.done).length;
    if (st.done && allDone && totalTasks > 0 && doneTasks === totalTasks) {
        confetti({ particleCount: 30, spread: 50, origin: { x: 0.2, y: 0.6 }, zIndex: 9999 }); 
        setTimeout(() => confetti({ particleCount: 30, spread: 50, origin: { x: 0.8, y: 0.6 }, zIndex: 9999 }), 200); 
        setTimeout(() => confetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 }), 400); 
        setTimeout(() => { showCelebrationModal(); }, 800);
    } else if (st.done) { confetti({ particleCount: 20, spread: 40 }); }
}

function editSubtask(date, tIdx, sIdx, element) {
    let text = toTitleCase(element.innerText.trim());
    if (text === "") { element.innerText = dailyData[date][tIdx].subtasks[sIdx].text; return; }
    dailyData[date][tIdx].subtasks[sIdx].text = text; save();
}

function removeSubtask(date, tIdx, sIdx) {
    dailyData[date][tIdx].subtasks.splice(sIdx, 1);
    if(dailyData[date][tIdx].subtasks.length > 0) {
        let allDone = dailyData[date][tIdx].subtasks.every(s => s.done); dailyData[date][tIdx].done = allDone;
    }
    save(); const ul = document.getElementById(`list-${date}`); ul.innerHTML = ''; dailyData[date].forEach((t, i) => renderTask(date, t, i));
    updateProgress(date); calculateStreak();
}