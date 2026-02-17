import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save, ChevronDown, Plus, GitBranch, Lightbulb, Brain,
  LayoutGrid, Download, FileImage, FileText, Grid3x3,
} from 'lucide-react';
import { canvasApi } from '../api/client';
import { nodeTypes } from '../components/canvas/CanvasNodes';
import CanvasContextMenu from '../components/canvas/CanvasContextMenu';
import CanvasSidePanel from '../components/canvas/CanvasSidePanel';
import EdgeToolbar from '../components/canvas/EdgeToolbar';
import EdgeContextMenu from '../components/canvas/EdgeContextMenu';
import { layoutFlowchart, layoutMindMap, layoutGrid } from '../utils/canvasAutoLayout';
import { exportAsPng, exportAsPdf } from '../utils/canvasExport';

const MODES = [
  { id: 'flowchart', label: 'Flowchart', icon: GitBranch },
  { id: 'visionBoard', label: 'Vision Board', icon: Lightbulb },
  { id: 'mindMap', label: 'Mind Map', icon: Brain },
];

function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

let nodeIdCounter = 1;
function getNodeId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

function CanvasInner() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const reactFlow = useReactFlow();

  const [activeBoardId, setActiveBoardId] = useState(null);
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState('flowchart');
  const [boardName, setBoardName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [edgeToolbarPos, setEdgeToolbarPos] = useState(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const boardDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);

  const { data: boards = [] } = useQuery({
    queryKey: ['canvas-boards'],
    queryFn: canvasApi.getBoards,
  });

  const createBoardMut = useMutation({
    mutationFn: (data) => canvasApi.createBoard(data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['canvas-boards'] });
      loadBoard(board);
    },
  });

  const saveBoardMut = useMutation({
    mutationFn: ({ id, data }) => canvasApi.updateBoard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canvas-boards'] });
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    },
  });

  const deleteBoardMut = useMutation({
    mutationFn: (id) => canvasApi.deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canvas-boards'] });
      setActiveBoardId(null);
      setNodes([]);
      setEdges([]);
      setBoardName('');
    },
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(e.target)) {
        setBoardDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load first board on mount
  useEffect(() => {
    if (boards.length > 0 && activeBoardId === null) {
      canvasApi.getBoard(boards[0].id).then(loadBoard);
    }
  }, [boards]);

  function loadBoard(board) {
    setActiveBoardId(board.id);
    setBoardName(board.name);
    setMode(board.mode);
    setSnapEnabled(board.viewport?.snapToGrid ?? false);

    const loadedNodes = (board.nodes || []).map((n) => ({
      ...n,
      data: { ...n.data, onLabelChange: handleLabelChange, onDescriptionChange: handleDescriptionChange, onDataChange: handleDataChange },
    }));
    setNodes(loadedNodes);
    setEdges(board.edges || []);

    if (board.viewport && board.viewport.x !== undefined) {
      setTimeout(() => {
        reactFlow.setViewport(board.viewport);
      }, 50);
    }
  }

  async function switchBoard(boardId) {
    const board = await canvasApi.getBoard(boardId);
    loadBoard(board);
    setBoardDropdownOpen(false);
  }

  function handleNewBoard() {
    const name = prompt('Board name:');
    if (!name?.trim()) return;
    createBoardMut.mutate({ name: name.trim(), mode: 'flowchart' });
    setBoardDropdownOpen(false);
  }

  function handleSave() {
    if (!activeBoardId) return;
    const viewport = { ...reactFlow.getViewport(), snapToGrid: snapEnabled };
    const cleanNodes = nodes.map((n) => {
      const { onLabelChange, onDescriptionChange, onDataChange, ...cleanData } = n.data;
      return { ...n, data: cleanData };
    });
    saveBoardMut.mutate({
      id: activeBoardId,
      data: { name: boardName, mode, nodes: cleanNodes, edges, viewport },
    });
  }

  function handleDeleteBoard() {
    if (!activeBoardId) return;
    if (!confirm('Delete this board?')) return;
    deleteBoardMut.mutate(activeBoardId);
  }

  // -- Node change handlers --
  const handleLabelChange = useCallback((nodeId, value) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: value } } : n))
    );
  }, []);

  const handleDescriptionChange = useCallback((nodeId, value) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, description: value } } : n))
    );
  }, []);

  const handleDataChange = useCallback((nodeId, updates) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n))
    );
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const getEdgeStyle = useCallback(() => {
    if (mode === 'flowchart') {
      return {
        type: 'smoothstep',
        arrowStyle: 'filled',
        animated: false,
      };
    }
    if (mode === 'mindMap') {
      return { type: 'default', arrowStyle: 'none', animated: true };
    }
    // visionBoard
    return { type: 'default', arrowStyle: 'none', animated: true };
  }, [mode]);

  const onConnect = useCallback(
    (params) => {
      const style = getEdgeStyle();
      setEdges((eds) => addEdge({ ...params, ...style }, eds));
    },
    [getEdgeStyle]
  );

  function getCenterPosition() {
    const viewport = reactFlow.getViewport();
    const bounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!bounds) return { x: 300, y: 300 };
    const x = (-viewport.x + bounds.width / 2) / viewport.zoom;
    const y = (-viewport.y + bounds.height / 2) / viewport.zoom;
    return { x: x + (Math.random() - 0.5) * 100, y: y + (Math.random() - 0.5) * 100 };
  }

  function addBlankNode(type) {
    const pos = getCenterPosition();
    const isVision = mode === 'visionBoard';
    const defaults = {
      text: { label: '', width: isVision ? 200 : undefined },
      box: { label: '', description: '' },
      diamond: { label: '' },
      oval: { label: '' },
      parallelogram: { label: '' },
      imageUpload: { label: '', imageBase64: '' },
      checklist: { label: 'Checklist', checklistItems: [{ id: '1', text: '', checked: false }] },
      codeBlock: { label: '', codeContent: '', codeLanguage: 'javascript' },
      table: { label: '', tableData: [['', '', ''], ['', '', ''], ['', '', '']] },
      stickyNote: { label: '', stickyColor: 'yellow' },
      image: { label: '', imageUrl: '' },
      section: { label: 'Section' },
    };

    const newNode = {
      id: getNodeId(),
      type,
      position: pos,
      data: {
        ...defaults[type],
        onLabelChange: handleLabelChange,
        onDescriptionChange: handleDescriptionChange,
        onDataChange: handleDataChange,
      },
      ...(isVision && type !== 'section' ? { style: { minWidth: 200 } } : {}),
    };

    setNodes((nds) => [...nds, newNode]);
  }

  function addHubNode(hubType, item) {
    const pos = getCenterPosition();
    let newNode;

    if (hubType === 'goal') {
      newNode = {
        id: getNodeId(),
        type: 'goal',
        position: pos,
        data: {
          label: item.title,
          hubType: 'goal',
          hubId: item.id,
          goalStatus: item.status,
          goalProgress: item.progress,
          goalColor: item.color,
          onLabelChange: handleLabelChange,
        },
      };
    } else if (hubType === 'note') {
      newNode = {
        id: getNodeId(),
        type: 'note',
        position: pos,
        data: {
          label: item.title,
          hubType: 'note',
          hubId: item.id,
          noteContent: item.content,
          onLabelChange: handleLabelChange,
        },
      };
    } else if (hubType === 'journal') {
      const excerpt = stripHtml(item.morningIntentions || item.content || item.eveningReflection);
      newNode = {
        id: getNodeId(),
        type: 'journal',
        position: pos,
        data: {
          label: new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          hubType: 'journal',
          hubId: item.date,
          journalExcerpt: excerpt,
          onLabelChange: handleLabelChange,
        },
      };
    }

    if (newNode) setNodes((nds) => [...nds, newNode]);
  }

  // -- Edge handlers --
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setEdgeToolbarPos({ x: event.clientX, y: event.clientY });
    setEdgeContextMenu(null);
    setContextMenu(null);
  }, []);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setEdgeContextMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
    setSelectedEdgeId(null);
    setEdgeToolbarPos(null);
    setContextMenu(null);
  }, []);

  const updateEdge = useCallback((edgeId, updates) => {
    setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)));
  }, []);

  function deleteEdge(edgeId) {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
    setEdgeToolbarPos(null);
  }

  function applyStyleToAll(edgeId) {
    const source = edges.find((e) => e.id === edgeId);
    if (!source) return;
    const { animated, arrowStyle, type } = source;
    setEdges((eds) => eds.map((e) => ({ ...e, animated, arrowStyle, type })));
  }

  function clearEdgeSelection() {
    setSelectedEdgeId(null);
    setEdgeToolbarPos(null);
    setEdgeContextMenu(null);
  }

  // -- Context menu --
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id, nodeData: node.data });
    clearEdgeSelection();
  }, []);

  function handleDeleteNode(nodeId) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }

  function handleDuplicateNode(nodeId) {
    const original = nodes.find((n) => n.id === nodeId);
    if (!original) return;
    const { onLabelChange, onDescriptionChange, onDataChange, ...cleanData } = original.data;
    const newNode = {
      ...original,
      id: getNodeId(),
      position: { x: original.position.x + 30, y: original.position.y + 30 },
      data: { ...cleanData, onLabelChange: handleLabelChange, onDescriptionChange: handleDescriptionChange, onDataChange: handleDataChange },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function handleColorChange(nodeId, color) {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, color } } : n))
    );
  }

  function handleNavigate(hubType, hubId) {
    if (hubType === 'goal') navigate(`/goals/${hubId}`);
    else if (hubType === 'note') navigate(`/notes/${hubId}`);
    else if (hubType === 'journal') navigate(`/journal`);
  }

  // -- Mind Map: add child --
  function handleAddChild(parentId) {
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;

    const childCount = edges.filter((e) => e.source === parentId).length;
    const angle = (childCount * Math.PI) / 4 - Math.PI / 2;
    const dist = 180;
    const childPos = {
      x: parent.position.x + Math.cos(angle) * dist,
      y: parent.position.y + Math.sin(angle) * dist + 80,
    };

    const childId = getNodeId();
    const childNode = {
      id: childId,
      type: 'text',
      position: childPos,
      data: { label: '', onLabelChange: handleLabelChange },
    };

    const newEdge = {
      id: `edge_${parentId}_${childId}`,
      source: parentId,
      target: childId,
      type: 'default',
    };

    setNodes((nds) => [...nds, childNode]);
    setEdges((eds) => [...eds, newEdge]);
  }

  // -- Auto-layout handler --
  function handleAutoLayout() {
    if (!activeBoardId || nodes.length === 0) return;

    let layoutFn;
    if (mode === 'flowchart') layoutFn = layoutFlowchart;
    else if (mode === 'mindMap') layoutFn = layoutMindMap;
    else layoutFn = layoutGrid;

    // Add animating class for CSS transition
    const flowEl = document.querySelector('.canvas-flow');
    flowEl?.classList.add('canvas-animating');

    const layoutedNodes = mode === 'visionBoard'
      ? layoutFn(nodes)
      : layoutFn(nodes, edges);

    setNodes(layoutedNodes.map((n) => ({
      ...n,
      data: { ...n.data, onLabelChange: handleLabelChange, onDescriptionChange: handleDescriptionChange, onDataChange: handleDataChange },
    })));

    setTimeout(() => reactFlow.fitView({ padding: 0.2 }), 50);
    setTimeout(() => flowEl?.classList.remove('canvas-animating'), 400);
  }

  // -- Export handlers --
  function handleExportPng() {
    reactFlow.fitView({ padding: 0.2 });
    setTimeout(() => exportAsPng(boardName), 200);
    setExportDropdownOpen(false);
  }

  function handleExportPdf() {
    reactFlow.fitView({ padding: 0.2 });
    setTimeout(() => exportAsPdf(boardName), 200);
    setExportDropdownOpen(false);
  }

  // Apply stored edge visuals (arrowStyle → markers, label styling)
  const displayEdges = edges.map((e) => {
    const result = { ...e };

    // Compute markers from arrowStyle
    if (e.arrowStyle) {
      delete result.markerEnd;
      delete result.markerStart;
      if (e.arrowStyle === 'open') {
        result.markerEnd = { type: MarkerType.Arrow, width: 16, height: 16 };
      } else if (e.arrowStyle === 'filled') {
        result.markerEnd = { type: MarkerType.ArrowClosed, width: 16, height: 16 };
      } else if (e.arrowStyle === 'double') {
        result.markerEnd = { type: MarkerType.ArrowClosed, width: 16, height: 16 };
        result.markerStart = { type: MarkerType.ArrowClosed, width: 16, height: 16 };
      }
      // 'none' — no markers
    }

    // Label pill styling
    if (e.label) {
      result.labelStyle = { fontSize: 11, fontWeight: 600 };
      result.labelBgStyle = { fill: '#ffffff', fillOpacity: 0.92, rx: 6, ry: 6 };
      result.labelBgPadding = [6, 4];
    }

    return result;
  });

  const defaultEdgeOptions = mode === 'flowchart'
    ? { type: 'smoothstep' }
    : { type: 'default' };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar — matches Dashboard/Notes header style */}
      <div className="flex items-center px-6 py-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0">
        {/* Left group: board selector + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div ref={boardDropdownRef} className="relative">
            <button
              onClick={() => setBoardDropdownOpen(!boardDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 min-w-[140px]"
            >
              <span className="truncate">{boardName || 'Select Board'}</span>
              <ChevronDown size={14} className={`shrink-0 transition-transform ${boardDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {boardDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => switchBoard(b.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 ${
                      b.id === activeBoardId ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
                <div className="border-t dark:border-slate-700" />
                <button
                  onClick={handleNewBoard}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Plus size={14} /> New Board
                </button>
              </div>
            )}
          </div>

          {activeBoardId && (
            <input
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="px-2 py-1 text-sm border rounded-lg bg-transparent dark:border-slate-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/50 w-40"
            />
          )}
        </div>

        {/* Center group: mode switcher */}
        <div className="flex-1 flex justify-center">
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === id
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right group: tools + save + delete */}
        <div className="flex items-center gap-2">
          {/* Auto-Layout */}
          <button
            onClick={handleAutoLayout}
            disabled={!activeBoardId || nodes.length === 0}
            title="Auto-layout nodes"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <LayoutGrid size={14} />
          </button>

          {/* Export dropdown */}
          <div ref={exportDropdownRef} className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              disabled={!activeBoardId || nodes.length === 0}
              title="Export canvas"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown size={12} className={`transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={handleExportPng}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <FileImage size={14} /> PNG Image
                </button>
                <button
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <FileText size={14} /> PDF Document
                </button>
              </div>
            )}
          </div>

          {/* Snap toggle */}
          <button
            onClick={() => setSnapEnabled((v) => !v)}
            disabled={!activeBoardId}
            title={snapEnabled ? 'Disable grid snap' : 'Enable grid snap'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${
              snapEnabled
                ? 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
                : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Grid3x3 size={14} />
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />

          {saveStatus && (
            <span className="text-xs text-green-500 font-medium">{saveStatus}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!activeBoardId}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white text-sm rounded-lg font-medium"
          >
            <Save size={14} />
            Save
          </button>
          {activeBoardId && (
            <button
              onClick={handleDeleteBoard}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Body: side panel + canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Side Panel */}
        <CanvasSidePanel onAddNode={addBlankNode} onAddHubNode={addHubNode} />

        {/* React Flow canvas */}
        <div className="flex-1 relative">
          {activeBoardId ? (
            <ReactFlow
              nodes={nodes}
              edges={displayEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              onPaneClick={() => { setContextMenu(null); clearEdgeSelection(); }}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              selectionOnDrag
              selectionMode={SelectionMode.Partial}
              panOnDrag={[1, 2]}
              snapToGrid={snapEnabled}
              snapGrid={[20, 20]}
              fitView
              className="canvas-flow"
            >
              <Background gap={20} size={1} />
              <Controls position="bottom-right" className="canvas-controls" style={{ marginBottom: 70 }} />
              <MiniMap
                position="bottom-left"
                maskColor="rgba(0,0,0,0.1)"
                className="canvas-minimap"
              />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
              <div className="text-center">
                <p className="text-gray-400 dark:text-gray-500 mb-3">No board selected</p>
                <button
                  onClick={handleNewBoard}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg mx-auto"
                >
                  <Plus size={16} /> Create Your First Board
                </button>
              </div>
            </div>
          )}

          {contextMenu && (
            <CanvasContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              nodeId={contextMenu.nodeId}
              nodeData={contextMenu.nodeData}
              onClose={() => setContextMenu(null)}
              onDelete={handleDeleteNode}
              onDuplicate={handleDuplicateNode}
              onColorChange={handleColorChange}
              onNavigate={handleNavigate}
              onAddChild={handleAddChild}
              showAddChild={mode === 'mindMap'}
            />
          )}

          {selectedEdgeId && edgeToolbarPos && (
            <EdgeToolbar
              edge={edges.find((e) => e.id === selectedEdgeId) || {}}
              position={edgeToolbarPos}
              onUpdate={updateEdge}
              onClose={clearEdgeSelection}
            />
          )}

          {edgeContextMenu && (
            <EdgeContextMenu
              x={edgeContextMenu.x}
              y={edgeContextMenu.y}
              edgeId={edgeContextMenu.edgeId}
              onClose={() => setEdgeContextMenu(null)}
              onDelete={deleteEdge}
              onApplyStyleToAll={applyStyleToAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
