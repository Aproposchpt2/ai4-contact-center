'use client';
import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NodeMenu from '@/components/NodeMenu';
import NodeProperties from '@/components/NodeProperties';
import { buildLogicFromGraph } from '@/lib/logicBuilder';
import { loadGraphFromLogic } from '@/lib/logicLoader';
import type { GeneratedLogic, LogicEdge, LogicNode, LogicNodeData, LogicNodeType } from '@/lib/logicTypes';

function defaultNodeData(type: LogicNodeType): LogicNodeData {
  if (type === 'menu') return { label: 'Main Menu', options: [] };
  if (type === 'option') return { key: 1, label: 'Option', queue: '' };
  if (type === 'queue') return { queueName: 'Queue_Name' };
  if (type === 'prompt') return { promptName: 'Prompt_Name' };
  if (type === 'after_hours') return { destination: 'AfterHours_Default' };
  return { destination: 'Holiday_Default' };
}

export default function DesignerPage() {
  const [nodes, setNodes] = useState<LogicNode[]>([]);
  const [edges, setEdges] = useState<LogicEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [generatedJson, setGeneratedJson] = useState<GeneratedLogic | null>(null);
  const [loadJsonInput, setLoadJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const handleAddNode = useCallback((type: LogicNodeType) => {
    const nextIndex = nodes.length + 1;
    const id = `${type}-${nextIndex}`;
    const position = { x: 120 + (nextIndex % 3) * 200, y: 100 + Math.floor(nextIndex / 3) * 140 };
    const newNode: LogicNode = {
      id,
      type,
      position,
      data: defaultNodeData(type),
    };
    setNodes((prev) => [...prev, newNode]);
  }, [nodes.length]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev as never) as unknown as LogicNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => applyEdgeChanges(changes, prev as never) as unknown as LogicEdge[]);
  }, []);

  const handleConnect: OnConnect = useCallback((params: Connection) => {
    setEdges((prev) => addEdge(params, prev as never) as unknown as LogicEdge[]);
  }, []);

  const handleNodeSelect = useCallback((_: unknown, node: LogicNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleNodeDataChange = useCallback((nodeId: string, dataPatch: Record<string, string | number>) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...dataPatch } } : node
      )
    );
  }, []);

  const handleGenerateJson = useCallback(() => {
    const output = buildLogicFromGraph(nodes, edges);
    setGeneratedJson(output);
    setError(null);
  }, [nodes, edges]);

  const handleLoadJson = useCallback(() => {
    try {
      const parsed = JSON.parse(loadJsonInput) as GeneratedLogic;
      const graph = loadGraphFromLogic(parsed);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setGeneratedJson(parsed);
      setSelectedNodeId(null);
      setError(null);
    } catch {
      setError('Invalid JSON. Paste a valid logic object before loading.');
    }
  }, [loadJsonInput]);

  const handleDownloadJson = useCallback(() => {
    if (!generatedJson) return;
    const blob = new Blob([JSON.stringify(generatedJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'logic.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [generatedJson]);

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', padding: '1rem' }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={handleGenerateJson}>Generate JSON</button>
            <button style={btnSecondary} onClick={handleLoadJson}>Load JSON</button>
            <button style={btnSecondary} onClick={handleDownloadJson} disabled={!generatedJson}>Download JSON</button>
          </div>

          <textarea
            value={loadJsonInput}
            onChange={(e) => setLoadJsonInput(e.target.value)}
            placeholder="Paste JSON logic here, then click Load JSON."
            rows={5}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.12)',
              color: '#e8f0fe',
              borderRadius: '6px',
              padding: '.7rem',
              marginBottom: '.75rem',
              fontFamily: "'Fira Mono', 'Courier New', monospace",
            }}
          />

          {error && (
            <p style={{ margin: '0 0 .75rem 0', color: '#ff8f8f', fontSize: '.85rem' }}>{error}</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0,1fr) 280px', gap: '.75rem', minHeight: '620px' }}>
            <aside style={panelStyle}>
              <h3 style={panelTitle}>Node Palette</h3>
              <NodeMenu onAddNode={handleAddNode} />
            </aside>

            <section style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
              <ReactFlow
                nodes={nodes as never}
                edges={edges as never}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onNodeClick={handleNodeSelect as never}
                fitView
              >
                <MiniMap />
                <Controls />
                <Background />
              </ReactFlow>
            </section>

            <aside style={panelStyle}>
              <h3 style={panelTitle}>Node Properties</h3>
              <NodeProperties node={selectedNode} onChange={handleNodeDataChange} />
            </aside>
          </div>

          <div style={{ marginTop: '.75rem', ...panelStyle }}>
            <h3 style={panelTitle}>Generated JSON</h3>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: "'Fira Mono', 'Courier New', monospace", color: 'rgba(255,255,255,.85)', fontSize: '.8rem' }}>
              {generatedJson ? JSON.stringify(generatedJson, null, 2) : 'Generate JSON to preview logic output.'}
            </pre>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: '8px',
  padding: '.75rem',
};

const panelTitle: React.CSSProperties = {
  margin: '0 0 .7rem 0',
  color: '#fff',
  fontSize: '.82rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};

const btnPrimary: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '6px',
  padding: '.55rem .9rem',
  fontWeight: 700,
  fontSize: '.75rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,.08)',
  color: '#e8f0fe',
  border: '1px solid rgba(255,255,255,.15)',
  borderRadius: '6px',
  padding: '.55rem .9rem',
  fontWeight: 700,
  fontSize: '.75rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

