import { 
    DEFAULT_WORK_TIME, 
    DEFAULT_BREAK_TIME, 
    DEFAULT_TOTAL_SETS,
    OPERATION_RESET,
    OPERATION_START
} from './constants.js';

let timeLeft;
const startButton = document.getElementById("start");
const resetButton = document.getElementById("reset");
const customSettings = document.getElementById('custom-setting');
const saveSettingsButton = document.getElementById("save-settings");
const workTimeInput = document.getElementById("work-time");
const breakTimeInput = document.getElementById("break-time");
const setsInput = document.getElementById("total-sets");
const timerElement = document.getElementById("timer");
const modeElement = document.getElementById("current-mode");
const setsDisplay = document.createElement("p"); // Display for current set progress
setsDisplay.id = "sets-display";
document.querySelector(".box").appendChild(setsDisplay); // Append to the popup


// Establish a connection with the background script
const port = chrome.runtime.connect();

port.onMessage.addListener((message) => {
    if (message.command === "updateTimer") {
        // Update the timer element
        timerElement.textContent = message.formattedTime;
        setsDisplay.textContent = `Set: ${message.currentSet}/${message.totalSets}`; // Update set progress
    }
});

startButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: OPERATION_START });
    chrome.storage.sync.set({ isStarted: true }, () => {
        toggleUiVisibility(true); // Hide Start button and show Reset button
    });
});

resetButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: OPERATION_RESET });
    chrome.storage.sync.set({ isStarted: false }, () => {
        toggleUiVisibility(false); // Hide Reset button and show Start button
    });
});

saveSettingsButton.addEventListener("click", () => {
    // Get the new values from the input fields
    const workTime = parseInt(workTimeInput.value, 10) || DEFAULT_WORK_TIME;
    const breakTime = parseInt(breakTimeInput.value, 10) || DEFAULT_BREAK_TIME;
    const totalSets = parseInt(setsInput.value, 10) || DEFAULT_TOTAL_SETS; // Get the total sets value

    // Save the settings to Chrome storage
    chrome.storage.sync.set({ workTime, breakTime, totalSets }, () => {
        alert("Settings saved!");

        // Update the timer in the popup immediately
        chrome.storage.sync.get(["workTime"], (settings) => {
            timeLeft = settings.workTime * 60;
            updateDisplay();
        });

        // Notify the background script to reset the timer
        chrome.runtime.sendMessage({ command: OPERATION_RESET });
    });
});

// Initialize buttons
function toggleUiVisibility(isStarted) {
    if (isStarted) {
        startButton.style.display = "none"; // Hide Start button
        resetButton.style.display = "inline"; // Show Reset button
        customSettings.style.display = "none" // Hide Custom Settings
        setsDisplay.style.display = 'block' // show sets
    } else {
        startButton.style.display = "inline"; // Show Start button
        resetButton.style.display = "none"; // Hide Reset button
        customSettings.style.display = "block" // Show Custom Settings
        setsDisplay.style.display = 'none' // Hide Sets

    }
};

// Function to update the display
const updateDisplay = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("timer").textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// Initialize inputs with saved settings
chrome.storage.sync.get(["workTime", "breakTime", "totalSets"], (settings) => {
    const workTime = settings.workTime || DEFAULT_WORK_TIME;
    const breakTime = settings.breakTime || DEFAULT_BREAK_TIME;
    const totalSets = settings.totalSets || DEFAULT_TOTAL_SETS;

    workTimeInput.value = workTime;
    breakTimeInput.value = breakTime;
    setsInput.value = totalSets;

    timeLeft = workTime * 60;
    updateDisplay();
});

// When the popup is opened, check the state from storage
chrome.storage.sync.get(["isStarted"], (result) => {
    const isStarted = result.isStarted || false;
    toggleUiVisibility(isStarted); // Adjust visibility based on stored state
});

// Initial visibility setup
toggleUiVisibility(false);