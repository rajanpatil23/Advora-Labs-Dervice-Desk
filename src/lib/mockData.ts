import type {
  Agent, User, Ticket, Incident, KbArticle, ServiceRequest,
  ServiceRequestItem, SlaPolicy, LogEntry, Priority, TicketStatus, SlaState, Message, ActivityEvent
} from "./types";

// Deterministic PRNG so data is stable across renders
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20240501);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const colors = ["#6366f1","#f97316","#22c55e","#ec4899","#0ea5e9","#a855f7","#eab308","#14b8a6","#ef4444","#8b5cf6"];
const initialsOf = (name: string) => name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();

// --- Agents ---
const agentNames = [
  "Maya Chen","Jordan Reese","Aisha Patel","Diego Romero","Lin Park",
  "Noah Fischer","Priya Mehta","Sara Okafor","Theo Müller","Kenji Watanabe"
];
export const agents: Agent[] = agentNames.map((name, i) => ({
  id: `a${i+1}`,
  name,
  email: name.toLowerCase().replace(" ",".") + "@connecttly.io",
  avatarColor: colors[i % colors.length],
  initials: initialsOf(name),
  team: pick(["Tier 1","Tier 2","Network","Apps","Security"]),
  role: i === 0 ? "admin" : i === 1 ? "manager" : "agent",
  workload: 4 + Math.floor(rand()*18),
  resolved: 80 + Math.floor(rand()*220),
  avgResolution: 2 + Math.round(rand()*22*10)/10,
  online: rand() > 0.35,
  rating: 4 + Math.round(rand()*10)/10,
  joined: new Date(Date.now() - (200+Math.floor(rand()*800))*86400000).toISOString(),
}));

// --- Customers / Requesters ---
const customerNames = [
  "Eleanor Vance","Marcus Chen","Sofia Rossi","Hiroshi Tanaka","Olivia Brand","Jamal Khan",
  "Anya Volkov","Liam O'Connor","Zoe Martinez","Felix Bauer","Isabella Costa","Adrian Zhao",
  "Naomi Bennett","Rashid Al-Farsi","Camille Dupont","Owen Walsh","Greta Lindqvist","Mateo Silva"
];
const companies = ["Northwind Co","Globex Industries","Acme Cloud","Initech","Stark Labs","Wayne Group","Umbrella Health","Pied Piper","Hooli","Massive Dynamic"];
export const customers: User[] = customerNames.map((name, i) => ({
  id: `c${i+1}`,
  name,
  email: name.toLowerCase().replace(/[^\w]/g,"") + "@" + pick(["northwind","globex","acme","initech","stark"]) + ".com",
  avatarColor: colors[(i+3) % colors.length],
  initials: initialsOf(name),
  company: pick(companies),
  role: "requester",
  ticketsOpened: 1 + Math.floor(rand()*30),
  joined: new Date(Date.now() - (50+Math.floor(rand()*600))*86400000).toISOString(),
}));

// --- Tickets ---
const titles = [
  "VPN connection drops every few minutes",
  "Cannot reset Okta password",
  "Outlook calendar not syncing on mobile",
  "MacBook Pro requesting FileVault recovery key",
  "New laptop request — Engineering team",
  "Slack notifications not working after update",
  "Printer on 4F won't pick up jobs",
  "Salesforce dashboard loads blank page",
  "Zoom audio dropping during client calls",
  "Production database CPU spike",
  "Wi‑Fi disconnects on conference room AP",
  "GitHub SSO returns 401",
  "Need access to Confluence Marketing space",
  "PDF export missing logo on invoices",
  "MFA token not received by SMS",
  "Sandbox environment provisioning failure",
  "API rate limit exceeded on staging",
  "Phishing email reported by Sales team",
  "Disk almost full on build agent #3",
  "Employee offboarding — revoke access",
  "Two-factor backup codes regeneration",
  "New monitor request",
  "Browser crashes when opening Looker",
  "S3 bucket permissions request",
  "Onboard new contractor — Acme Cloud",
];
const categories = ["Network","Hardware","Access","Software","Email","Security","Cloud","Mobile"];
const tagPool = ["vpn","mac","windows","urgent","priority","client","wfh","mobile","security","onboarding","p1","login","sso","sla"];

const now = Date.now();
const hours = (h: number) => new Date(now - h*3600000).toISOString();

function buildMessages(authorAgent: Agent, requester: User, count: number): Message[] {
  const samples = [
    "Hi team, I started experiencing this issue this morning. Could you please take a look?",
    "Thanks for reporting. We're investigating now and will update shortly.",
    "Quick update — we identified the root cause and are deploying a fix.",
    "Could you confirm if the issue persists after restarting your machine?",
    "Yes, just tried that and it's still happening.",
    "I've escalated this to the network team for further analysis.",
    "Internal: noticed AP firmware mismatch — opening change request.",
    "All clear on our side now, can you verify?",
    "Confirmed — working perfectly. Thank you!",
  ];
  return range(count).map((i) => {
    const isReq = i % 2 === 0;
    return {
      id: `m${Math.floor(rand()*1e9)}`,
      authorId: isReq ? requester.id : authorAgent.id,
      authorName: isReq ? requester.name : authorAgent.name,
      authorRole: isReq ? "requester" : "agent",
      body: samples[(i + Math.floor(rand()*samples.length)) % samples.length],
      isInternal: !isReq && i > 2 && rand() > 0.7,
      createdAt: hours(48 - i*3 - Math.floor(rand()*2)),
    };
  });
}

function buildActivity(): ActivityEvent[] {
  const events: ActivityEvent[] = [
    { id: `e${Math.floor(rand()*1e9)}`, type: "created", text: "Ticket created from email channel", by: "System", at: hours(72) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "assigned", text: "Assigned to Maya Chen", by: "Auto-router", at: hours(70) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "priority", text: "Priority set to High", by: "Maya Chen", at: hours(68) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "comment", text: "Added internal note", by: "Diego Romero", at: hours(40) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "status", text: "Status changed to In Progress", by: "Maya Chen", at: hours(36) },
  ];
  return events;
}

const priorities: Priority[] = ["low","medium","high","critical"];
const statuses: TicketStatus[] = ["new","open","in_progress","on_hold","resolved","closed"];

export const tickets: Ticket[] = range(120).map((i) => {
  const agent = agents[Math.floor(rand()*agents.length)];
  const req = customers[Math.floor(rand()*customers.length)];
  const priority = pick(priorities);
  const status = pick(statuses);
  const created = hours(Math.floor(rand()*240));
  const dueOffset = priority === "critical" ? 4 : priority === "high" ? 12 : priority === "medium" ? 24 : 72;
  const due = new Date(new Date(created).getTime() + dueOffset*3600000).toISOString();
  const resp = new Date(new Date(created).getTime() + (dueOffset/4)*3600000).toISOString();
  const slaRoll = rand();
  const slaState: SlaState =
    status === "resolved" || status === "closed" ? "met" :
    slaRoll > 0.85 ? "breached" : slaRoll > 0.65 ? "at_risk" : "on_track";

  return {
    id: `t${i+1}`,
    number: `CN-${1000 + i}`,
    title: titles[i % titles.length],
    description: "User reported the issue via the support portal. Detailed reproduction steps are attached. Initial triage suggests an infrastructure-side root cause.",
    requesterId: req.id,
    assigneeId: rand() > 0.1 ? agent.id : undefined,
    priority,
    status,
    category: pick(categories),
    subcategory: pick(["Configuration","Access","Outage","Request","Incident"]),
    tags: range(2 + Math.floor(rand()*3)).map(() => pick(tagPool)).filter((v,idx,arr)=>arr.indexOf(v)===idx),
    createdAt: created,
    updatedAt: hours(Math.floor(rand()*40)),
    dueAt: due,
    responseDueAt: resp,
    firstResponseAt: rand() > 0.2 ? hours(Math.floor(rand()*60)) : undefined,
    resolvedAt: status === "resolved" || status === "closed" ? hours(Math.floor(rand()*30)) : undefined,
    slaState,
    channel: pick(["email","chat","portal","phone"]),
    messages: buildMessages(agent, req, 3 + Math.floor(rand()*5)),
    activity: buildActivity(),
    attachments: rand() > 0.6 ? [{ name: "screenshot.png", size: "412 KB" }, { name: "logs.txt", size: "12 KB" }] : [],
  };
});

// --- Incidents ---
export const incidents: Incident[] = range(14).map((i) => ({
  id: `i${i+1}`,
  number: `INC-${200+i}`,
  title: pick(["Auth service degraded","Database failover","CDN edge errors EU-West","Email delivery delays","Payment gateway timeouts","API latency spike"]),
  service: pick(["Auth Service","Database","CDN","Email Gateway","Payment API","Core API"]),
  impact: pick(["low","medium","high"]),
  urgency: pick(["low","medium","high"]),
  severity: pick([1,2,3,4]) as 1|2|3|4,
  status: pick(["investigating","identified","monitoring","resolved"]),
  escalation: Math.floor(rand()*3)+1,
  rootCause: rand() > 0.4 ? "Misconfigured load balancer health checks." : undefined,
  workaround: rand() > 0.5 ? "Force-route traffic to secondary region." : undefined,
  resolution: rand() > 0.6 ? "Rolled back deploy and validated." : undefined,
  createdAt: hours(Math.floor(rand()*200)),
  updatedAt: hours(Math.floor(rand()*40)),
  ownerId: agents[Math.floor(rand()*agents.length)].id,
  affected: 50 + Math.floor(rand()*5000),
  timeline: buildActivity(),
}));

// --- Service Requests ---
export const catalog: ServiceRequestItem[] = [
  { id: "sr1", catalog: "Hardware", title: "New Laptop", description: "Request a new laptop for an employee", icon: "Laptop", estimate: "3–5 days" },
  { id: "sr2", catalog: "Access", title: "Application Access", description: "Request access to a new application", icon: "Key", estimate: "1 day" },
  { id: "sr3", catalog: "Onboarding", title: "New Employee Setup", description: "Provision accounts and equipment", icon: "UserPlus", estimate: "5 days" },
  { id: "sr4", catalog: "Software", title: "Software License", description: "Order a software license", icon: "Package", estimate: "2 days" },
  { id: "sr5", catalog: "Cloud", title: "Cloud Sandbox", description: "Provision a sandbox environment", icon: "Cloud", estimate: "1 day" },
  { id: "sr6", catalog: "Mobile", title: "Mobile Device", description: "Request a corporate mobile device", icon: "Smartphone", estimate: "4 days" },
];

export const serviceRequests: ServiceRequest[] = range(22).map((i) => {
  const item = pick(catalog);
  const reqUser = pick(customers);
  const status = pick(["submitted","approval","fulfilling","completed","rejected"]) as ServiceRequest["status"];
  const stepNames = ["Submitted","Approval","Fulfillment","Completed"];
  const stepIdx = status === "submitted" ? 0 : status === "approval" ? 1 : status === "fulfilling" ? 2 : 3;
  return {
    id: `sreq${i+1}`,
    number: `REQ-${500+i}`,
    itemId: item.id,
    itemTitle: item.title,
    requesterId: reqUser.id,
    status,
    approver: pick(agents.slice(0,3)).name,
    createdAt: hours(Math.floor(rand()*240)),
    updatedAt: hours(Math.floor(rand()*30)),
    steps: stepNames.map((n, idx) => ({ name: n, status: idx < stepIdx ? "done" : idx === stepIdx ? "current" : "pending" })),
  };
});

// --- Knowledge Base ---
export const articles: KbArticle[] = [
  { id: "kb1", title: "How to reset your Okta password", category: "Access", excerpt: "Step-by-step guide to recover your account in 3 minutes.", body: "1. Visit the Okta portal...\n2. Click ‘Need help signing in’...\n3. Verify your identity...", views: 1245, helpful: 92, updatedAt: hours(72), author: "Maya Chen" },
  { id: "kb2", title: "Connecting to corporate VPN on macOS", category: "Network", excerpt: "Setup the GlobalProtect client and troubleshoot common issues.", body: "Install GlobalProtect from the company portal...", views: 980, helpful: 88, updatedAt: hours(120), author: "Jordan Reese" },
  { id: "kb3", title: "Requesting access to Confluence", category: "Access", excerpt: "Use the service catalog to request a new space.", body: "Navigate to Service Catalog → Application Access...", views: 612, helpful: 81, updatedAt: hours(48), author: "Aisha Patel" },
  { id: "kb4", title: "Troubleshooting Zoom audio issues", category: "Software", excerpt: "Five quick fixes when your audio drops mid-call.", body: "Check input device, restart audio service...", views: 1450, helpful: 94, updatedAt: hours(24), author: "Diego Romero" },
  { id: "kb5", title: "Reporting a phishing email", category: "Security", excerpt: "Forward suspicious emails to phishing@connecttly.io.", body: "Always include full headers when reporting...", views: 2100, helpful: 97, updatedAt: hours(8), author: "Sara Okafor" },
  { id: "kb6", title: "MFA: regenerating backup codes", category: "Security", excerpt: "Generate new one-time codes from your account settings.", body: "Sign in to your account → Security → MFA...", views: 540, helpful: 85, updatedAt: hours(200), author: "Lin Park" },
  { id: "kb7", title: "Onboarding checklist for new hires", category: "Onboarding", excerpt: "Everything IT needs to provision on day one.", body: "Hardware, accounts, training...", views: 880, helpful: 90, updatedAt: hours(15), author: "Theo Müller" },
  { id: "kb8", title: "Provisioning a sandbox environment", category: "Cloud", excerpt: "Submit a request via the catalog and get a sandbox in hours.", body: "Open the Service Catalog and select Cloud Sandbox...", views: 410, helpful: 78, updatedAt: hours(180), author: "Kenji Watanabe" },
];

// --- SLA Policies ---
export const slaPolicies: SlaPolicy[] = [
  { id: "sla1", name: "Critical — P1", priority: "critical", responseMins: 15, resolutionMins: 240, active: true },
  { id: "sla2", name: "High — P2", priority: "high", responseMins: 60, resolutionMins: 720, active: true },
  { id: "sla3", name: "Medium — P3", priority: "medium", responseMins: 240, resolutionMins: 1440, active: true },
  { id: "sla4", name: "Low — P4", priority: "low", responseMins: 480, resolutionMins: 4320, active: true },
];

// --- Activity Log ---
export const logs: LogEntry[] = range(40).map((i) => ({
  id: `lg${i+1}`,
  at: hours(Math.floor(rand()*200)),
  actor: pick(agents).name,
  action: pick(["created","updated","assigned","resolved","commented","escalated","closed","reopened"]),
  target: pick(["CN-1004","CN-1011","INC-203","CN-1078","REQ-505","CN-1099"]),
  type: pick(["ticket","incident","user","sla","system"]),
}));

// Demo current user
export const currentUser: Agent = agents[0];
