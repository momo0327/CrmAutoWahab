import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { CompanyDrawer } from "@/components/CompanyDrawer";
import { Mail, Search, Trash2, Download, FileText, FileSpreadsheet, Plus, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { Company } from "@/lib/companies";

export const Route = createFileRoute("/_app/emails")({ component: EmailsPage });

const CATEGORY_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#14b8a6", label: "Teal" },
];

type EmailCategory = { id: string; label: string; color: string };
type EmailRow = { id: string; name: string; email: string; email_category_id: string | null };

function EmailsPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<EmailCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");

  // Create category form
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0].value);

  const [q, setQ] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  async function loadCategories() {
    const { data } = await supabase
      .from("email_categories" as any)
      .select("id, label, color")
      .order("created_at", { ascending: true });
    if (data) setCategories(data as unknown as EmailCategory[]);
  }

  async function load() {
    setLoading(true);
    const PAGE = 1000;
    let all: EmailRow[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, email, email_category_id")
        .not("email", "is", null)
        .range(from, from + PAGE - 1);
      if (error) { toast.error(error.message); break; }
      const page = ((data ?? []) as any[]).filter((r) => r.email) as EmailRow[];
      all = all.concat(page);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    setRows(all);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
    load();
  }, []);

  async function createCategory() {
    if (!newLabel.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("email_categories" as any)
      .insert({ label: newLabel.trim(), color: newColor, user_id: user.id })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setCategories((prev) => [...prev, data as unknown as EmailCategory]);
    setNewLabel("");
    setNewColor(CATEGORY_COLORS[0].value);
    setCreating(false);
    toast.success("Category created");
  }

  async function deleteCategory(id: string) {
    await supabase.from("email_categories" as any).delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setRows((prev) => prev.map((r) => r.email_category_id === id ? { ...r, email_category_id: null } : r));
    if (categoryFilter === id) setCategoryFilter("all");
  }

  async function assignCategory(companyId: string, categoryId: string | null) {
    const { error } = await supabase
      .from("companies")
      .update({ email_category_id: categoryId } as any)
      .eq("id", companyId);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => r.id === companyId ? { ...r, email_category_id: categoryId } : r));
  }

  const filtered = useMemo(() => {
    let result = rows;
    if (categoryFilter !== "all") result = result.filter((r) => r.email_category_id === categoryFilter);
    if (q) {
      const lq = q.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(lq) || r.email.toLowerCase().includes(lq));
    }
    return result;
  }, [rows, q, categoryFilter]);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    const some = filtered.some((r) => selectedIds.has(r.id));
    const all = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
    el.indeterminate = some && !all;
  }, [filtered, selectedIds]);

  async function openCompany(id: string) {
    const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
    if (error) return toast.error(error.message);
    setSelectedCompany(data as unknown as Company);
  }

  function getSelectedRows() { return rows.filter((r) => selectedIds.has(r.id)); }

  function exportCSV() {
    const data = getSelectedRows();
    const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const lines = [["Company", "Email"].map(esc).join(",")];
    for (const r of data) lines.push([r.name, r.email].map(esc).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "emails.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const data = getSelectedRows().map((r) => ({ Company: r.name, Email: r.email }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Emails");
    XLSX.writeFile(wb, "emails.xlsx");
  }

  async function clearEmails() {
    if (!confirm(`Clear email from ${selectedIds.size} ${selectedIds.size === 1 ? "company" : "companies"}?`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("companies").update({ email: null }).in("id", ids);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    toast.success(`Cleared ${ids.length} email${ids.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="p-8 space-y-6 w-full">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-wide uppercase">Emails</h1>
          <p className="text-sm text-muted-foreground mt-1">All company emails in one place.</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-card text-sm hover:bg-muted"
              >
                <Download className="size-4" /> Export {selectedIds.size}
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 mt-1 z-50 w-44 rounded-md border bg-popover shadow-md overflow-hidden">
                    <button onClick={() => { exportCSV(); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted text-left">
                      <FileText className="size-4 text-muted-foreground" /> Export as CSV
                    </button>
                    <button onClick={() => { exportExcel(); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted text-left">
                      <FileSpreadsheet className="size-4 text-muted-foreground" /> Export as Excel
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={clearEmails} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-destructive/30 text-destructive text-sm hover:bg-destructive/10">
              <Trash2 className="size-4" /> Clear email {selectedIds.size}
            </button>
          </div>
        )}
      </header>

      {/* Category filter pills + create button */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* All pill */}
          <button
            onClick={() => setCategoryFilter("all")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              categoryFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
            }`}
          >
            All
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${categoryFilter === "all" ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
              {rows.length}
            </span>
          </button>

          {/* Category pills */}
          {categories.map((cat) => {
            const count = rows.filter((r) => r.email_category_id === cat.id).length;
            const active = categoryFilter === cat.id;
            return (
              <div key={cat.id} className="relative group inline-flex">
                <button
                  onClick={() => setCategoryFilter(active ? "all" : cat.id)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition pr-7"
                  style={active
                    ? { borderColor: cat.color, backgroundColor: cat.color, color: "#fff" }
                    : { borderColor: cat.color + "55", color: cat.color, backgroundColor: cat.color + "18" }
                  }
                >
                  <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? "#fff" : cat.color }} />
                  {cat.label}
                  <span className="rounded-full px-1.5 py-0.5 text-xs" style={{ backgroundColor: active ? "rgba(255,255,255,0.2)" : cat.color + "30" }}>
                    {count}
                  </span>
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 size-4 flex items-center justify-center rounded-full hover:bg-black/20 transition-opacity"
                  title="Delete category"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            );
          })}

          {/* Create category button / form */}
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <Plus className="size-3.5" /> Create category
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-sm">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") setCreating(false); }}
                placeholder="Category name…"
                className="text-sm bg-transparent outline-none w-36"
              />
              <div className="flex gap-1">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewColor(c.value)}
                    className="size-4 rounded-full border-2 transition-all shrink-0"
                    style={{
                      backgroundColor: c.value,
                      borderColor: newColor === c.value ? "white" : "transparent",
                      boxShadow: newColor === c.value ? `0 0 0 2px ${c.value}` : "none",
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              <button
                onClick={createCategory}
                disabled={!newLabel.trim()}
                className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                Save
              </button>
              <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company or email…"
            className="w-full max-w-md pl-9 pr-3 py-2 rounded-md border bg-card text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full min-w-[580px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filtered.map((r) => r.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="size-4 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium tracking-[0.18em] uppercase w-[35%]">Company</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium tracking-[0.18em] uppercase w-[35%]">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium tracking-[0.18em] uppercase w-[30%]">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => {
                const cat = categories.find((c) => c.id === r.email_category_id);
                return (
                  <tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openCompany(r.id)}>
                    <td className="px-4 py-6 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(r.id);
                            else n.delete(r.id);
                            return n;
                          });
                        }}
                        className="size-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-6">
                      <div className="font-medium truncate">{r.name}</div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{r.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6" onClick={(e) => e.stopPropagation()}>
                      <CategoryPicker
                        categories={categories}
                        value={r.email_category_id}
                        onChange={(catId) => assignCategory(r.id, catId)}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    {rows.length === 0 ? "No emails added yet." : "No results match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && !loading && (
        <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} emails</p>
      )}

      {selectedCompany && (
        <CompanyDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onCompanyChange={(updated) => {
            setSelectedCompany(updated);
            setRows((prev) =>
              updated.email
                ? prev.map((r) => r.id === updated.id ? { ...r, name: updated.name, email: updated.email! } : r)
                : prev.filter((r) => r.id !== updated.id),
            );
          }}
          onCompanyDeleted={(id) => {
            setSelectedCompany(null);
            setRows((prev) => prev.filter((r) => r.id !== id));
          }}
        />
      )}
    </div>
  );
}

// ─── Category picker inline dropdown ─────────────────────────────────────────

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: EmailCategory[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const cat = categories.find((c) => c.id === value);
  const MENU_H = 180;

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const openUp = rect.bottom + MENU_H > window.innerHeight;
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        openUp,
      });
    }
    setOpen((o) => !o);
  }

  return (
    <div>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors hover:opacity-80"
        style={cat
          ? { borderColor: cat.color + "55", color: cat.color, backgroundColor: cat.color + "18" }
          : undefined
        }
      >
        {cat ? (
          <>
            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            {cat.label}
          </>
        ) : (
          <span className="text-muted-foreground">+ Assign</span>
        )}
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-44 rounded-md border bg-popover shadow-md overflow-hidden"
            style={pos.openUp
              ? { bottom: window.innerHeight - pos.top, left: pos.left }
              : { top: pos.top, left: pos.left }
            }
          >
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              >
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                {c.label}
                {value === c.id && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </button>
            ))}
            {value && (
              <>
                <div className="border-t" />
                <button
                  onClick={() => { onChange(null); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left text-muted-foreground"
                >
                  <X className="size-3.5" /> Remove category
                </button>
              </>
            )}
            {categories.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No categories yet.</p>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
