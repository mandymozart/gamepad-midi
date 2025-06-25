// Gamepad to MIDI Controller
// Enhanced version with MIDI output capabilities

const fudgeFactor = 2;
const runningElem = document.querySelector('#running');
const gamepadsElem = document.querySelector('#gamepads');
const midiDeviceSelect = document.querySelector('#midiDevice');
const midiStatusElem = document.querySelector('#midiStatus');

// MIDI Log elements
const midiLogToggle = document.querySelector('.midi-log-toggle');
const midiLogOverlay = document.querySelector('.midi-log-overlay');
const midiLogContent = document.querySelector('.midi-log-content');
const midiLogClearBtn = document.querySelector('.midi-log-controls button');

// Gamepad Visual elements
const gamepadVisualToggle = document.querySelector('.gamepad-visual-toggle');
const gamepadVisualOverlay = document.querySelector('.gamepad-visual-overlay');
const gamepadVisualContent = document.querySelector('.gamepad-visual-content');
const gamepadVisualClose = document.querySelector('.gamepad-visual-close');

const gamepadsByIndex = {};
let midiOutput = null;
let midiAccess = null;
let midiLogVisible = false;
let midiLogEntries = [];
let gamepadVisualVisible = false;
let currentVisualGamepad = null;

// MIDI Configuration
const midiConfig = {
    defaultVelocity: 127,
    ccChannels: new Map(), // axis index -> CC number
    noteChannels: new Map(), // button index -> note number
    axisEnabled: new Map(), // axis index -> boolean
    buttonEnabled: new Map(), // button index -> boolean
    velocities: new Map(), // button index -> velocity
    lastAxisValues: new Map(), // axis index -> last sent MIDI value
    lastButtonStates: new Map() // button index -> last pressed state
};

// Initialize MIDI
async function initMIDI() {
    if (!navigator.requestMIDIAccess) {
        midiStatusElem.textContent = 'MIDI: Not supported in this browser';
        midiStatusElem.className = 'midi-status status-disconnected';
        return;
    }

    try {
        midiAccess = await navigator.requestMIDIAccess();
        updateMIDIDeviceList();
        midiStatusElem.textContent = 'MIDI: Ready (select device)';
        midiStatusElem.className = 'midi-status status-connected';
    } catch (error) {
        console.error('Failed to initialize MIDI:', error);
        midiStatusElem.textContent = 'MIDI: Failed to initialize';
        midiStatusElem.className = 'midi-status status-disconnected';
    }
}

function updateMIDIDeviceList() {
    if (!midiAccess) return;

    // Clear existing options
    midiDeviceSelect.innerHTML = '<option value="">Select MIDI Device...</option>';

    // Add available MIDI output devices
    for (let output of midiAccess.outputs.values()) {
        const option = document.createElement('option');
        option.value = output.id;
        option.textContent = output.name;
        midiDeviceSelect.appendChild(option);
    }
}

function selectMIDIDevice(deviceId) {
    if (!midiAccess) return;

    if (deviceId) {
        midiOutput = midiAccess.outputs.get(deviceId);
        if (midiOutput) {
            midiStatusElem.textContent = `MIDI: Connected to ${midiOutput.name}`;
            midiStatusElem.className = 'midi-status status-connected';
        }
    } else {
        midiOutput = null;
        midiStatusElem.textContent = 'MIDI: No device selected';
        midiStatusElem.className = 'midi-status status-disconnected';
    }
}

// Convert gamepad axis value (-1 to 1) to MIDI CC value (0 to 127)
function axisToMIDI(axisValue) {
    // Clamp to -1, 1 range
    const clamped = Math.max(-1, Math.min(1, axisValue));
    // Convert to 0-127 range with 64 as center
    return Math.round((clamped + 1) * 63.5);
}

// MIDI Logging Functions
function addMIDILogEntry(type, message, details) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        type,
        message,
        details,
        timestamp,
        id: Date.now() + Math.random() // Simple unique ID
    };
    
    midiLogEntries.push(entry);
    
    // Keep only last 100 entries to prevent memory issues
    if (midiLogEntries.length > 100) {
        midiLogEntries.shift();
    }
    
    updateMIDILogDisplay();
}

function updateMIDILogDisplay() {
    if (!midiLogVisible) return;
    
    midiLogContent.innerHTML = '';
    
    midiLogEntries.slice(-50).forEach(entry => { // Show last 50 entries
        const div = document.createElement('div');
        div.className = `midi-log-entry ${entry.type}`;
        div.innerHTML = `
            <div>
                <span class="timestamp">[${entry.timestamp}]</span>
                ${entry.message}
            </div>
            <div style="font-size: 10px; color: #aaa; margin-left: 20px;">
                ${entry.details}
            </div>
        `;
        midiLogContent.appendChild(div);
    });
    
    // Auto-scroll to bottom
    midiLogContent.scrollTop = midiLogContent.scrollHeight;
}

function toggleMIDILog() {
    midiLogVisible = !midiLogVisible;
    midiLogOverlay.style.display = midiLogVisible ? 'flex' : 'none';
    midiLogToggle.textContent = midiLogVisible ? 'Hide MIDI Log' : 'Show MIDI Log';
    
    if (midiLogVisible) {
        updateMIDILogDisplay();
    }
}

function clearMIDILog() {
    midiLogEntries = [];
    updateMIDILogDisplay();
}

// Send MIDI CC message
function sendMIDICC(ccNumber, value, channel = 0) {
    if (!midiOutput) return;
    
    const status = 0xB0 + channel; // CC message on channel
    midiOutput.send([status, ccNumber, value]);
    addMIDILogEntry('cc', `CC ${ccNumber} sent`, `Value: ${value}`);
}

// Send MIDI Note On
function sendMIDINoteOn(note, velocity, channel = 0) {
    if (!midiOutput) return;
    
    const status = 0x90 + channel; // Note on message on channel
    midiOutput.send([status, note, velocity]);
    addMIDILogEntry('note-on', `Note ${note} on`, `Velocity: ${velocity}`);
}

// Send MIDI Note Off
function sendMIDINoteOff(note, channel = 0) {
    if (!midiOutput) return;
    
    const status = 0x80 + channel; // Note off message on channel
    midiOutput.send([status, note, 0]);
    addMIDILogEntry('note-off', `Note ${note} off`, '');
}

// Templates for gamepad display with MIDI controls
const controllerTemplate = `
<div>
  <div class="head"><div class="index"></div><div class="id"></div></div>
  <div class="info"><div class="label">connected:</div><span class="connected"></span></div>
  <div class="info"><div class="label">mapping:</div><span class="mapping"></span></div>
  <div class="inputs">
    <div class="axes-section">
        <h4>Axes (Analog Controls)</h4>
        <div class="axes"></div>
    </div>
    <div class="buttons-section">
        <h4>Buttons</h4>
        <div class="buttons"></div>
    </div>
  </div>
</div>
`;

const axisTemplate = `
<div>
    <svg viewBox="-2.2 -2.2 4.4 4.4" width="80" height="80">
        <circle cx="0" cy="0" r="2" fill="none" stroke="#888" stroke-width="0.04" />
        <path d="M0,-2L0,2M-2,0L2,0" stroke="#888" stroke-width="0.04" />
        <circle cx="0" cy="0" r="0.22" fill="red" class="axis" />
        <text text-anchor="middle" fill="#CCC" x="0" y="2.6" class="axis-label">Axis</text>
        <text text-anchor="middle" fill="#CCC" x="0" y="-2.4" class="axis-index">0</text>
    </svg>
    <div class="control-row">
        <input type="checkbox" class="enabled-checkbox axis-enabled"> Enable
    </div>
    <div class="control-row">
        <label>CC #:</label>
        <input type="number" class="cc-control" min="0" max="127" value="1">
        <span class="midi-value"></span>
    </div>
</div>
`;

const buttonTemplate = `
<div>
    <svg viewBox="-2.2 -2.2 4.4 4.4" width="60" height="60">
      <circle cx="0" cy="0" r="2" fill="none" stroke="#888" stroke-width="0.1" />
      <circle cx="0" cy="0" r="0" fill="gray" class="button" />
      <text class="value" dominant-baseline="middle" text-anchor="middle" fill="#CCC" x="0" y="0">0.00</text>
      <text class="index" alignment-baseline="hanging" dominant-baseline="hanging" text-anchor="start" fill="#CCC" x="-2" y="-2">0</text>
    </svg>
    <div class="control-row">
        <input type="checkbox" class="enabled-checkbox button-enabled"> Enable
    </div>
    <div class="control-row">
        <label>Note:</label>
        <input type="number" class="note-control" min="0" max="127" value="60">
    </div>
    <div class="control-row">
        <label>Velocity:</label>
        <input type="number" class="velocity-control" min="1" max="127" value="127">
    </div>
</div>
`;

function addGamepad(gamepad) {
    console.log('add:', gamepad.index);
    const elem = document.createElement('div');
    elem.innerHTML = controllerTemplate;

    const axesElem = elem.querySelector('.axes');
    const buttonsElem = elem.querySelector('.buttons');
    
    const axes = [];
    for (let ndx = 0; ndx < gamepad.axes.length; ndx++) {
        const div = document.createElement('div');
        div.innerHTML = axisTemplate;
        axesElem.appendChild(div);
        
        const axisIndex = div.querySelector('.axis-index');
        const axisLabel = div.querySelector('.axis-label');
        const enabledCheckbox = div.querySelector('.axis-enabled');
        const ccControl = div.querySelector('.cc-control');
        const midiValue = div.querySelector('.midi-value');
        
        axisIndex.textContent = ndx;
        
        // Label axes as X/Y for pairs, or just the number for singles
        let axisName = '';
        if (ndx % 2 === 0 && ndx + 1 < gamepad.axes.length) {
            axisName = `${Math.floor(ndx / 2)} X`;
        } else if (ndx % 2 === 1) {
            axisName = `${Math.floor(ndx / 2)} Y`;
        } else {
            axisName = `${ndx}`;
        }
        axisLabel.textContent = axisName;
        
        ccControl.value = ndx + 1; // Default CC mapping
        
        // Set up event listeners
        enabledCheckbox.addEventListener('change', (e) => {
            midiConfig.axisEnabled.set(`${gamepad.index}-${ndx}`, e.target.checked);
        });
        
        ccControl.addEventListener('change', (e) => {
            midiConfig.ccChannels.set(`${gamepad.index}-${ndx}`, parseInt(e.target.value));
        });
        
        // Initialize with defaults
        midiConfig.axisEnabled.set(`${gamepad.index}-${ndx}`, false);
        midiConfig.ccChannels.set(`${gamepad.index}-${ndx}`, ndx + 1);
        
        axes.push({
            axis: div.querySelector('.axis'),
            value: axisIndex,
            midiValue: midiValue,
            index: ndx
        });
    }

    const buttons = [];
    for (let ndx = 0; ndx < gamepad.buttons.length; ++ndx) {
        const div = document.createElement('div');
        div.innerHTML = buttonTemplate;
        buttonsElem.appendChild(div);
        
        const indexElem = div.querySelector('.index');
        const enabledCheckbox = div.querySelector('.button-enabled');
        const noteControl = div.querySelector('.note-control');
        const velocityControl = div.querySelector('.velocity-control');
        
        indexElem.textContent = ndx;
        noteControl.value = 60 + ndx; // Default note mapping (C4 + offset)
        
        // Set up event listeners
        enabledCheckbox.addEventListener('change', (e) => {
            midiConfig.buttonEnabled.set(`${gamepad.index}-${ndx}`, e.target.checked);
        });
        
        noteControl.addEventListener('change', (e) => {
            midiConfig.noteChannels.set(`${gamepad.index}-${ndx}`, parseInt(e.target.value));
        });
        
        velocityControl.addEventListener('change', (e) => {
            midiConfig.velocities.set(`${gamepad.index}-${ndx}`, parseInt(e.target.value));
        });
        
        // Initialize with defaults
        midiConfig.buttonEnabled.set(`${gamepad.index}-${ndx}`, false);
        midiConfig.noteChannels.set(`${gamepad.index}-${ndx}`, 60 + ndx);
        midiConfig.velocities.set(`${gamepad.index}-${ndx}`, 127);
        
        buttons.push({
            circle: div.querySelector('.button'),
            value: div.querySelector('.value'),
            index: ndx,
            pressed: false
        });
    }

    gamepadsByIndex[gamepad.index] = {
        gamepad,
        elem,
        axes,
        buttons,
        index: elem.querySelector('.index'),
        id: elem.querySelector('.id'),
        mapping: elem.querySelector('.mapping'),
        connected: elem.querySelector('.connected'),
    };
    gamepadsElem.appendChild(elem);
}

function removeGamepad(gamepad) {
    const info = gamepadsByIndex[gamepad.index];
    if (info) {
        // Clean up MIDI mappings and tracking values
        for (let i = 0; i < gamepad.axes.length; i++) {
            const axisKey = `${gamepad.index}-${i}`;
            midiConfig.axisEnabled.delete(axisKey);
            midiConfig.ccChannels.delete(axisKey);
            midiConfig.lastAxisValues.delete(axisKey);
        }
        for (let i = 0; i < gamepad.buttons.length; i++) {
            const buttonKey = `${gamepad.index}-${i}`;
            midiConfig.buttonEnabled.delete(buttonKey);
            midiConfig.noteChannels.delete(buttonKey);
            midiConfig.velocities.delete(buttonKey);
            midiConfig.lastButtonStates.delete(buttonKey);
        }
        
        delete gamepadsByIndex[gamepad.index];
        info.elem.parentElement.removeChild(info.elem);
    }
}

function addGamepadIfNew(gamepad) {
    const info = gamepadsByIndex[gamepad.index];
    if (!info) {
        addGamepad(gamepad);
    } else {
        info.gamepad = gamepad;
    }
}

function handleConnect(e) {
    console.log('connect');
    addGamepadIfNew(e.gamepad);
}

function handleDisconnect(e) {
    console.log('disconnect');
    removeGamepad(e.gamepad);
}

const keys = ['index', 'id', 'connected', 'mapping'];

function processController(info) {
    const {elem, gamepad, axes, buttons} = info;
    
    // Update basic gamepad info
    for (const key of keys) {
        info[key].textContent = gamepad[key];
    }
    
    // Process axes and send MIDI CC messages
    axes.forEach(({axis, midiValue}, ndx) => {
        const axisValue = gamepad.axes[ndx];
        const midiVal = axisToMIDI(axisValue);
        
        // Update visual - X axes move horizontally, Y axes move vertically
        if (ndx % 2 === 0) {
            // X axis - move horizontally
            axis.setAttributeNS(null, 'cx', axisValue * fudgeFactor);
            axis.setAttributeNS(null, 'cy', 0);
        } else {
            // Y axis - move vertically  
            axis.setAttributeNS(null, 'cx', 0);
            axis.setAttributeNS(null, 'cy', axisValue * fudgeFactor);
        }
        
        midiValue.textContent = `MIDI: ${midiVal}`;
        
        // Send MIDI if enabled
        const axisKey = `${gamepad.index}-${ndx}`;
        if (midiConfig.axisEnabled.get(axisKey) && midiOutput) {
            const ccNumber = midiConfig.ccChannels.get(axisKey);
            if (ccNumber !== undefined) {
                const lastValue = midiConfig.lastAxisValues.get(axisKey);
                if (lastValue === undefined || Math.abs(lastValue - midiVal) > 1) {
                    sendMIDICC(ccNumber, midiVal);
                    midiConfig.lastAxisValues.set(axisKey, midiVal);
                }
            }
        }
    });
    
    // Process buttons and send MIDI notes
    buttons.forEach(({circle, value}, ndx) => {
        const button = gamepad.buttons[ndx];
        const buttonKey = `${gamepad.index}-${ndx}`;
        const isEnabled = midiConfig.buttonEnabled.get(buttonKey);
        
        // Update visual
        circle.setAttributeNS(null, 'r', button.value * fudgeFactor);
        circle.setAttributeNS(null, 'fill', button.pressed ? 'red' : 'gray');
        value.textContent = `${button.value.toFixed(2)}`;
        
        // Handle MIDI note on/off
        if (isEnabled && midiOutput) {
            const noteNumber = midiConfig.noteChannels.get(buttonKey);
            const velocity = midiConfig.velocities.get(buttonKey);
            
            if (noteNumber !== undefined && velocity !== undefined) {
                // Check for button press/release state change
                const buttonInfo = buttons[ndx];
                if (button.pressed && !buttonInfo.pressed) {
                    // Button just pressed
                    sendMIDINoteOn(noteNumber, velocity);
                    midiConfig.lastButtonStates.set(buttonKey, true);
                    buttonInfo.pressed = true;
                } else if (!button.pressed && buttonInfo.pressed) {
                    // Button just released
                    sendMIDINoteOff(noteNumber);
                    midiConfig.lastButtonStates.set(buttonKey, false);
                    buttonInfo.pressed = false;
                }
            }
        }
    });
}

function addNewPads() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i]
        if (gamepad) {
            addGamepadIfNew(gamepad);
        }
    }
}

function process() {
    runningElem.textContent = ((performance.now() * 0.001 * 60 | 0) % 100).toString().padStart(2, '0');
    addNewPads();
    
    // Update the current visual gamepad to the first connected gamepad
    const connectedGamepads = Object.values(gamepadsByIndex);
    if (connectedGamepads.length > 0 && !currentVisualGamepad) {
        currentVisualGamepad = connectedGamepads[0].gamepad;
    } else if (connectedGamepads.length > 0) {
        // Update the gamepad reference (Chrome creates new objects each frame)
        currentVisualGamepad = connectedGamepads[0].gamepad;
    }
    
    Object.values(gamepadsByIndex).forEach(processController);
    updateGamepadVisual(currentVisualGamepad); // Update the visual representation
    requestAnimationFrame(process);
}

// Event listeners
window.addEventListener("gamepadconnected", handleConnect);
window.addEventListener("gamepaddisconnected", handleDisconnect);

midiDeviceSelect.addEventListener('change', (e) => {
    selectMIDIDevice(e.target.value);
});

midiLogToggle.addEventListener('click', toggleMIDILog);
midiLogClearBtn.addEventListener('click', clearMIDILog);

gamepadVisualToggle.addEventListener('click', () => {
    gamepadVisualVisible = !gamepadVisualVisible;
    gamepadVisualOverlay.style.display = gamepadVisualVisible ? 'flex' : 'none';
    gamepadVisualToggle.textContent = gamepadVisualVisible ? 'Hide Gamepad Visual' : 'Show Gamepad Visual';
});

gamepadVisualClose.addEventListener('click', () => {
    gamepadVisualVisible = false;
    gamepadVisualOverlay.style.display = 'none';
    gamepadVisualToggle.textContent = 'Show Gamepad Visual';
});

// Gamepad Visual Functions
function createGamepadVisual() {
    const gamepadHTML = `
        <svg width="350" viewBox="0 0 441 383" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="XBox">
                <path id="LOutline" d="M220.5 294.5C220.5 294.5 195 294.5 150 294.5C105 294.5 81.5 378.5 49.5 378.5C17.5 378.5 4 363.9 4 317.5C4 271.1 43.5 165.5 55 137.5C66.5 109.5 95.5 92.0001 128 92.0001C154 92.0001 200.5 92.0001 220.5 92.0001" stroke="hsl(210,50%,85%)" stroke-width="3" stroke-opacity="1"></path>
                <path id="ROutline" d="M220 294.5C220 294.5 245.5 294.5 290.5 294.5C335.5 294.5 359 378.5 391 378.5C423 378.5 436.5 363.9 436.5 317.5C436.5 271.1 397 165.5 385.5 137.5C374 109.5 345 92.0001 312.5 92.0001C286.5 92.0001 240 92.0001 220 92.0001" stroke="hsl(210,50%,85%)" stroke-width="3" stroke-opacity="1"></path>
                
                <!-- Left Analog Stick -->
                <circle id="LStickOutline" cx="113" cy="160" r="37.5" stroke="hsl(210,50%,85%)" stroke-opacity="1" stroke-width="3"></circle>
                <circle id="LeftStick" cx="113" cy="160" r="28" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3" data-button="10" data-axes="0,1"></circle>
                
                <!-- Right Analog Stick -->
                <circle id="RStickOutline" cx="278" cy="238" r="37.5" stroke="hsl(210,50%,85%)" stroke-opacity="1" stroke-width="3"></circle>
                <circle id="RightStick" cx="278" cy="238" r="28" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3" data-button="11" data-axes="2,3"></circle>
                
                <!-- D-Pad -->
                <circle id="DOutline" cx="166" cy="238" r="37.5" stroke="hsl(210,50%,85%)" stroke-opacity="1" stroke-width="3"></circle>
                <g id="DUp" data-button="12"><mask id="path-8-inside-1" fill="white"><path d="M177.669 222.335C180.793 219.21 180.816 213.997 176.868 212.014C176.327 211.743 175.776 211.491 175.215 211.258C172.182 210.002 168.931 209.355 165.648 209.355C162.365 209.355 159.114 210.002 156.081 211.258C155.521 211.491 154.969 211.743 154.429 212.014C150.48 213.997 150.503 219.21 153.627 222.335L159.991 228.698C163.116 231.823 168.181 231.823 171.305 228.698L177.669 222.335Z"></path></mask><path d="M177.669 222.335C180.793 219.21 180.816 213.997 176.868 212.014C176.327 211.743 175.776 211.491 175.215 211.258C172.182 210.002 168.931 209.355 165.648 209.355C162.365 209.355 159.114 210.002 156.081 211.258C155.521 211.491 154.969 211.743 154.429 212.014C150.48 213.997 150.503 219.21 153.627 222.335L159.991 228.698C163.116 231.823 168.181 231.823 171.305 228.698L177.669 222.335Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-8-inside-1)"></path></g>
                <g id="DRight" data-button="15"><mask id="path-9-inside-2" fill="white"><path d="M181.447 249.669C184.571 252.793 189.785 252.816 191.768 248.868C192.039 248.327 192.291 247.776 192.523 247.215C193.78 244.182 194.426 240.931 194.426 237.648C194.426 234.365 193.78 231.114 192.523 228.081C192.291 227.521 192.039 226.969 191.768 226.429C189.785 222.48 184.571 222.503 181.447 225.627L175.083 231.991C171.959 235.116 171.959 240.181 175.083 243.305L181.447 249.669Z"></path></mask><path d="M181.447 249.669C184.571 252.793 189.785 252.816 191.768 248.868C192.039 248.327 192.291 247.776 192.523 247.215C193.78 244.182 194.426 240.931 194.426 237.648C194.426 234.365 193.78 231.114 192.523 228.081C192.291 227.521 192.039 226.969 191.768 226.429C189.785 222.48 184.571 222.503 181.447 225.627L175.083 231.991C171.959 235.116 171.959 240.181 175.083 243.305L181.447 249.669Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-9-inside-2)"></path></g>
                <g id="DDown" data-button="13"><mask id="path-10-inside-3" fill="white"><path d="M154.113 253.447C150.989 256.571 150.966 261.785 154.914 263.767C155.455 264.039 156.006 264.291 156.566 264.523C159.6 265.78 162.85 266.426 166.134 266.426C169.417 266.426 172.667 265.78 175.701 264.523C176.261 264.291 176.812 264.039 177.353 263.767C181.301 261.785 181.279 256.571 178.154 253.447L171.79 247.083C168.666 243.959 163.601 243.959 160.477 247.083L154.113 253.447Z"></path></mask><path d="M154.113 253.447C150.989 256.571 150.966 261.785 154.914 263.767C155.455 264.039 156.006 264.291 156.566 264.523C159.6 265.78 162.85 266.426 166.134 266.426C169.417 266.426 172.667 265.78 175.701 264.523C176.261 264.291 176.812 264.039 177.353 263.767C181.301 261.785 181.279 256.571 178.154 253.447L171.79 247.083C168.666 243.959 163.601 243.959 160.477 247.083L154.113 253.447Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-10-inside-3)"></path></g>
                <g id="DLeft" data-button="14"><mask id="path-11-inside-4" fill="white"><path d="M150.335 226.113C147.21 222.989 141.997 222.966 140.014 226.914C139.743 227.455 139.491 228.006 139.258 228.566C138.002 231.6 137.355 234.85 137.355 238.134C137.355 241.417 138.002 244.667 139.258 247.701C139.491 248.261 139.743 248.812 140.014 249.353C141.997 253.301 147.21 253.279 150.335 250.154L156.698 243.79C159.823 240.666 159.823 235.601 156.698 232.477L150.335 226.113Z"></path></mask><path d="M150.335 226.113C147.21 222.989 141.997 222.966 140.014 226.914C139.743 227.455 139.491 228.006 139.258 228.566C138.002 231.6 137.355 234.85 137.355 238.134C137.355 241.417 138.002 244.667 139.258 247.701C139.491 248.261 139.743 248.812 140.014 249.353C141.997 253.301 147.21 253.279 150.335 250.154L156.698 243.790C159.823 240.666 159.823 235.601 156.698 232.477L150.335 226.113Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-11-inside-4)"></path></g>
                
                <!-- Face Buttons -->
                <circle id="BOutline" cx="329" cy="160" r="37.5" stroke="hsl(210,50%,85%)" stroke-opacity="1" stroke-width="3"></circle>
                <g id="BTop" data-button="3"><mask id="path-13-inside-5" fill="white"><path d="M340.669 144.335C343.793 141.21 343.816 135.997 339.868 134.014C339.327 133.743 338.776 133.491 338.215 133.258C335.182 132.002 331.931 131.355 328.648 131.355C325.365 131.355 322.114 132.002 319.081 133.258C318.521 133.491 317.969 133.743 317.429 134.014C313.48 135.997 313.503 141.21 316.627 144.335L322.991 150.698C326.116 153.823 331.181 153.823 334.305 150.698L340.669 144.335Z"></path></mask><path d="M340.669 144.335C343.793 141.21 343.816 135.997 339.868 134.014C339.327 133.743 338.776 133.491 338.215 133.258C335.182 132.002 331.931 131.355 328.648 131.355C325.365 131.355 322.114 132.002 319.081 133.258C318.521 133.491 317.969 133.743 317.429 134.014C313.48 135.997 313.503 141.21 316.627 144.335L322.991 150.698C326.116 153.823 331.181 153.823 334.305 150.698L340.669 144.335Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-13-inside-5)"></path></g>
                <g id="BRight" data-button="1"><mask id="path-14-inside-6" fill="white"><path d="M344.447 171.669C347.571 174.793 352.785 174.816 354.768 170.868C355.039 170.327 355.291 169.776 355.523 169.215C356.78 166.182 357.426 162.931 357.426 159.648C357.426 156.365 356.78 153.114 355.523 150.081C355.291 149.521 355.039 148.969 354.768 148.429C352.785 144.48 347.571 144.503 344.447 147.627L338.083 153.991C334.959 157.116 334.959 162.181 338.083 165.305L344.447 171.669Z"></path></mask><path d="M344.447 171.669C347.571 174.793 352.785 174.816 354.768 170.868C355.039 170.327 355.291 169.776 355.523 169.215C356.78 166.182 357.426 162.931 357.426 159.648C357.426 156.365 356.78 153.114 355.523 150.081C355.291 149.521 355.039 148.969 354.768 148.429C352.785 144.48 347.571 144.503 344.447 147.627L338.083 153.991C334.959 157.116 334.959 162.181 338.083 165.305L344.447 171.669Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-14-inside-6)"></path></g>
                <g id="BBottom" data-button="0"><mask id="path-15-inside-7" fill="white"><path d="M317.113 175.447C313.989 178.571 313.966 183.785 317.914 185.767C318.455 186.039 319.006 186.291 319.566 186.523C322.6 187.78 325.85 188.426 329.134 188.426C332.417 188.426 335.667 187.78 338.701 186.523C339.261 186.291 339.812 186.039 340.353 185.767C344.301 183.785 344.279 178.571 341.154 175.447L334.79 169.083C331.666 165.959 326.601 165.959 323.477 169.083L317.113 175.447Z"></path></mask><path d="M317.113 175.447C313.989 178.571 313.966 183.785 317.914 185.767C318.455 186.039 319.006 186.291 319.566 186.523C322.6 187.78 325.85 188.426 329.134 188.426C332.417 188.426 335.667 187.78 338.701 186.523C339.261 186.291 339.812 186.039 340.353 185.767C344.301 183.785 344.279 178.571 341.154 175.447L334.79 169.083C331.666 165.959 326.601 165.959 323.477 169.083L317.113 175.447Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-15-inside-7)"></path></g>
                <g id="BLeft" data-button="2"><mask id="path-16-inside-8" fill="white"><path d="M313.335 148.113C310.21 144.989 304.997 144.966 303.014 148.914C302.743 149.455 302.491 150.006 302.258 150.566C301.002 153.6 300.355 156.851 300.355 160.134C300.355 163.417 301.002 166.668 302.258 169.701C302.491 170.261 302.743 170.812 303.014 171.353C304.997 175.301 310.21 175.279 313.335 172.154L319.698 165.790C322.823 162.666 322.823 157.601 319.698 154.477L313.335 148.113Z"></path></mask><path d="M313.335 148.113C310.21 144.989 304.997 144.966 303.014 148.914C302.743 149.455 302.491 150.006 302.258 150.566C301.002 153.6 300.355 156.851 300.355 160.134C300.355 163.417 301.002 166.668 302.258 169.701C302.491 170.261 302.743 170.812 303.014 171.353C304.997 175.301 310.21 175.279 313.335 172.154L319.698 165.790C322.823 162.666 322.823 157.601 319.698 154.477L313.335 148.113Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="6" mask="url(#path-16-inside-8)"></path></g>
                
                <!-- Meta Buttons (Select/Start) -->
                <g id="LMeta" data-button="8"><circle cx="185" cy="162" r="10" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3"></circle></g>
                <g id="RMeta" data-button="9"><circle cx="259" cy="162" r="10" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3"></circle></g>
                
                <!-- Shoulder Buttons -->
                <rect id="L1" x="111.5" y="61.5" width="41" height="13" rx="6.5" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3" data-button="4"></rect>
                <rect id="R1" x="289.5" y="61.5" width="41" height="13" rx="6.5" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3" data-button="5"></rect>
                
                <!-- Trigger Buttons -->
                <path id="L2" d="M152.5 37C152.5 41.1421 149.142 44.5 145 44.5H132C127.858 44.5 124.5 41.1421 124.5 37V16.5C124.5 8.76801 130.768 2.5 138.5 2.5C146.232 2.5 152.5 8.76801 152.5 16.5V37Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3" data-button="6"></path>
                <path id="R2" d="M317.5 37C317.5 41.1421 314.142 44.5 310 44.5H297C292.858 44.5 289.5 41.1421 289.5 37V16.5C289.5 8.76801 295.768 2.5 303.5 2.5C311.232 2.5 317.5 8.76801 317.5 16.5V37Z" fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,1)" stroke-width="3" data-button="7"></path>
                
                <!-- Decorative Lines -->
                <line x1="30" y1="210" x2="130" y2="300" stroke-width="3" stroke="hsl(210,50%,85%)" opacity="0.3"></line>
                <line x1="411" y1="210" x2="311" y2="300" stroke-width="3" stroke="hsl(210,50%,85%)" opacity="0.3"></line>
            </g>
        </svg>
    `;
    
    gamepadVisualContent.innerHTML = gamepadHTML;
}

function updateGamepadVisual(gamepad) {
    if (!gamepad || !gamepadVisualContent.children.length) return;
    
    // Map button indices to SVG element IDs
    const buttonMap = {
        0: 'BBottom',    // A
        1: 'BRight',     // B
        2: 'BLeft',      // X
        3: 'BTop',       // Y
        4: 'L1',         // L1
        5: 'R1',         // R1
        6: 'L2',         // L2
        7: 'R2',         // R2
        8: 'LMeta',      // Select
        9: 'RMeta',      // Start
        10: 'LeftStick', // Left Stick Press
        11: 'RightStick' // Right Stick Press
    };
    
    // Update button states
    gamepad.buttons.forEach((button, index) => {
        const isPressed = button.pressed || button.value > 0.5;
        
        if (buttonMap[index]) {
            const element = gamepadVisualContent.querySelector(`#${buttonMap[index]}`);
            if (element) {
                if (isPressed) {
                    element.style.fill = 'hsl(210,100%,70%)';
                    element.style.stroke = 'hsl(210,100%,80%)';
                } else {
                    element.style.fill = 'rgba(0,0,0,0)';
                    element.style.stroke = 'rgba(0,0,0,1)';
                }
            }
        }
    });
    
    // Update analog stick positions
    const leftStick = gamepadVisualContent.querySelector('#LeftStick');
    const rightStick = gamepadVisualContent.querySelector('#RightStick');
    
    if (leftStick && gamepad.axes.length > 1) {
        const x = 113 + (gamepad.axes[0] * 20); // Base position + movement
        const y = 160 + (gamepad.axes[1] * 20);
        leftStick.setAttribute('cx', x);
        leftStick.setAttribute('cy', y);
    }
    
    if (rightStick && gamepad.axes.length > 3) {
        const x = 278 + (gamepad.axes[2] * 20);
        const y = 238 + (gamepad.axes[3] * 20);
        rightStick.setAttribute('cx', x);
        rightStick.setAttribute('cy', y);
    }
    
    // Handle D-pad - Method 1: As buttons (12, 13, 14, 15)
    const dpadButtons = {
        12: 'DUp',
        13: 'DDown',
        14: 'DLeft',
        15: 'DRight'
    };
    
    // Reset D-pad states
    Object.values(dpadButtons).forEach(id => {
        const element = gamepadVisualContent.querySelector(`#${id}`);
        if (element) {
            element.style.fill = 'rgba(0,0,0,0)';
            element.style.stroke = 'rgba(0,0,0,1)';
        }
    });
    
    // Check button-based D-pad
    Object.entries(dpadButtons).forEach(([buttonIndex, elementId]) => {
        if (gamepad.buttons[buttonIndex] && gamepad.buttons[buttonIndex].pressed) {
            const element = gamepadVisualContent.querySelector(`#${elementId}`);
            if (element) {
                element.style.fill = 'hsl(210,100%,70%)';
                element.style.stroke = 'hsl(210,100%,80%)';
            }
        }
    });
    
    // Handle D-pad - Method 2: As axes (6,7)
    if (gamepad.axes.length > 6) {
        const horizontalAxis = gamepad.axes[6]; // -1 = left, 1 = right
        const verticalAxis = gamepad.axes[7];   // -1 = up, 1 = down
        
        // Horizontal D-pad
        if (horizontalAxis < -0.5) {
            const element = gamepadVisualContent.querySelector('#DLeft');
            if (element) {
                element.style.fill = 'hsl(210,100%,70%)';
                element.style.stroke = 'hsl(210,100%,80%)';
            }
        } else if (horizontalAxis > 0.5) {
            const element = gamepadVisualContent.querySelector('#DRight');
            if (element) {
                element.style.fill = 'hsl(210,100%,70%)';
                element.style.stroke = 'hsl(210,100%,80%)';
            }
        }
        
        // Vertical D-pad
        if (verticalAxis < -0.5) {
            const element = gamepadVisualContent.querySelector('#DUp');
            if (element) {
                element.style.fill = 'hsl(210,100%,70%)';
                element.style.stroke = 'hsl(210,100%,80%)';
            }
        } else if (verticalAxis > 0.5) {
            const element = gamepadVisualContent.querySelector('#DDown');
            if (element) {
                element.style.fill = 'hsl(210,100%,70%)';
                element.style.stroke = 'hsl(210,100%,80%)';
            }
        }
    }
}

// Initialize everything
initMIDI();
createGamepadVisual();
requestAnimationFrame(process);
