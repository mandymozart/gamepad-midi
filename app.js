// Gamepad to MIDI Controller
// Enhanced version with MIDI output capabilities

const fudgeFactor = 2;
const runningElem = document.querySelector('#running');
const gamepadsElem = document.querySelector('#gamepads');
const midiDeviceSelect = document.querySelector('#midiDevice');
const midiStatusElem = document.querySelector('#midiStatus');
const vrmSceneSelect = document.querySelector('#vrmScene');
const vrmStatusElem = document.querySelector('#vrmStatus');

// MIDI Log elements
const midiLogToggle = document.querySelector('.midi-log-toggle');
const midiLogOverlay = document.querySelector('.midi-log-overlay');
const midiLogContent = document.querySelector('.midi-log-content');
const midiLogClearBtn = document.querySelector('.midi-log-controls button');


// Gamepad 3D elements
const gamepad3DToggle = document.querySelector('.gamepad-3d-toggle');
const gamepad3DOverlay = document.querySelector('.gamepad-3d-overlay');
const gamepad3DClose = document.querySelector('.gamepad-3d-close');

// Gamepads toggle elements
const gamepadsToggle = document.querySelector('.gamepads-toggle');

const gamepadsByIndex = {};
let midiOutput = null;
let midiAccess = null;
let midiLogVisible = false;
let midiLogEntries = [];
let gamepad3DVisible = false;
let gamepadsVisible = true; // Default to visible

// MIDI Configuration
const midiConfig = {
    defaultVelocity: 127,
    ccChannels: new Map(), // axis index -> CC number
    noteChannels: new Map(), // button index -> note number
    axisEnabled: new Map(), // axis index -> boolean
    buttonEnabled: new Map(), // button index -> boolean
    velocities: new Map(), // button index -> velocity
    lastAxisValues: new Map(), // axis index -> last sent MIDI value
    lastButtonStates: new Map(), // button index -> last pressed state
    axisInverted: new Map() // axis index -> boolean
};

// VRM Configuration - Simplified for button animations only
const vrmConfig = {
    activeScene: null,
    
    // Button mappings: "${gamepadIndex}-${buttonIndex}" -> animation name
    buttonMappings: new Map(), // key -> animation name
    buttonVrmEnabled: new Map(), // "${gamepadIndex}-${buttonIndex}" -> boolean
    
    // Scene registry
    scenes: new Map() // scene name -> scene config
};

// Make vrmConfig available globally
window.vrmConfig = vrmConfig;
console.log('🔧 vrmConfig created and exposed to window:', window.vrmConfig);
// Preset Management
const presets = new Map(); // presetName -> presetData
const gamepadPresets = new Map(); // gamepadIndex -> currentPresetName

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
    midiDeviceSelect.innerHTML = '<option value="">Select...</option>';

    let firstDeviceId = null;
    
    // Add available MIDI output devices
    for (let output of midiAccess.outputs.values()) {
        const option = document.createElement('option');
        option.value = output.id;
        option.textContent = output.name;
        midiDeviceSelect.appendChild(option);
        
        // Remember the first device ID
        if (!firstDeviceId) {
            firstDeviceId = output.id;
        }
    }
    
    // Auto-select the first MIDI device if available
    if (firstDeviceId) {
        midiDeviceSelect.value = firstDeviceId;
        selectMIDIDevice(firstDeviceId);
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
function axisToMIDI(axisValue, inverted) {
    // Clamp to -1, 1 range
    const clamped = Math.max(-1, Math.min(1, axisValue));
    // Convert to 0-127 range with 64 as center
    let midiVal = Math.round((clamped + 1) * 63.5);
    if (inverted) {
        midiVal = 127 - midiVal;
    }
    return midiVal;
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
    
    // Update the visual display
    updateMIDILogDisplay();
}

function updateMIDILogDisplay() {
    if (!midiLogContent) return;
    
    midiLogContent.innerHTML = '';
    
    midiLogEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = `midi-log-entry midi-log-${entry.type}`;
        entryDiv.innerHTML = `
            <span class="midi-log-timestamp">${entry.timestamp}</span>
            <span class="midi-log-message">${entry.message}</span>
            <span class="midi-log-details">${entry.details}</span>
        `;
        midiLogContent.appendChild(entryDiv);
    });
    
    // Auto-scroll to bottom
    midiLogContent.scrollTop = midiLogContent.scrollHeight;
}

function toggleMIDILog() {
    midiLogVisible = !midiLogVisible;
    if (midiLogOverlay) {
        midiLogOverlay.style.display = midiLogVisible ? 'flex' : 'none';
    }
    if (midiLogToggle) {
        midiLogToggle.style.color = midiLogVisible ? 'white' : 'grey';
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

// Preset Management Functions
function captureCurrentPreset(gamepadIndex, gamepad) {
    const presetData = {
        metadata: {
            gamepadId: gamepad.id,
            gamepadIndex: gamepadIndex,
            axesCount: gamepad.axes.length,
            buttonsCount: gamepad.buttons.length,
            createdAt: new Date().toISOString()
        },
        axes: {},
        buttons: {}
    };

    // Capture axis settings
    for (let i = 0; i < gamepad.axes.length; i++) {
        const key = `${gamepadIndex}-${i}`;
        presetData.axes[i] = {
            enabled: midiConfig.axisEnabled.get(key) || false,
            inverted: midiConfig.axisInverted.get(key) || false,
            ccNumber: midiConfig.ccChannels.get(key) || (i + 1),
            channel: 0 // Default channel, could be made configurable
        };
    }

    // Capture button settings
    for (let i = 0; i < gamepad.buttons.length; i++) {
        const key = `${gamepadIndex}-${i}`;
        presetData.buttons[i] = {
            enabled: midiConfig.buttonEnabled.get(key) || false,
            note: midiConfig.noteChannels.get(key) || (60 + i),
            velocity: midiConfig.velocities.get(key) || 127,
            channel: 0 // Default channel, could be made configurable
        };
    }

    return presetData;
}

function applyPreset(gamepadIndex, gamepad, presetData) {
    // Check compatibility and show warning if needed
    const warning = checkPresetCompatibility(gamepad, presetData);
    const warningElem = document.querySelector(`[data-gamepad="${gamepadIndex}"] .preset-warning`);
    
    if (warning) {
        warningElem.textContent = warning;
        warningElem.style.display = 'block';
    } else {
        warningElem.style.display = 'none';
    }

    // Apply axis settings
    Object.entries(presetData.axes || {}).forEach(([axisIndex, settings]) => {
        const index = parseInt(axisIndex);
        if (index < gamepad.axes.length) {
            const key = `${gamepadIndex}-${index}`;
            midiConfig.axisEnabled.set(key, settings.enabled);
            midiConfig.axisInverted.set(key, settings.inverted);
            midiConfig.ccChannels.set(key, settings.ccNumber);
        }
    });

    // Apply button settings
    Object.entries(presetData.buttons || {}).forEach(([buttonIndex, settings]) => {
        const index = parseInt(buttonIndex);
        if (index < gamepad.buttons.length) {
            const key = `${gamepadIndex}-${index}`;
            midiConfig.buttonEnabled.set(key, settings.enabled);
            midiConfig.noteChannels.set(key, settings.note);
            midiConfig.velocities.set(key, settings.velocity);
        }
    });

    // Update UI to reflect the loaded preset
    updatePresetUI(gamepadIndex, gamepad);
}

function checkPresetCompatibility(gamepad, presetData) {
    const warnings = [];
    
    if (presetData.metadata.gamepadId !== gamepad.id) {
        warnings.push(`Controller mismatch: preset for "${presetData.metadata.gamepadId}", current is "${gamepad.id}"`);
    }
    
    if (presetData.metadata.axesCount !== gamepad.axes.length) {
        warnings.push(`Axes count mismatch: preset has ${presetData.metadata.axesCount}, current has ${gamepad.axes.length}`);
    }
    
    if (presetData.metadata.buttonsCount !== gamepad.buttons.length) {
        warnings.push(`Buttons count mismatch: preset has ${presetData.metadata.buttonsCount}, current has ${gamepad.buttons.length}`);
    }
    
    return warnings.length > 0 ? warnings.join('; ') : null;
}

function updatePresetUI(gamepadIndex, gamepad) {
    const gamepadElem = document.querySelector(`[data-gamepad="${gamepadIndex}"]`);
    if (!gamepadElem) return;

    // Update axis UI elements
    const axisElements = gamepadElem.querySelectorAll('.axes > div');
    axisElements.forEach((elem, index) => {
        const key = `${gamepadIndex}-${index}`;
        const enabledCheckbox = elem.querySelector('.axis-enabled');
        const invertCheckbox = elem.querySelector('.axis-invert');
        const ccControl = elem.querySelector('.cc-control');
        
        if (enabledCheckbox) enabledCheckbox.checked = midiConfig.axisEnabled.get(key) || false;
        if (invertCheckbox) invertCheckbox.checked = midiConfig.axisInverted.get(key) || false;
        if (ccControl) ccControl.value = midiConfig.ccChannels.get(key) || (index + 1);
    });

    // Update button UI elements
    const buttonElements = gamepadElem.querySelectorAll('.buttons > div');
    buttonElements.forEach((elem, index) => {
        const key = `${gamepadIndex}-${index}`;
        const enabledCheckbox = elem.querySelector('.button-enabled');
        const noteControl = elem.querySelector('.note-control');
        const velocityControl = elem.querySelector('.velocity-control');
        
        if (enabledCheckbox) enabledCheckbox.checked = midiConfig.buttonEnabled.get(key) || false;
        if (noteControl) noteControl.value = midiConfig.noteChannels.get(key) || (60 + index);
        if (velocityControl) velocityControl.value = midiConfig.velocities.get(key) || 127;
    });
}

function savePresetsToFile() {
    const presetsObject = Object.fromEntries(presets);
    const jsonData = JSON.stringify(presetsObject, null, 2);
    
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamepad-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    addMIDILogEntry('info', 'Presets saved to file', `${presets.size} presets exported`);
}

function loadPresetsFromFile(fileData) {
    try {
        const presetsData = JSON.parse(fileData);
        
        // Clear existing presets
        presets.clear();
        
        // Load new presets
        Object.entries(presetsData).forEach(([name, data]) => {
            presets.set(name, data);
        });
        
        // Update all preset dropdowns
        updateAllPresetDropdowns();
        
        addMIDILogEntry('info', 'Presets loaded from file', `${presets.size} presets imported`);
        return true;
    } catch (error) {
        addMIDILogEntry('error', 'Failed to load presets', error.message);
        return false;
    }
}

function updateAllPresetDropdowns() {
    const selectElements = document.querySelectorAll('.preset-select');
    selectElements.forEach(select => {
        // Save current selection
        const currentValue = select.value;
        
        // Clear and rebuild options
        select.innerHTML = '<option value="">-- Select Preset --</option>';
        
        presets.forEach((data, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (presets.has(currentValue)) {
            select.value = currentValue;
        }
    });
}

// Templates for gamepad display with MIDI controls
const controllerTemplate = `
<div>
  <div class="head"><div class="index"></div><div class="id"></div></div>
  <div class="info"><div class="label">connected:</div><span class="connected"></span></div>
  <div class="info"><div class="label">mapping:</div><span class="mapping"></span></div>
  <div class="preset-section">
    <div class="section-header">
      <h4>Presets</h4>
    </div>
    <div class="preset-controls">
      <div class="preset-row">
        <select class="preset-select">
          <option value="">-- Select Preset --</option>
        </select>
        <div class="preset-warning" style="display: none; color: orange; font-size: 12px; margin-top: 5px;"></div>
      </div>
      <div class="preset-create-row" style="margin-top: 8px;">
        <input type="text" class="preset-name-input" placeholder="New preset name..." style="width: 150px; margin-right: 5px;">
        <button class="preset-create" type="button">Create</button>
      </div>
      <div class="preset-buttons">
        <button class="preset-update" type="button" disabled>Update</button>
        <button class="preset-load" type="button" disabled>Load</button>
        <button class="preset-save" type="button">Save All</button>
        <button class="preset-open" type="button">Open File</button>
      </div>
      <input type="file" class="preset-file-input" accept=".json" style="display: none;">
    </div>
  </div>
  <div class="inputs">
    <div class="axes-section">
        <div class="section-header">
            <h4>Axes (Analog Controls)</h4>
            <button class="enable-all-axes" type="button">Enable All</button>
        </div>
        <div class="axes"></div>
    </div>
    <div class="buttons-section">
        <div class="section-header">
            <h4>Buttons</h4>
            <button class="enable-all-buttons" type="button">Enable All</button>
        </div>
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
    <div class="control-section">
        <h5>MIDI</h5>
        <div class="control-row">
            <input type="checkbox" class="enabled-checkbox axis-enabled"> Enable
        </div>
        <div class="control-row">
            <input type="checkbox" class="invert-checkbox axis-invert"> Invert
        </div>
        <div class="control-row">
            <label>CC #:</label>
            <input type="number" class="cc-control" min="0" max="127" value="1">
            <span class="midi-value"></span>
        </div>
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
    <div class="control-section">
        <h5>MIDI</h5>
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
    <div class="control-section">
        <h5>VRM</h5>
        <div class="control-row">
            <input type="checkbox" class="vrm-enabled-checkbox button-vrm-enabled"> Enable
        </div>
        <div class="control-row">
            <label>Animation:</label>
            <select class="vrm-animation-select">
                <option value="">Select...</option>
                <option value="happy">Happy</option>
                <option value="angry">Angry</option>
                <option value="sad">Sad</option>
                <option value="surprised">Surprised</option>
                <option value="blink">Blink</option>
                <option value="a">A</option>
                <option value="i">I</option>
                <option value="u">U</option>
                <option value="e">E</option>
                <option value="o">O</option>
                <option value="reset">Reset All</option>
            </select>
        </div>
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
        const invertCheckbox = div.querySelector('.axis-invert');
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
        
        // Set up MIDI event listeners
        enabledCheckbox.addEventListener('change', (e) => {
            midiConfig.axisEnabled.set(`${gamepad.index}-${ndx}`, e.target.checked);
        });
        
        invertCheckbox.addEventListener('change', (e) => {
            midiConfig.axisInverted.set(`${gamepad.index}-${ndx}`, e.target.checked);
        });
        
        ccControl.addEventListener('change', (e) => {
            midiConfig.ccChannels.set(`${gamepad.index}-${ndx}`, parseInt(e.target.value));
        });
        
        
        // Initialize MIDI defaults
        midiConfig.axisEnabled.set(`${gamepad.index}-${ndx}`, true);
        midiConfig.axisInverted.set(`${gamepad.index}-${ndx}`, false);
        midiConfig.ccChannels.set(`${gamepad.index}-${ndx}`, ndx + 1);
        
        
        // Check the enabled checkbox since we're enabling by default
        enabledCheckbox.checked = true;
        
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
        
        // VRM controls
        const vrmEnabledCheckbox = div.querySelector('.button-vrm-enabled');
        const vrmAnimationSelect = div.querySelector('.vrm-animation-select');
        
        // Set up MIDI event listeners
        enabledCheckbox.addEventListener('change', (e) => {
            midiConfig.buttonEnabled.set(`${gamepad.index}-${ndx}`, e.target.checked);
        });
        
        noteControl.addEventListener('change', (e) => {
            midiConfig.noteChannels.set(`${gamepad.index}-${ndx}`, parseInt(e.target.value));
        });
        
        velocityControl.addEventListener('change', (e) => {
            midiConfig.velocities.set(`${gamepad.index}-${ndx}`, parseInt(e.target.value));
        });
        
        // Set up VRM event listeners
        vrmEnabledCheckbox.addEventListener('change', (e) => {
            vrmConfig.buttonVrmEnabled.set(`${gamepad.index}-${ndx}`, e.target.checked);
        });
        
        vrmAnimationSelect.addEventListener('change', (e) => {
            const buttonKey = `${gamepad.index}-${ndx}`;
            if (e.target.value) {
                vrmConfig.buttonMappings.set(buttonKey, e.target.value);
            } else {
                vrmConfig.buttonMappings.delete(buttonKey);
            }
        });
        
        // Initialize MIDI defaults - enable all controls automatically
        midiConfig.buttonEnabled.set(`${gamepad.index}-${ndx}`, true);
        midiConfig.noteChannels.set(`${gamepad.index}-${ndx}`, 60 + ndx);
        midiConfig.velocities.set(`${gamepad.index}-${ndx}`, 127);
        
        // Initialize VRM defaults
        vrmConfig.buttonVrmEnabled.set(`${gamepad.index}-${ndx}`, false);
        
        // Check the enabled checkbox since we're enabling by default
        enabledCheckbox.checked = true;
        
        buttons.push({
            circle: div.querySelector('.button'),
            value: div.querySelector('.value'),
            index: ndx,
            pressed: false,
            vrmPressed: false // Track VRM button state separately
        });
    }

    // Add event listeners for Enable All buttons
    const enableAllAxesBtn = elem.querySelector('.enable-all-axes');
    const enableAllButtonsBtn = elem.querySelector('.enable-all-buttons');
    
    enableAllAxesBtn.addEventListener('click', () => {
        for (let ndx = 0; ndx < gamepad.axes.length; ndx++) {
            const axisKey = `${gamepad.index}-${ndx}`;
            midiConfig.axisEnabled.set(axisKey, true);
            const axisDiv = axesElem.children[ndx];
            const checkbox = axisDiv.querySelector('.axis-enabled');
            checkbox.checked = true;
        }
    });
    
    enableAllButtonsBtn.addEventListener('click', () => {
        for (let ndx = 0; ndx < gamepad.buttons.length; ndx++) {
            const buttonKey = `${gamepad.index}-${ndx}`;
            midiConfig.buttonEnabled.set(buttonKey, true);
            const buttonDiv = buttonsElem.children[ndx];
            const checkbox = buttonDiv.querySelector('.button-enabled');
            checkbox.checked = true;
        }
    });

    // Preset event handlers
    const presetSelect = elem.querySelector('.preset-select');
    const presetUpdateBtn = elem.querySelector('.preset-update');
    const presetLoadBtn = elem.querySelector('.preset-load');
    const presetSaveBtn = elem.querySelector('.preset-save');
    const presetOpenBtn = elem.querySelector('.preset-open');
    const presetFileInput = elem.querySelector('.preset-file-input');
    const presetNameInput = elem.querySelector('.preset-name-input');
    const presetCreateBtn = elem.querySelector('.preset-create');
    
    // Set data attribute for gamepad identification
    elem.setAttribute('data-gamepad', gamepad.index);
    
    // Preset select change handler
    presetSelect.addEventListener('change', (e) => {
        const presetName = e.target.value;
        presetUpdateBtn.disabled = !presetName;
        presetLoadBtn.disabled = !presetName;
        gamepadPresets.set(gamepad.index, presetName);
    });
    
    // Create button - creates a new preset with current settings
    presetCreateBtn.addEventListener('click', () => {
        const presetName = presetNameInput.value.trim();
        if (!presetName) {
            addMIDILogEntry('warning', 'Preset name required', 'Enter a name for the new preset');
            return;
        }
        
        if (presets.has(presetName)) {
            addMIDILogEntry('warning', 'Preset already exists', `"${presetName}" already exists. Use Update button to modify it.`);
            return;
        }
        
        const currentPreset = captureCurrentPreset(gamepad.index, gamepad);
        presets.set(presetName, currentPreset);
        
        // Update all dropdowns and select the new preset
        updateAllPresetDropdowns();
        presetSelect.value = presetName;
        presetUpdateBtn.disabled = false;
        presetLoadBtn.disabled = false;
        gamepadPresets.set(gamepad.index, presetName);
        
        // Clear input
        presetNameInput.value = '';
        
        addMIDILogEntry('info', `Preset "${presetName}" created`, 'Current settings saved as new preset');
    });
    
    // Update button - captures current settings and updates the selected preset
    presetUpdateBtn.addEventListener('click', () => {
        const presetName = presetSelect.value;
        if (!presetName) return;
        
        const currentPreset = captureCurrentPreset(gamepad.index, gamepad);
        presets.set(presetName, currentPreset);
        addMIDILogEntry('info', `Preset "${presetName}" updated`, 'Current settings saved');
    });
    
    // Load button - applies the selected preset to current gamepad
    presetLoadBtn.addEventListener('click', () => {
        const presetName = presetSelect.value;
        if (!presetName || !presets.has(presetName)) return;
        
        const presetData = presets.get(presetName);
        applyPreset(gamepad.index, gamepad, presetData);
        addMIDILogEntry('info', `Preset "${presetName}" loaded`, 'Settings applied');
    });
    
    // Save button - exports all presets to JSON file
    presetSaveBtn.addEventListener('click', () => {
        if (presets.size === 0) {
            addMIDILogEntry('warning', 'No presets to save', 'Create some presets first');
            return;
        }
        savePresetsToFile();
    });
    
    // Open button - triggers file input
    presetOpenBtn.addEventListener('click', () => {
        presetFileInput.click();
    });
    
    // File input handler - loads presets from JSON file
    presetFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const success = loadPresetsFromFile(event.target.result);
            if (success) {
                // Update button states if current gamepad has a preset selected
                const currentPreset = gamepadPresets.get(gamepad.index);
                if (currentPreset && presets.has(currentPreset)) {
                    presetSelect.value = currentPreset;
                    presetUpdateBtn.disabled = false;
                    presetLoadBtn.disabled = false;
                }
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        e.target.value = '';
    });

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
    gamepadsElem.innerHTML = '';
    gamepadsElem.appendChild(elem);
}

function removeGamepad(gamepad) {
    const info = gamepadsByIndex[gamepad.index];
    if (info) {
        // Clean up MIDI mappings and tracking values
        for (let i = 0; i < gamepad.axes.length; i++) {
            const axisKey = `${gamepad.index}-${i}`;
            midiConfig.axisEnabled.delete(axisKey);
            midiConfig.axisInverted.delete(axisKey);
            midiConfig.ccChannels.delete(axisKey);
            midiConfig.lastAxisValues.delete(axisKey);
            
        }
        for (let i = 0; i < gamepad.buttons.length; i++) {
            const buttonKey = `${gamepad.index}-${i}`;
            midiConfig.buttonEnabled.delete(buttonKey);
            midiConfig.noteChannels.delete(buttonKey);
            midiConfig.velocities.delete(buttonKey);
            midiConfig.lastButtonStates.delete(buttonKey);
            
            // Clean up VRM mappings
            vrmConfig.buttonVrmEnabled.delete(buttonKey);
            vrmConfig.buttonMappings.delete(buttonKey);
        }
        
        // Clean up controller-level VRM settings
        vrmConfig.sceneEnabled.delete(gamepad.index.toString());
        
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
        const inverted = midiConfig.axisInverted.get(`${gamepad.index}-${ndx}`);
        const midiVal = axisToMIDI(axisValue, inverted);
        
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
        
        midiValue.textContent = `${midiVal}`;
        
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
        
        // Axes no longer control VRM animations
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
        
        // Handle VRM button animations
        if (vrmConfig.buttonVrmEnabled.get(buttonKey) && window.vrmManager) {
            const animation = vrmConfig.buttonMappings.get(buttonKey);
            if (animation) {
                const buttonInfo = buttons[ndx];
                if (button.pressed && !buttonInfo.vrmPressed) {
                    // Button just pressed - trigger animation
                    if (animation === 'reset') {
                        window.vrmManager.resetAnimations();
                    } else {
                        window.vrmManager.triggerAnimation(animation);
                    }
                    buttonInfo.vrmPressed = true;
                } else if (!button.pressed && buttonInfo.vrmPressed) {
                    // Button released
                    buttonInfo.vrmPressed = false;
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
    
    Object.values(gamepadsByIndex).forEach(processController);
    
    // Update VRM system
    if (window.vrmManager) {
        window.vrmManager.update();
    }
    
    requestAnimationFrame(process);
}

// Event listeners
window.addEventListener("gamepadconnected", handleConnect);
window.addEventListener("gamepaddisconnected", handleDisconnect);

midiDeviceSelect.addEventListener('change', (e) => {
    selectMIDIDevice(e.target.value);
});

vrmSceneSelect.addEventListener('change', (e) => {
    if (e.target.value) {
        loadVRMScene(e.target.value);
        vrmStatusElem.textContent = `VRM: Loading ${e.target.value}...`;
        vrmStatusElem.className = 'vrm-status status-connecting';
    } else {
        vrmStatusElem.textContent = 'VRM: No Scene';
        vrmStatusElem.className = 'vrm-status status-disconnected';
    }
});

function setupOverlayToggles() {
    if (midiLogToggle) {
        midiLogToggle.addEventListener('click', toggleMIDILog);
    }
    
    if (gamepad3DToggle) {
        gamepad3DToggle.addEventListener('click', () => {
            gamepad3DVisible = !gamepad3DVisible;
            if (gamepad3DOverlay) {
                gamepad3DOverlay.style.display = gamepad3DVisible ? 'flex' : 'none';
            }
            gamepad3DToggle.style.color = gamepad3DVisible ? 'white' : 'grey';
        });
    }
    
    if (gamepadsToggle) {
        gamepadsToggle.addEventListener('click', () => {
            gamepadsVisible = !gamepadsVisible;
            if (gamepadsElem) {
                gamepadsElem.style.display = gamepadsVisible ? 'flex' : 'none';
            }
            gamepadsToggle.style.color = gamepadsVisible ? 'white' : 'grey';
        });
    }
    
    if (midiLogClearBtn) {
        midiLogClearBtn.addEventListener('click', clearMIDILog);
    }
}

// VRM Helper Functions


// VRM Scene Management
function initVRMSystem() {
    // Check if VRM classes are available from avatar.js
    if (typeof window.VRMManager === 'undefined' || typeof window.VRMSceneManager === 'undefined') {
        console.log('VRM classes not loaded, retrying...');
        setTimeout(initVRMSystem, 500);
        return;
    }
    
    // Check if 3D scene elements are ready
    const canvas = document.querySelector('#gamepad-3d-canvas canvas');
    const sceneReady = canvas && window.scene && window.renderer;
    
    if (sceneReady) {
        try {
            // Initialize VRM system using the classes from avatar.js
            const vrmManager = new window.VRMManager(window.scene, window.renderer);
            const sceneManager = new window.VRMSceneManager(vrmManager);
            
            // Make available globally
            window.vrmManager = vrmManager;
            window.vrmSceneManager = sceneManager;
            
            console.log('VRM system initialized successfully');
        } catch (error) {
            console.error('Error initializing VRM system:', error);
            setTimeout(initVRMSystem, 1000);
        }
    } else {
        console.log('3D scene not ready, retrying VRM init...');
        setTimeout(initVRMSystem, 250);
    }
}

function loadVRMScene(sceneName) {
    if (!window.vrmSceneManager) {
        console.error('VRM system not initialized');
        vrmStatusElem.textContent = 'VRM: System not ready';
        vrmStatusElem.className = 'vrm-status status-disconnected';
        return;
    }
    
    window.vrmSceneManager.loadScene(sceneName)
        .then(scene => {
            vrmConfig.activeScene = scene;
            console.log(`VRM scene loaded: ${sceneName}`);
            
            // Update status
            vrmStatusElem.textContent = `VRM: ${scene.name}`;
            vrmStatusElem.className = 'vrm-status status-connected';
        })
        .catch(error => {
            console.error('Failed to load VRM scene:', error);
            vrmStatusElem.textContent = 'VRM: Load failed';
            vrmStatusElem.className = 'vrm-status status-disconnected';
        });
}


// Initialize everything
initMIDI();
setupOverlayToggles();

// Initialize VRM system after a short delay to ensure three-gamepad.js is loaded
setTimeout(initVRMSystem, 1000);

// Auto-load a default VRM scene after initialization
setTimeout(() => {
    if (window.vrmSceneManager && vrmSceneSelect.options.length > 1) {
        const defaultScene = vrmSceneSelect.options[1].value; // First non-empty option
        console.log(`🎭 Auto-loading default VRM scene: ${defaultScene}`);
        vrmSceneSelect.value = defaultScene;
        loadVRMScene(defaultScene);
    }
}, 2000);

requestAnimationFrame(process);
