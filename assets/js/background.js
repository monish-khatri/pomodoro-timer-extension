import { 
    DEFAULT_WORK_TIME, 
    DEFAULT_BREAK_TIME, 
    DEFAULT_TOTAL_SETS, 
    BACK_TO_WORK_TITLE,
    BACK_TO_WORK_MSG,
    TAKE_BREAK_TITLE,
    TAKE_BREAK_MSG,
    POMODORO_COMPLETE_TITLE,
    POMODORO_COMPLETE_MSG,
    NOTIFICATION_ICON,
    OPERATION_START,
    OPERATION_RESET
} from './constants.js';

let timerInterval;
let timeLeft;
let isBreak = false;
let currentSet = 1; // Track the current set
let totalSets = DEFAULT_TOTAL_SETS; // Total sets defined by the user

// Create a variable to store the port for communication
let port = null;

const startTimer = () => {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateBadge();
        } else {
            clearInterval(timerInterval);
            isBreak = !isBreak;

            // Fetch the saved durations and totalSets
            chrome.storage.sync.get(["workTime", "breakTime", "totalSets"], (settings) => {
                totalSets = settings.totalSets || 1; // Get the total sets from storage

                // If the current set is less than the total sets, proceed to the next cycle
                if (currentSet < totalSets) {
                    timeLeft = isBreak ? settings.breakTime * 60 : settings.workTime * 60;
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: chrome.runtime.getURL(NOTIFICATION_ICON),
                        title: isBreak ? TAKE_BREAK_TITLE : BACK_TO_WORK_TITLE,
                        message: isBreak ? TAKE_BREAK_MSG : BACK_TO_WORK_MSG
                    });
                    if(!isBreak) currentSet++;
                    startTimer(); // Restart the timer
                } else {
                    // If all sets are completed
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: chrome.runtime.getURL(NOTIFICATION_ICON),
                        title: POMODORO_COMPLETE_TITLE,
                        message: POMODORO_COMPLETE_MSG
                    });
                    resetTimer(true); // Reset the timer after completion
                }
            });
        }
    }, 1000);
};

const resetTimer = (isComplete = false) => {
    clearInterval(timerInterval);
    isBreak = false;
    currentSet = 1; // Reset the current set count
    chrome.storage.sync.set({ isStarted: false }); // Save state as "not started"
    chrome.storage.sync.get(["workTime"], (settings) => {
        timeLeft = settings.workTime * 60;
        updateBadge();
    });
};

const updateBadge = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

    // Update the badge text
    chrome.action.setBadgeText({ text: formattedTime });

    // Send the updated time to the popup if connected
    if (port) {
        port.postMessage({ command: "updateTimer", formattedTime, currentSet, totalSets });
    }
};

// Listener for connection from the popup
chrome.runtime.onConnect.addListener((p) => {
    port = p;
    port.onDisconnect.addListener(() => {
        port = null;
    });
});

// Listen for commands from the popup
chrome.runtime.onMessage.addListener((message) => {
    if (message.command === OPERATION_START) {
        chrome.storage.sync.get(["workTime", "totalSets"], (settings) => {
            timeLeft = timeLeft || settings.workTime * 60;
            totalSets = settings.totalSets || 1; // Use the total sets from storage
            currentSet = 1; // Start from the first set
            startTimer();
        });
    } else if (message.command === OPERATION_RESET) {
        resetTimer();
    }
});

// Initialize badge on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ workTime: DEFAULT_WORK_TIME, breakTime: DEFAULT_BREAK_TIME, totalSets: DEFAULT_TOTAL_SETS}); // Default to 1 set
    resetTimer();
});
