export type LogicNodeType =
  | 'menu'
  | 'option'
  | 'queue'
  | 'prompt'
  | 'after_hours'
  | 'holiday';

export type LogicNodeData = {
  label?: string;
  options?: Array<{ key: number; label: string }>;
  key?: number;
  queue?: string;
  queueName?: string;
  promptName?: string;
  destination?: string;
};

export type LogicNode = {
  id: string;
  type: LogicNodeType;
  position: { x: number; y: number };
  data: LogicNodeData;
};

export type LogicEdge = {
  id: string;
  source: string;
  target: string;
};

export type GeneratedLogic = {
  menu: string;
  options: Array<{ key: number; label: string; queue: string }>;
  after_hours: string | null;
  holiday: string | null;
};

