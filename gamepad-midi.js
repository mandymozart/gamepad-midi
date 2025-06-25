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
    updateGamepadVisual(); // Update the visual representation
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
        <div class="gamepad-controller">
            <div class="gamepad-handles"></div>
            
            <!-- Trigger buttons -->
            <div class="trigger-buttons">
                <div class="trigger-button button-l2" data-button="6">L2</div>
                <div class="trigger-button button-r2" data-button="7">R2</div>
            </div>
            
            <!-- Shoulder buttons -->
            <div class="shoulder-buttons">
                <div class="shoulder-button button-l1" data-button="4">L1</div>
                <div class="shoulder-button button-r1" data-button="5">R1</div>
            </div>
            
            <!-- Center buttons -->
            <div class="center-buttons">
                <div class="center-button" data-button="8">Select</div>
                <div class="center-button" data-button="9">Start</div>
            </div>
            
            <!-- D-pad -->
            <div class="dpad">
                <div class="dpad-button dpad-up" data-button="12"></div>
                <div class="dpad-button dpad-down" data-button="13"></div>
                <div class="dpad-button dpad-left" data-button="14"></div>
                <div class="dpad-button dpad-right" data-button="15"></div>
            </div>
            
            <!-- Face buttons -->
            <div class="face-buttons">
                <div class="face-button button-y" data-button="3">Y</div>
                <div class="face-button button-x" data-button="2">X</div>
                <div class="face-button button-b" data-button="1">B</div>
                <div class="face-button button-a" data-button="0">A</div>
            </div>
            
            <!-- Analog sticks -->
            <div class="analog-stick left-stick" data-button="10">
                <div class="stick-dot" data-axes="0,1"></div>
            </div>
            <div class="analog-stick right-stick" data-button="11">
                <div class="stick-dot" data-axes="2,3"></div>
            </div>
        </div>
    `;
    
    gamepadVisualContent.innerHTML = gamepadHTML;
}

function updateGamepadVisual() {
    if (!gamepadVisualVisible || !currentVisualGamepad) return;
    
    const gamepad = currentVisualGamepad;
    
    // Update buttons
    const buttonElements = gamepadVisualContent.querySelectorAll('[data-button]');
    buttonElements.forEach(element => {
        const buttonIndex = parseInt(element.dataset.button);
        if (buttonIndex < gamepad.buttons.length) {
            const button = gamepad.buttons[buttonIndex];
            if (button.pressed) {
                element.classList.add('pressed');
            } else {
                element.classList.remove('pressed');
            }
        }
    });
    
    // Update analog sticks
    const stickElements = gamepadVisualContent.querySelectorAll('[data-axes]');
    stickElements.forEach(element => {
        const [xAxis, yAxis] = element.dataset.axes.split(',').map(Number);
        if (xAxis < gamepad.axes.length && yAxis < gamepad.axes.length) {
            const x = gamepad.axes[xAxis] * 15; // Scale movement
            const y = gamepad.axes[yAxis] * 15;
            element.style.transform = `translate(${x}px, ${y}px)`;
        }
    });
    
    // Update analog stick press states
    const leftStick = gamepadVisualContent.querySelector('.left-stick');
    const rightStick = gamepadVisualContent.querySelector('.right-stick');
    
    if (leftStick && gamepad.buttons[10] && gamepad.buttons[10].pressed) {
        leftStick.classList.add('pressed');
    } else if (leftStick) {
        leftStick.classList.remove('pressed');
    }
    
    if (rightStick && gamepad.buttons[11] && gamepad.buttons[11].pressed) {
        rightStick.classList.add('pressed');
    } else if (rightStick) {
        rightStick.classList.remove('pressed');
    }
}

// Initialize everything
initMIDI();
createGamepadVisual();
requestAnimationFrame(process);
