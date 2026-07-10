import type { GeneratedLogic, LogicEdge, LogicNode } from '@/lib/logicTypes';

type Graph = { nodes: LogicNode[]; edges: LogicEdge[] };

function nodeId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

export function loadGraphFromLogic(logic: GeneratedLogic): Graph {
  const nodes: LogicNode[] = [];
  const edges: LogicEdge[] = [];

  const menuId = 'menu-1';
  nodes.push({
    id: menuId,
    type: 'menu',
    position: { x: 280, y: 40 },
    data: { label: logic.menu || 'Main Menu', options: [] },
  });

  logic.options.forEach((option, idx) => {
    const optionIndex = idx + 1;
    const optionId = nodeId('option', optionIndex);
    const queueId = nodeId('queue', optionIndex);

    nodes.push({
      id: optionId,
      type: 'option',
      position: { x: 80 + idx * 220, y: 220 },
      data: {
        key: option.key,
        label: option.label,
        queue: option.queue,
      },
    });

    nodes.push({
      id: queueId,
      type: 'queue',
      position: { x: 80 + idx * 220, y: 400 },
      data: {
        queueName: option.queue,
      },
    });

    edges.push({ id: `edge-${menuId}-${optionId}`, source: menuId, target: optionId });
    edges.push({ id: `edge-${optionId}-${queueId}`, source: optionId, target: queueId });
  });

  if (logic.after_hours) {
    nodes.push({
      id: 'after-hours-1',
      type: 'after_hours',
      position: { x: 680, y: 120 },
      data: { destination: logic.after_hours },
    });
  }

  if (logic.holiday) {
    nodes.push({
      id: 'holiday-1',
      type: 'holiday',
      position: { x: 680, y: 260 },
      data: { destination: logic.holiday },
    });
  }

  return { nodes, edges };
}

