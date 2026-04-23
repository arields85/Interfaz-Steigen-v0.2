// =============================================================================
// EventHorizonBackground -- WebGL shader background + tweaks panel
// All visual parameters are runtime-controllable via uniform floats.
// =============================================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { Settings, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Default parameter values (used for reset)
// ---------------------------------------------------------------------------

const DEFAULTS = {
    // Nebula
    nebShow: 1,
    nebSpeed: 0.11,
    nebIntensity: 0.5,
    nebVariation: 0.14,
    nebHue: 0.0,
    nebContrast: 0.48,
    nebDensity: 0.3,
    nebSat: 0.5,
    nebColorVar: 1.0,
    nebColorShift: 1.0,
    // Stars
    starShow: 1,
    starDensity: 1.1,
    starBrightness: 0.8,
    starTwinkle: 0.6,
    starSize: 0.95,
    // Lensing (magnifying-glass distortion)
    lensShow: 1,
    lensMass: 0.08,
    lensSize: 0.35,
    lensOpacity: 1.0,
    lensLag: 0.02,
    // Chromatic aberration
    chromShow: 1,
    // Mouse nebula displacement (purple cloud reacting to cursor)
    nebMouseShow: 1,
    nebMouseIntensity: 0.8,
    nebMouseLag: 0.015,
    // Cursor halo
    haloShow: 1,
    haloIntensity: 0.15,
    haloLag: 0.02,
    // Vignette
    vigShow: 1,
};

type Params = typeof DEFAULTS;

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_press;

// Nebula
uniform float u_nebShow;
uniform float u_nebSpeed;
uniform float u_nebIntensity;
uniform float u_nebVariation;
uniform float u_nebHue;
uniform float u_nebContrast;
uniform float u_nebDensity;
uniform float u_nebSat;
uniform float u_nebColorVar;
uniform float u_nebColorShift;

// Stars
uniform float u_starShow;
uniform float u_starDensity;
uniform float u_starBrightness;
uniform float u_starTwinkle;
uniform float u_starSize;

// Lensing
uniform float u_lensShow;
uniform float u_lensMass;
uniform float u_lensSize;
uniform float u_lensOpacity;

// Chromatic aberration
uniform float u_chromShow;

// Mouse nebula displacement
uniform float u_nebMouseShow;
uniform float u_nebMouseIntensity;
uniform vec2  u_mouseNeb;

// Cursor halo
uniform float u_haloShow;
uniform float u_haloIntensity;
uniform vec2  u_mouseHalo;

// Vignette
uniform float u_vigShow;

float hash12(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec2 hash22(vec2 p){
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash12(i), b=hash12(i+vec2(1,0));
  float c=hash12(i+vec2(0,1)), d=hash12(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<6;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,3.1); a*=0.5; }
  return v;
}

vec3 hueShift(vec3 col, float h){
  vec3 k = vec3(0.57735);
  float cosA = cos(h*6.2831);
  float sinA = sin(h*6.2831);
  return col*cosA + cross(k, col)*sinA + k*dot(k, col)*(1.0-cosA);
}

vec3 stars(vec2 p, float density, float seed){
  vec2 g = floor(p);
  vec2 f = fract(p);
  float s = hash12(g + seed);
  if(s < 1.0 - density) return vec3(0.0);
  vec2 cp = hash22(g + seed + 17.0);
  float d = length(f - cp);
  float sz = 0.06 * u_starSize;
  float br = smoothstep(sz, 0.0, d);
  float tw = mix(1.0, 0.6 + 0.4*sin(u_time*2.0 + s*40.0), u_starTwinkle);
  float hue = hash12(g + seed + 3.0);
  vec3 c = mix(vec3(0.8,0.9,1.0), vec3(1.0,0.85,0.7), hue);
  return c * br * tw * smoothstep(0.0, 1.0, s) * u_starBrightness;
}

vec3 starfield(vec2 p){
  vec3 c = vec3(0.0);
  float dens = u_starDensity;
  c += stars(p*9.0,  0.02*dens, 1.0) * 0.6;
  c += stars(p*18.0, 0.015*dens, 2.0) * 0.9;
  c += stars(p*36.0, 0.010*dens, 3.0) * 1.0;
  return c * u_starShow;
}

vec3 ambientBG(vec2 p){
  vec3 bg = vec3(0.01, 0.012, 0.03);
  float t = u_time * u_nebSpeed;
  vec2 mp = u_mouseNeb * 2.0 - 1.0;
  mp.x *= u_res.x / u_res.y;
  vec2 toM = p - mp;
  float dM = length(toM);
  vec2 drift = normalize(toM + 1e-5) * exp(-dM*0.35) * u_nebMouseIntensity * u_nebMouseShow;
  vec2 np = p + drift;
  float scale = mix(0.6, 1.6, u_nebVariation);
  float neb  = fbm(np*scale + vec2(t*0.6, t*0.45));
  float neb2 = fbm(np*scale*1.7 + vec2(-t*0.4, t*0.3) + 11.0);
  neb = pow(clamp(neb, 0.0, 1.0), mix(2.2, 0.35, clamp(u_nebDensity, 0.0, 1.0)));
  float edge0 = mix(0.45, 0.25, u_nebContrast);
  float edge1 = mix(0.65, 0.90, u_nebContrast);
  vec3 dark   = vec3(0.02,0.03,0.08);
  vec3 lightA = vec3(0.35, 0.18, 0.55);
  vec3 lightB = vec3(0.15, 0.45, 0.60);
  lightA = hueShift(lightA, u_nebHue);
  lightB = hueShift(lightB, u_nebHue + u_nebColorShift);
  dark   = hueShift(dark,   u_nebHue * 0.4);
  vec3 light = mix(lightA, lightB, smoothstep(0.3, 0.8, neb2) * u_nebColorVar);
  vec3 nebCol = mix(dark, light, smoothstep(edge0, edge1, neb)) * u_nebIntensity * u_nebShow;
  float nebLum = dot(nebCol, vec3(0.299,0.587,0.114));
  nebCol = mix(vec3(nebLum), nebCol, u_nebSat);
  bg += nebCol;
  bg += starfield(p + vec2(10.0,10.0));
  return bg;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  vec2 p = uv*2.0 - 1.0;
  p.x *= aspect;
  vec2 mp = u_mouse*2.0 - 1.0;
  mp.x *= aspect;
  vec2 toC = p - mp;
  float d = length(toC);
  float mass = u_lensMass + u_press*0.06;
  float horizon = mass*0.9;

  // Lensing (toggleable)
  float bend = (mass / max(d*d, 0.002)) * u_lensShow;
  vec2 sdir = normalize(toC + 1e-5);
  vec2 sampP = mix(p, p - sdir * bend * u_lensSize, u_lensOpacity);
  vec3 bg = ambientBG(sampP);

  // Chromatic aberration (toggleable)
  if(u_chromShow > 0.5 && u_lensShow > 0.5){
    vec2 r_off = sampP - sdir * bend * 0.03;
    vec2 b_off = sampP + sdir * bend * 0.03;
    float rn = fbm(r_off*0.9 + vec2(u_time*0.02, u_time*0.015));
    float bn = fbm(b_off*0.9 + vec2(u_time*0.02, u_time*0.015));
    vec3 lensCol = vec3(
      0.12 + 0.6*smoothstep(0.35,0.75,rn),
      bg.g,
      0.12 + 0.9*smoothstep(0.35,0.75,bn)
    );
    bg = mix(bg, lensCol, smoothstep(0.5, horizon*2.0, 1.0/(d+0.01)));
  }

  vec3 col = bg;

  // Cursor halo (uses separate u_mouseHalo position)
  vec2 haloP = u_mouseHalo*2.0-1.0;
  haloP.x *= aspect;
  float dHalo = length(p - haloP);
  col += vec3(0.9,0.8,0.6) * exp(-dHalo*14.0) * u_haloIntensity * u_haloShow;

  // Vignette
  float vig = mix(1.0, 0.85 + 0.2*smoothstep(1.8, 0.2, length(p)), u_vigShow);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// WebGL helpers
// ---------------------------------------------------------------------------

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const s = gl.createShader(type);
    if (!s) { console.error('WebGL: createShader returned null'); return null; }
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
    }
    return s;
}

function createProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    if (!p) return null;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(p));
        gl.deleteProgram(p);
        return null;
    }
    return p;
}

// ---------------------------------------------------------------------------
// Uniform name mapping
// ---------------------------------------------------------------------------

const UNIFORM_MAP: Partial<Record<keyof Params, string>> = {
    nebShow: 'u_nebShow',
    nebSpeed: 'u_nebSpeed',
    nebIntensity: 'u_nebIntensity',
    nebVariation: 'u_nebVariation',
    nebHue: 'u_nebHue',
    nebContrast: 'u_nebContrast',
    nebDensity: 'u_nebDensity',
    nebSat: 'u_nebSat',
    nebColorVar: 'u_nebColorVar',
    nebColorShift: 'u_nebColorShift',
    starShow: 'u_starShow',
    starDensity: 'u_starDensity',
    starBrightness: 'u_starBrightness',
    starTwinkle: 'u_starTwinkle',
    starSize: 'u_starSize',
    lensShow: 'u_lensShow',
    lensMass: 'u_lensMass',
    lensSize: 'u_lensSize',
    lensOpacity: 'u_lensOpacity',
    chromShow: 'u_chromShow',
    nebMouseShow: 'u_nebMouseShow',
    nebMouseIntensity: 'u_nebMouseIntensity',
    haloShow: 'u_haloShow',
    haloIntensity: 'u_haloIntensity',
    vigShow: 'u_vigShow',
};

// ---------------------------------------------------------------------------
// Panel definition
// ---------------------------------------------------------------------------

type SectionDef = {
    title: string;
    toggleKey?: keyof Params;
    controls: ControlDef[];
};

type ControlDef = {
    key: keyof Params;
    label: string;
    min: number;
    max: number;
    step: number;
};

const SECTIONS: SectionDef[] = [
    {
        title: 'Nebula',
        toggleKey: 'nebShow',
        controls: [
            { key: 'nebSpeed', label: 'Speed', min: 0, max: 0.5, step: 0.005 },
            { key: 'nebIntensity', label: 'Intensity', min: 0, max: 2, step: 0.02 },
            { key: 'nebVariation', label: 'Variation', min: 0, max: 1, step: 0.02 },
            { key: 'nebContrast', label: 'Contrast', min: 0, max: 1, step: 0.02 },
            { key: 'nebDensity', label: 'Density', min: 0, max: 1, step: 0.01 },
            { key: 'nebHue', label: 'Hue', min: 0, max: 1, step: 0.01 },
            { key: 'nebSat', label: 'Saturation', min: 0, max: 2, step: 0.02 },
            { key: 'nebColorVar', label: 'Color Variation', min: 0, max: 1, step: 0.02 },
            { key: 'nebColorShift', label: 'Color Shift', min: 0, max: 1, step: 0.01 },
        ],
    },
    {
        title: 'Stars',
        toggleKey: 'starShow',
        controls: [
            { key: 'starDensity', label: 'Density', min: 0, max: 3, step: 0.05 },
            { key: 'starBrightness', label: 'Brightness', min: 0, max: 2.5, step: 0.05 },
            { key: 'starSize', label: 'Size', min: 0.3, max: 2.5, step: 0.05 },
            { key: 'starTwinkle', label: 'Twinkle', min: 0, max: 1, step: 0.02 },
        ],
    },
    {
        title: 'Gravitational Lensing',
        toggleKey: 'lensShow',
        controls: [
            { key: 'lensMass', label: 'Intensity', min: 0.01, max: 0.3, step: 0.005 },
            { key: 'lensSize', label: 'Size', min: 0.05, max: 1.0, step: 0.01 },
            { key: 'lensOpacity', label: 'Opacity', min: 0, max: 1, step: 0.01 },
            { key: 'lensLag', label: 'Follow Delay', min: 0.005, max: 0.3, step: 0.005 },
        ],
    },
    {
        title: 'Chromatic Aberration',
        toggleKey: 'chromShow',
        controls: [],
    },
    {
        title: 'Mouse Nebula',
        toggleKey: 'nebMouseShow',
        controls: [
            { key: 'nebMouseIntensity', label: 'Intensity', min: 0, max: 2.5, step: 0.05 },
            { key: 'nebMouseLag', label: 'Follow Delay', min: 0.003, max: 0.2, step: 0.002 },
        ],
    },
    {
        title: 'Cursor Halo',
        toggleKey: 'haloShow',
        controls: [
            { key: 'haloIntensity', label: 'Intensity', min: 0, max: 0.5, step: 0.01 },
            { key: 'haloLag', label: 'Follow Delay', min: 0.005, max: 0.3, step: 0.005 },
        ],
    },
    {
        title: 'Vignette',
        toggleKey: 'vigShow',
        controls: [],
    },
];

// ---------------------------------------------------------------------------
// Toggle Switch component
// ---------------------------------------------------------------------------

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-8 h-[18px] rounded-full border transition-colors ${
                value
                    ? 'bg-accent-cyan/20 border-accent-cyan/50'
                    : 'bg-white/8 border-white/10'
            }`}
        >
            <span
                className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-all ${
                    value
                        ? 'translate-x-3.5 bg-accent-cyan shadow-[0_0_6px_rgba(34,211,238,0.6)]'
                        : 'bg-industrial-muted'
                }`}
            />
        </button>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventHorizonBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const paramsRef = useRef<Params>({ ...DEFAULTS });
    const [params, setParams] = useState<Params>({ ...DEFAULTS });
    const [panelOpen, setPanelOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    // Sync state to ref (ref is read in the frame loop without re-renders)
    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    const updateParam = useCallback((key: keyof Params, value: number) => {
        setParams(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetAll = useCallback(() => {
        setParams({ ...DEFAULTS });
    }, []);

    const toggleSection = useCallback((title: string) => {
        setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
    }, []);

    // WebGL setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', {
            antialias: false,
            premultipliedAlpha: false,
            powerPreference: 'high-performance',
        });
        if (!gl) {
            canvas.style.display = 'none';
            return;
        }

        if (gl.isContextLost()) return;

        gl.clearColor(0.02, 0.027, 0.04, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const prog = createProgram(gl, VERT, FRAG);
        if (!prog) {
            canvas.style.display = 'none';
            return;
        }

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // Resolve all uniform locations once
        const uRes = gl.getUniformLocation(prog, 'u_res');
        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uMouse = gl.getUniformLocation(prog, 'u_mouse');
        const uMouseNeb = gl.getUniformLocation(prog, 'u_mouseNeb');
        const uMouseHalo = gl.getUniformLocation(prog, 'u_mouseHalo');
        const uPress = gl.getUniformLocation(prog, 'u_press');

        const paramUniforms: Partial<Record<keyof Params, WebGLUniformLocation | null>> = {};
        for (const key of Object.keys(UNIFORM_MAP) as (keyof Params)[]) {
            paramUniforms[key] = gl.getUniformLocation(prog, UNIFORM_MAP[key]);
        }

        const mouse = { x: 0.5, y: 0.5 };
        const smoothMouse = { x: 0.5, y: 0.5 };
        const smoothMouseNeb = { x: 0.5, y: 0.5 };
        const smoothMouseHalo = { x: 0.5, y: 0.5 };
        const startTime = performance.now();
        let rafId = 0;

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX / window.innerWidth;
            mouse.y = 1 - e.clientY / window.innerHeight;
        };
        window.addEventListener('pointermove', handleMouseMove);

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const w = Math.floor(canvas!.clientWidth * dpr);
            const h = Math.floor(canvas!.clientHeight * dpr);
            if (canvas!.width !== w || canvas!.height !== h) {
                canvas!.width = w;
                canvas!.height = h;
                gl!.viewport(0, 0, w, h);
            }
        }

        function frame(now: number) {
            resize();
            gl!.clear(gl!.COLOR_BUFFER_BIT);
            const t = (now - startTime) / 1000;
            const p = paramsRef.current;
            // Lensing mouse (purple nebula distortion)
            smoothMouse.x += (mouse.x - smoothMouse.x) * p.lensLag;
            smoothMouse.y += (mouse.y - smoothMouse.y) * p.lensLag;
            // Nebula drift mouse
            smoothMouseNeb.x += (mouse.x - smoothMouseNeb.x) * p.nebMouseLag;
            smoothMouseNeb.y += (mouse.y - smoothMouseNeb.y) * p.nebMouseLag;
            // Cursor halo mouse
            smoothMouseHalo.x += (mouse.x - smoothMouseHalo.x) * p.haloLag;
            smoothMouseHalo.y += (mouse.y - smoothMouseHalo.y) * p.haloLag;

            gl!.useProgram(prog);
            if (uRes) gl!.uniform2f(uRes, canvas!.width, canvas!.height);
            if (uTime) gl!.uniform1f(uTime, t);
            if (uMouse) gl!.uniform2f(uMouse, smoothMouse.x, smoothMouse.y);
            if (uMouseNeb) gl!.uniform2f(uMouseNeb, smoothMouseNeb.x, smoothMouseNeb.y);
            if (uMouseHalo) gl!.uniform2f(uMouseHalo, smoothMouseHalo.x, smoothMouseHalo.y);
            if (uPress) gl!.uniform1f(uPress, 0);

            // Push all params as uniforms
            for (const key of Object.keys(paramUniforms) as (keyof Params)[]) {
                const loc = paramUniforms[key];
                if (loc) gl!.uniform1f(loc, p[key]);
            }

            gl!.drawArrays(gl!.TRIANGLES, 0, 3);
            rafId = requestAnimationFrame(frame);
        }

        rafId = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('pointermove', handleMouseMove);
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="fixed inset-0 w-full h-full"
                style={{ zIndex: 0, pointerEvents: 'none' }}
                aria-hidden="true"
            />

            {/* Toggle button */}
            <button
                type="button"
                onClick={() => setPanelOpen(v => !v)}
                className={`fixed bottom-4 left-4 z-50 w-9 h-9 rounded-lg grid place-items-center border transition-colors ${
                    panelOpen
                        ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                        : 'bg-industrial-surface/80 border-industrial-border text-industrial-muted hover:text-industrial-text'
                }`}
                title="Shader tweaks"
            >
                <Settings size={16} />
            </button>

            {/* Control panel */}
            {panelOpen && (
                <div
                    className="fixed bottom-14 left-4 z-50 w-72 max-h-[calc(100vh-120px)] overflow-y-auto hmi-scrollbar rounded-xl border border-industrial-border bg-industrial-surface/90 backdrop-blur-xl shadow-2xl"
                    style={{ pointerEvents: 'auto' }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-industrial-border bg-industrial-surface/95 backdrop-blur-sm rounded-t-xl">
                        <span className="text-xs font-mono uppercase tracking-widest text-industrial-muted">
                            Shader Tweaks
                        </span>
                        <button
                            type="button"
                            onClick={resetAll}
                            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-industrial-muted hover:text-accent-cyan transition-colors"
                            title="Reset all to defaults"
                        >
                            <RotateCcw size={12} />
                            Reset
                        </button>
                    </div>

                    <div className="p-3 space-y-1">
                        {SECTIONS.map(section => {
                            const isCollapsed = collapsed[section.title];
                            const isEnabled = section.toggleKey ? params[section.toggleKey] > 0.5 : true;

                            return (
                                <div key={section.title} className="rounded-lg">
                                    {/* Section header */}
                                    <div className="flex items-center gap-2 px-2 py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.title)}
                                            className="text-industrial-muted hover:text-industrial-text transition-colors"
                                        >
                                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        <span
                                            className={`flex-1 text-xs font-mono uppercase tracking-wider cursor-pointer ${
                                                isEnabled ? 'text-industrial-text' : 'text-industrial-muted'
                                            }`}
                                            onClick={() => toggleSection(section.title)}
                                        >
                                            {section.title}
                                        </span>
                                        {section.toggleKey && (
                                            <Toggle
                                                value={isEnabled}
                                                onChange={v => updateParam(section.toggleKey!, v ? 1 : 0)}
                                            />
                                        )}
                                    </div>

                                    {/* Section body */}
                                    {!isCollapsed && section.controls.length > 0 && (
                                        <div className={`px-2 pb-2 space-y-2 ${!isEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
                                            {section.controls.map(ctrl => (
                                                <div key={ctrl.key} className="space-y-0.5">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-industrial-muted">{ctrl.label}</span>
                                                        <span className="font-mono text-industrial-muted/70 tabular-nums">
                                                            {params[ctrl.key].toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={ctrl.min}
                                                        max={ctrl.max}
                                                        step={ctrl.step}
                                                        value={params[ctrl.key]}
                                                        onChange={e => updateParam(ctrl.key, parseFloat(e.target.value))}
                                                        className="w-full h-1 appearance-none rounded-full bg-white/8 accent-accent-cyan cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-accent-cyan [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
