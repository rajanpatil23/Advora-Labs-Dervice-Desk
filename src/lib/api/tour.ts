// Frontend-only product tour state. Persisted to localStorage per user.

export type TourStep = {
  id: string;
  title: string;
  description: string;
  // CSS selector for the element to spotlight; if absent, shows centered modal.
  target?: string;
  // Where to place the popover relative to the target.
  placement?: "top" | "bottom" | "left" | "right" | "center";
  // Optional path to navigate to before showing this step.
  route?: string;
};

export type Tour = {
  id: string;
  name: string;
  steps: TourStep[];
};

export const PRODUCT_TOUR: Tour = {
  id: "product_tour_v1",
  name: "Welcome tour",
  steps: [
    {
      id: "welcome",
      title: "Welcome to Advora 👋",
      description:
        "Let's take a 60-second tour of the most important parts of your support workspace. You can exit anytime.",
      placement: "center",
      route: "/app/dashboard",
    },
    {
      id: "search",
      title: "Universal search",
      description:
        "Find any ticket, person, or article instantly. Press ⌘K (or Ctrl+K) anywhere to open the command palette.",
      target: "#global-search",
      placement: "bottom",
    },
    {
      id: "tickets",
      title: "Tickets",
      description:
        "Your main workspace. Filter by queue, search, and bulk-update tickets. Press R while a ticket is open to reply.",
      target: "a[href='/app/tickets']",
      placement: "right",
      route: "/app/tickets",
    },
    {
      id: "views",
      title: "Saved views",
      description:
        "Pin filter presets like 'SLA at risk' or 'Assigned to me'. Share them with your team or keep them private.",
      target: "a[href='/app/views']",
      placement: "right",
    },
    {
      id: "automations",
      title: "Automations",
      description:
        "Build no-code rules that auto-assign, escalate, or close tickets based on conditions you choose.",
      target: "a[href='/app/automations']",
      placement: "right",
    },
    {
      id: "shortcuts",
      title: "Keyboard shortcuts",
      description:
        "Press ? at any time to see all shortcuts. Use G then T for tickets, G then I for incidents, and more.",
      placement: "center",
    },
    {
      id: "done",
      title: "You're all set 🎉",
      description:
        "Explore the sidebar to discover SLA policies, CSAT, branding, and integrations. You can re-run this tour from your profile menu anytime.",
      placement: "center",
    },
  ],
};

const KEY = (userId: string, tourId: string) => `lov.tour.${tourId}.${userId}`;

export const tourApi = {
  hasCompleted(userId: string, tourId = PRODUCT_TOUR.id): boolean {
    return localStorage.getItem(KEY(userId, tourId)) === "done";
  },
  markComplete(userId: string, tourId = PRODUCT_TOUR.id) {
    localStorage.setItem(KEY(userId, tourId), "done");
    try { window.dispatchEvent(new Event("lov:tour-completed")); } catch {}
  },
  reset(userId: string, tourId = PRODUCT_TOUR.id) {
    localStorage.removeItem(KEY(userId, tourId));
  },
};
