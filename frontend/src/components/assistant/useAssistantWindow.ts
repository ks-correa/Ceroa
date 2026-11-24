import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';

type Size = { width: number; height: number };
export type ResizeEdge = 'top' | 'left' | 'corner';
export const ASSISTANT_SIZE_KEY = 'ceroa.assistant.size';
const initialSize = { width: 416, height: 650 };
function readSize(): Size {
  try {
    const value = JSON.parse(localStorage.getItem(ASSISTANT_SIZE_KEY) || 'null');
    if (value && Number.isFinite(value.width) && Number.isFinite(value.height))
      return { width: Math.max(360, Math.min(1200, value.width)), height: Math.max(400, Math.min(1000, value.height)) };
  } catch { /* Storage may be unavailable. */ }
  return initialSize;
}
function viewport() {
  const v = window.visualViewport;
  return { width: v?.width ?? window.innerWidth, height: v?.height ?? window.innerHeight, top: v?.offsetTop ?? 0, left: v?.offsetLeft ?? 0 };
}
export function useAssistantWindow() {
  const [preferred, setPreferred] = useState(readSize);
  const [view, setView] = useState(viewport);
  const [maximized, setMaximized] = useState(false);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ x: number; y: number; size: Size; edge: ResizeEdge } | null>(null);
  const mobile = view.width < 640;
  const margin = mobile ? 0 : 16;
  const bottom = mobile || maximized ? margin : view.width >= 1024 ? 96 : 152;
  const limits = { width: Math.max(0, Math.min(1200, view.width - margin * 2)), height: Math.max(0, Math.min(1000, view.height - Math.min(bottom, view.height / 4) - margin)) };
  const clamp = (size: Size) => ({ width: Math.min(limits.width, Math.max(360, size.width)), height: Math.min(limits.height, Math.max(400, size.height)) });
  const size = mobile || maximized ? { width: view.width - margin * 2, height: view.height - margin * 2 } : clamp(preferred);
  useEffect(() => {
    const update = () => { setView(viewport()); drag.current = null; setResizing(false); };
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
  useEffect(() => {
    if (resizing) return;
    // Only geometry is persisted, never conversation or financial data.
    try { localStorage.setItem(ASSISTANT_SIZE_KEY, JSON.stringify(preferred)); } catch { /* Keep working without storage. */ }
  }, [preferred, resizing]);
  function onPointerDown(edge: ResizeEdge, event: PointerEvent<HTMLButtonElement>) {
    if (mobile || maximized || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, size, edge };
    setResizing(true);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    setPreferred(clamp({ width: start.size.width + (start.edge === 'top' ? 0 : start.x - event.clientX), height: start.size.height + (start.edge === 'left' ? 0 : start.y - event.clientY) }));
  }
  function endResize() { drag.current = null; setResizing(false); }
  function onKeyDown(edge: ResizeEdge, event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 16;
    setPreferred(clamp({ width: size.width + (edge !== 'top' ? event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0 : 0), height: size.height + (edge !== 'left' ? event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0 : 0) }));
  }
  return { mobile, maximized, resizing, toggleMaximized: () => setMaximized(value => !value),
    style: { width: size.width, height: size.height, right: margin + window.innerWidth - view.width - view.left, bottom: window.innerHeight - view.height - view.top + Math.min(bottom, view.height / 4) },
    resizeProps: (edge: ResizeEdge) => ({ onPointerDown: (event: PointerEvent<HTMLButtonElement>) => onPointerDown(edge, event), onPointerMove, onPointerUp: endResize, onPointerCancel: endResize, onLostPointerCapture: endResize, onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onKeyDown(edge, event) }) };
}
