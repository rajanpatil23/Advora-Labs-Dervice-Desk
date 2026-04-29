// Frontend-only CSAT surveys & responses. Persisted to localStorage.

export type SurveyTrigger = "on_resolved" | "on_closed" | "manual";
export type SurveyScale = "csat_5" | "csat_3" | "nps";

export type Survey = {
  id: string;
  name: string;
  trigger: SurveyTrigger;
  scale: SurveyScale;
  question: string;
  followUp?: string;
  enabled: boolean;
  createdAt: string;
};

export type SurveyResponse = {
  id: string;
  surveyId: string;
  ticketId: string;
  ticketNumber: string;
  agentId?: string;
  agentName?: string;
  score: number; // 1-5 or 0-10 for NPS
  comment?: string;
  submittedAt: string;
};

const KEY = "lov.csat.v1";

type State = { surveys: Survey[]; responses: SurveyResponse[] };

const seedSurvey: Survey = {
  id: "sv-default",
  name: "Default post-resolution survey",
  trigger: "on_resolved",
  scale: "csat_5",
  question: "How would you rate your support experience?",
  followUp: "Tell us what we could do better (optional)",
  enabled: true,
  createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
};

function seedResponses(): SurveyResponse[] {
  const agents = [
    { id: "a1", name: "Sarah Chen" },
    { id: "a2", name: "Marcus Reed" },
    { id: "a3", name: "Priya Patel" },
    { id: "a4", name: "Diego Alvarez" },
  ];
  const comments = [
    "Quick and helpful, thanks!", "Resolved on first contact.", "Took a while but got there.",
    "Great communication throughout.", "Felt rushed, more empathy would help.",
    undefined, "Perfect - issue solved instantly.", undefined, "Good experience overall.",
  ];
  return Array.from({ length: 24 }, (_, i) => {
    const agent = agents[i % agents.length];
    const score = Math.random() < 0.7 ? 5 : Math.random() < 0.6 ? 4 : Math.random() < 0.5 ? 3 : Math.random() < 0.5 ? 2 : 1;
    return {
      id: `r-${i}`,
      surveyId: "sv-default",
      ticketId: `t-${i}`,
      ticketNumber: `TKT-${1000 + i}`,
      agentId: agent.id,
      agentName: agent.name,
      score,
      comment: comments[i % comments.length],
      submittedAt: new Date(Date.now() - i * 86400_000 * 0.5).toISOString(),
    };
  });
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { surveys: [seedSurvey], responses: seedResponses() };
    return JSON.parse(raw);
  } catch {
    return { surveys: [seedSurvey], responses: seedResponses() };
  }
}
function write(s: State) { localStorage.setItem(KEY, JSON.stringify(s)); }

export const csatApi = {
  get: () => read(),
  saveSurvey: (s: Survey) => {
    const st = read();
    st.surveys = st.surveys.find(x => x.id === s.id)
      ? st.surveys.map(x => x.id === s.id ? s : x)
      : [s, ...st.surveys];
    write(st);
  },
  toggleSurvey: (id: string) => {
    const st = read();
    st.surveys = st.surveys.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    write(st);
  },
  deleteSurvey: (id: string) => {
    const st = read();
    st.surveys = st.surveys.filter(s => s.id !== id);
    st.responses = st.responses.filter(r => r.surveyId !== id);
    write(st);
  },
  newSurvey: (): Survey => ({
    id: crypto.randomUUID(),
    name: "",
    trigger: "on_resolved",
    scale: "csat_5",
    question: "How would you rate your support experience?",
    enabled: true,
    createdAt: new Date().toISOString(),
  }),
  submitResponse: (input: Omit<SurveyResponse, "id" | "submittedAt">) => {
    const st = read();
    const r: SurveyResponse = { ...input, id: crypto.randomUUID(), submittedAt: new Date().toISOString() };
    st.responses = [r, ...st.responses];
    write(st);
    return r;
  },
};

// ---- metrics helpers ----
export function csatPercent(responses: SurveyResponse[]): number {
  if (responses.length === 0) return 0;
  const positive = responses.filter(r => r.score >= 4).length;
  return (positive / responses.length) * 100;
}

export function npsScore(responses: SurveyResponse[]): number {
  if (responses.length === 0) return 0;
  const promoters = responses.filter(r => r.score >= 9).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  return ((promoters - detractors) / responses.length) * 100;
}
