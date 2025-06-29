"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();
  const modelRef = useRef<THREE.Group>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<THREE.Group>();
  const interactionSphereRef = useRef<THREE.Mesh>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup with transparent background for floating effect
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera setup - positioned to focus on right side
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(-2, 1, 2); // Position camera to look at right side

    // Renderer setup with alpha for transparency
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      premultipliedAlpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0); // Transparent clear color
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced Lighting with white light for natural green appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // White ambient light
    scene.add(ambientLight);

    // Main white light from front-left
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0); // Pure white light
    mainLight.position.set(-5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // Rim light for dramatic effect - also white
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0); // White rim light
    rimLight.position.set(5, 3, -3);
    scene.add(rimLight);

    // Soft fill light - white
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4); // White fill light
    fillLight.position.set(0, -2, 2);
    scene.add(fillLight);

    // Create interactive particles system
    const createInteractiveParticles = () => {
      const particlesGroup = new THREE.Group();
      
      for (let i = 0; i < 20; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x81C784,
          transparent: true,
          opacity: 0.6
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random initial positions around robot
        const angle = (i / 20) * Math.PI * 2;
        const radius = 2 + Math.random() * 1;
        particle.position.set(
          Math.cos(angle) * radius + 3,
          Math.sin(angle * 3) * 0.5 + Math.random() * 2,
          Math.sin(angle) * radius
        );
        
        // Store original position for animation
        particle.userData = {
          originalX: particle.position.x,
          originalY: particle.position.y,
          originalZ: particle.position.z,
          speed: 0.5 + Math.random() * 0.5
        };
        
        particlesGroup.add(particle);
      }
      
      return particlesGroup;
    };

    // Create invisible interaction sphere for mouse detection
    const createInteractionSphere = () => {
      const sphereGeometry = new THREE.SphereGeometry(2, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0,
        visible: false
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(3, 0, 0);
      return sphere;
    };

    // Initialize interactive elements
    const particles = createInteractiveParticles();
    particlesRef.current = particles;
    scene.add(particles);

    const interactionSphere = createInteractionSphere();
    interactionSphereRef.current = interactionSphere;
    scene.add(interactionSphere);

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Load GLTF Model with enhanced interactivity
    const loader = new GLTFLoader();
    loader.load(
      'textured_mesh.glb',
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    // Keep original colors, just enhance material properties
                    mat.metalness = 0.3;
                    mat.roughness = 0.4;
                  }
                });
              } else if (child.material instanceof THREE.MeshStandardMaterial) {
                // Keep original colors, just enhance material properties
                child.material.metalness = 0.3;
                child.material.roughness = 0.4;
              }
            }
          }
        });

        // Position model on the right side as welcome robot
        model.scale.setScalar(2);
        model.position.set(3, 0, 0); // Right side position
        scene.add(model);
        setIsLoading(false);
      },
      (progress) => {
        const progressPercent = (progress.loaded / progress.total) * 100;
        setLoadingProgress(progressPercent);
      },
      (error) => {
        console.error('Error loading model:', error);
        const welcomeRobot = createWelcomeRobot();
        welcomeRobot.scale.setScalar(1.5);
        welcomeRobot.position.set(3, 0, 0); // Right side position
        modelRef.current = welcomeRobot;
        scene.add(welcomeRobot);
        setIsLoading(false);
      }
    );

    // Enhanced mouse interaction with smooth tracking
    const handleMouseMove = (event: MouseEvent) => {
      // Update mouse coordinates for raycasting
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Store normalized mouse position
      mouseRef.current.x = mouse.x;
      mouseRef.current.y = mouse.y;
      
      // Enhanced robot tracking with more responsive movement
      targetRotationRef.current.y = mouseRef.current.x * Math.PI * 0.3; // Increased sensitivity
      targetRotationRef.current.x = mouseRef.current.y * Math.PI * 0.15; // Increased sensitivity

      // Check for intersection with interaction sphere
      if (interactionSphereRef.current) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(interactionSphereRef.current);
        
        if (intersects.length > 0) {
          setIsMouseOver(true);
        } else {
          setIsMouseOver(false);
        }
      }
    };

    // Mouse click interaction
    const handleMouseClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      if (interactionSphereRef.current) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(interactionSphereRef.current);
        
        if (intersects.length > 0) {
          // Trigger special animation on click
          if (modelRef.current) {
            // Create a wave effect
            modelRef.current.userData.clicked = true;
            modelRef.current.userData.clickTime = Date.now();
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleMouseClick);

    // Enhanced animation loop with interactive effects
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      if (modelRef.current) {
        // Smooth mouse tracking with easing
        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08; // Faster response
        currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08; // Faster response
        
        // Apply rotations
        modelRef.current.rotation.x = currentRotationRef.current.x;
        modelRef.current.rotation.y = currentRotationRef.current.y + Math.sin(time * 0.5) * 0.1;
        
        // Enhanced floating motion based on mouse interaction
        const floatIntensity = isMouseOver ? 0.25 : 0.15;
        modelRef.current.position.y = Math.sin(time * 1.2) * floatIntensity;
        
        // Interactive scale breathing effect
        const breatheIntensity = isMouseOver ? 0.04 : 0.02;
        const breathe = 1 + Math.sin(time * 2) * breatheIntensity;
        modelRef.current.scale.setScalar(2 * breathe);

        // Special click animation
        if (modelRef.current.userData.clicked) {
          const clickElapsed = (Date.now() - modelRef.current.userData.clickTime) / 1000;
          if (clickElapsed < 1) {
            const wave = Math.sin(clickElapsed * Math.PI * 4) * (1 - clickElapsed);
            modelRef.current.position.z = wave * 0.3;
          } else {
            modelRef.current.userData.clicked = false;
            modelRef.current.position.z = 0;
          }
        }

        // Animate individual robot parts for fallback model
        modelRef.current.traverse((child) => {
          if (child.userData.isHead) {
            // Head follows mouse more closely
            child.rotation.y = mouseRef.current.x * 0.3;
            child.rotation.x = mouseRef.current.y * 0.2;
          }
          
          if (child.userData.isEye) {
            // Eye blinking animation
            const blinkTime = Math.sin(time * 3) > 0.95 ? 0.1 : 1;
            child.scale.y = blinkTime;
          }
          
          if (child.userData.isGlow) {
            // Pulsing glow effect
            const pulse = 0.3 + Math.sin(time * 4) * 0.2;
            child.material.opacity = pulse;
          }
          
          if (child.userData.isArm) {
            // Arm gestures based on mouse position
            const armMovement = isMouseOver ? Math.sin(time * 2) * 0.2 : 0;
            if (child.userData.side === 'left') {
              child.rotation.z = child.userData.originalRotationZ + armMovement;
            } else {
              child.rotation.z = child.userData.originalRotationZ - armMovement;
            }
          }
          
          if (child.userData.isHand) {
            // Hand waving animation
            const wave = isMouseOver ? Math.sin(time * 3) * 0.3 : 0;
            child.position.y = child.userData.originalY + wave;
          }
          
          if (child.userData.isPanel) {
            // Panel pulse based on interaction
            const pulseIntensity = isMouseOver ? 0.4 : 0.2;
            child.material.emissiveIntensity = pulseIntensity + Math.sin(time * 2) * 0.1;
          }
        });
      }

      // Animate interactive particles
      if (particlesRef.current) {
        particlesRef.current.children.forEach((particle, index) => {
          const userData = particle.userData;
          
          // Particles react to mouse position
          const mouseInfluence = isMouseOver ? 1.5 : 1;
          const speed = userData.speed * mouseInfluence;
          
          // Orbital motion with mouse influence
          const angle = time * speed + index * 0.5;
          const radius = 2 + Math.sin(time + index) * 0.5;
          
          particle.position.x = userData.originalX + Math.cos(angle) * radius * 0.3;
          particle.position.y = userData.originalY + Math.sin(angle * 2) * 0.3;
          particle.position.z = userData.originalZ + Math.sin(angle) * radius * 0.3;
          
          // Particle opacity based on interaction
          particle.material.opacity = isMouseOver ? 0.9 : 0.6;
        });
      }

      // Camera looks at the robot on the right
      camera.lookAt(3, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleMouseClick);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* 3D Scene Container - positioned to show robot on right */}
      <div ref={mountRef} className="absolute inset-0 cursor-pointer" />
      
      {/* Loading Screen */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-2xl font-bold text-white mb-2">Initializing Welcome Robot</h3>
            <p className="text-emerald-400 text-lg font-medium">Preparing Robot Assistant...</p>
            <div className="mt-4 w-64 bg-slate-700 rounded-full h-2 mx-auto">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-emerald-400 text-sm mt-2 font-semibold">{Math.round(loadingProgress)}%</p>
          </div>
        </div>
      )}
      
      {/* Main Content Layout */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header Navigation */}
        <header className="absolute top-0 left-0 right-0 p-6 md:p-8 z-10">
          <div className="w-full mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ZB</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  ZB-Labs.ai
                </h1>
              </div>
            </div>
            <nav className="hidden md:flex justify-center items-center space-x-8 pointer-events-auto">
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Home</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Blog</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">About</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Contact</a>
              <button className="pointer-events-auto px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-full transition-all duration-300">
                Hello
              </button>
            </nav>
          </div>
        </header>

        {/* Hero Content - Left Side */}
        <div className="absolute left-6 md:left-12 top-1/2 transform -translate-y-1/2 max-w-xl z-10">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              A Smart Product{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                Robot Assistant
              </span>
            </h2>
            
            <p className="text-gray-300 text-lg leading-relaxed max-w-md">
              Meet your AI-powered Robot Assistant. Move your mouse to interact and click to activate special features.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="pointer-events-auto px-8 py-4 bg-gray-600/80 hover:bg-gray-500/80 text-white font-medium rounded-full transition-all duration-300 backdrop-blur-sm border border-gray-500/50">
                Welcome
              </button>
              <button className="pointer-events-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Status Indicator */}
        <div className="absolute bottom-8 right-8 z-10">
          <div className={`bg-emerald-500/20 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border transition-all duration-300 ${
            isMouseOver ? 'border-emerald-400 bg-emerald-500/30' : 'border-emerald-500/30'
          }`}>
            <p className="text-emerald-400 font-medium text-sm flex items-center">
              <span className="mr-2">🤖</span>
              {isMouseOver ? 'Robot is responding to your interaction!' : 'Move mouse over robot to interact'}
            </p>
          </div>
        </div>

        {/* Enhanced Welcome Message from Robot */}
        <div className="absolute right-8 top-1/3 z-10 hidden lg:block">
          <div className={`bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border max-w-xs transition-all duration-300 ${
            isMouseOver ? 'border-emerald-400 bg-slate-800/95' : 'border-emerald-500/30'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                isMouseOver ? 'animate-pulse' : ''
              }`}>
                <span className="text-white text-xs">🤖</span>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Robot Assistant</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {isMouseOver 
                    ? "I can see you! Try clicking on me for a special animation!" 
                    : "Hello! I'm here to help you with quality control processes. Ready to get started?"
                  }
                </p>
                <div className="mt-3 flex space-x-2">
                  <div className={`w-2 h-2 bg-emerald-400 rounded-full ${isMouseOver ? 'animate-bounce' : 'animate-pulse'}`}></div>
                  <div className={`w-2 h-2 bg-emerald-400 rounded-full ${isMouseOver ? 'animate-bounce' : 'animate-pulse'}`} style={{animationDelay: '0.2s'}}></div>
                  <div className={`w-2 h-2 bg-emerald-400 rounded-full ${isMouseOver ? 'animate-bounce' : 'animate-pulse'}`} style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}