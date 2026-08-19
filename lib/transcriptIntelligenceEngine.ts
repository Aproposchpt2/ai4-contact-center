export type TranscriptChannel = 'voice' | 'sms' | 'chat' | 'email';
export type TranscriptSpeaker = 'agent' | 'customer' | 'system' | 'unknown';

export type TranscriptTurn = {
  id: string;
  timestamp: string;
  speaker: TranscriptSpeaker;
  text: string;
};

export type NormalizedTranscript = {
  id: string;
  channel: TranscriptChannel;
  sourceName?: string;
  rawText: string;
  turns: TranscriptTurn[];
  metadata: {
    startedAt: string;
    endedAt: string;
    turnCount: number;
    customerTurns: number;
    agentTurns: number;
    durationSeconds: number;
  };
};

export type IntentResult = { label: string; confidence: number; supportingPhrases: string[] };
export type SentimentResult = { score: number; label: 'negative' | 'neutral' | 'positive' };
export type AgentScore = { score: number; rating: 'poor' | 'fair' | 'good' | 'excellent'; notes: string[] };
export type CustomerFrustration = { score: number; level: 'low' | 'medium' | 'high'; signals: string[] };

export type IssueResult = {
  type: 'billing' | 'technical' | 'access' | 'routing' | 'escalation' | 'compliance' | 'general';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
};

export type TopicCluster = { topic: string; count: number; examples: string[] };

export type TranscriptAnalysis = {
  transcript: NormalizedTranscript;
  intents: IntentResult[];
  sentiment: SentimentResult;
  emotions: string[];
  issues: IssueResult[];
  escalationDetected: boolean;
  agentScore: AgentScore;
  customerFrustration: CustomerFrustration;
  topics: TopicCluster[];
  keywords: string[];
};

export type FlowMappingResult = {
  mappedSegments: Array<{ turnId: string; nodeId: string; reason: string }>;
  path: string[];
  deviations: string[];
  agentOverrides: string[];
  brokenSelfServicePaths: string[];
  repeatedLoops: string[];
  dropOffPoints: string[];
  unreachableSelfServiceNodes: string[];
};

export type IntelligenceReport = TranscriptAnalysis & {
  flowMapping: FlowMappingResult;
  recommendations: string[];
  summary: {
    transcriptId: string;
    channel: TranscriptChannel;
    primaryIntent: string;
    sentiment: SentimentResult['label'];
    topIssue: string;
    escalationDetected: boolean;
    agentScore: number;
    customerFrustration: number;
  };
};

type ParseInput = {
  text?: string;
  fileName?: string;
  mimeType?: string;
  channel?: TranscriptChannel;
};

const POSITIVE_WORDS = ['thanks', 'great', 'helpful', 'resolved', 'perfect', 'good', 'appreciate'];
const NEGATIVE_WORDS = ['angry', 'frustrated', 'upset', 'terrible', 'bad', 'issue', 'problem', 'not working', 'broken'];
const ESCALATION_WORDS = ['manager', 'supervisor', 'escalate', 'complaint', 'legal'];
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'you', 'your', 'have', 'this', 'from', 'are', 'was', 'can', 'please',
  'about', 'into', 'they', 'their', 'them', 'would', 'could', 'should', 'just', 'like', 'there', 'what', 'when',
]);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoTimestamp(input: string): string {
  const parsed = Date.parse(input);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  const hms = input.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    const hours = Number(hms[1]);
    const minutes = Number(hms[2]);
    const seconds = Number(hms[3] ?? '0');
    const base = new Date();
    base.setHours(hours, minutes, seconds, 0);
    return base.toISOString();
  }
  return new Date().toISOString();
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]+/g, ' ').trim();
}

function detectChannel(params: ParseInput): TranscriptChannel {
  if (params.channel) return params.channel;
  const source = (params.fileName ?? '').toLowerCase();
  const raw = (params.text ?? '').toLowerCase();
  if (source.endsWith('.eml') || raw.includes('subject:') || raw.includes('from:')) return 'email';
  if (source.includes('sms') || source.includes('message')) return 'sms';
  if (source.endsWith('.csv') || raw.includes('agent:') || raw.includes('customer:')) return 'chat';
  return 'voice';
}

function speakerFromText(prefix: string): TranscriptSpeaker {
  const value = prefix.toLowerCase();
  if (value.includes('agent') || value.includes('rep')) return 'agent';
  if (value.includes('customer') || value.includes('caller') || value.includes('client')) return 'customer';
  if (value.includes('system') || value.includes('ivr') || value.includes('bot')) return 'system';
  return 'unknown';
}

function parseCsv(text: string): TranscriptTurn[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const turns: TranscriptTurn[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((part) => part.trim());
    if (cols.length < 3) continue;
    const timestamp = toIsoTimestamp(cols[0]);
    const speaker = speakerFromText(cols[1]);
    const content = cleanText(cols.slice(2).join(','));
    if (!content) continue;
    turns.push({ id: makeId('turn'), timestamp, speaker, text: content });
  }
  return turns;
}

function parseJson(text: string): TranscriptTurn[] {
  const parsed = JSON.parse(text) as unknown;
  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed && Array.isArray((parsed as { turns?: unknown[] }).turns)
    ? (parsed as { turns: unknown[] }).turns
    : [];

  return records
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const timestamp = toIsoTimestamp(String(record.timestamp ?? record.time ?? new Date().toISOString()));
      const speaker = speakerFromText(String(record.speaker ?? record.role ?? 'unknown'));
      const textValue = cleanText(String(record.text ?? record.message ?? ''));
      if (!textValue) return null;
      return { id: makeId('turn'), timestamp, speaker, text: textValue } as TranscriptTurn;
    })
    .filter((value): value is TranscriptTurn => value !== null);
}

function parsePlainText(text: string): TranscriptTurn[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const turns: TranscriptTurn[] = [];

  lines.forEach((line) => {
    const timestampMatch = line.match(/^\[(.*?)\]\s*(.*)$/);
    const contentWithSpeaker = timestampMatch ? timestampMatch[2] : line;
    const speakerMatch = contentWithSpeaker.match(/^([A-Za-z ]+):\s*(.*)$/);
    const speaker = speakerMatch ? speakerFromText(speakerMatch[1]) : 'unknown';
    const content = cleanText(speakerMatch ? speakerMatch[2] : contentWithSpeaker);
    if (!content) return;
    turns.push({
      id: makeId('turn'),
      timestamp: timestampMatch ? toIsoTimestamp(timestampMatch[1]) : new Date().toISOString(),
      speaker,
      text: content,
    });
  });

  return turns;
}

export function ingestTranscript(input: ParseInput): NormalizedTranscript {
  const rawText = input.text?.trim() ?? '';
  if (!rawText) throw new Error('Transcript text is required');
  const channel = detectChannel(input);
  const lowerName = (input.fileName ?? '').toLowerCase();
  let turns: TranscriptTurn[] = [];
  if (lowerName.endsWith('.json') || rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
    try { turns = parseJson(rawText); } catch { turns = parsePlainText(rawText); }
  } else if (lowerName.endsWith('.csv') || rawText.split(/\r?\n/)[0].toLowerCase().includes('timestamp')) {
    turns = parseCsv(rawText);
  } else turns = parsePlainText(rawText);
  if (turns.length === 0) throw new Error('No transcript turns could be parsed');
  const sorted = [...turns].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  const startedAt = sorted[0].timestamp;
  const endedAt = sorted[sorted.length - 1].timestamp;
  return { id: makeId('transcript'), channel, sourceName: input.fileName, rawText, turns: sorted, metadata: { startedAt, endedAt, turnCount: sorted.length, customerTurns: sorted.filter(t=>t.speaker==='customer').length, agentTurns: sorted.filter(t=>t.speaker==='agent').length, durationSeconds: Math.max(0, Math.floor((Date.parse(endedAt)-Date.parse(startedAt))/1000)) } };
}

function scoreIntent(transcript: NormalizedTranscript, label: string, keywords: string[]): IntentResult { const phrases:string[]=[]; transcript.turns.forEach(turn=>{const line=turn.text.toLowerCase(); keywords.forEach(keyword=>{if(line.includes(keyword)&&phrases.length<6) phrases.push(turn.text);});}); return {label,confidence:Math.min(.98,Number((phrases.length/Math.max(2,transcript.turns.length/4)).toFixed(2))),supportingPhrases:phrases}; }
function analyzeSentiment(transcript: NormalizedTranscript): SentimentResult { const text=transcript.turns.map(t=>t.text.toLowerCase()).join(' '); let score=0; POSITIVE_WORDS.forEach(w=>{if(text.includes(w))score++}); NEGATIVE_WORDS.forEach(w=>{if(text.includes(w))score--}); const n=Math.max(-1,Math.min(1,score/8)); return {score:Number(n.toFixed(3)),label:n>.2?'positive':n<-.2?'negative':'neutral'}; }
function detectEmotions(transcript: NormalizedTranscript): string[] { const text=transcript.turns.map(t=>t.text.toLowerCase()).join(' '); const e:string[]=[]; if(/(frustrated|angry|upset|annoyed)/.test(text))e.push('frustration'); if(/(confused|unclear|not sure|don\'t understand)/.test(text))e.push('confusion'); if(/(thank you|appreciate|great service|helpful)/.test(text))e.push('gratitude'); if(/(urgent|immediately|asap)/.test(text))e.push('urgency'); if(!e.length)e.push('neutral'); return e; }
function detectIssues(transcript: NormalizedTranscript): IssueResult[] { const lines=transcript.turns.map(t=>t.text), lower=lines.join(' ').toLowerCase(), issues:IssueResult[]=[]; if(/(bill|charge|invoice|payment)/.test(lower))issues.push({type:'billing',severity:'medium',description:'Billing-related concern detected',evidence:lines.filter(l=>/bill|charge|payment/i.test(l)).slice(0,4)}); if(/(error|not working|bug|failed|crash|timeout)/.test(lower))issues.push({type:'technical',severity:'high',description:'Technical failure indicators present',evidence:lines.filter(l=>/error|failed|not working|timeout/i.test(l)).slice(0,4)}); if(/(cannot login|locked|password|verification|access)/.test(lower))issues.push({type:'access',severity:'medium',description:'Access/authentication issue detected',evidence:lines.filter(l=>/login|password|locked|access/i.test(l)).slice(0,4)}); if(/(transferred|loop|same menu|again and again|keeps sending)/.test(lower))issues.push({type:'routing',severity:'high',description:'Potential routing/IVR loop issue detected',evidence:lines.filter(l=>/transfer|loop|menu|again/i.test(l)).slice(0,4)}); if(ESCALATION_WORDS.some(w=>lower.includes(w)))issues.push({type:'escalation',severity:'high',description:'Escalation language identified',evidence:lines.filter(l=>/manager|supervisor|escalat|complaint|legal/i.test(l)).slice(0,4)}); if(!issues.length)issues.push({type:'general',severity:'low',description:'No major issue patterns detected',evidence:lines.slice(0,2)}); return issues; }
function computeAgentScore(transcript:NormalizedTranscript,sentiment:SentimentResult,issues:IssueResult[]):AgentScore{const a=transcript.turns.filter(t=>t.speaker==='agent').map(t=>t.text.toLowerCase()),notes:string[]=[];let score=72;const p=a.filter(l=>/please|thank you|happy to help|glad/i.test(l)).length,e=a.filter(l=>/sorry|understand|apologize|that sounds/i.test(l)).length,r=a.filter(l=>/resolved|fixed|completed|done|updated/i.test(l)).length;score+=p*2+e*2+r*3;if(issues.some(i=>i.severity==='high')){score-=8;notes.push('High-severity issue present in conversation.')}if(sentiment.label==='negative'){score-=5;notes.push('Conversation ended with negative sentiment.')}if(!p)notes.push('Low courtesy language from agent.');if(!e)notes.push('Low empathy signal detected.');if(r)notes.push('Resolution-oriented language present.');const b=Math.max(0,Math.min(100,score));return{score:b,rating:b>=90?'excellent':b>=75?'good':b>=60?'fair':'poor',notes};}
function computeCustomerFrustration(transcript:NormalizedTranscript,sentiment:SentimentResult,issues:IssueResult[]):CustomerFrustration{const c=transcript.turns.filter(t=>t.speaker==='customer').map(t=>t.text.toLowerCase()),signals:string[]=[];let score=20;const f=c.filter(l=>/frustrated|angry|upset|ridiculous|unacceptable/.test(l)).length,r=c.filter(l=>/again|still|already|third time|repeated/.test(l)).length,e=c.filter(l=>/manager|supervisor|complaint|cancel/.test(l)).length;score+=f*15+r*8+e*10;if(sentiment.label==='negative')score+=15;if(issues.some(i=>i.type==='technical'||i.type==='routing'))score+=10;if(f)signals.push('Explicit frustration language');if(r)signals.push('Repeated-contact indicators');if(e)signals.push('Escalation requests');if(!signals.length)signals.push('No strong frustration signals');const b=Math.max(0,Math.min(100,score));return{score:b,level:b>=70?'high':b>=40?'medium':'low',signals};}
function extractKeywords(transcript:NormalizedTranscript):string[]{const f=new Map<string,number>();transcript.turns.forEach(t=>t.text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).map(x=>x.trim()).filter(x=>x.length>3&&!STOPWORDS.has(x)).forEach(x=>f.set(x,(f.get(x)??0)+1)));return Array.from(f.entries()).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([x])=>x);}
function clusterTopics(transcript:NormalizedTranscript):TopicCluster[]{const c=[{topic:'Billing & Payments',matcher:/bill|invoice|payment|charge|refund/i},{topic:'Access & Authentication',matcher:/login|password|locked|access|verify/i},{topic:'Technical Support',matcher:/error|failed|bug|crash|timeout|not working/i},{topic:'Routing & Transfers',matcher:/transfer|queue|menu|route|agent/i},{topic:'Account Changes',matcher:/update|change|address|profile|plan/i}];const r:TopicCluster[]=[];c.forEach(x=>{const e=transcript.turns.map(t=>t.text).filter(t=>x.matcher.test(t)).slice(0,4);if(e.length)r.push({topic:x.topic,count:e.length,examples:e})});return r;}
export function analyzeTranscript(transcript:NormalizedTranscript):TranscriptAnalysis{const catalog=[{label:'Billing Support',keywords:['bill','charge','invoice','payment','refund']},{label:'Technical Support',keywords:['error','failed','not working','bug','timeout']},{label:'Account Access',keywords:['login','password','locked','verify','access']},{label:'Order/Status Inquiry',keywords:['status','order','update','tracking']},{label:'Escalation Request',keywords:['manager','supervisor','escalate','complaint']}];const intents=catalog.map(i=>scoreIntent(transcript,i.label,i.keywords)).filter(i=>i.confidence>0).sort((a,b)=>b.confidence-a.confidence).slice(0,5),sentiment=analyzeSentiment(transcript),issues=detectIssues(transcript);return{transcript,intents,sentiment,emotions:detectEmotions(transcript),issues,escalationDetected:issues.some(i=>i.type==='escalation'),agentScore:computeAgentScore(transcript,sentiment,issues),customerFrustration:computeCustomerFrustration(transcript,sentiment,issues),topics:clusterTopics(transcript),keywords:extractKeywords(transcript)};}
function nodeFromTurn(turn:TranscriptTurn){const t=turn.text.toLowerCase();if(/menu|option|press/.test(t))return{nodeId:'menu-main',reason:'Menu language detected'};if(/billing|invoice|charge|payment/.test(t))return{nodeId:'queue-billing',reason:'Billing keywords detected'};if(/tech|error|failed|not working|timeout/.test(t))return{nodeId:'queue-tech',reason:'Technical support keywords detected'};if(/agent|representative|transfer/.test(t))return{nodeId:'agent-handoff',reason:'Agent transfer language detected'};if(/after hours|closed|business hours/.test(t))return{nodeId:'after-hours',reason:'After-hours language detected'};if(/holiday/.test(t))return{nodeId:'holiday-route',reason:'Holiday language detected'};return{nodeId:'self-service',reason:'Default self-service segment'};}
export function mapTranscriptToFlow(transcript:NormalizedTranscript):FlowMappingResult{const mappedSegments=transcript.turns.map(turn=>{const m=nodeFromTurn(turn);return{turnId:turn.id,nodeId:m.nodeId,reason:m.reason}}),path=mappedSegments.map(s=>s.nodeId),deviations:string[]=[],agentOverrides:string[]=[],brokenSelfServicePaths:string[]=[],repeatedLoops:string[]=[],dropOffPoints:string[]=[];const start=path[0];if(start&&start!=='menu-main'&&start!=='self-service')deviations.push(`Conversation started at ${start} instead of standard menu entry.`);for(let i=1;i<path.length;i++){if(path[i]==='agent-handoff'&&path[i-1]!=='queue-tech'&&path[i-1]!=='queue-billing')agentOverrides.push(`Agent handoff occurred early at step ${i+1}.`);if(path[i]===path[i-1]&&path[i]!=='self-service')repeatedLoops.push(`Repeated node loop detected at ${path[i]} (step ${i+1}).`)}const raw=transcript.turns.map(t=>t.text.toLowerCase()).join(' ');if(/didn\'t work|still not working|same issue|again/.test(raw))brokenSelfServicePaths.push('Customer repeated unresolved issue after self-service steps.');const last=transcript.turns[transcript.turns.length-1];if(last&&/bye|disconnect|hang up|cancel/.test(last.text.toLowerCase())&&!/resolved|fixed|done/.test(raw))dropOffPoints.push(`Drop-off likely at ${mappedSegments[mappedSegments.length-1].nodeId}.`);const known=['menu-main','self-service','queue-billing','queue-tech','agent-handoff','after-hours','holiday-route'],used=new Set(path),unreachableSelfServiceNodes=known.filter(n=>n.startsWith('self')||n.includes('menu')).filter(n=>!used.has(n));return{mappedSegments,path,deviations,agentOverrides,brokenSelfServicePaths,repeatedLoops,dropOffPoints,unreachableSelfServiceNodes};}
export function generateIntelligenceReport(params:{transcript:NormalizedTranscript;analysis?:TranscriptAnalysis;flowMapping?:FlowMappingResult}):IntelligenceReport{const analysis=params.analysis??analyzeTranscript(params.transcript),flowMapping=params.flowMapping??mapTranscriptToFlow(params.transcript),recommendations:string[]=[];if(analysis.sentiment.label==='negative')recommendations.push('Review transcript for coaching opportunities to improve customer sentiment.');if(analysis.customerFrustration.level!=='low')recommendations.push('Escalate workflow review for frustration hot spots and tighten self-service resolution.');if(flowMapping.repeatedLoops.length)recommendations.push('Reduce loop conditions and add explicit escape routes in IVR logic.');if(flowMapping.brokenSelfServicePaths.length)recommendations.push('Improve self-service prompts and fallback routing to reduce handoffs.');if(analysis.issues.some(i=>i.type==='technical'))recommendations.push('Feed technical issues into troubleshooting and routing optimization modules.');if(analysis.agentScore.score<70)recommendations.push('Schedule targeted agent coaching for empathy and resolution language.');const primaryIntent=analysis.intents[0]?.label??'General Inquiry',topIssue=analysis.issues[0]?.description??'No major issues detected';return{...analysis,flowMapping,recommendations,summary:{transcriptId:analysis.transcript.id,channel:analysis.transcript.channel,primaryIntent,sentiment:analysis.sentiment.label,topIssue,escalationDetected:analysis.escalationDetected,agentScore:analysis.agentScore.score,customerFrustration:analysis.customerFrustration.score}};}
