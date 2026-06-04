// ===== SLIDEFORGE APP =====
// Pure React + Hooks + lucide-react only

import React, {
  useState,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  Type,
  Square,
  Circle,
  ArrowRight,
  Image,
  Palette,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  GripVertical,
  Maximize2,
  Presentation,
} from 'lucide-react';

// ===== CONSTANTS =====
const CANVAS_W = 900;
const CANVAS_H = 506.25; // 16:9

// ===== UTILS =====
const uid = () => Math.random().toString(36).slice(2, 10);

const makeTextEl = (x = 80, y = 80) => ({
  id: uid(), type: 'text',
  x, y, w: 320, h: 80,
  content: 'Double-click to edit',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  color: '#1a1a1a',
  fill: 'transparent',
  border: 'none',
  opacity: 1,
});

const makeShapeEl = (shape = 'rect', x = 120, y = 120) => ({
  id: uid(), type: 'shape', shape,
  x, y,
  w: shape === 'arrow' ? 200 : 160,
  h: shape === 'arrow' ? 60 : 120,
  fill: '#D4B571',
  stroke: '#9A8452',
  strokeWidth: 2,
  opacity: 1,
});

const makeImageEl = (src, x = 100, y = 80) => ({
  id: uid(), type: 'image',
  x, y, w: 300, h: 200,
  src,
  opacity: 1,
  border: 'none',
});

const makeSlide = () => ({
  id: uid(),
  bg: '#ffffff',
  elements: [],
});

// ===== UNDO/REDO REDUCER =====
const HISTORY_LIMIT = 80;

function historyReducer(state, action) {
  switch (action.type) {
    case 'PUSH': {
      const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
      return { past, present: action.payload, future: [] };
    }
    case 'UNDO': {
      if (!state.past.length) return state;
      const newPresent = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: newPresent,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }
    case 'REDO': {
      if (!state.future.length) return state;
      const newPresent = state.future[0];
      return {
        past: [...state.past, state.present],
        present: newPresent,
        future: state.future.slice(1),
      };
    }
    default: return state;
  }
}

const initSlides = [makeSlide()];

// ===== SLIDE REDUCER HELPERS =====
function updateSlide(slides, slideId, fn) {
  return slides.map(s => s.id === slideId ? { ...s, ...fn(s) } : s);
}
function updateElement(slides, slideId, elId, fn) {
  return updateSlide(slides, slideId, s => ({
    elements: s.elements.map(e => e.id === elId ? { ...e, ...fn(e) } : e),
  }));
}

// ===== SHAPE SVG =====
function ShapeEl({ el }) {
  const { shape, fill, stroke, strokeWidth } = el;
  const sw = strokeWidth || 2;
  if (shape === 'rect') {
    return (
      <svg className="shape-element" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect x={sw / 2} y={sw / 2}
          width={`calc(100% - ${sw}px)`} height={`calc(100% - ${sw}px)`}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      </svg>
    );
  }
  if (shape === 'circle') {
    return (
      <svg className="shape-element" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="50" rx={50 - sw / 2} ry={50 - sw / 2}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      </svg>
    );
  }
  if (shape === 'arrow') {
    return (
      <svg className="shape-element" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={stroke || fill} />
          </marker>
        </defs>
        <line x1="4" y1="30" x2="186" y2="30"
          stroke={stroke || fill} strokeWidth={sw * 2}
          markerEnd="url(#arr)"
        />
      </svg>
    );
  }
  return null;
}

// ===== SLIDE THUMBNAIL =====
function SlideThumbnail({ slide, scale = 0.195 }) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '16/9',
      background: slide.bg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {slide.elements.map(el => (
        <MiniElement key={el.id} el={el} scale={scale} />
      ))}
    </div>
  );
}

function MiniElement({ el, scale }) {
  const style = {
    position: 'absolute',
    left: el.x * scale,
    top: el.y * scale,
    width: el.w * scale,
    height: el.h * scale,
    opacity: el.opacity ?? 1,
    pointerEvents: 'none',
  };

  if (el.type === 'text') {
    return (
      <div style={{
        ...style,
        color: el.color,
        fontSize: el.fontSize * scale,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        textAlign: el.textAlign,
        display: 'flex',
        alignItems: 'center',
        justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
        overflow: 'hidden',
        lineHeight: 1.4,
        padding: '0 2px',
        wordBreak: 'break-word',
      }}>
        <span style={{ display: 'block', width: '100%', textAlign: el.textAlign }}>{el.content}</span>
      </div>
    );
  }
  if (el.type === 'shape') {
    return <div style={style}><ShapeEl el={el} /></div>;
  }
  if (el.type === 'image') {
    return <img src={el.src} alt="" style={{ ...style, objectFit: 'cover' }} />;
  }
  return null;
}

// ===== CANVAS ELEMENT =====
function CanvasElement({
  el, selected, onSelect, onUpdate, onDelete, scale,
  allSelected, onDragStart,
}) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);
  const elRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const elStyle = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    opacity: el.opacity ?? 1,
    zIndex: selected ? 50 : 1,
  };

  // Drag move
  const handleMouseDown = useCallback((e) => {
    if (resizeRef.current) return;
    if (e.target.closest('.resize-handle') || e.target.closest('.element-delete-btn')) return;
    e.stopPropagation();
    onSelect(el.id, e.shiftKey);
    if (editing) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;

    const onMove = (me) => {
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      onUpdate({ x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [el, selected, editing, onSelect, onUpdate, scale]);

  // Double click to edit text
  const handleDblClick = useCallback((e) => {
    if (el.type !== 'text') return;
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 10);
  }, [el.type]);

  const handleBlur = () => setEditing(false);

  // Resize
  const handleResizeMouseDown = useCallback((e, dir) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x, origY = el.y, origW = el.w, origH = el.h;

    const onMove = (me) => {
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      let nx = origX, ny = origY, nw = origW, nh = origH;
      if (dir.includes('e')) nw = Math.max(40, origW + dx);
      if (dir.includes('s')) nh = Math.max(20, origH + dy);
      if (dir.includes('w')) { nx = origX + dx; nw = Math.max(40, origW - dx); }
      if (dir.includes('n')) { ny = origY + dy; nh = Math.max(20, origH - dy); }
      onUpdate({ x: nx, y: ny, w: nw, h: nh });
    };
    const onUp = () => {
      resizeRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [el, onUpdate, scale]);

  const textStyle = {
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    color: el.color,
    textAlign: el.textAlign,
  };

  return (
    <div
      ref={elRef}
      className="slide-element"
      style={elStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDblClick}
    >
      {/* Content */}
      {el.type === 'text' && !editing && (
        <div className="text-element" style={textStyle}>
          <span style={{ width: '100%', textAlign: el.textAlign, display: 'block' }}>
            {el.content}
          </span>
        </div>
      )}
      {el.type === 'text' && editing && (
        <textarea
          ref={textareaRef}
          className="text-element-editable"
          style={{ ...textStyle, padding: '4px' }}
          value={el.content}
          onChange={e => onUpdate({ content: e.target.value })}
          onBlur={handleBlur}
          onClick={e => e.stopPropagation()}
        />
      )}
      {el.type === 'shape' && <ShapeEl el={el} />}
      {el.type === 'image' && (
        <img src={el.src} alt="" className="image-element" draggable={false} />
      )}

      {/* Selection UI */}
      {selected && (
        <>
          <div className="element-selected-ring" />
          {/* Delete btn */}
          <button className="element-delete-btn" onMouseDown={e => { e.stopPropagation(); onDelete(el.id); }}>
            <X size={10} />
          </button>
          {/* Resize handles */}
          {['nw','ne','sw','se','n','s','e','w'].map(dir => (
            <div
              key={dir}
              className={`resize-handle ${dir}`}
              onMouseDown={e => handleResizeMouseDown(e, dir)}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ===== IMAGE URL MODAL =====
function ImageModal({ onConfirm, onClose }) {
  const [url, setUrl] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add Image from URL</div>
        <input
          className="modal-input"
          placeholder="https://example.com/image.jpg"
          value={url}
          onChange={e => setUrl(e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onConfirm(url.trim()); }}
        />
        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={() => url.trim() && onConfirm(url.trim())}>
            Add Image
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== SHAPE PICKER =====
function ShapePicker({ onPick, onClose }) {
  const shapes = [
    { id: 'rect', label: 'Rectangle', icon: <Square size={16} /> },
    { id: 'circle', label: 'Circle / Ellipse', icon: <Circle size={16} /> },
    { id: 'arrow', label: 'Arrow', icon: <ArrowRight size={16} /> },
  ];
  return (
    <div className="shape-picker-dropdown">
      {shapes.map(s => (
        <div key={s.id} className="shape-option" onClick={() => { onPick(s.id); onClose(); }}>
          {s.icon} {s.label}
        </div>
      ))}
    </div>
  );
}

// ===== PROPERTIES PANEL =====
function PropertiesPanel({ el, onUpdate }) {
  if (!el) {
    return (
      <div className="right-panel">
        <div className="panel-header">
          <span className="panel-title">Properties</span>
        </div>
        <div className="no-selection-msg">
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
          Click an element on the canvas to edit its properties
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel">
      <div className="panel-header">
        <span className="panel-title">Properties</span>
      </div>
      <div className="props-panel">
        {/* Transform */}
        <div className="props-section">
          <div className="props-section-title">Transform</div>
          <div className="prop-row">
            <span className="prop-label">X</span>
            <input type="number" className="prop-input" value={Math.round(el.x)}
              onChange={e => onUpdate({ x: Number(e.target.value) })} />
            <span className="prop-label" style={{textAlign:'center'}}>Y</span>
            <input type="number" className="prop-input" value={Math.round(el.y)}
              onChange={e => onUpdate({ y: Number(e.target.value) })} />
          </div>
          <div className="prop-row">
            <span className="prop-label">W</span>
            <input type="number" className="prop-input" value={Math.round(el.w)}
              onChange={e => onUpdate({ w: Math.max(20, Number(e.target.value)) })} />
            <span className="prop-label" style={{textAlign:'center'}}>H</span>
            <input type="number" className="prop-input" value={Math.round(el.h)}
              onChange={e => onUpdate({ h: Math.max(20, Number(e.target.value)) })} />
          </div>
          <div className="prop-row">
            <span className="prop-label">Opacity</span>
            <input type="range" min="0.1" max="1" step="0.05" className="prop-input"
              style={{ padding: 0, cursor: 'pointer' }}
              value={el.opacity ?? 1}
              onChange={e => onUpdate({ opacity: Number(e.target.value) })} />
            <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 30, textAlign: 'right' }}>
              {Math.round((el.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>

        {/* Text Properties */}
        {el.type === 'text' && (
          <div className="props-section">
            <div className="props-section-title">Text</div>
            <div className="prop-row">
              <span className="prop-label">Size</span>
              <input type="number" className="prop-input" min="8" max="200"
                value={el.fontSize}
                onChange={e => onUpdate({ fontSize: Number(e.target.value) })} />
            </div>
            <div className="prop-row">
              <span className="prop-label">Color</span>
              <input type="color" className="prop-input" value={el.color}
                onChange={e => onUpdate({ color: e.target.value })} />
            </div>
            <div className="prop-row">
              <span className="prop-label">Style</span>
              <div className="prop-btn-group">
                <button className={`prop-btn ${el.fontWeight === 'bold' ? 'active' : ''}`}
                  onClick={() => onUpdate({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })}>
                  <Bold size={12} /> Bold
                </button>
                <button className={`prop-btn ${el.fontStyle === 'italic' ? 'active' : ''}`}
                  onClick={() => onUpdate({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                  <Italic size={12} /> Italic
                </button>
              </div>
            </div>
            <div className="prop-row">
              <span className="prop-label">Align</span>
              <div className="prop-btn-group">
                {['left','center','right'].map(a => (
                  <button key={a} className={`prop-btn ${el.textAlign === a ? 'active' : ''}`}
                    onClick={() => onUpdate({ textAlign: a })}>
                    {a === 'left' && <AlignLeft size={12} />}
                    {a === 'center' && <AlignCenter size={12} />}
                    {a === 'right' && <AlignRight size={12} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="prop-row">
              <span className="prop-label">Content</span>
            </div>
            <textarea
              className="prop-input"
              style={{ height: 72, resize: 'vertical', fontSize: 12, lineHeight: 1.5 }}
              value={el.content}
              onChange={e => onUpdate({ content: e.target.value })}
            />
          </div>
        )}

        {/* Shape Properties */}
        {el.type === 'shape' && (
          <div className="props-section">
            <div className="props-section-title">Shape</div>
            <div className="prop-row">
              <span className="prop-label">Fill</span>
              <input type="color" className="prop-input" value={el.fill}
                onChange={e => onUpdate({ fill: e.target.value })} />
            </div>
            <div className="prop-row">
              <span className="prop-label">Stroke</span>
              <input type="color" className="prop-input" value={el.stroke || '#000000'}
                onChange={e => onUpdate({ stroke: e.target.value })} />
            </div>
            <div className="prop-row">
              <span className="prop-label">Stroke W</span>
              <input type="number" className="prop-input" min="0" max="20"
                value={el.strokeWidth || 2}
                onChange={e => onUpdate({ strokeWidth: Number(e.target.value) })} />
            </div>
          </div>
        )}

        {/* Image Properties */}
        {el.type === 'image' && (
          <div className="props-section">
            <div className="props-section-title">Image</div>
            <div className="prop-row">
              <span className="prop-label">URL</span>
            </div>
            <input
              className="prop-input"
              style={{ fontSize: 11 }}
              value={el.src}
              onChange={e => onUpdate({ src: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PRESENT MODE =====
function PresentMode({ slides, activeIdx, onClose }) {
  const [idx, setIdx] = useState(activeIdx);
  const slide = slides[idx];

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setIdx(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length, onClose]);

  // Compute best fit scale
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H) * 0.9;
  const cw = CANVAS_W * scale;
  const ch = CANVAS_H * scale;

  return (
    <div className="present-overlay">
      <button className="present-exit-btn" onClick={onClose}>
        <X size={14} /> Exit (ESC)
      </button>
      <div className="present-canvas" style={{ width: cw, height: ch, position: 'relative', background: slide.bg, overflow: 'hidden' }}>
        {slide.elements.map(el => {
          const s = {
            position: 'absolute',
            left: el.x * scale,
            top: el.y * scale,
            width: el.w * scale,
            height: el.h * scale,
            opacity: el.opacity ?? 1,
          };
          if (el.type === 'text') return (
            <div key={el.id} style={{
              ...s, display: 'flex', alignItems: 'center',
              justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
              fontSize: el.fontSize * scale,
              fontWeight: el.fontWeight,
              fontStyle: el.fontStyle,
              color: el.color,
              textAlign: el.textAlign,
              wordBreak: 'break-word',
              overflow: 'hidden',
              lineHeight: 1.4,
              padding: '0 4px',
            }}>
              <span style={{ display: 'block', width: '100%', textAlign: el.textAlign }}>{el.content}</span>
            </div>
          );
          if (el.type === 'shape') return <div key={el.id} style={s}><ShapeEl el={el} /></div>;
          if (el.type === 'image') return <img key={el.id} src={el.src} alt="" style={{ ...s, objectFit: 'cover' }} />;
          return null;
        })}
      </div>
      <div className="present-nav">
        <button className="present-btn" onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx === 0}>
          <ChevronLeft size={18} />
        </button>
        <span className="present-counter">{idx + 1} / {slides.length}</span>
        <button className="present-btn" onClick={() => setIdx(i => Math.min(i + 1, slides.length - 1))} disabled={idx === slides.length - 1}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initSlides,
    future: [],
  });
  const slides = history.present;

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElId, setSelectedElId] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [draggingSlide, setDraggingSlide] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const canvasRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const shapePickerRef = useRef(null);

  const activeSlide = slides[activeSlideIdx] || slides[0];
  const selectedEl = activeSlide?.elements.find(e => e.id === selectedElId) || null;

  // Compute canvas scale to fit in viewport
  const [canvasScale, setCanvasScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const area = canvasAreaRef.current;
      if (!area) return;
      const aw = area.clientWidth - 40;
      const ah = area.clientHeight - 40;
      setCanvasScale(Math.min(aw / CANVAS_W, ah / CANVAS_H, 1));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (canvasAreaRef.current) ro.observe(canvasAreaRef.current);
    return () => ro.disconnect();
  }, []);

  // Push to history
  const pushHistory = useCallback((newSlides) => {
    dispatch({ type: 'PUSH', payload: newSlides });
  }, []);

  const undo = () => dispatch({ type: 'UNDO' });
  const redo = () => dispatch({ type: 'REDO' });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (presentMode) return;
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElId) {
        const tag = document.activeElement.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          deleteElement(selectedElId);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [presentMode, selectedElId, slides, activeSlideIdx]);

  // Click outside to deselect
  useEffect(() => {
    if (showShapePicker) {
      const fn = (e) => {
        if (shapePickerRef.current && !shapePickerRef.current.contains(e.target)) {
          setShowShapePicker(false);
        }
      };
      document.addEventListener('mousedown', fn);
      return () => document.removeEventListener('mousedown', fn);
    }
  }, [showShapePicker]);

  // ===== SLIDES =====
  const addSlide = () => {
    if (slides.length >= 20) return;
    const newSlides = [...slides, makeSlide()];
    pushHistory(newSlides);
    setActiveSlideIdx(newSlides.length - 1);
    setSelectedElId(null);
  };

  const deleteSlide = (idx) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== idx);
    pushHistory(newSlides);
    setActiveSlideIdx(Math.min(idx, newSlides.length - 1));
    setSelectedElId(null);
  };

  const setSlideAndPush = (fn) => {
    const newSlides = fn(slides);
    pushHistory(newSlides);
  };

  const setSlidesBg = (color) => {
    setSlideAndPush(ss => updateSlide(ss, activeSlide.id, () => ({ bg: color })));
  };

  // ===== ELEMENTS =====
  const addElement = (el) => {
    setSlideAndPush(ss => updateSlide(ss, activeSlide.id, s => ({
      elements: [...s.elements, el],
    })));
    setSelectedElId(el.id);
  };

  const updateEl = useCallback((elId, updates) => {
    const newSlides = updateElement(slides, activeSlide.id, elId, () => updates);
    pushHistory(newSlides);
  }, [slides, activeSlide?.id, pushHistory]);

  const deleteElement = useCallback((elId) => {
    setSlideAndPush(ss => updateSlide(ss, activeSlide.id, s => ({
      elements: s.elements.filter(e => e.id !== elId),
    })));
    setSelectedElId(null);
  }, [slides, activeSlide?.id]);

  // ===== CANVAS CLICK =====
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedElId(null);
    }
  };

  // ===== TOOLBAR ACTIONS =====
  const addText = () => {
    addElement(makeTextEl(
      CANVAS_W / 2 - 160,
      CANVAS_H / 2 - 40
    ));
    setActiveTool('select');
  };

  const addShape = (shape) => {
    addElement(makeShapeEl(shape,
      CANVAS_W / 2 - 80,
      CANVAS_H / 2 - 60
    ));
    setActiveTool('select');
  };

  const addImage = (src) => {
    addElement(makeImageEl(src, CANVAS_W / 2 - 150, CANVAS_H / 2 - 100));
    setShowImageModal(false);
    setActiveTool('select');
  };

  // ===== EXPORT/IMPORT =====
  const exportJSON = () => {
    const data = { slides, version: '1.0', app: 'SlideForge' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slideforge-presentation.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.slides && Array.isArray(data.slides)) {
            pushHistory(data.slides);
            setActiveSlideIdx(0);
            setSelectedElId(null);
          }
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ===== SLIDE DRAG REORDER =====
  const handleSlideThumbDragStart = (e, idx) => {
    setDraggingSlide(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleSlideThumbDragOver = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleSlideThumbDrop = (e, idx) => {
    e.preventDefault();
    if (draggingSlide === null || draggingSlide === idx) {
      setDraggingSlide(null);
      setDragOverIdx(null);
      return;
    }
    const newSlides = [...slides];
    const [removed] = newSlides.splice(draggingSlide, 1);
    newSlides.splice(idx, 0, removed);
    pushHistory(newSlides);
    setActiveSlideIdx(idx);
    setDraggingSlide(null);
    setDragOverIdx(null);
  };
  const handleSlideThumbDragEnd = () => {
    setDraggingSlide(null);
    setDragOverIdx(null);
  };

  // Thumbnail scale
  const THUMB_W = 194; // panel width minus padding
  const thumbScale = THUMB_W / CANVAS_W;

  return (
    <div className="app">
      {/* ===== TOPBAR ===== */}
      <div className="topbar">
        <div className="topbar-logo">
          <Presentation size={20} color="#D4B571" />
          <span className="topbar-logo-text">SlideForge</span>
        </div>

        {/* Tools group */}
        <div className="topbar-group">
          <button className="toolbar-btn tooltip" data-tip="Add Text (T)"
            onClick={addText}>
            <Type size={15} /> Text
          </button>

          <div style={{ position: 'relative' }} ref={shapePickerRef}>
            <button className={`toolbar-btn tooltip ${showShapePicker ? 'active' : ''}`}
              data-tip="Add Shape"
              onClick={() => setShowShapePicker(v => !v)}>
              <Square size={15} /> Shape
            </button>
            {showShapePicker && (
              <ShapePicker onPick={addShape} onClose={() => setShowShapePicker(false)} />
            )}
          </div>

          <button className="toolbar-btn tooltip" data-tip="Add Image (URL)"
            onClick={() => setShowImageModal(true)}>
            <Image size={15} /> Image
          </button>
        </div>

        <div className="topbar-divider" />

        {/* Background */}
        <div className="color-picker-wrap tooltip" data-tip="Slide Background">
          <Palette size={15} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Background</span>
          <label className="color-swatch" style={{ background: activeSlide?.bg || '#fff' }}>
            <input type="color" value={activeSlide?.bg || '#ffffff'}
              onChange={e => setSlidesBg(e.target.value)} />
          </label>
        </div>

        <div className="topbar-divider" />

        {/* Undo/Redo */}
        <div className="topbar-group">
          <button className="toolbar-btn tooltip" data-tip="Undo (Ctrl+Z)"
            onClick={undo} disabled={!history.past.length}>
            <Undo2 size={15} />
          </button>
          <button className="toolbar-btn tooltip" data-tip="Redo (Ctrl+Y)"
            onClick={redo} disabled={!history.future.length}>
            <Redo2 size={15} />
          </button>
        </div>

        <div className="topbar-divider" />

        {/* Export/Import */}
        <div className="topbar-group">
          <button className="toolbar-btn tooltip" data-tip="Export JSON" onClick={exportJSON}>
            <Download size={15} /> Export
          </button>
          <button className="toolbar-btn tooltip" data-tip="Import JSON" onClick={importJSON}>
            <Upload size={15} /> Import
          </button>
        </div>

        <div className="topbar-spacer" />

        {/* Present */}
        <button className="toolbar-btn primary" onClick={() => setPresentMode(true)}>
          <Play size={15} /> Present
        </button>
      </div>

      {/* ===== MAIN AREA ===== */}
      <div className="main-area">
        {/* ===== LEFT PANEL ===== */}
        <div className="left-panel">
          <div className="panel-header">
            <span className="panel-title">Slides ({slides.length}/20)</span>
          </div>
          <div className="slide-list">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`slide-thumb-wrap ${activeSlideIdx === idx ? 'selected' : ''} ${dragOverIdx === idx ? 'drag-over' : ''}`}
                onClick={() => { setActiveSlideIdx(idx); setSelectedElId(null); }}
                draggable
                onDragStart={e => handleSlideThumbDragStart(e, idx)}
                onDragOver={e => handleSlideThumbDragOver(e, idx)}
                onDrop={e => handleSlideThumbDrop(e, idx)}
                onDragEnd={handleSlideThumbDragEnd}
              >
                <span className="slide-thumb-number">{idx + 1}</span>
                <SlideThumbnail slide={slide} scale={thumbScale} />
                <div className="slide-thumb-actions">
                  <button className="thumb-action-btn"
                    onClick={e => { e.stopPropagation(); deleteSlide(idx); }}
                    title="Delete slide">
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="add-slide-btn" onClick={addSlide} disabled={slides.length >= 20}>
            <Plus size={14} /> Add Slide
          </button>
        </div>

        {/* ===== CANVAS AREA ===== */}
        <div className="canvas-area" ref={canvasAreaRef} onClick={() => setSelectedElId(null)}>
          <div
            className="canvas-wrapper"
            style={{
              width: CANVAS_W * canvasScale,
              height: CANVAS_H * canvasScale,
            }}
          >
            <div
              ref={canvasRef}
              className="canvas-surface"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                background: activeSlide?.bg || '#fff',
                transform: `scale(${canvasScale})`,
                transformOrigin: 'top left',
              }}
              onClick={handleCanvasClick}
            >
              {activeSlide?.elements.length === 0 && (
                <div className="canvas-empty-hint">
                  <div className="canvas-empty-hint-icon">🎨</div>
                  <div className="canvas-empty-hint-text">Add text, shapes, or images from the toolbar</div>
                </div>
              )}
              {activeSlide?.elements.map(el => (
                <CanvasElement
                  key={el.id}
                  el={el}
                  selected={selectedElId === el.id}
                  scale={canvasScale}
                  onSelect={(id, multi) => setSelectedElId(id)}
                  onUpdate={(updates) => updateEl(el.id, updates)}
                  onDelete={deleteElement}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <PropertiesPanel
          el={selectedEl}
          onUpdate={(updates) => selectedEl && updateEl(selectedEl.id, updates)}
        />
      </div>

      {/* ===== MODALS ===== */}
      {showImageModal && (
        <ImageModal onConfirm={addImage} onClose={() => setShowImageModal(false)} />
      )}

      {/* ===== PRESENT MODE ===== */}
      {presentMode && (
        <PresentMode
          slides={slides}
          activeIdx={activeSlideIdx}
          onClose={() => setPresentMode(false)}
        />
      )}
    </div>
  );
}
