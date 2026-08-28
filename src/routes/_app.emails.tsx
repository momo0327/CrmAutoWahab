import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyDrawer } from "@/components/CompanyDrawer";
import { Mail, Search, Trash2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { Company } from "@/lib/companies";

export const Route = createFileRoute("/_app/emails")({ component: EmailsPage });

type EmailRow = { id: string; name: string; email: string };

function EmailsPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  async function load() {
    setLoading(true);
    const PAGE = 1000;
    let all: EmailRow[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, email")
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

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const lq = q.toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(lq) || r.email.toLowerCase().includes(lq),
    );
  }, [rows, q]);

  // Keep indeterminate state on the select-all checkbox
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

  function getSelectedRows() {
    return rows.filter((r) => selectedIds.has(r.id));
  }

  function exportCSV() {
    const data = getSelectedRows();
    const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const lines = [["Company", "Email"].map(esc).join(",")];
    for (const r of data) lines.push([r.name, r.email].map(esc).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emails.csv";
    a.click();
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
                ref={exportBtnRef}
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-card text-sm hover:bg-muted"
              >
                <Download className="size-4" /> Export {selectedIds.size}
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 mt-1 z-50 w-44 rounded-md border bg-popover shadow-md overflow-hidden">
                    <button
                      onClick={() => { exportCSV(); setExportOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted text-left"
                    >
                      <FileText className="size-4 text-muted-foreground" /> Export as CSV
                    </button>
                    <button
                      onClick={() => { exportExcel(); setExportOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted text-left"
                    >
                      <FileSpreadsheet className="size-4 text-muted-foreground" /> Export as Excel
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={clearEmails}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-destructive/30 text-destructive text-sm hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Clear email {selectedIds.size}
            </button>
          </div>
        )}
      </header>

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

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
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
                <th className="text-left px-4 py-3 text-[11px] font-medium tracking-[0.18em] uppercase w-[50%]">Company</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium tracking-[0.18em] uppercase w-[50%]">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => openCompany(r.id)}
                >
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground text-sm">
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
                ? prev.map((r) => r.id === updated.id ? { id: updated.id, name: updated.name, email: updated.email! } : r)
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
