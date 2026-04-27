const firebaseConfig = {
    apiKey: "AIzaSyBZINWJcrTkMGZSBBQrWXqOt28GTjnu1oU",
    authDomain: "pro-planner-60e6b.firebaseapp.com",
    projectId: "pro-planner-60e6b",
    storageBucket: "pro-planner-60e6b.firebasestorage.app",
    messagingSenderId: "333738470107",
    appId: "1:333738470107:web:12c85823447903a758fafe",
    databaseURL: "https://pro-planner-60e6b-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();
let currentUser = null;

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

function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function save() { 
    localStorage.setItem('vibeProFinal', JSON.stringify(dailyData)); 
    syncToFirebase(); 
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
    } catch (e) { console.error("Error loading data:", e); }
}