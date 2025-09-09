// VRM Model Integration with Three.js
// Handles VRM model loading, animation, and gamepad mapping

class VRMManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.currentVRM = null;
        this.currentScene = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        
        // Current active animations/expressions
        this.activeAnimations = new Map();
        
        this.initVRMLoader();
    }
    
    async initVRMLoader() {
        try {
            console.log('Initializing VRM loader...');
            // Use the VRM loader from script tag (like in the working example)
            this.loader = new THREE.GLTFLoader();
            this.loader.crossOrigin = "anonymous";
            console.log('VRM loader initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VRM loader:', error);
            throw error;
        }
    }
    
    async loadVRMModel(url) {
        try {
            console.log(`Loading VRM from: ${url}`);
            
            const gltf = await new Promise((resolve, reject) => {
                this.loader.load(
                    url, 
                    (gltf) => {
                        console.log('VRM loaded successfully:', gltf);
                        resolve(gltf);
                    },
                    (progress) => {
                        console.log('VRM loading progress:', progress);
                    },
                    (error) => {
                        console.error('VRM loading error:', error);
                        reject(error);
                    }
                );
            });
            
            // Use the working example's approach
            THREE.VRMUtils.removeUnnecessaryJoints(gltf.scene);
            
            const vrm = await THREE.VRM.from(gltf);
            console.log('VRM object:', vrm);
            
            if (!vrm) {
                throw new Error('No VRM data found in loaded file');
            }
            
            if (this.currentVRM) {
                this.scene.remove(this.currentVRM.scene);
            }
            
            this.currentVRM = vrm;
            this.scene.add(vrm.scene);
            
            // Rotate model 180deg to face camera (like in working example)
            vrm.scene.rotation.y = Math.PI;
            
            // Initialize mixer for animations
            this.mixer = new THREE.AnimationMixer(vrm.scene);
            
            // Initialize animations
            this.resetAnimations();
            
            console.log('VRM model loaded successfully:', url);
            return vrm;
            
        } catch (error) {
            console.error('Failed to load VRM model:', error);
            throw error;
        }
    }
    
    
    resetAnimations() {
        if (!this.currentVRM) return;
        
        // Clear all active animations
        this.activeAnimations.clear();
        
        // Reset blend shapes if available
        if (this.currentVRM.blendShapeProxy) {
            const PresetName = THREE.VRMSchema.BlendShapePresetName;
            Object.keys(PresetName).forEach(key => {
                this.currentVRM.blendShapeProxy.setValue(PresetName[key], 0);
            });
        }
        
        console.log('🔄 All animations reset');
    }
    
    // Trigger a VRM animation or expression
    triggerAnimation(animationName) {
        if (!this.currentVRM) {
            console.log(`❌ No VRM loaded`);
            return;
        }
        
        console.log(`🎬 Triggering animation: ${animationName}`);
        
        // Check if this is a blend shape/expression
        if (this.currentVRM.blendShapeProxy) {
            const PresetName = THREE.VRMSchema.BlendShapePresetName;
            
            // Map common animation names to VRM blend shape presets
            const animationMap = {
                'happy': PresetName.Joy,
                'angry': PresetName.Angry,
                'sad': PresetName.Sorrow,
                'surprised': PresetName.Fun,
                'blink': PresetName.Blink,
                'blinkLeft': PresetName.BlinkL,
                'blinkRight': PresetName.BlinkR,
                'a': PresetName.A,
                'i': PresetName.I,
                'u': PresetName.U,
                'e': PresetName.E,
                'o': PresetName.O
            };
            
            const presetName = animationMap[animationName.toLowerCase()] || PresetName[animationName];
            
            if (presetName !== undefined) {
                // Set the expression to full intensity
                this.currentVRM.blendShapeProxy.setValue(presetName, 1.0);
                this.activeAnimations.set(animationName, { type: 'expression', preset: presetName });
                
                console.log(`✅ Applied expression: ${animationName}`);
                
                // Auto-reset after 2 seconds
                setTimeout(() => {
                    if (this.currentVRM && this.currentVRM.blendShapeProxy) {
                        this.currentVRM.blendShapeProxy.setValue(presetName, 0);
                        this.activeAnimations.delete(animationName);
                        console.log(`🔄 Reset expression: ${animationName}`);
                    }
                }, 2000);
            } else {
                console.log(`❌ Unknown animation: ${animationName}`);
            }
        }
    }
    
    // Handle button press for VRM animations
    handleButtonPress(buttonIndex, pressed) {
        if (!this.currentVRM || !pressed) return;
        
        console.log(`🎮 Button ${buttonIndex} pressed`);
        
        // Default button to animation mapping
        const buttonAnimations = {
            0: 'happy',     // A button
            1: 'angry',     // B button  
            2: 'surprised', // X button
            3: 'sad',       // Y button
            4: 'blink',     // Left shoulder
            5: 'blink',     // Right shoulder
            6: 'a',         // Left trigger
            7: 'i',         // Right trigger
            8: 'reset',     // Select/Back
            9: 'u',         // Start
            10: 'e',        // Left stick click
            11: 'o',        // Right stick click
        };
        
        const animation = buttonAnimations[buttonIndex];
        
        if (animation === 'reset') {
            this.resetAnimations();
        } else if (animation) {
            this.triggerAnimation(animation);
        }
    }
    
    // Get available animations for current VRM
    getAvailableAnimations() {
        if (!this.currentVRM || !this.currentVRM.blendShapeProxy) {
            return [];
        }
        
        const PresetName = THREE.VRMSchema.BlendShapePresetName;
        const animations = [];
        
        // Add all available blend shape presets
        Object.keys(PresetName).forEach(key => {
            animations.push(key.toLowerCase());
        });
        
        // Add common animation aliases
        animations.push('happy', 'angry', 'sad', 'surprised', 'reset');
        
        return animations;
    }

    // Simple button handler that can be customized
    triggerButtonAction(buttonKey, pressed, mapping) {
        if (!this.currentVRM || !pressed) return;
        
        // Extract button index from key (format: "gamepadIndex-buttonIndex")
        const parts = buttonKey.split('-');
        const buttonIndex = parseInt(parts[1]);
        
        if (mapping && mapping.value) {
            // Use custom mapping if provided
            if (mapping.value === 'reset') {
                this.resetAnimations();
            } else {
                this.triggerAnimation(mapping.value);
            }
        } else {
            // Use default button mapping
            this.handleButtonPress(buttonIndex, pressed);
        }
    }
    
    update() {
        if (this.currentVRM) {
            this.currentVRM.update(this.clock.getDelta());
        }
    }
    
    dispose() {
        if (this.currentVRM) {
            this.scene.remove(this.currentVRM.scene);
            this.currentVRM = null;
        }
        
        this.activeAnimations.clear();
    }
}

// Scene configuration system
class VRMSceneManager {
    constructor(vrmManager) {
        this.vrmManager = vrmManager;
        this.scenes = new Map();
        this.activeScene = null;
    }
    
    registerScene(sceneConfig) {
        this.scenes.set(sceneConfig.name, sceneConfig);
        console.log(`Registered VRM scene: ${sceneConfig.name}`);
    }
    
    async loadScene(sceneName) {
        const sceneConfig = this.scenes.get(sceneName);
        if (!sceneConfig) {
            throw new Error(`Scene not found: ${sceneName}`);
        }
        
        try {
            await this.vrmManager.loadVRMModel(sceneConfig.vrmUrl);
            this.activeScene = sceneConfig;
            
            // Apply default mappings if any
            if (sceneConfig.defaultMappings) {
                this.applyDefaultMappings(sceneConfig.defaultMappings);
            }
            
            console.log(`Loaded VRM scene: ${sceneName}`);
            return sceneConfig;
            
        } catch (error) {
            console.error(`Failed to load scene ${sceneName}:`, error);
            throw error;
        }
    }
    
    applyDefaultMappings(defaultMappings) {
        // This would integrate with the main config system
        // For now, just log the mappings
        console.log('Default mappings:', defaultMappings);
    }
    
    getAvailableScenes() {
        return Array.from(this.scenes.keys());
    }
    
    getActiveScene() {
        return this.activeScene;
    }
    
    getMappingTargets() {
        if (!this.activeScene) return [];
        return this.activeScene.mappingTargets || {};
    }
}

// Export for global use
window.VRMManager = VRMManager;
window.VRMSceneManager = VRMSceneManager;

// Integration with existing gamepad system
window.initVRMSystem = function(scene, renderer) {
    const vrmManager = new VRMManager(scene, renderer);
    const sceneManager = new VRMSceneManager(vrmManager);
    
    // Make available globally
    window.vrmManager = vrmManager;
    window.vrmSceneManager = sceneManager;
    
    return { vrmManager, sceneManager };
};
