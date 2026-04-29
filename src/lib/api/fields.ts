// Frontend-only custom fields + form definitions. Persisted to localStorage.

export type FieldType = "text" | "textarea" | "number" | "select" | "multiselect" | "checkbox" | "date" | "url";

export type CustomField = {
  id: string;
  key: string; // machine-name, unique per org (e.g. "device_id")
  label: string;
  type: FieldType;
  helpText?: string;
  options?: string[]; // for select / multiselect
  required: boolean;
  showOnPortal: boolean; // visible in customer portal new-request form
  showOnAgent: boolean;  // visible in agent ticket sidebar
  // Conditional visibility (optional). Field shows only when:
  //   another field's value equals one of `equalsAny`.
  visibleWhen?: { fieldKey: string; equalsAny: string[] };
  createdAt: string;
};

export type FormDefinition = {
  id: string;
  name: string;
  // Which categories this form applies to. Empty = applies to all.
  categories: string[];
  // Ordered list of field keys (custom field keys + built-ins)
  fieldOrder: string[];
  // Fields required just for this form
  requiredKeys: string[];
  isDefault: boolean;
  createdAt: string;
};

const KEY = "lov.fields.v1";

type State = { fields: CustomField[]; forms: FormDefinition[] };

const seedFields: CustomField[] = [
  {
    id: "f-device",
    key: "device_id",
    label: "Device / Asset ID",
    type: "text",
    helpText: "Asset tag printed on the device sticker",
    required: false,
    showOnPortal: true,
    showOnAgent: true,
    createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
  },
  {
    id: "f-impact",
    key: "business_impact",
    label: "Business impact",
    type: "select",
    options: ["Just me", "My team", "Whole department", "Entire company"],
    required: true,
    showOnPortal: true,
    showOnAgent: true,
    createdAt: new Date(Date.now() - 20 * 86400_000).toISOString(),
  },
  {
    id: "f-locked",
    key: "account_locked",
    label: "Is your account locked out?",
    type: "checkbox",
    required: false,
    showOnPortal: true,
    showOnAgent: true,
    visibleWhen: { fieldKey: "category", equalsAny: ["Account", "Access"] },
    createdAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
  },
];

const seedForms: FormDefinition[] = [
  {
    id: "form-default",
    name: "Default request form",
    categories: [],
    fieldOrder: ["title", "category", "priority", "description", "device_id", "business_impact", "account_locked"],
    requiredKeys: ["title", "category", "description", "business_impact"],
    isDefault: true,
    createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
  },
];

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { fields: seedFields, forms: seedForms };
    return JSON.parse(raw);
  } catch {
    return { fields: seedFields, forms: seedForms };
  }
}
function write(s: State) { localStorage.setItem(KEY, JSON.stringify(s)); }

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Single-line text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL" },
];

// Built-in (non-custom) fields available to forms
export const BUILTIN_FIELDS = [
  { key: "title", label: "Title", type: "text" as FieldType },
  { key: "category", label: "Category", type: "select" as FieldType },
  { key: "priority", label: "Priority", type: "select" as FieldType },
  { key: "description", label: "Description", type: "textarea" as FieldType },
];

const BUILTIN_KEYS = new Set(BUILTIN_FIELDS.map(f => f.key));

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export const fieldsApi = {
  get: () => read(),
  saveField: (f: CustomField) => {
    const s = read();
    if (!f.key) f.key = slugify(f.label);
    s.fields = s.fields.find(x => x.id === f.id)
      ? s.fields.map(x => x.id === f.id ? f : x)
      : [...s.fields, f];
    write(s);
  },
  deleteField: (id: string) => {
    const s = read();
    const removed = s.fields.find(f => f.id === id);
    s.fields = s.fields.filter(f => f.id !== id);
    if (removed) {
      s.forms = s.forms.map(form => ({
        ...form,
        fieldOrder: form.fieldOrder.filter(k => k !== removed.key),
        requiredKeys: form.requiredKeys.filter(k => k !== removed.key),
      }));
    }
    write(s);
  },
  newField: (): CustomField => ({
    id: crypto.randomUUID(),
    key: "",
    label: "",
    type: "text",
    required: false,
    showOnPortal: true,
    showOnAgent: true,
    createdAt: new Date().toISOString(),
  }),
  saveForm: (f: FormDefinition) => {
    const s = read();
    s.forms = s.forms.find(x => x.id === f.id)
      ? s.forms.map(x => x.id === f.id ? f : x)
      : [...s.forms, f];
    write(s);
  },
  deleteForm: (id: string) => {
    const s = read();
    s.forms = s.forms.filter(f => f.id !== id);
    write(s);
  },
  newForm: (): FormDefinition => ({
    id: crypto.randomUUID(),
    name: "",
    categories: [],
    fieldOrder: ["title", "category", "priority", "description"],
    requiredKeys: ["title", "category", "description"],
    isDefault: false,
    createdAt: new Date().toISOString(),
  }),
  isBuiltin: (key: string) => BUILTIN_KEYS.has(key),
};
