import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAllEmailsFn } from "@/lib/admin.functions";
import { Mail, Search, Download, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_admin/admin/emails")({ component: AdminEmailsPage });

type EmailRow = { id: string; name: string; email: string; employee: string };

function AdminEmailsPage() {
  const fetchEmails = useServerFn(getAllEmailsFn);
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEmails({}).then((data) => {
      setRows(data as EmailRow[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const lq = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(lq) ||
        r.email.toLowerCase().includes(lq) ||
        r.employee.toLowerCase().includes(lq),
    );
  }, [rows, q]);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    const some = filtered.some((r) => selectedIds.has(r.id));
    const all = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
    el.indeterminate = some && !all;
  }, [filtered, selectedIds]);

  function getSelectedRows() {
    return rows.filter((r) => selectedIds.has(r.id));
  }

  function exportCSV() {
    const data = getSelectedRows();
    const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const lines = [["Company", "Email", "Employee"].map(esc).join(",")];
    for (const r of data) lines.push([r.name, r.email, r.employee].map(esc).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emails.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const data = getSelectedRows().map((r) => ({ Company: r.name, Email: r.email, Employee: r.employee }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Emails");
    XLSX.writeFile(wb, "emails.xlsx");
  }

  return (
    <div className="p-8 space-y-6 w-full">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-wide uppercase">Emails</h1>
          <p className="text-sm text-muted-foreground mt-1">All emails collected across every employee.</p>
        </div>
        {selectedIds.size > 0 && (
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
        )}
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by company, email or employee…"
          className="w-full max-w-md pl-9 pr-3 py-2 rounded-md border bg-card text-sm"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
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
                <th className="text-left px-4 py-3 text-[11px] font-medium tracking-[0.18em] uppercase w-[30%]">Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-6 w-10">
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
                  <td className="px-4 py-6 text-muted-foreground truncate">{r.employee}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    {rows.length === 0 ? "No emails collected yet." : "No results match your search."}
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
    </div>
  );
}
