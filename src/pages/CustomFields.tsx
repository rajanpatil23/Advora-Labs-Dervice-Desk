import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ListChecks, Plus, Trash2, FormInput, GripVertical, ArrowUp, ArrowDown, Eye } from "lucide-react";
import {
  BUILTIN_FIELDS, FIELD_TYPES, fieldsApi,
  type CustomField, type FormDefinition,
} from "@/lib/api/fields";

export default function CustomFields() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const [state, setState] = useState(fieldsApi.get());
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const refresh = () => setState(fieldsApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <ListChecks className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Custom Fields & Forms</h1>
          <p className="text-sm text-muted-foreground">Capture exactly the data your team needs on every ticket.</p>
        </div>
      </header>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Fields ({state.fields.length})</TabsTrigger>
          <TabsTrigger value="forms">Forms ({state.forms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditingField(fieldsApi.newField())}>
              <Plus className="h-4 w-4 mr-1" /> New field
            </Button>
          </div>
          {state.fields.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No custom fields yet.</CardContent></Card>
          ) : (
            state.fields.map(f => (
              <Card key={f.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  <button onClick={() => setEditingField({ ...f })} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{f.label}</span>
                      <Badge variant="outline" className="text-xs font-mono">{f.key}</Badge>
                      <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                      {f.required && <Badge variant="destructive" className="text-xs">required</Badge>}
                      {f.visibleWhen && <Badge variant="outline" className="text-xs">conditional</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.helpText || "-"}
                      <span className="ml-2">
                        {f.showOnPortal && "· portal"}
                        {f.showOnAgent && " · agent"}
                      </span>
                    </p>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => { fieldsApi.deleteField(f.id); refresh(); toast.success("Field deleted"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="forms" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditingForm(fieldsApi.newForm())}>
              <Plus className="h-4 w-4 mr-1" /> New form
            </Button>
          </div>
          {state.forms.map(form => (
            <Card key={form.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <FormInput className="h-5 w-5 text-muted-foreground" />
                <button onClick={() => setEditingForm({ ...form })} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{form.name || "Untitled form"}</span>
                    {form.isDefault && <Badge variant="default" className="text-xs">default</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.fieldOrder.length} fields · {form.categories.length === 0 ? "all categories" : form.categories.join(", ")}
                  </p>
                </button>
                {!form.isDefault && (
                  <Button variant="ghost" size="icon" onClick={() => { fieldsApi.deleteForm(form.id); refresh(); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <FieldEditor field={editingField} allFields={state.fields} onClose={() => setEditingField(null)} onSaved={refresh} />
      <FormEditor form={editingForm} customFields={state.fields} onClose={() => setEditingForm(null)} onSaved={refresh} />
    </div>
  );
}

function FieldEditor({ field, allFields, onClose, onSaved }: {
  field: CustomField | null;
  allFields: CustomField[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CustomField | null>(field);
  const [optionsText, setOptionsText] = useState("");
  useEffect(() => {
    setDraft(field);
    setOptionsText(field?.options?.join("\n") ?? "");
  }, [field]);
  if (!draft) return null;
  const update = (p: Partial<CustomField>) => setDraft({ ...draft, ...p });

  const needsOptions = draft.type === "select" || draft.type === "multiselect";

  const save = () => {
    if (!draft.label.trim()) { toast.error("Label required"); return; }
    if (needsOptions) {
      const opts = optionsText.split("\n").map(s => s.trim()).filter(Boolean);
      if (opts.length === 0) { toast.error("At least one option required"); return; }
      draft.options = opts;
    }
    fieldsApi.saveField(draft);
    toast.success("Field saved");
    onSaved(); onClose();
  };

  return (
    <Sheet open={!!field} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{field?.label ? "Edit field" : "New field"}</SheetTitle>
          <SheetDescription>Custom data captured on tickets.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={draft.label} onChange={(e) => update({ label: e.target.value })} placeholder="Device / Asset ID" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Field key</Label>
              <Input value={draft.key} onChange={(e) => update({ key: e.target.value })} placeholder="device_id" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => update({ type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Help text (optional)</Label>
            <Input value={draft.helpText ?? ""} onChange={(e) => update({ helpText: e.target.value })} placeholder="Shown below the field" />
          </div>
          {needsOptions && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea rows={5} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={"Option A\nOption B"} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <Toggle label="Required" checked={draft.required} onChange={(v) => update({ required: v })} />
            <Toggle label="Show on customer portal" checked={draft.showOnPortal} onChange={(v) => update({ showOnPortal: v })} />
            <Toggle label="Show in agent ticket view" checked={draft.showOnAgent} onChange={(v) => update({ showOnAgent: v })} />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="m-0">Conditional visibility</Label>
              <Switch
                checked={!!draft.visibleWhen}
                onCheckedChange={(v) => update({ visibleWhen: v ? { fieldKey: "category", equalsAny: [] } : undefined })}
              />
            </div>
            {draft.visibleWhen && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Show this field only when…</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={draft.visibleWhen.fieldKey}
                    onValueChange={(v) => update({ visibleWhen: { ...draft.visibleWhen!, fieldKey: v } })}
                  >
                    <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      {allFields.filter(f => f.id !== draft.id && (f.type === "select" || f.type === "checkbox")).map(f => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="value1, value2"
                    value={draft.visibleWhen.equalsAny.join(", ")}
                    onChange={(e) => update({
                      visibleWhen: { ...draft.visibleWhen!, equalsAny: e.target.value.split(",").map(s => s.trim()).filter(Boolean) },
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <SheetFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save field</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FormEditor({ form, customFields, onClose, onSaved }: {
  form: FormDefinition | null;
  customFields: CustomField[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<FormDefinition | null>(form);
  useEffect(() => { setDraft(form); }, [form]);
  if (!draft) return null;
  const update = (p: Partial<FormDefinition>) => setDraft({ ...draft, ...p });

  const allAvailable = [
    ...BUILTIN_FIELDS.map(f => ({ key: f.key, label: f.label, builtin: true })),
    ...customFields.map(f => ({ key: f.key, label: f.label, builtin: false })),
  ];
  const inForm = new Set(draft.fieldOrder);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...draft.fieldOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ fieldOrder: next });
  };

  const toggleRequired = (key: string) => {
    update({
      requiredKeys: draft.requiredKeys.includes(key)
        ? draft.requiredKeys.filter(k => k !== key)
        : [...draft.requiredKeys, key],
    });
  };

  const remove = (key: string) => {
    update({
      fieldOrder: draft.fieldOrder.filter(k => k !== key),
      requiredKeys: draft.requiredKeys.filter(k => k !== key),
    });
  };

  const add = (key: string) => {
    if (inForm.has(key)) return;
    update({ fieldOrder: [...draft.fieldOrder, key] });
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error("Name required"); return; }
    fieldsApi.saveForm(draft);
    toast.success("Form saved");
    onSaved(); onClose();
  };

  return (
    <Sheet open={!!form} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{form?.name ? "Edit form" : "New form"}</SheetTitle>
          <SheetDescription>Define what fields appear on the request form.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Hardware request" />
          </div>
          <div className="space-y-2">
            <Label>Applies to categories (comma-separated, blank = all)</Label>
            <Input
              value={draft.categories.join(", ")}
              onChange={(e) => update({ categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="Hardware, Network"
            />
          </div>

          <div className="space-y-2">
            <Label>Fields in this form</Label>
            <Card>
              <CardContent className="p-2 space-y-1">
                {draft.fieldOrder.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3 text-center">No fields. Add some below.</p>
                )}
                {draft.fieldOrder.map((k, i) => {
                  const meta = allAvailable.find(a => a.key === k);
                  return (
                    <div key={k} className="flex items-center gap-2 rounded-md border bg-card p-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{meta?.label ?? k}</span>
                          <Badge variant="outline" className="text-xs font-mono">{k}</Badge>
                          {meta?.builtin && <Badge variant="secondary" className="text-xs">built-in</Badge>}
                        </div>
                      </div>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Checkbox checked={draft.requiredKeys.includes(k)} onCheckedChange={() => toggleRequired(k)} />
                        required
                      </label>
                      <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === draft.fieldOrder.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(k)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label>Add field</Label>
            <div className="flex flex-wrap gap-2">
              {allAvailable.filter(a => !inForm.has(a.key)).map(a => (
                <Button key={a.key} variant="outline" size="sm" onClick={() => add(a.key)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {a.label}
                  {a.builtin && <span className="ml-1 text-xs text-muted-foreground">(built-in)</span>}
                </Button>
              ))}
              {allAvailable.filter(a => !inForm.has(a.key)).length === 0 && (
                <p className="text-xs text-muted-foreground">All available fields are added.</p>
              )}
            </div>
          </div>

          <Toggle label="Set as default form" checked={draft.isDefault} onChange={(v) => update({ isDefault: v })} />

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> Preview
            </p>
            <FormPreview form={draft} customFields={customFields} />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save form</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FormPreview({ form, customFields }: { form: FormDefinition; customFields: CustomField[] }) {
  return (
    <div className="mt-3 space-y-3">
      {form.fieldOrder.map(key => {
        const builtin = BUILTIN_FIELDS.find(b => b.key === key);
        const custom = customFields.find(c => c.key === key);
        const label = builtin?.label ?? custom?.label ?? key;
        const type = builtin?.type ?? custom?.type ?? "text";
        const required = form.requiredKeys.includes(key) || (custom?.required ?? false);
        return (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
            {type === "textarea"
              ? <Textarea disabled rows={2} placeholder={`Enter ${label.toLowerCase()}`} />
              : type === "select"
                ? <Select disabled><SelectTrigger><SelectValue placeholder={`Choose ${label.toLowerCase()}`} /></SelectTrigger></Select>
                : type === "checkbox"
                  ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox disabled /> {label}</div>
                  : <Input disabled placeholder={`Enter ${label.toLowerCase()}`} type={type === "number" ? "number" : type === "date" ? "date" : "text"} />}
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
