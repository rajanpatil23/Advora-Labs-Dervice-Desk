import type {
  Agent, User, Ticket, Incident, KbArticle, ServiceRequest,
  ServiceRequestItem, SlaPolicy, LogEntry, Priority, TicketStatus, SlaState, Message, ActivityEvent
} from "./types";
import { SEED_ORGS, SEED_TEAMS } from "./api/seedUsers";

// Deterministic PRNG so data is stable across renders
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const colors = ["#6366f1","#f97316","#22c55e","#ec4899","#0ea5e9","#a855f7","#eab308","#14b8a6","#ef4444","#8b5cf6"];
const initialsOf = (name: string) => name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const now = Date.now();
const hours = (h: number) => new Date(now - h*3600000).toISOString();

// Per-org data builder ------------------------------------------------------
interface OrgSeed {
  agents: Agent[];
  customers: User[];
  tickets: Ticket[];
  incidents: Incident[];
  serviceRequests: ServiceRequest[];
  catalog: ServiceRequestItem[];
  articles: KbArticle[];
  slaPolicies: SlaPolicy[];
  logs: LogEntry[];
}

function buildOrgData(orgId: string, seed: number): OrgSeed {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const orgTeams = SEED_TEAMS.filter(t => t.org_id === orgId);

  // Agents
  const agentNames = [
    "Maya Chen","Jordan Reese","Aisha Patel","Diego Romero","Lin Park",
    "Noah Fischer","Priya Mehta","Sara Okafor","Theo Müller","Kenji Watanabe"
  ];
  const orgDomain = SEED_ORGS.find(o => o.id === orgId)?.domain ?? "example.com";
  const agents: Agent[] = agentNames.map((name, i) => ({
    id: `a_${orgId}_${i+1}`,
    org_id: orgId,
    name,
    email: name.toLowerCase().replace(" ",".") + "@" + orgDomain,
    avatarColor: colors[i % colors.length],
    initials: initialsOf(name),
    team: pick(orgTeams)?.name,
    role: i === 0 ? "admin" : i === 1 ? "manager" : i < 4 ? "agent" : "resolver",
    workload: 4 + Math.floor(rand()*18),
    resolved: 80 + Math.floor(rand()*220),
    avgResolution: 2 + Math.round(rand()*22*10)/10,
    online: rand() > 0.35,
    rating: 4 + Math.round(rand()*10)/10,
    joined: new Date(Date.now() - (200+Math.floor(rand()*800))*86400000).toISOString(),
  }));

  // Customers
  const customerNames = [
    "Eleanor Vance","Marcus Chen","Sofia Rossi","Hiroshi Tanaka","Olivia Brand","Jamal Khan",
    "Anya Volkov","Liam O'Connor","Zoe Martinez","Felix Bauer","Isabella Costa","Adrian Zhao",
    "Naomi Bennett","Rashid Al-Farsi","Camille Dupont","Owen Walsh"
  ];
  const companies = ["Northwind Co","Stark Labs","Wayne Group","Umbrella Health","Pied Piper","Hooli","Massive Dynamic"];
  const customers: User[] = customerNames.map((name, i) => ({
    id: `c_${orgId}_${i+1}`,
    org_id: orgId,
    name,
    email: name.toLowerCase().replace(/[^\w]/g,"") + "@" + pick(["client","customer","partner"]) + ".com",
    avatarColor: colors[(i+3) % colors.length],
    initials: initialsOf(name),
    company: pick(companies),
    role: "requester",
    ticketsOpened: 1 + Math.floor(rand()*30),
    joined: new Date(Date.now() - (50+Math.floor(rand()*600))*86400000).toISOString(),
  }));

  // Tickets - org-flavoured titles
  const titlesByOrg: Record<string, string[]> = {
    org_acme: [
      "VPN connection drops every few minutes","Cannot reset Okta password","Slack notifications not working",
      "GitHub SSO returns 401","API rate limit exceeded on staging","Production database CPU spike",
      "Salesforce dashboard loads blank page","Sandbox environment provisioning failure","S3 bucket permissions request",
      "New laptop request - Engineering team","Disk almost full on build agent","Two-factor backup codes regeneration",
      "MFA token not received by SMS","Outlook calendar not syncing on mobile","Phishing email reported by Sales team",
    ],
    org_globex: [
      "PLC controller offline on line 3","Forklift telemetry not reporting","Plant Wi-Fi outage in warehouse B",
      "Barcode scanner pairing issue","SCADA dashboard latency spike","Inventory sync failure with ERP",
      "Badge reader at gate 2 not responding","Conveyor sensor calibration request","Production server reboot scheduling",
      "VPN access for new contractor","Printer on shop floor offline","Shift handover report missing data",
    ],
    org_initech: [
      "EHR slow during morning rounds","Patient portal login failure","Lab results not appearing in chart",
      "Pharmacy printer jamming repeatedly","Telehealth video call dropping","HIPAA audit log export request",
      "Tablet not connecting to clinical Wi-Fi","Imaging viewer crashing on radiology station","Nurse call system delays",
      "Single sign-on broken for residents","Pager sync issue overnight","E-prescribe certificate renewal",
    ],
  };
  const titles = titlesByOrg[orgId] ?? titlesByOrg.org_acme;

  const categoriesByOrg: Record<string, string[]> = {
    org_acme:    ["Network","Software","Access","Security","Cloud","Mobile"],
    org_globex:  ["Network","Hardware","OT/SCADA","Access","Facilities","Mobile"],
    org_initech: ["Clinical Apps","Network","Hardware","Access","Compliance","Mobile"],
  };
  const categories = categoriesByOrg[orgId];
  const tagPool = ["urgent","priority","client","wfh","mobile","security","onboarding","p1","login","sso","sla"];

  const buildMessages = (authorAgent: Agent, requester: User, count: number): Message[] => {
    const samples = [
      "Hi team, I started experiencing this issue this morning. Could you take a look?",
      "Thanks for reporting. We're investigating now and will update shortly.",
      "Quick update - we identified the root cause and are deploying a fix.",
      "Could you confirm if the issue persists after restarting?",
      "Yes, just tried that and it's still happening.",
      "I've escalated this to the network team for further analysis.",
      "Internal: noticed a firmware mismatch - opening change request.",
      "All clear on our side now, can you verify?",
      "Confirmed - working perfectly. Thank you!",
    ];
    return range(count).map((i) => {
      const isReq = i % 2 === 0;
      return {
        id: `m_${orgId}_${Math.floor(rand()*1e9)}`,
        authorId: isReq ? requester.id : authorAgent.id,
        authorName: isReq ? requester.name : authorAgent.name,
        authorRole: isReq ? "requester" : "agent",
        body: samples[(i + Math.floor(rand()*samples.length)) % samples.length],
        isInternal: !isReq && i > 2 && rand() > 0.7,
        createdAt: hours(48 - i*3 - Math.floor(rand()*2)),
      };
    });
  };

  const buildActivity = (): ActivityEvent[] => [
    { id: `e${Math.floor(rand()*1e9)}`, type: "created", text: "Ticket created from email channel", by: "System", at: hours(72) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "assigned", text: `Assigned to ${agents[0].name}`, by: "Auto-router", at: hours(70) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "priority", text: "Priority set to High", by: agents[0].name, at: hours(68) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "comment", text: "Added internal note", by: agents[3]?.name ?? agents[0].name, at: hours(40) },
    { id: `e${Math.floor(rand()*1e9)}`, type: "status", text: "Status changed to In Progress", by: agents[0].name, at: hours(36) },
  ];

  const priorities: Priority[] = ["low","medium","high","critical"];
  const statuses: TicketStatus[] = ["new","open","in_progress","on_hold","resolved","closed"];

  const tickets: Ticket[] = range(80).map((i) => {
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
      id: `t_${orgId}_${i+1}`,
      org_id: orgId,
      number: `${orgId === "org_acme" ? "AC" : orgId === "org_globex" ? "GX" : "IH"}-${1000 + i}`,
      title: titles[i % titles.length],
      description: "User reported the issue via the support portal. Detailed reproduction steps are attached.",
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

  const incidents: Incident[] = range(8).map((i) => ({
    id: `i_${orgId}_${i+1}`,
    org_id: orgId,
    number: `INC-${(orgId === "org_acme" ? 200 : orgId === "org_globex" ? 400 : 600)+i}`,
    title: pick([
      "Auth service degraded","Database failover","CDN edge errors","Email delivery delays","API latency spike",
      "Production outage in region","Storage cluster slow"
    ]),
    service: pick(["Auth Service","Database","CDN","Email Gateway","Core API","Storage"]),
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

  const catalog: ServiceRequestItem[] = [
    { id: `sr_${orgId}_1`, org_id: orgId, catalog: "Hardware", title: "New Laptop", description: "Request a new laptop for an employee", icon: "Laptop", estimate: "3-5 days" },
    { id: `sr_${orgId}_2`, org_id: orgId, catalog: "Access", title: "Application Access", description: "Request access to a new application", icon: "Key", estimate: "1 day" },
    { id: `sr_${orgId}_3`, org_id: orgId, catalog: "Onboarding", title: "New Employee Setup", description: "Provision accounts and equipment", icon: "UserPlus", estimate: "5 days" },
    { id: `sr_${orgId}_4`, org_id: orgId, catalog: "Software", title: "Software License", description: "Order a software license", icon: "Package", estimate: "2 days" },
    { id: `sr_${orgId}_5`, org_id: orgId, catalog: "Cloud", title: "Cloud Sandbox", description: "Provision a sandbox environment", icon: "Cloud", estimate: "1 day" },
  ];

  const serviceRequests: ServiceRequest[] = range(15).map((i) => {
    const item = pick(catalog);
    const reqUser = pick(customers);
    const status = pick(["submitted","approval","fulfilling","completed","rejected"]) as ServiceRequest["status"];
    const stepNames = ["Submitted","Approval","Fulfillment","Completed"];
    const stepIdx = status === "submitted" ? 0 : status === "approval" ? 1 : status === "fulfilling" ? 2 : 3;
    return {
      id: `sreq_${orgId}_${i+1}`,
      org_id: orgId,
      number: `REQ-${(orgId === "org_acme" ? 500 : orgId === "org_globex" ? 700 : 900)+i}`,
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

  const articleTitlesByOrg: Record<string, string[]> = {
    org_acme:    ["Reset your Okta password","Connect to corporate VPN on macOS","Request access to Confluence","Troubleshoot Zoom audio","Report a phishing email"],
    org_globex:  ["Reset SCADA workstation login","Connect handheld scanner to Wi-Fi","Request shop floor printer access","Report a safety incident","Plant Wi-Fi best practices"],
    org_initech: ["Reset EHR password","Set up clinical tablet","Request access to PACS imaging","Report a HIPAA concern","Telehealth setup guide"],
  };
  const articles: KbArticle[] = (articleTitlesByOrg[orgId] ?? []).map((title, i) => ({
    id: `kb_${orgId}_${i+1}`,
    org_id: orgId,
    title,
    category: pick(categories),
    excerpt: "Step-by-step guide for the most common workflow.",
    body: "1. Open the relevant portal...\n2. Follow the prompts...\n3. Verify the result.",
    views: 200 + Math.floor(rand()*2000),
    helpful: 70 + Math.floor(rand()*30),
    updatedAt: hours(Math.floor(rand()*200)),
    author: pick(agents).name,
  }));

  const slaPolicies: SlaPolicy[] = [
    { id: `sla_${orgId}_1`, org_id: orgId, name: "Critical - P1", priority: "critical", responseMins: 15, resolutionMins: 240, active: true },
    { id: `sla_${orgId}_2`, org_id: orgId, name: "High - P2",     priority: "high",     responseMins: 60, resolutionMins: 720, active: true },
    { id: `sla_${orgId}_3`, org_id: orgId, name: "Medium - P3",   priority: "medium",   responseMins: 240, resolutionMins: 1440, active: true },
    { id: `sla_${orgId}_4`, org_id: orgId, name: "Low - P4",      priority: "low",      responseMins: 480, resolutionMins: 4320, active: true },
  ];

  const logs: LogEntry[] = range(30).map((i) => ({
    id: `lg_${orgId}_${i+1}`,
    org_id: orgId,
    at: hours(Math.floor(rand()*200)),
    actor: pick(agents).name,
    action: pick(["created","updated","assigned","resolved","commented","escalated","closed","reopened"]),
    target: pick(tickets.slice(0,10)).number,
    type: pick(["ticket","incident","user","sla","system"]),
  }));

  return { agents, customers, tickets, incidents, serviceRequests, catalog, articles, slaPolicies, logs };
}

// Build all orgs ------------------------------------------------------------
const seedsByOrg: Record<string, OrgSeed> = {
  org_acme:    buildOrgData("org_acme",    20240501),
  org_globex:  buildOrgData("org_globex",  20240602),
  org_initech: buildOrgData("org_initech", 20240703),
};

// Aggregated, org-tagged exports - store filters by current org
export const agents:          Agent[]              = SEED_ORGS.flatMap(o => seedsByOrg[o.id].agents);
export const customers:       User[]               = SEED_ORGS.flatMap(o => seedsByOrg[o.id].customers);
export const tickets:         Ticket[]             = SEED_ORGS.flatMap(o => seedsByOrg[o.id].tickets);
export const incidents:       Incident[]           = SEED_ORGS.flatMap(o => seedsByOrg[o.id].incidents);
export const serviceRequests: ServiceRequest[]     = SEED_ORGS.flatMap(o => seedsByOrg[o.id].serviceRequests);
export const catalog:         ServiceRequestItem[] = SEED_ORGS.flatMap(o => seedsByOrg[o.id].catalog);
export const articles:        KbArticle[]          = SEED_ORGS.flatMap(o => seedsByOrg[o.id].articles);
export const slaPolicies:     SlaPolicy[]          = SEED_ORGS.flatMap(o => seedsByOrg[o.id].slaPolicies);
export const logs:            LogEntry[]           = SEED_ORGS.flatMap(o => seedsByOrg[o.id].logs);

// Demo current user - first agent of first org (used by store mutations as "me")
export const currentUser: Agent = seedsByOrg.org_acme.agents[0];
