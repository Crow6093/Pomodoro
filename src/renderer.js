// DOM Elements
const timeDisplay = document.getElementById('time-display');
const progressRing = document.querySelector('.progress-ring__circle');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnAdd = document.getElementById('btn-add');
const taskList = document.getElementById('task-list');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// New Elements for Task Tab

const addTaskFormFull = document.getElementById('add-task-form-full');
const newTaskInputFull = document.getElementById('new-task-input-full');
const taskListFull = document.getElementById('task-list-full');

// Timer State
let timerInterval = null;
let totalTime = 25 * 60; // 25 minutes in seconds
let currentTime = totalTime;
let isRunning = false;
const radius = progressRing.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
let tasks = []; // Shared task state
let isWidgetEnabled = true; // Widget toggle state
let currentLang = 'es'; // Default language

const translations = {
    es: {
        navPomodoro: "Pomodoro",
        navStopwatch: "Cronómetro",
        navTasks: "Tareas",
        navSettings: "Ajustes",
        tasksHeaderPreview: "Tareas",
        tasksHeaderFull: "Lista de Tareas",
        newTaskPlaceholder: "Nueva tarea...",
        settingsDuration: "Duración del Pomodoro",
        customTimeLabel: "Personalizado (min):",
        applyBtn: "Aplicar",
        widgetToggle: "Widget Flotante:",
        alarmSound: "Sonido de Alarma",
        selectFile: "Seleccionar Archivo",
        startBtn: "Iniciar",
        pauseBtn: "Pausa",
        resumeBtn: "Reanudar",
        saveRecordBtn: "Guardar",
        stopAllBtn: "Parar del todo",
        stopwatchReady: "Listo",
        stopwatchRunning: "En marcha ✨",
        stopwatchPaused: "Pausado ⏸️",
        recordNamePlaceholder: "Nombre del registro...",
        recordsHeader: "Registros",
        clearAllRecords: "Borrar todos",
        emptyRecords: "No hay registros guardados aún ⏱️",
        recordSaved: "¡Registro guardado! ✨",
        defaultRecordName: "Registro",
        emptyTasks: "No olvides ir a la pestaña de tareas para poner una nueva tarea ✨",
        pomodoroComplete: "Pomodoro Completado!",
        greatJob: "¡Buen trabajo!",
        timeAdded: "Tiempo Añadido",
        fiveMinAdded: "+5 Minutos añadidos!",
        timeUpdated: "Tiempo Actualizado",
        timerSetTo: "Temporizador ajustado a",
        minutes: "minutos"
    },
    en: {
        navPomodoro: "Pomodoro",
        navStopwatch: "Stopwatch",
        navTasks: "Tasks",
        navSettings: "Settings",
        tasksHeaderPreview: "Tasks",
        tasksHeaderFull: "Task List",
        newTaskPlaceholder: "New task...",
        settingsDuration: "Pomodoro Duration",
        customTimeLabel: "Custom (min):",
        applyBtn: "Apply",
        widgetToggle: "Floating Widget:",
        alarmSound: "Alarm Sound",
        selectFile: "Select File",
        startBtn: "Start",
        pauseBtn: "Pause",
        resumeBtn: "Resume",
        saveRecordBtn: "Save",
        stopAllBtn: "Stop Completely",
        stopwatchReady: "Ready",
        stopwatchRunning: "Running ✨",
        stopwatchPaused: "Paused ⏸️",
        recordNamePlaceholder: "Record name...",
        recordsHeader: "Records",
        clearAllRecords: "Clear all",
        emptyRecords: "No saved records yet ⏱️",
        recordSaved: "Record saved! ✨",
        defaultRecordName: "Record",
        emptyTasks: "Don't forget to go to the tasks tab to add a new task ✨",
        pomodoroComplete: "Pomodoro Complete!",
        greatJob: "Great job!",
        timeAdded: "Time Added",
        fiveMinAdded: "+5 Minutes added!",
        timeUpdated: "Time Updated",
        timerSetTo: "Timer set to",
        minutes: "minutes"
    }
};

// Initialize Ring
progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
progressRing.style.strokeDashoffset = 0;

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressRing.style.strokeDashoffset = offset;
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timeDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    // Update Ring
    const percent = (currentTime / totalTime) * 100;
    setProgress(percent);

    // Urgent Alert (< 10%)
    if (percent < 10) {
        progressRing.classList.add('urgent');
    } else {
        progressRing.classList.remove('urgent');
    }

    // Send update to main process for widget
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('update-timer', {
            time: timeDisplay.textContent,
            percent: percent,
            enabled: isWidgetEnabled
        });
    } catch (e) {
        // Electron not available
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => {
        if (currentTime > 0) {
            currentTime--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;

            // Completion Logic
            // Completion Logic
            new Notification(translations[currentLang].pomodoroComplete, { body: translations[currentLang].greatJob });
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('timer-finished');

            // Play Sound
            const path = require('path');
            const customSound = localStorage.getItem('customAlarm');
            let soundPath;

            if (customSound) {
                soundPath = customSound;
            } else {
                soundPath = path.join(__dirname, '../assets/alarma.mp3');
                // Fix for ASAR: HTML5 Audio needs unpacked file
                if (soundPath.includes('app.asar')) {
                    soundPath = soundPath.replace('app.asar', 'app.asar.unpacked');
                }
            }

            const audio = new Audio(soundPath);
            audio.play().catch(e => console.error("Error playing sound:", e));

            // Visual Shake
            document.body.classList.add('shaking');
            setTimeout(() => {
                document.body.classList.remove('shaking');
            }, 1000);

            currentTime = totalTime; // Reset for now
            updateTimerDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
}

// Event Listeners for Timer
btnStart.addEventListener('click', startTimer);
btnPause.addEventListener('click', pauseTimer);

// Tabs Logic
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        tabContents.forEach(t => t.style.display = 'none');

        item.classList.add('active');
        const tabId = item.getAttribute('data-tab');
        const targetTab = document.getElementById(tabId);
        const controlsFooter = document.querySelector('.controls');

        if (tabId === 'pomodoro') {
            if (targetTab) targetTab.style.display = 'flex';
            if (controlsFooter) controlsFooter.style.display = 'flex';
            btnStart.style.display = '';
            btnPause.style.display = '';
            btnAdd.style.display = '';
            btnAdd.innerText = '⏰'; // Clock icon for adding time
        } else if (tabId === 'cronometro') {
            if (targetTab) targetTab.style.display = 'flex';
            if (controlsFooter) controlsFooter.style.display = 'none';
        } else if (tabId === 'tareas') {
            if (targetTab) targetTab.style.display = 'block';
            if (controlsFooter) controlsFooter.style.display = 'flex';
            btnStart.style.display = 'none';
            btnPause.style.display = 'none';
            btnAdd.style.display = '';
            btnAdd.innerText = '+'; // Plus icon for adding task
        } else {
            // Ajustes
            if (targetTab) targetTab.style.display = 'block';
            if (controlsFooter) controlsFooter.style.display = 'none';
            btnStart.style.display = 'none';
            btnPause.style.display = 'none';
            btnAdd.style.display = 'none';
        }
    });
});

// Task Logic

// Add Button Logic (Context Sensitive)
btnAdd.addEventListener('click', () => {
    const isPomodoro = document.getElementById('pomodoro').style.display !== 'none';
    const isTareas = document.getElementById('tareas').style.display === 'block';

    if (isPomodoro) {
        // Add 5 minutes to timer
        currentTime += 5 * 60;
        totalTime += 5 * 60; // Update total duration so the ring scales correctly 
        // Usually extend current session. keeping it simple.
        updateTimerDisplay();
        new Notification(translations[currentLang].timeAdded, { body: translations[currentLang].fiveMinAdded });

        // Floating +5 Animation
        const floatingEl = document.createElement('div');
        floatingEl.textContent = '+5';
        floatingEl.classList.add('floating-plus-five');

        // Position it near the button
        const rect = btnAdd.getBoundingClientRect();
        floatingEl.style.left = `${rect.left + rect.width / 2}px`;
        floatingEl.style.top = `${rect.top - 20}px`; // Start slightly above button

        document.body.appendChild(floatingEl);

        // Remove after 2.5s
        setTimeout(() => {
            floatingEl.remove();
        }, 2500);
    } else if (isTareas) {
        toggleForm(addTaskFormFull, newTaskInputFull);
    }
});

function toggleForm(form, input) {
    if (form.style.display === 'none') {
        form.style.display = 'block';
        input.focus();
    } else {
        form.style.display = 'none';
    }
}

function setupInput(input, form) {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = input.value.trim();
            if (text) {
                addTask(text);
                input.value = '';
                form.style.display = 'none';
            }
        }
    });
}

// Setup inputs for both views

setupInput(newTaskInputFull, addTaskFormFull);

function addTask(text) {
    const task = {
        id: Date.now(),
        text: text,
        completed: false
    };
    tasks.push(task);
    saveConfig();
    renderTasks();
}

function renderTasks() {
    taskList.innerHTML = '';
    taskListFull.innerHTML = '';

    // 1. Render Full List (All assignments)
    tasks.forEach(task => {
        const itemHTML = `
            <div class="task-item">
                <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <label style="${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.text}</label>
                <span class="task-icon" onclick="deleteTask(${task.id})" style="cursor: pointer;">🗑️</span>
            </div>
        `;
        taskListFull.insertAdjacentHTML('beforeend', itemHTML);
    });

    // 2. Render Preview List (Only first 2 INCOMPLETE tasks)
    const incompleteTasks = tasks.filter(t => !t.completed).slice(0, 2);

    if (incompleteTasks.length === 0) {
        taskList.innerHTML = `
            <div class="task-item" style="justify-content: center; text-align: center; color: #90A4AE; font-size: 0.9rem;">
                <span>${translations[currentLang].emptyTasks}</span>
            </div>
        `;
    } else {
        incompleteTasks.forEach(task => {
            const itemHTML = `
                <div class="task-item">
                    <input type="checkbox" class="task-checkbox" data-id="${task.id}">
                    <label>${task.text}</label>
                    <span class="task-icon" onclick="deleteTask(${task.id})" style="cursor: pointer;">🗑️</span>
                </div>
            `;
            taskList.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    // Re-bind events (simple delegation or re-bind)
    document.querySelectorAll('.task-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            const t = tasks.find(x => x.id === id);
            if (t) {
                t.completed = e.target.checked;
                saveConfig();
                renderTasks();
            }
        });
    });
}

// Global Delete Function
window.deleteTask = function (id) {
    tasks = tasks.filter(t => t.id !== id);
    saveConfig();
    renderTasks();
};

// Settings Logic
const timeButtons = document.querySelectorAll('.btn-time');
const customInput = document.getElementById('custom-time-input');
const btnSetCustom = document.getElementById('btn-set-custom');
const widgetToggle = document.getElementById('widget-toggle');

// Sound Selection Logic
const btnSelectSound = document.getElementById('btn-select-sound');
const currentSoundLabel = document.getElementById('current-sound-label');
const btnResetSound = document.getElementById('btn-reset-sound');
const { ipcRenderer } = require('electron'); // Ensure imported

// Initial Load
if (localStorage.getItem('customAlarm')) {
    const savedPath = localStorage.getItem('customAlarm');
    currentSoundLabel.textContent = savedPath.split(/[/\\]/).pop();
    btnResetSound.style.display = 'inline-block';
} else {
    btnResetSound.style.display = 'none';
}

if (btnResetSound) {
    btnResetSound.addEventListener('click', async () => {
        const currentPath = localStorage.getItem('customAlarm');
        if (currentPath) {
            await ipcRenderer.invoke('delete-custom-sound', currentPath);
        }
        localStorage.removeItem('customAlarm');
        currentSoundLabel.textContent = 'Default';
        btnResetSound.style.display = 'none';
    });
}

if (btnSelectSound) {
    btnSelectSound.addEventListener('click', async () => {
        // If there is already a custom sound, we might want to delete it before selecting a new one?
        // Or wait until the new one is confirmed. let's keep it simple: just overwrite the reference.
        // Ideally we should clean up the old one if it exists to avoid clutter.
        const oldPath = localStorage.getItem('customAlarm');

        const filePath = await ipcRenderer.invoke('open-sound-dialog');

        if (filePath) {
            // New file selected and copied successfully
            if (oldPath && oldPath !== filePath) {
                await ipcRenderer.invoke('delete-custom-sound', oldPath);
            }

            localStorage.setItem('customAlarm', filePath);
            currentSoundLabel.textContent = filePath.split(/[/\\]/).pop();
            btnResetSound.style.display = 'inline-block';

            // Optional preview
            const audio = new Audio(filePath);
            audio.play().catch(e => console.error(e));
        }
    });
}

if (widgetToggle) {
    widgetToggle.addEventListener('change', (e) => {
        isWidgetEnabled = e.target.checked;
        updateTimerDisplay(); // Force update to notify main process immediately
        saveConfig();
    });
}

timeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update UI
        timeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Time
        const minutes = parseInt(btn.getAttribute('data-time'));
        setTimer(minutes);
    });
});

btnSetCustom.addEventListener('click', () => {
    const minutes = parseInt(customInput.value);
    if (minutes > 0) {
        timeButtons.forEach(b => b.classList.remove('active')); // Deselect others
        setTimer(minutes);

        // Maybe visual feedback?
        new Notification(translations[currentLang].timeUpdated, { body: `${translations[currentLang].timerSetTo} ${minutes} ${translations[currentLang].minutes}` });
    }
});

function setTimer(minutes) {
    if (isRunning) pauseTimer(); // Stop if running
    totalTime = minutes * 60;
    currentTime = totalTime;
    updateTimerDisplay();
}

// Initial Render
updateTimerDisplay();
renderTasks(); // Render initial state (empty or loaded)
// Window Controls
try {
    const btnMinimize = document.getElementById('btn-minimize');
    const btnClose = document.getElementById('btn-close');
    const { ipcRenderer } = require('electron'); // Re-import or rely on previous scope if available. 
    // Best to just use if already imported. It was imported in startTimer, but scope is local.
    // Let's assume we can require it again or it's global if nodeIntegration.

    btnMinimize.addEventListener('click', () => {
        ipcRenderer.send('minimize-app');
    });

    btnClose.addEventListener('click', () => {
        ipcRenderer.send('close-app');
    });
} catch (e) {
    console.error("IPC not available", e);
}


// Language Switching Logic
const langEs = document.getElementById('lang-es');
const langEn = document.getElementById('lang-en');
if (langEs && langEn) {
    langEs.addEventListener('click', () => changeLanguage('es'));
    langEn.addEventListener('click', () => changeLanguage('en'));
}

function changeLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];

    // Update static elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Update specific attributes like placeholders
    const taskInput = document.getElementById('new-task-input-full');
    if (taskInput) {
        taskInput.placeholder = t.newTaskPlaceholder;
    }
    const swRecordInput = document.getElementById('sw-record-input');
    if (swRecordInput) {
        swRecordInput.placeholder = t.recordNamePlaceholder;
    }

    // Refresh dynamic content
    renderTasks();
    renderStopwatchRecords();
    updateStopwatchButtons();

    // Update Flags UI
    if (lang === 'es') {
        langEs.classList.add('active');
        langEn.classList.remove('active');
    } else {
        langEn.classList.add('active');
        langEs.classList.remove('active');
    }

    // Save new language preference
    saveConfig();
}

function saveConfig() {
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('save-config', {
            language: currentLang,
            widgetEnabled: isWidgetEnabled,
            tasks: tasks,
            stopwatchRecords: stopwatchRecords
        });
    } catch (e) {
        console.error("Failed to save config", e);
    }
}

// ===================================================
// Stopwatch / Cronómetro Logic
// ===================================================
const swMinSec = document.getElementById('sw-min-sec');
const swMs = document.getElementById('sw-ms');
const swStatus = document.getElementById('sw-status');
const swProgressRing = document.querySelector('.sw-progress-ring__circle');
const swRecordInput = document.getElementById('sw-record-input');
const swBtnStart = document.getElementById('sw-btn-start');
const swBtnStartText = document.getElementById('sw-btn-start-text');
const swBtnRecord = document.getElementById('sw-btn-record');
const swBtnStop = document.getElementById('sw-btn-stop');
const swRecordsList = document.getElementById('sw-records-list');
const swRecordsCount = document.getElementById('sw-records-count');
const swBtnClearAll = document.getElementById('sw-btn-clear-all');

let swInterval = null;
let swStartTime = 0;
let swElapsed = 0; // Milliseconds
let swState = 'idle'; // 'idle' | 'running' | 'paused'
let stopwatchRecords = [];
const swRadius = 66;
const swCircumference = 2 * Math.PI * swRadius; // ~414.69

if (swProgressRing) {
    swProgressRing.style.strokeDasharray = `${swCircumference} ${swCircumference}`;
    swProgressRing.style.strokeDashoffset = `${swCircumference}`;
}

function formatStopwatchTime(totalMs) {
    const totalSeconds = Math.floor(totalMs / 1000);
    const ms = Math.floor((totalMs % 1000) / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor(totalSeconds / 3600);

    const pad = (n) => (n < 10 ? '0' + n : '' + n);

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
}

function updateStopwatchDisplay() {
    const totalSeconds = Math.floor(swElapsed / 1000);
    const ms = Math.floor((swElapsed % 1000) / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor(totalSeconds / 3600);

    const pad = (n) => (n < 10 ? '0' + n : '' + n);

    if (swMinSec) {
        if (hours > 0) {
            swMinSec.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        } else {
            swMinSec.textContent = `${pad(minutes)}:${pad(seconds)}`;
        }
    }
    if (swMs) {
        swMs.textContent = `.${pad(ms)}`;
    }

    if (swProgressRing) {
        // Complete circle every 60 seconds
        const currentSecondMs = swElapsed % 60000;
        const percent = (currentSecondMs / 60000) * 100;
        const offset = swCircumference - (percent / 100) * swCircumference;
        swProgressRing.style.strokeDashoffset = offset;
    }
}

function updateStopwatchButtons() {
    const t = translations[currentLang];
    if (!swBtnStart || !swBtnStartText || !swBtnRecord || !swBtnStop || !swStatus) return;

    if (swState === 'idle') {
        swBtnStart.className = 'btn btn-main sw-btn';
        swBtnStartText.textContent = t.startBtn;
        swBtnRecord.style.display = 'none';
        swBtnStop.style.display = 'none';

        swStatus.textContent = t.stopwatchReady;
        swStatus.className = 'sw-status-pill';
    } else if (swState === 'running') {
        swBtnStart.className = 'btn btn-secondary sw-btn';
        swBtnStartText.textContent = t.pauseBtn;
        swBtnRecord.style.display = 'flex';
        swBtnRecord.textContent = t.saveRecordBtn;
        swBtnStop.style.display = 'flex';
        swBtnStop.textContent = t.stopAllBtn;

        swStatus.textContent = t.stopwatchRunning;
        swStatus.className = 'sw-status-pill running';
    } else if (swState === 'paused') {
        swBtnStart.className = 'btn btn-main sw-btn';
        swBtnStartText.textContent = t.resumeBtn;
        swBtnRecord.style.display = 'flex';
        swBtnRecord.textContent = t.saveRecordBtn;
        swBtnStop.style.display = 'flex';
        swBtnStop.textContent = t.stopAllBtn;

        swStatus.textContent = t.stopwatchPaused;
        swStatus.className = 'sw-status-pill paused';
    }
}

function handleStopwatchStart() {
    if (swState === 'idle') {
        swStartTime = Date.now() - swElapsed;
        swState = 'running';
        swInterval = setInterval(() => {
            swElapsed = Date.now() - swStartTime;
            updateStopwatchDisplay();
        }, 20);
        updateStopwatchButtons();
    } else if (swState === 'running') {
        // Pause stopwatch
        if (swInterval) {
            clearInterval(swInterval);
            swInterval = null;
        }
        swElapsed = Date.now() - swStartTime;
        swState = 'paused';
        updateStopwatchDisplay();
        updateStopwatchButtons();
    } else if (swState === 'paused') {
        // Resume stopwatch
        swStartTime = Date.now() - swElapsed;
        swState = 'running';
        swInterval = setInterval(() => {
            swElapsed = Date.now() - swStartTime;
            updateStopwatchDisplay();
        }, 20);
        updateStopwatchButtons();
    }
}

function handleStopwatchStopAll() {
    if (swInterval) {
        clearInterval(swInterval);
        swInterval = null;
    }
    swState = 'idle';
    swElapsed = 0;
    swStartTime = 0;
    updateStopwatchDisplay();
    updateStopwatchButtons();
    if (swRecordInput) swRecordInput.value = '';
    if (swProgressRing) swProgressRing.style.strokeDashoffset = `${swCircumference}`;
}

function handleStopwatchRecord() {
    if (swElapsed <= 0) return;

    const t = translations[currentLang];
    const userTyped = swRecordInput ? swRecordInput.value.trim() : '';
    const recordName = userTyped || `${t.defaultRecordName} #${stopwatchRecords.length + 1}`;
    const formatted = formatStopwatchTime(swElapsed);
    const now = new Date();
    const timeMeta = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRecord = {
        id: Date.now(),
        name: recordName,
        time: formatted,
        ms: swElapsed,
        timestamp: timeMeta
    };

    stopwatchRecords.unshift(newRecord);
    if (swRecordInput) swRecordInput.value = '';
    renderStopwatchRecords();
    saveConfig();

    showFloatingToast(t.recordSaved, swBtnRecord);
}

function renderStopwatchRecords() {
    if (!swRecordsList) return;
    swRecordsList.innerHTML = '';

    const count = stopwatchRecords.length;
    if (swRecordsCount) swRecordsCount.textContent = count;
    if (swBtnClearAll) swBtnClearAll.style.display = count > 0 ? 'inline-block' : 'none';

    if (count === 0) {
        swRecordsList.innerHTML = `
            <div class="sw-empty-state">
                <span>⏱️</span>
                <span>${translations[currentLang].emptyRecords}</span>
            </div>
        `;
        return;
    }

    stopwatchRecords.forEach((record, index) => {
        const itemNum = count - index;
        const itemEl = document.createElement('div');
        itemEl.className = 'sw-record-item';
        itemEl.innerHTML = `
            <div class="sw-record-left">
                <span class="sw-record-num">#${itemNum}</span>
                <div class="sw-record-details">
                    <span class="sw-record-name" title="${record.name}">${record.name}</span>
                    <span class="sw-record-time-meta">${record.timestamp || ''}</span>
                </div>
            </div>
            <div class="sw-record-right">
                <span class="sw-record-badge">${record.time}</span>
                <button class="sw-record-del" onclick="deleteStopwatchRecord(${record.id})" title="Borrar">🗑️</button>
            </div>
        `;
        swRecordsList.appendChild(itemEl);
    });
}

window.deleteStopwatchRecord = function(id) {
    stopwatchRecords = stopwatchRecords.filter(r => r.id !== id);
    renderStopwatchRecords();
    saveConfig();
};

function showFloatingToast(text, referenceElement) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.className = 'floating-plus-five';
    toast.style.color = 'var(--text-color)';
    toast.style.background = 'var(--header-bg)';
    toast.style.padding = '4px 12px';
    toast.style.borderRadius = '15px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
    toast.style.fontSize = '0.9rem';
    toast.style.border = '2px solid var(--accent-yellow)';
    toast.style.whiteSpace = 'nowrap';

    if (referenceElement) {
        const rect = referenceElement.getBoundingClientRect();
        toast.style.left = `${rect.left + rect.width / 2}px`;
        toast.style.top = `${rect.top - 15}px`;
        toast.style.transform = 'translate(-50%, 0)';
    } else {
        toast.style.left = '50%';
        toast.style.top = '30%';
        toast.style.transform = 'translate(-50%, 0)';
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2200);
}

// Event Listeners for Stopwatch
if (swBtnStart) swBtnStart.addEventListener('click', handleStopwatchStart);
if (swBtnStop) swBtnStop.addEventListener('click', handleStopwatchStopAll);
if (swBtnRecord) swBtnRecord.addEventListener('click', handleStopwatchRecord);
if (swBtnClearAll) swBtnClearAll.addEventListener('click', () => {
    if (stopwatchRecords.length === 0) return;
    stopwatchRecords = [];
    renderStopwatchRecords();
    saveConfig();
});

if (swRecordInput) {
    swRecordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (swElapsed > 0) {
                handleStopwatchRecord();
            }
        }
    });
}

// Initialize Application with Config
(async () => {
    try {
        const { ipcRenderer } = require('electron');
        const config = await ipcRenderer.invoke('get-config');

        // Apply Config
        if (config.language) {
            changeLanguage(config.language);
        } else {
            changeLanguage('es');
        }

        if (typeof config.widgetEnabled !== 'undefined') {
            isWidgetEnabled = config.widgetEnabled;
            if (widgetToggle) widgetToggle.checked = isWidgetEnabled;
            updateTimerDisplay();
        }

        if (config.tasks) {
            tasks = config.tasks;
            renderTasks();
        }

        if (config.stopwatchRecords && Array.isArray(config.stopwatchRecords)) {
            stopwatchRecords = config.stopwatchRecords;
            renderStopwatchRecords();
        }
    } catch (e) {
        console.error("Failed to load config", e);
        changeLanguage('es');
    }
})();
