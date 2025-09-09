// Cat Pope VRM Scene Configuration
// Example scene for gamepad-to-VRM mapping

export const catPopeScene = {
    name: "Cat Pope",
    description: "A regal cat character with papal attire",
    vrmUrl: "https://dg3rfg6exbkmv.cloudfront.net/c/v1/s=op/model_basis_files/27937/157391511918548715.vrm", // Placeholder URL
    
    // Available mapping targets for this character
    mappingTargets: {
        head: {
            label: "Head",
            parameters: {
                rotationX: { label: "Nod (X)", range: [-0.5, 0.5] },
                rotationY: { label: "Turn (Y)", range: [-0.8, 0.8] },
                rotationZ: { label: "Tilt (Z)", range: [-0.3, 0.3] }
            }
        },
        spine: {
            label: "Spine/Torso",
            parameters: {
                rotationX: { label: "Lean Forward/Back", range: [-0.3, 0.3] },
                rotationY: { label: "Twist Left/Right", range: [-0.5, 0.5] },
                rotationZ: { label: "Side Bend", range: [-0.2, 0.2] }
            }
        },
        leftArm: {
            label: "Left Arm",
            parameters: {
                rotationX: { label: "Swing Forward/Back", range: [-1.0, 1.0] },
                rotationY: { label: "Cross Body", range: [-0.5, 0.5] },
                rotationZ: { label: "Raise Up/Down", range: [-1.5, 1.5] }
            }
        },
        rightArm: {
            label: "Right Arm", 
            parameters: {
                rotationX: { label: "Swing Forward/Back", range: [-1.0, 1.0] },
                rotationY: { label: "Cross Body", range: [-0.5, 0.5] },
                rotationZ: { label: "Raise Up/Down", range: [-1.5, 1.5] }
            }
        }
    },
    
    // Available expressions for button mapping
    expressions: {
        happy: { label: "Happy/Smile", description: "Joyful expression" },
        angry: { label: "Angry", description: "Stern papal disapproval" },
        surprised: { label: "Surprised", description: "Wide-eyed wonder" },
        blink: { label: "Blink", description: "Eye blink animation" },
        blessing: { label: "Blessing", description: "Serene blessing expression" }
    },
    
    // Available gesture animations for button mapping
    gestures: {
        wave: { label: "Papal Wave", description: "Ceremonial greeting wave" },
        blessing: { label: "Blessing Gesture", description: "Raise hand in blessing" },
        nod: { label: "Nod", description: "Approving nod" },
        shake: { label: "Head Shake", description: "Disapproving shake" },
        bow: { label: "Bow", description: "Respectful bow" }
    },
    
    // Default mappings applied when scene loads
    defaultMappings: {
        axes: {
            // Left stick controls head
            "leftStick": {
                x: { target: "head", parameter: "rotationY", multiplier: 1.0 },
                y: { target: "head", parameter: "rotationX", multiplier: -1.0 } // Invert Y
            },
            // Right stick controls spine
            "rightStick": {
                x: { target: "spine", parameter: "rotationY", multiplier: 1.0 },
                y: { target: "spine", parameter: "rotationX", multiplier: -1.0 }
            }
        },
        buttons: {
            // Face buttons for expressions
            "south": { target: "expressions", action: "expression", value: "happy" },
            "north": { target: "expressions", action: "expression", value: "surprised" },
            "east": { target: "expressions", action: "expression", value: "blessing" },
            "west": { target: "expressions", action: "expression", value: "angry" },
            
            // Shoulder buttons for gestures
            "leftShoulder": { target: "gestures", action: "gesture", value: "wave" },
            "rightShoulder": { target: "gestures", action: "gesture", value: "blessing" },
            
            // Triggers for arm control
            "leftTrigger": { target: "leftArm", action: "raise", multiplier: 1.5 },
            "rightTrigger": { target: "rightArm", action: "raise", multiplier: 1.5 }
        }
    },
    
    // Scene-specific settings
    settings: {
        smoothingFactor: 0.15, // How smooth the animations are
        expressionDuration: 2000, // How long expressions last (ms)
        gestureDuration: 3000, // How long gestures last (ms)
        autoReturn: true, // Return to neutral pose after gestures
        
        // Camera settings for this scene
        camera: {
            position: { x: 0, y: 1.6, z: 2.5 },
            target: { x: 0, y: 1.4, z: 0 },
            fov: 45
        },
        
        // Lighting setup
        lighting: {
            ambient: { color: 0x404040, intensity: 0.4 },
            directional: { 
                color: 0xffffff, 
                intensity: 0.8,
                position: { x: 1, y: 1, z: 0.5 }
            }
        }
    },
    
    // Custom initialization function
    onLoad: function(vrmManager) {
        console.log("Cat Pope scene loaded - ready for papal gamepad control!");
        
        // Set custom smoothing for this character
        if (vrmManager) {
            vrmManager.smoothingFactor = this.settings.smoothingFactor;
        }
        
        // Could add scene-specific setup here
        // e.g., special lighting, effects, etc.
    },
    
    // Custom cleanup function
    onUnload: function(vrmManager) {
        console.log("Cat Pope scene unloaded");
        // Clean up any scene-specific resources
    }
};

// Alternative scene configurations for testing
export const testScenes = {
    basicHuman: {
        name: "Basic Human",
        description: "Simple human character for testing",
        vrmUrl: "https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm",
        mappingTargets: {
            head: {
                label: "Head",
                parameters: {
                    rotationX: { label: "Nod", range: [-0.5, 0.5] },
                    rotationY: { label: "Turn", range: [-1.0, 1.0] },
                    rotationZ: { label: "Tilt", range: [-0.3, 0.3] }
                }
            }
        },
        expressions: {
            neutral: { label: "Neutral" },
            happy: { label: "Happy" },
            angry: { label: "Angry" },
            surprised: { label: "Surprised" }
        },
        defaultMappings: {
            axes: {
                "leftStick": {
                    x: { target: "head", parameter: "rotationY" },
                    y: { target: "head", parameter: "rotationX", multiplier: -1.0 }
                }
            }
        }
    }
};

// Register scenes when this module loads
if (typeof window !== 'undefined' && window.vrmSceneManager) {
    window.vrmSceneManager.registerScene(catPopeScene);
    window.vrmSceneManager.registerScene(testScenes.basicHuman);
}
