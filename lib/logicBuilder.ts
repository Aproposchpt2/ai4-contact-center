import type { GeneratedLogic, LogicEdge, LogicNode } from '@/lib/logicTypes';

function getNodeById(nodes: LogicNode[], id: string): LogicNode | undefined {
  return nodes.find((node) => node.id === id);
}

function targetsFromSource(edges: LogicEdge[], sourceId: string): string[] {
  return edges.filter((edge) => edge.source === sourceId).map((edge) => edge.target);
}

export function buildLogicFromGraph(nodes: LogicNode[], edges: LogicEdge[]): GeneratedLogic {
  const menuNode = nodes.find((node) => node.type === 'menu');

  const result: GeneratedLogic = {
    menu: menuNode?.data.label?.trim() || 'Main Menu',
    options: [],
    after_hours: null,
    holiday: null,
  };

  if (!menuNode) return result;

  const optionIds = targetsFromSource(edges, menuNode.id);
  for (const optionId of optionIds) {
    const optionNode = getNodeById(nodes, optionId);
    if (!optionNode || optionNode.type !== 'option') continue;

    const keyValue = Number(optionNode.data.key ?? 0);
    const labelValue = optionNode.data.label?.trim() || 'Option';
    let queueValue = optionNode.data.queue?.trim() || '';

    const queueTargetId = targetsFromSource(edges, optionNode.id).find((targetId) => {
      const targetNode = getNodeById(nodes, targetId);
      return targetNode?.type === 'queue';
    });

    if (queueTargetId) {
      const queueNode = getNodeById(nodes, queueTargetId);
      queueValue = queueNode?.data.queueName?.trim() || queueValue;
    }

    result.options.push({
      key: Number.isFinite(keyValue) ? keyValue : 0,
      label: labelValue,
      queue: queueValue || `${labelValue.replace(/\s+/g, '')}_Queue`,
    });
  }

  const afterHoursNode = nodes.find((node) => node.type === 'after_hours');
  if (afterHoursNode) {
    result.after_hours = afterHoursNode.data.destination?.trim() || 'AfterHours_Default';
  }

  const holidayNode = nodes.find((node) => node.type === 'holiday');
  if (holidayNode) {
    result.holiday = holidayNode.data.destination?.trim() || 'Holiday_Default';
  }

  return result;
}

