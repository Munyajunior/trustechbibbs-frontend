"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const vertexShaderSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentShaderSource = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPanorama;
uniform float uYaw;
uniform float uPitch;
uniform float uAspect;
uniform float uHalfFovTangent;
const float PI = 3.141592653589793;
void main() {
  vec2 xy = vUv * 2.0 - 1.0;
  vec3 ray = normalize(vec3(xy.x * uAspect * uHalfFovTangent,
                            xy.y * uHalfFovTangent, -1.0));
  float cp = cos(uPitch);
  float sp = sin(uPitch);
  ray = vec3(ray.x, cp * ray.y - sp * ray.z, sp * ray.y + cp * ray.z);
  float cy = cos(uYaw);
  float sy = sin(uYaw);
  ray = vec3(cy * ray.x + sy * ray.z, ray.y, -sy * ray.x + cy * ray.z);
  float longitude = atan(ray.x, -ray.z);
  vec2 uv = vec2(fract(longitude / (2.0 * PI) + 0.5),
                 acos(clamp(ray.y, -1.0, 1.0)) / PI);
  gl_FragColor = texture2D(uPanorama, uv);
}`;

function compileShader(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind);
  if (!shader) throw new Error("WebGL shader unavailable");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error("WebGL shader compilation failed");
  }
  return shader;
}

export function PanoramaViewer({ src, alt, hint }: { src: string; alt: string; hint: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { setFallback(true); return; }
    let disposed = false;
    let program: WebGLProgram | null = null;
    let vertex: WebGLShader | null = null;
    let fragment: WebGLShader | null = null;
    let buffer: WebGLBuffer | null = null;
    let texture: WebGLTexture | null = null;
    let ready = false;
    let yaw = 0;
    let pitch = 0;
    let fov = 70;
    let pointer: { id: number; x: number; y: number } | null = null;
    const image = new window.Image();

    function draw() {
      if (!gl || !canvas || !program || !ready || disposed) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform1f(gl.getUniformLocation(program, "uYaw"), yaw);
      gl.uniform1f(gl.getUniformLocation(program, "uPitch"), pitch);
      gl.uniform1f(gl.getUniformLocation(program, "uAspect"), canvas.width / canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, "uHalfFovTangent"), Math.tan(fov * Math.PI / 360));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function resize() {
      if (!canvas) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    }

    function pointerDown(event: PointerEvent) {
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas?.setPointerCapture(event.pointerId);
    }
    function pointerMove(event: PointerEvent) {
      if (!pointer || pointer.id !== event.pointerId || !canvas) return;
      yaw += (pointer.x - event.clientX) * 0.006;
      pitch = Math.max(-1.45, Math.min(1.45, pitch + (event.clientY - pointer.y) * 0.006));
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      draw();
    }
    function pointerUp(event: PointerEvent) {
      if (pointer?.id === event.pointerId) pointer = null;
    }
    function wheel(event: WheelEvent) {
      event.preventDefault();
      fov = Math.max(40, Math.min(100, fov + Math.sign(event.deltaY) * 5));
      draw();
    }
    function keyDown(event: KeyboardEvent) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      } else return;
      if (event.key === "ArrowLeft") yaw -= 0.12;
      if (event.key === "ArrowRight") yaw += 0.12;
      if (event.key === "ArrowUp") pitch = Math.min(1.45, pitch + 0.12);
      if (event.key === "ArrowDown") pitch = Math.max(-1.45, pitch - 0.12);
      if (event.key === "+") fov = Math.max(40, fov - 5);
      if (event.key === "-") fov = Math.min(100, fov + 5);
      draw();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      setFallback(true);
    }

    try {
      vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      program = gl.createProgram();
      if (!program) throw new Error("WebGL program unavailable");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("WebGL link failed");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error("WebGL buffer unavailable");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      if (!texture) throw new Error("WebGL texture unavailable");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(program, "uPanorama"), 0);
      image.onload = () => {
        if (disposed || !gl) return;
        try {
          const maxWidth = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
          const width = Math.min(image.naturalWidth, maxWidth);
          const height = Math.round(width * image.naturalHeight / image.naturalWidth);
          const surface = document.createElement("canvas");
          surface.width = width;
          surface.height = height;
          const drawingContext = surface.getContext("2d");
          if (!drawingContext) throw new Error("Canvas image conversion unavailable");
          drawingContext.drawImage(image, 0, 0, width, height);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, surface);
          ready = true;
          resize();
        } catch { setFallback(true); }
      };
      image.onerror = () => { if (!disposed) setFallback(true); };
      image.src = src;
    } catch { setFallback(true); }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("keydown", keyDown);
    canvas.addEventListener("webglcontextlost", contextLost);
    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      image.src = "";
      observer.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keyDown);
      canvas.removeEventListener("webglcontextlost", contextLost);
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    };
  }, [src]);

  return <div className="gallery-sphere" role="region" aria-label={hint}>
    {fallback && <div className="gallery-panorama" tabIndex={0}><Image src={src} alt={alt} width={2400} height={1200} sizes="(max-width: 1000px) 200vw, 2400px" /></div>}
    <canvas ref={canvasRef} className={fallback ? "gallery-sphere-canvas hidden" : "gallery-sphere-canvas"} tabIndex={fallback ? -1 : 0} role="img" aria-label={alt} />
  </div>;
}
