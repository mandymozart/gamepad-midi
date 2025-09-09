// VRM Model Integration with KalidoKit and Three.js
// Handles VRM model loading, animation, and gamepad mapping

import * as Kalidokit from 'kalidokit';

class VRMManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.currentVRM = null;
        this.currentScene = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        
        // Animation state
        this.animationState = {
            head: { x: 0, y: 0, z: 0 },
            spine: { x: 0, y: 0, z: 0 },
            leftArm: { x: 0, y: 0, z: 0 },
            rightArm: { x: 0, y: 0, z: 0 },
            expressions: new Map()
        };
        
        // Smoothing for animations
        this.smoothingFactor = 0.1;
        
        this.initVRMLoader();
    }
    
    async initVRMLoader() {
        // Import VRM loader
        const { VRMLoaderPlugin, VRMUtils } = await import('https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@2/lib/three-vrm.module.js');
        
        this.loader = new THREE.GLTFLoader();
        this.loader.register((parser) => new VRMLoaderPlugin(parser));
    }
    
    async loadVRMModel(url) {
        try {
            const gltf = await new Promise((resolve, reject) => {
                this.loader.load(url, resolve, undefined, reject);
            });
            
            const vrm = gltf.userData.vrm;
            
            if (this.currentVRM) {
                this.scene.remove(this.currentVRM.scene);
            }
            
            this.currentVRM = vrm;
            this.scene.add(vrm.scene);
            
            // Initialize mixer for animations
            this.mixer = new THREE.AnimationMixer(vrm.scene);
            
            // Set up initial pose
            this.resetPose();
            
            console.log('VRM model loaded successfully:', url);
            return vrm;
            
        } catch (error) {
            console.error('Failed to load VRM model:', error);
            throw error;
        }
    }
    
    resetPose() {
        if (!this.currentVRM) return;
        
        // Reset all bone rotations to default
        Object.keys(this.animationState).forEach(key => {
            if (key !== 'expressions') {
                this.animationState[key] = { x: 0, y: 0, z: 0 };
            }
        });
        
        this.animationState.expressions.clear();
        this.applyPose();
    }
    
    // Apply current animation state to VRM model
    applyPose() {
        if (!this.currentVRM) return;
        
        const humanoid = this.currentVRM.humanoid;
        if (!humanoid) return;
        
        // Apply head rotation
        const head = humanoid.getNormalizedBoneNode('head');
        if (head) {
            head.rotation.x = this.animationState.head.x;
            head.rotation.y = this.animationState.head.y;
            head.rotation.z = this.animationState.head.z;
        }
        
        // Apply spine rotation
        const spine = humanoid.getNormalizedBoneNode('spine');
        if (spine) {
            spine.rotation.x = this.animationState.spine.x;
            spine.rotation.y = this.animationState.spine.y;
            spine.rotation.z = this.animationState.spine.z;
        }
        
        // Apply arm rotations
        const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
        if (leftUpperArm) {
            leftUpperArm.rotation.x = this.animationState.leftArm.x;
            leftUpperArm.rotation.y = this.animationState.leftArm.y;
            leftUpperArm.rotation.z = this.animationState.leftArm.z;
        }
        
        const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
        if (rightUpperArm) {
            rightUpperArm.rotation.x = this.animationState.rightArm.x;
            rightUpperArm.rotation.y = this.animationState.rightArm.y;
            rightUpperArm.rotation.z = this.animationState.rightArm.z;
        }
        
        // Apply expressions
        const expressionManager = this.currentVRM.expressionManager;
        if (expressionManager) {
            this.animationState.expressions.forEach((value, expressionName) => {
                expressionManager.setValue(expressionName, value);
            });
        }
    }
    
    // Update VRM from gamepad input
    updateFromGamepad(axisKey, axisValue, mapping) {
        if (!this.currentVRM || !mapping) return;
        
        const { target, parameter, range = [-1, 1], multiplier = 1 } = mapping;
        
        // Normalize axis value to mapping range
        const normalizedValue = this.mapRange(axisValue, [-1, 1], range) * multiplier;
        
        // Apply smoothing
        const currentValue = this.getTargetValue(target, parameter);
        const smoothedValue = this.lerp(currentValue, normalizedValue, this.smoothingFactor);
        
        this.setTargetValue(target, parameter, smoothedValue);
        this.applyPose();
    }
    
    // Handle button press events
    triggerButtonAction(buttonKey, pressed, mapping) {
        if (!this.currentVRM || !mapping || !pressed) return;
        
        const { target, action, value } = mapping;
        
        switch (action) {
            case 'expression':
                this.animationState.expressions.set(value, pressed ? 1.0 : 0.0);
                break;
            case 'gesture':
                this.triggerGesture(value);
                break;
            case 'reset':
                this.resetPose();
                break;
        }
        
        this.applyPose();
    }
    
    triggerGesture(gestureName) {
        // Implement gesture animations
        switch (gestureName) {
            case 'wave':
                this.animateWave();
                break;
            case 'nod':
                this.animateNod();
                break;
            case 'shake':
                this.animateShake();
                break;
        }
    }
    
    animateWave() {
        // Simple wave animation
        const originalRotation = { ...this.animationState.rightArm };
        
        // Animate arm up and wave
        this.animationState.rightArm.z = -Math.PI / 3;
        this.animationState.rightArm.y = Math.PI / 6;
        
        setTimeout(() => {
            this.animationState.rightArm = originalRotation;
            this.applyPose();
        }, 2000);
    }
    
    animateNod() {
        const originalRotation = { ...this.animationState.head };
        
        // Nod down then up
        this.animationState.head.x = Math.PI / 8;
        this.applyPose();
        
        setTimeout(() => {
            this.animationState.head.x = -Math.PI / 12;
            this.applyPose();
            
            setTimeout(() => {
                this.animationState.head = originalRotation;
                this.applyPose();
            }, 300);
        }, 300);
    }
    
    animateShake() {
        const originalRotation = { ...this.animationState.head };
        
        // Shake left then right
        this.animationState.head.y = Math.PI / 8;
        this.applyPose();
        
        setTimeout(() => {
            this.animationState.head.y = -Math.PI / 8;
            this.applyPose();
            
            setTimeout(() => {
                this.animationState.head = originalRotation;
                this.applyPose();
            }, 300);
        }, 300);
    }
    
    getTargetValue(target, parameter) {
        if (this.animationState[target]) {
            return this.animationState[target][parameter] || 0;
        }
        return 0;
    }
    
    setTargetValue(target, parameter, value) {
        if (this.animationState[target]) {
            this.animationState[target][parameter] = value;
        }
    }
    
    // Utility functions
    lerp(a, b, alpha) {
        return a + alpha * (b - a);
    }
    
    mapRange(value, fromRange, toRange) {
        const [fromMin, fromMax] = fromRange;
        const [toMin, toMax] = toRange;
        
        const normalized = (value - fromMin) / (fromMax - fromMin);
        return toMin + normalized * (toMax - toMin);
    }
    
    update() {
        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());
        }
        
        if (this.currentVRM) {
            this.currentVRM.update(this.clock.getDelta());
        }
    }
    
    dispose() {
        if (this.currentVRM) {
            this.scene.remove(this.currentVRM.scene);
            this.currentVRM = null;
        }
        
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
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
