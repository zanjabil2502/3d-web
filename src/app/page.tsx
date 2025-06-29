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


    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Load GLTF Model
    const loader = new GLTFLoader();
    loader.load(
      '/model/textured_mesh.glb',
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

        // Position model on the right side
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

    };

    window.addEventListener('mousemove', handleMouseMove);

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
        
        // Floating motion
        modelRef.current.position.y = Math.sin(time * 1.2) * 0.15;

        // Scale breathing effect
        const breathe = 1 + Math.sin(time * 2) * 0.02;
        modelRef.current.scale.setScalar(2 * breathe);
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
            <h3 className="text-2xl font-bold text-white mb-2">Loading 3D Model</h3>
            <p className="text-emerald-400 text-lg font-medium">Preparing 3D Scene...</p>
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
              Experience our interactive 3D model. Move your mouse to see the model respond to your movements.
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

      </div>
    </div>
  );
}