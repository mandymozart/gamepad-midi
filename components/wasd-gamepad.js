/**
 * WASD Gamepad Simulator
 * Simulates gamepad input using keyboard controls for testing without physical controller
 */

class WASDGamepad {
    constructor() {
        this.enabled = false;
        this.axes = new Array(4).fill(0); // Left stick X/Y, Right stick X/Y
        this.buttons = new Array(16).fill({ pressed: false, value: 0 });
        this.id = "WASD Gamepad (Keyboard Controls)";
        this.index = 0;
        this.connected = false;
        
        this.keyMappings = {
            // Left stick (WASD)
            'KeyW': { type: 'axis', index: 1, value: -1 }, // Up
            'KeyS': { type: 'axis', index: 1, value: 1 },  // Down
            'KeyA': { type: 'axis', index: 0, value: -1 }, // Left
            'KeyD': { type: 'axis', index: 0, value: 1 },  // Right
            
            // Right stick (Arrow keys)
            'ArrowUp': { type: 'axis', index: 3, value: -1 },
            'ArrowDown': { type: 'axis', index: 3, value: 1 },
            'ArrowLeft': { type: 'axis', index: 2, value: -1 },
            'ArrowRight': { type: 'axis', index: 2, value: 1 },
            
            // Face buttons (Xbox layout)
            'Space': { type: 'button', index: 0 },     // A button
            'KeyX': { type: 'button', index: 1 },      // B button
            'KeyC': { type: 'button', index: 2 },      // X button
            'KeyV': { type: 'button', index: 3 },      // Y button
            
            // Shoulder buttons
            'KeyQ': { type: 'button', index: 4 },      // LB
            'KeyE': { type: 'button', index: 5 },      // RB
            'Digit1': { type: 'button', index: 6 },    // LT
            'Digit2': { type: 'button', index: 7 },    // RT
            
            // Special buttons
            'Escape': { type: 'button', index: 8 },    // Select/Back
            'Enter': { type: 'button', index: 9 },     // Start
            'KeyZ': { type: 'button', index: 10 },     // Left stick click
            'KeyM': { type: 'button', index: 11 },     // Right stick click
            
            // D-pad
            'Numpad8': { type: 'button', index: 12 },  // D-pad Up
            'Numpad2': { type: 'button', index: 13 },  // D-pad Down
            'Numpad4': { type: 'button', index: 14 },  // D-pad Left
            'Numpad6': { type: 'button', index: 15 }   // D-pad Right
        };
        
        this.pressedKeys = new Set();
        this.setupEventListeners();
        
        // Ensure UI is created after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createUI());
        } else {
            // DOM is already ready, create UI immediately
            setTimeout(() => this.createUI(), 100);
        }
    }
    
    enable() {
        this.enabled = true;
        this.connected = true;
        this.updateButtonStatus();
        console.log('WASD gamepad enabled');
    }
    
    
    disable() {
        this.enabled = false;
        this.connected = false;
        this.resetState();
        this.updateButtonStatus();
        console.log('WASD gamepad disabled');
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            const mapping = this.keyMappings[e.code];
            if (mapping) {
                e.preventDefault();
                this.pressedKeys.add(e.code);
                this.updateInput(mapping, true);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (!this.enabled) return;
            
            const mapping = this.keyMappings[e.code];
            if (mapping) {
                e.preventDefault();
                this.pressedKeys.delete(e.code);
                this.updateInput(mapping, false);
            }
        });
    }
    
    updateInput(mapping, pressed) {
        if (mapping.type === 'axis') {
            // Handle axis input - combine multiple keys for same axis
            let axisValue = 0;
            
            // Check all pressed keys that affect this axis
            for (const keyCode of this.pressedKeys) {
                const keyMapping = this.keyMappings[keyCode];
                if (keyMapping && keyMapping.type === 'axis' && keyMapping.index === mapping.index) {
                    axisValue += keyMapping.value;
                }
            }
            
            // Clamp to [-1, 1]
            const oldValue = this.axes[mapping.index];
            this.axes[mapping.index] = Math.max(-1, Math.min(1, axisValue));
            
            // Log axis changes
            if (oldValue !== this.axes[mapping.index]) {
                console.log(`🎮 WASD Axis ${mapping.index} changed: ${oldValue.toFixed(3)} -> ${this.axes[mapping.index].toFixed(3)}`);
            }
            
        } else if (mapping.type === 'button') {
            this.buttons[mapping.index] = {
                pressed: pressed,
                value: pressed ? 1 : 0
            };
            
            console.log(`🎮 WASD Button ${mapping.index} ${pressed ? 'pressed' : 'released'}`);
        }
    }
    
    resetState() {
        this.axes.fill(0);
        this.buttons = this.buttons.map(() => ({ pressed: false, value: 0 }));
        this.pressedKeys.clear();
    }
    
    createUI() {
        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createUI());
            return;
        }
        
        const ui = document.querySelector('.wasd-overlay');
        
        // Setup toggle button in header
        const toggleBtn = document.querySelector('.wasd-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.enabled) {
                    this.disable();
                } else {
                    this.enable();
                }
            });
        }
        
        this.toggleBtn = toggleBtn;
        this.ui = ui;
        this.updateButtonStatus();
    }
    
    updateButtonStatus() {
        if (this.toggleBtn) {
            if (this.enabled) {
                this.toggleBtn.textContent = 'WASD ON';
                this.toggleBtn.classList.add('active');
            } else {
                this.toggleBtn.textContent = 'WASD';
                this.toggleBtn.classList.remove('active');
            }
        }
    }
    
    startStatusUpdate() {
        setInterval(() => {
            if (!this.enabled) return;
            
            // Update axis display
            const leftStick = document.getElementById('left-stick');
            const rightStick = document.getElementById('right-stick');
            
            if (leftStick) {
                leftStick.textContent = `${this.axes[0].toFixed(1)}, ${this.axes[1].toFixed(1)}`;
            }
            if (rightStick) {
                rightStick.textContent = `${this.axes[2].toFixed(1)}, ${this.axes[3].toFixed(1)}`;
            }
            
            // Update button display
            const buttonDisplay = document.getElementById('button-display');
            if (buttonDisplay) {
                const pressedButtons = this.buttons
                    .map((btn, idx) => btn.pressed ? idx : null)
                    .filter(idx => idx !== null);
                
                buttonDisplay.textContent = pressedButtons.length > 0 
                    ? `Pressed: ${pressedButtons.join(', ')}` 
                    : 'No buttons pressed';
            }
        }, 50);
    }
    
    // Gamepad API compatibility methods
    get timestamp() {
        return performance.now();
    }
    
    get mapping() {
        return 'standard';
    }
}

// Global WASD gamepad instance
window.wasdGamepad = new WASDGamepad();

// Monkey patch the navigator.getGamepads() function to include virtual gamepad
const originalGetGamepads = navigator.getGamepads.bind(navigator);
navigator.getGamepads = function() {
    const realGamepads = originalGetGamepads();
    const gamepads = Array.from(realGamepads);
    
    // Add WASD gamepad if enabled
    if (window.wasdGamepad && window.wasdGamepad.enabled) {
        // Find first empty slot or add to end
        let insertIndex = gamepads.findIndex(gp => gp === null);
        if (insertIndex === -1) {
            insertIndex = gamepads.length;
        }
        gamepads[insertIndex] = window.wasdGamepad;
    }
    
    return gamepads;
};

console.log('WASD gamepad system loaded. Use window.wasdGamepad to control.');
