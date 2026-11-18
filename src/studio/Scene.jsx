import {Suspense,useCallback,useDeferredValue,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {ContactShadows,Decal,Environment,Lightformer,OrbitControls,PerformanceMonitor,RoundedBox,useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {colors} from '../data/catalog.js';
import {prefersReducedMotion} from '../lib/dom.js';
import {useStore} from '../store/useStore.js';
import {layoutFor,productConfig,variantFor,assertVerified} from './design.js';
import {runtime,subscribe} from './runtime.js';
import {camera as cameraRef,useStudio} from './state.js';

const compactScreen = () => typeof matchMedia === 'function' && matchMedia('(max-width: 767px)').matches;

/* ---------------------------------------------------------------- textures */

/** Per-side atlas textures: product colour + the flat print layer placed in the model's UV print zone. */
function useAtlas(draft) {
  const gl = useThree(s => s.gl), invalidate = useThree(s => s.invalidate);
  const maps = useMemo(() => {
    const width = compactScreen() ? 1024 : 2048, out = {};
    for (const side of ['front','back']) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = width / 2;
      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8,gl.capabilities.getMaxAnisotropy());
      out[side] = {canvas,texture};
    }
    return out;
  },[gl]);
  useEffect(() => () => Object.values(maps).forEach(m => m.texture.dispose()),[maps]);

  const compose = useCallback(() => {
    const d = useStore.getState().draft;
    if (!d || !productConfig[d.id]) return;
    const zones = productConfig[d.id].zones, color = colors[d.color];
    for (const side of ['front','back']) {
      const {canvas,texture} = maps[side], ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = color; ctx.fillRect(0,0,canvas.width,canvas.height);
      const [u0,v0,u1,v1] = (zones[d.id === 'mug' && layoutFor(d).mode === 'wrap' ? 'wrap' : side] || zones.front).uv;
      const source = side === 'back' ? (d.sides === 2 ? runtime.canvases.back : null) : runtime.canvases.front;
      if (source?.width) {
        // glTF UVs use top-left canvas coordinates with flipY=false; the mug zone is authored bottom-up.
        if (d.id === 'mug') ctx.drawImage(source,u0 * canvas.width,(1 - v1) * canvas.height,(u1 - u0) * canvas.width,(v1 - v0) * canvas.height);
        else ctx.drawImage(source,u0 * canvas.width,v0 * canvas.height,(u1 - u0) * canvas.width,(v1 - v0) * canvas.height);
      }
      texture.needsUpdate = true;
    }
    invalidate();
  },[maps,invalidate]);

  const mode = layoutFor(draft).mode;
  useEffect(() => { compose(); return subscribe(compose); },[compose]);
  useEffect(() => { compose(); },[draft.color,mode,draft.sides,compose]);
  return maps;
}

/** Texture that mirrors the flat front print layer (used for decals on the procedural tote and cap). */
function useDecalTexture(decalFlip = true) {
  const invalidate = useThree(s => s.invalidate);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(runtime.canvases.front);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.flipY = decalFlip;
    return t;
  },[]);
  useEffect(() => { const update = () => { texture.needsUpdate = true; invalidate(); }; update(); const off = subscribe(update); return () => { off(); texture.dispose(); }; },[texture,invalidate]);
  return texture;
}

/* ------------------------------------------------------------------ models */

function buildGlb(scene,id,maps,color) {
  const next = clone(scene), meshes = [], disposables = [];
  if (id === 'tee') next.traverse(o => { if (['Sketchfab_model','GLTF_SceneRootNode'].includes(o.name)) { o.matrix.identity(); o.matrix.decompose(o.position,o.quaternion,o.scale); } });
  next.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(next), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  next.position.sub(center); wrapper.add(next); wrapper.scale.setScalar(2 / size.y); wrapper.updateMatrixWorld(true);
  next.traverse(o => {
    if (!o.isMesh) return;
    let side = null;
    if (id === 'mug' && o.name === 'Mug_Body_Printable') side = 'front';
    if (id === 'tee') {
      for (let p = o; p; p = p.parent) { if (p.name.includes('Body_Front')) side = 'front'; if (p.name.includes('Body_Back')) side = 'back'; }
      if (side) {
        // Print panels get planar UVs derived from the vertex positions of the (unquantised) source model.
        const geometry = o.geometry.clone(), pos = geometry.attributes.position, uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
          uv[i * 2] = side === 'back' ? 1 - (pos.getX(i) + .21) / .42 : (pos.getX(i) + .21) / .42;
          uv[i * 2 + 1] = 1 - (pos.getY(i) - .95) / .68;
        }
        geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
        o.geometry = geometry; disposables.push(geometry);
      }
    }
    const material = new THREE.MeshPhysicalMaterial({
      color:side ? '#ffffff' : color,map:side ? maps[side].texture : null,metalness:0,roughness:id === 'mug' ? .22 : .86,
      clearcoat:id === 'mug' ? .28 : 0,clearcoatRoughness:.18,sheen:id === 'tee' ? .35 : 0,side:THREE.DoubleSide
    });
    o.material = material; disposables.push(material);
    o.userData.printSide = side;
    meshes.push(o);
  });
  return {wrapper,meshes,disposables};
}

function GlbProduct({draft}) {
  const wanted = variantFor(draft).url, url = useDeferredValue(wanted);
  const gltf = useGLTF(url,false);
  const invalidate = useThree(s => s.invalidate);
  const maps = useAtlas(draft);
  const color = colors[draft.color];
  const built = useMemo(() => buildGlb(gltf.scene,draft.id,maps,color),[gltf,draft.id,maps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => built.disposables.forEach(d => d.dispose()),[built]);
  useEffect(() => {
    for (const o of built.meshes) {
      if (!o.userData.printSide) o.material.color.set(color);
      o.material.roughness = draft.id === 'mug' ? (draft.quality === 1 ? .30 : .22) : .86;
    }
    invalidate();
  },[built,color,draft.quality,draft.id,invalidate]);
  useEffect(() => {
    useStudio.getState().set({status:'Drag to rotate · pinch or scroll to zoom'});
  },[built,draft.id]);
  return <primitive object={built.wrapper}/>;
}

export function preloadGlb(id) {
  const variant = productConfig[id]?.variants[id === 'mug' ? '325 ml' : 'default'];
  if (variant) useGLTF.preload(variant.url,false);
}
export function clearGlb(draft) { const v = variantFor(draft); if (v) useGLTF.clear([v.url,false]); }

function ToteModel({draft}) {
  const texture = useDecalTexture(), color = colors[draft.color];
  const fabric = {color,roughness:.95,metalness:0};
  return <group scale={1.12} position={[0,-.15,0]}>
    <RoundedBox args={[1.5,1.7,.3]} radius={.035} smoothness={4}><meshStandardMaterial {...fabric}/></RoundedBox>
    {[-.1,.1].map(z => <mesh key={z} position={[0,.85,z]}><torusGeometry args={[.42,.045,12,48,Math.PI]}/><meshStandardMaterial {...fabric}/></mesh>)}
    <mesh position={[0,-.05,.152]}><planeGeometry args={[1,1]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2}/></mesh>
  </group>;
}

function CapModel({draft}) {
  const texture = useDecalTexture(false), color = colors[draft.color];
  const dome = useRef(null);
  const brim = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0,0,1,1.15,0,Math.PI,false);
    return new THREE.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:true,bevelSize:.03,bevelThickness:.02,bevelSegments:3,curveSegments:32});
  },[]);
  useEffect(() => () => brim.dispose(),[brim]);
  const fabric = {color,roughness:.9,metalness:0,side:THREE.DoubleSide};
  return <group scale={1.3} position={[0,-.5,0]}>
    <mesh ref={dome} scale={[1,.86,1.04]}>
      <sphereGeometry args={[1,64,40,0,Math.PI * 2,0,Math.PI / 2]}/>
      <meshStandardMaterial {...fabric}/>
      <Decal position={[0,.45,.93]} scale={[.95,.45,.5]}><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-4}/></Decal>
    </mesh>
    <mesh geometry={brim} position={[0,-.02,.82]} rotation={[Math.PI / 2 + .16,0,0]} scale={[.74,.5,1]}><meshStandardMaterial {...fabric}/></mesh>
    <mesh position={[0,.86,0]}><sphereGeometry args={[.07,16,12]}/><meshStandardMaterial {...fabric}/></mesh>
  </group>;
}

/* ------------------------------------------------------------ camera + env */

const HOME = new THREE.Vector3(0,.3,5.2);

function CameraRig() {
  const camera = useThree(s => s.camera), invalidate = useThree(s => s.invalidate);
  const target = useRef(null), lastTouch = useRef(performance.now());
  const auto = useStudio(s => s.auto);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const go = v => { lastTouch.current = performance.now(); if (reduced) { camera.position.copy(v); target.current = null; } else target.current = v; invalidate(); };
    const radius = () => camera.position.length();
    cameraRef.current = {
      view(name) { const a = {front:0,back:Math.PI,side:Math.PI / 2}[name] ?? 0, r = radius(); go(new THREE.Vector3(Math.sin(a) * r,.22,Math.cos(a) * r)); },
      rotate(delta) { const a = Math.atan2(camera.position.x,camera.position.z) + delta, r = radius(); go(new THREE.Vector3(Math.sin(a) * r,camera.position.y,Math.cos(a) * r)); },
      zoom(factor) { camera.position.multiplyScalar(factor); lastTouch.current = performance.now(); invalidate(); },
      reset() { go(HOME.clone()); }
    };
    // Gentle reveal: start slightly off-axis and settle on the front view.
    if (!reduced) { camera.position.set(2.6,.9,6.4); target.current = HOME.clone(); invalidate(); } else camera.position.copy(HOME);
    return () => { cameraRef.current = null; };
  },[camera,invalidate]);

  const controls = useThree(s => s.controls);
  useEffect(() => {
    if (!controls) return;
    const start = () => { lastTouch.current = performance.now(); target.current = null; }, end = () => { lastTouch.current = performance.now(); };
    controls.addEventListener('start',start); controls.addEventListener('end',end);
    return () => { controls.removeEventListener('start',start); controls.removeEventListener('end',end); };
  },[controls]);

  useFrame((_,delta) => {
    if (target.current) {
      camera.position.lerp(target.current,1 - Math.exp(-delta * 8));
      if (camera.position.distanceTo(target.current) < .005) target.current = null;
      invalidate();
    }
    if (controls) {
      controls.autoRotate = auto && !prefersReducedMotion() && performance.now() - lastTouch.current > 3500;
      if (controls.autoRotate) invalidate();
    }
  });
  return null;
}

/** Procedural softbox lighting: no network HDRs, so it works offline and renders instantly. */
function StudioLights() {
  return <>
    <ambientLight intensity={.3}/>
    <directionalLight position={[3,5,4]} intensity={2.2}/>
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.4} position={[0,5,-4]} scale={[10,4,1]} color="#ffffff"/>
      <Lightformer form="rect" intensity={1.6} position={[-5,1,2]} rotation-y={Math.PI / 2} scale={[6,3,1]} color="#f3ecff"/>
      <Lightformer form="rect" intensity={1.2} position={[5,1,2]} rotation-y={-Math.PI / 2} scale={[6,3,1]} color="#fff4ec"/>
      <Lightformer form="circle" intensity={2} position={[0,-2,5]} scale={4} color="#ffffff"/>
    </Environment>
  </>;
}

function Adaptive({max}) {
  const setDpr = useThree(s => s.setDpr);
  return <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(max)}/>;
}

function Content({draft}) {
  assertVerified(draft.id);
  return <>
    <StudioLights/>
    <Suspense fallback={null}>
      {(draft.id === 'mug' || draft.id === 'tee') && <GlbProduct draft={draft}/>}
      {draft.id === 'tote' && <ToteModel draft={draft}/>}
      {draft.id === 'cap' && <CapModel draft={draft}/>}
    </Suspense>
    <ContactShadows position={[0,-1.02,0]} opacity={.32} scale={7} blur={2.6} far={2.4} resolution={512}/>
    <OrbitControls makeDefault enablePan={false} enableDamping minDistance={2.8} maxDistance={8} maxPolarAngle={Math.PI * .85} autoRotateSpeed={.65}/>
    <CameraRig/>
  </>;
}

/** The R3F canvas. Renders on demand (idle = 0 GPU work) with adaptive resolution. */
export default function Viewport({draft}) {
  const compact = compactScreen(), max = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1,compact ? 1.25 : 1.75);
  return <Canvas frameloop="demand" dpr={[1,max]} camera={{fov:35,position:[0,.3,5.2],near:.01,far:100}}
    gl={{antialias:true,alpha:true,powerPreference:'high-performance'}}
    aria-label="Interactive product model. Drag to rotate, pinch or scroll to zoom."
    onCreated={({gl,invalidate}) => {
      gl.domElement.addEventListener('webglcontextlost',e => { e.preventDefault(); useStudio.getState().set({status:'Graphics context lost. Switch to 2D or reload this page.',failed:true}); });
      gl.domElement.addEventListener('webglcontextrestored',() => { useStudio.getState().set({failed:false}); invalidate(); });
    }}>
    <Adaptive max={max}/>
    <Content draft={draft}/>
  </Canvas>;
}
