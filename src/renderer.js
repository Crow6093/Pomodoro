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
            new Notification('Pomodoro Complete!', { body: 'Great job!' });
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
        document.getElementById(tabId).style.display = 'block';

        if (tabId === 'pomodoro') {
            document.getElementById('pomodoro').style.display = 'flex';
            btnStart.style.display = '';
            btnPause.style.display = '';
            btnAdd.style.display = '';
            btnAdd.innerText = '⏰'; // Clock icon for adding time
        } else if (tabId === 'tareas') {
            btnStart.style.display = 'none';
            btnPause.style.display = 'none';
            btnAdd.style.display = '';
            btnAdd.innerText = '+'; // Plus icon for adding task
        } else {
            // Ajustes
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
        new Notification('Time Added', { body: '+5 Minutes added!' });

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
                <span>No olvides ir a la pestaña de tareas para poner una nueva tarea ✨</span>
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
                renderTasks();
            }
        });
    });
}

// Global Delete Function
window.deleteTask = function (id) {
    tasks = tasks.filter(t => t.id !== id);
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
    btnResetSound.addEventListener('click', () => {
        localStorage.removeItem('customAlarm');
        currentSoundLabel.textContent = 'Default';
        btnResetSound.style.display = 'none';
    });
}

if (btnSelectSound) {
    btnSelectSound.addEventListener('click', async () => {
        const filePath = await ipcRenderer.invoke('open-sound-dialog');
        if (filePath) {
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
        new Notification('Time Updated', { body: `Timer set to ${minutes} minutes` });
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
