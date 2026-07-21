"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('THREE.Clock') || args[0].includes('Google Maps JavaScript API'))) return;
    originalWarn(...args);
  };
  
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Google Maps JavaScript API')) return;
    originalError(...args);
  };
}

const fragmentShader = `
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 vUv;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 mouse = u_mouse / u_resolution.xy;
    
    // Adjust aspect ratio for circle
    st.x *= u_resolution.x / u_resolution.y;
    mouse.x *= u_resolution.x / u_resolution.y;

    float dist = distance(st, mouse);
    
    // Smooth glow effect
    float glow = smoothstep(0.5, 0.0, dist);
    
    // Very dark base with subtle green/white glow on mouse
    vec3 color = mix(vec3(0.0), vec3(0.05, 0.2, 0.1), glow * 0.5);
    
    // Add subtle noise
    float noise = fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    color += noise * 0.02;

    gl_FragColor = vec4(color, 1.0);
}
`;

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

function ShaderPlane() {
  const mesh = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
    }),
    [size]
  );

  useFrame((state) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.u_time.value = state.clock.elapsedTime;
      
      // Map mouse coordinates from NDC (-1 to 1) to screen space (0 to width/height)
      const mouseX = (state.pointer.x * 0.5 + 0.5) * size.width;
      const mouseY = (state.pointer.y * -0.5 + 0.5) * size.height; // WebGL Y is inverted
      
      // Smooth interpolation for mouse movement
      material.uniforms.u_mouse.value.x += (mouseX - material.uniforms.u_mouse.value.x) * 0.05;
      material.uniforms.u_mouse.value.y += (mouseY - material.uniforms.u_mouse.value.y) * 0.05;
    }
  });

  return (
    <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function WebGLBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <ShaderPlane />
      </Canvas>
    </div>
  );
}
