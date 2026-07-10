import type { ParsedCallFlow } from '@/lib/parser';

interface Props {
  data: ParsedCallFlow;
}

const W = 160;   // node width
const H = 48;    // node height
const GAP_X = 40;
const GAP_Y = 80;
const PAD = 24;

function nodeColor(type: 'entry' | 'menu' | 'option' | 'meta') {
  return {
    entry:  { fill: '#0a2540', stroke: '#5bd3ff', text: '#5bd3ff'  },
    menu:   { fill: '#0d2d4a', stroke: '#7c3aed', text: '#c4b5fd'  },
    option: { fill: '#0a1e2e', stroke: '#5bd3ff', text: '#e8f0fe'  },
    meta:   { fill: '#0a2018', stroke: '#34d399', text: '#6ee7b7'  },
  }[type];
}

interface Node { id: string; x: number; y: number; label: string; sublabel?: string; type: 'entry'|'menu'|'option'|'meta' }
interface Edge { from: string; to: string; dashed?: boolean }

export default function FlowVisualizer({ data }: Props) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // ── Entry ──
  nodes.push({ id: 'entry', x: PAD, y: PAD, label: 'Incoming Call', type: 'entry' });

  // ── Menu ──
  const menuX = PAD;
  const menuY = PAD + H + GAP_Y;
  nodes.push({ id: 'menu', x: menuX, y: menuY, label: data.menu, sublabel: 'Main Menu', type: 'menu' });
  edges.push({ from: 'entry', to: 'menu' });

  // ── Options ──
  const opts = data.options;
  const totalOptionsW = opts.length * W + (opts.length - 1) * GAP_X;
  const menuCX = menuX + W / 2;
  const startX = menuCX - totalOptionsW / 2;
  const optY = menuY + H + GAP_Y + 20;

  opts.forEach((opt, i) => {
    const id = `opt_${opt.key}`;
    const x = startX + i * (W + GAP_X);
    nodes.push({ id, x, y: optY, label: `${opt.key} · ${opt.label}`, sublabel: opt.queue, type: 'option' });
    edges.push({ from: 'menu', to: id });
  });

  // ── After hours & Holiday (below menu, right side) ──
  const metaY = menuY + H + GAP_Y + 20;
  const metaX = Math.max(startX + totalOptionsW + GAP_X * 2, menuX + W + 60);

  if (data.after_hours) {
    const id = 'after_hours';
    nodes.push({ id, x: metaX, y: metaY, label: data.after_hours, sublabel: 'After Hours', type: 'meta' });
    edges.push({ from: 'menu', to: id, dashed: true });
  }
  if (data.holiday) {
    const id = 'holiday';
    nodes.push({ id, x: metaX, y: metaY + H + GAP_Y, label: data.holiday, sublabel: 'Holiday', type: 'meta' });
    edges.push({ from: 'menu', to: id, dashed: true });
  }

  // ── Compute SVG viewport ──
  const allX = nodes.map(n => n.x + W);
  const allY = nodes.map(n => n.y + H);
  const svgW = Math.max(...allX) + PAD;
  const svgH = Math.max(...allY) + PAD;

  function cx(n: Node) { return n.x + W / 2; }
  function cy(n: Node) { return n.y + H / 2; }

  function getEdgePath(from: Node, to: Node) {
    const x1 = cx(from), y1 = from.y + H;
    const x2 = cx(to),   y2 = to.y;
    const my = (y1 + y2) / 2;
    return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
  }

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,.08)', background: '#060e1a' }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width={svgW}
        height={svgH}
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeMap[e.from];
          const to   = nodeMap[e.to];
          if (!from || !to) return null;
          return (
            <path
              key={i}
              d={getEdgePath(from, to)}
              fill="none"
              stroke={e.dashed ? '#34d399' : 'rgba(91,211,255,.4)'}
              strokeWidth={1.5}
              strokeDasharray={e.dashed ? '5,4' : undefined}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const c = nodeColor(node.type);
          return (
            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
              <rect
                width={W} height={H} rx={6}
                fill={c.fill} stroke={c.stroke} strokeWidth={1}
              />
              {node.sublabel && (
                <text x={W / 2} y={14} textAnchor="middle" fontSize={9} fill={c.stroke} fontWeight={700} letterSpacing={1} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  {node.sublabel}
                </text>
              )}
              <text
                x={W / 2}
                y={node.sublabel ? 31 : H / 2 + 5}
                textAnchor="middle"
                fontSize={11}
                fill={c.text}
                fontWeight={600}
                fontFamily="Inter, sans-serif"
              >
                {node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
