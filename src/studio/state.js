import {create} from 'zustand';

/** UI state shared between the studio stage (preview panel) and the fine-tune tools (controls column). */
export const useStudio = create(set => ({
  mode:'3d',            // '3d' | '2d'
  layer:'image',        // 'image' | 'text'
  auto:false,
  touchRotate:false,
  status:'Loading studio…',
  warning:'',
  failed:false,         // 3D could not start (no WebGL / model load error)
  retryKey:0,
  set:patch => set(patch),
  reset:() => set({mode:'3d',layer:'image',auto:false,touchRotate:false,status:'Loading studio…',warning:'',failed:false})
}));

/** Imperative camera controller registered by the active 3D scene. */
export const camera = {current:null};
