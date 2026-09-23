import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Plus, Search, X, Pencil, Trash2, Copy, ChevronDown, ChevronUp,
  Image as ImageIcon, Loader2, Check, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/valuations")({ component: ValuationsPage });

// ─── Types ────────────────────────────────────────────────────────────────────

type Valuation = {
  id: string;
  user_id: string;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
  axle_config: string | null;
  year: number | null;
  mileage: number | null;
  body_builder: string | null;
  capacity: string | null;
  equipment: string | null;
  valuation_price: number | null;
  valuation_date: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  sale_price: number | null;
  sale_date: string | null;
  notes: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
};

type FormData = Omit<Valuation, "id" | "user_id" | "created_at" | "updated_at">;

const EMPTY: FormData = {
  brand: "", model: "", vehicle_type: "", axle_config: "",
  year: null, mileage: null, body_builder: "", capacity: "",
  equipment: "", valuation_price: null, valuation_date: "",
  purchase_price: null, purchase_date: "", sale_price: null,
  sale_date: "", notes: "", images: [],
};

type SortKey = "valuation_date" | "created_at" | "valuation_price" | "year" | "mileage";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("sv-SE");
}

function imageUrl(path: string) {
  return supabase.storage.from("valuation-images").getPublicUrl(path).data.publicUrl;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ValuationsPage() {
  const { user } = useAuth();
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Valuation | null>(null);
  const [detail, setDetail] = useState<Valuation | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [fBrand, setFBrand] = useState("");
  const [fType, setFType] = useState("");
  const [fAxle, setFAxle] = useState("");
  const [fBuilder, setFBuilder] = useState("");
  const [fYearMin, setFYearMin] = useState("");
  const [fYearMax, setFYearMax] = useState("");
  const [fMileMin, setFMileMin] = useState("");
  const [fMileMax, setFMileMax] = useState("");
  const [fPriceMin, setFPriceMin] = useState("");
  const [fPriceMax, setFPriceMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("valuation_date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("valuations" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setValuations((data ?? []) as unknown as Valuation[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Derived filter options
  const brands = useMemo(() => Array.from(new Set(valuations.map((v) => v.brand).filter(Boolean) as string[])).sort(), [valuations]);
  const types = useMemo(() => Array.from(new Set(valuations.map((v) => v.vehicle_type).filter(Boolean) as string[])).sort(), [valuations]);
  const axles = useMemo(() => Array.from(new Set(valuations.map((v) => v.axle_config).filter(Boolean) as string[])).sort(), [valuations]);
  const builders = useMemo(() => Array.from(new Set(valuations.map((v) => v.body_builder).filter(Boolean) as string[])).sort(), [valuations]);

  const filtered = useMemo(() => {
    let list = valuations.filter((v) => {
      if (fBrand && v.brand?.toLowerCase() !== fBrand.toLowerCase()) return false;
      if (fType && v.vehicle_type?.toLowerCase() !== fType.toLowerCase()) return false;
      if (fAxle && v.axle_config?.toLowerCase() !== fAxle.toLowerCase()) return false;
      if (fBuilder && v.body_builder?.toLowerCase() !== fBuilder.toLowerCase()) return false;
      if (fYearMin && (v.year ?? 0) < parseInt(fYearMin)) return false;
      if (fYearMax && (v.year ?? 9999) > parseInt(fYearMax)) return false;
      if (fMileMin && (v.mileage ?? 0) < parseInt(fMileMin)) return false;
      if (fMileMax && (v.mileage ?? Infinity) > parseInt(fMileMax)) return false;
      if (fPriceMin && (v.valuation_price ?? 0) < parseInt(fPriceMin)) return false;
      if (fPriceMax && (v.valuation_price ?? Infinity) > parseInt(fPriceMax)) return false;
      if (q) {
        const ql = q.toLowerCase();
        const hay = [v.brand, v.model, v.vehicle_type, v.axle_config, v.body_builder, v.equipment, v.notes, String(v.year ?? "")].join(" ").toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
      const bv = b[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (sortDir === "asc" ? 1 : -1);
    });

    return list;
  }, [valuations, q, fBrand, fType, fAxle, fBuilder, fYearMin, fYearMax, fMileMin, fMileMax, fPriceMin, fPriceMax, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(v: Valuation) { setEditing(v); setDetail(null); setModalOpen(true); }

  function copyValuation(v: Valuation) {
    const copy: FormData = {
      brand: v.brand, model: v.model, vehicle_type: v.vehicle_type,
      axle_config: v.axle_config, year: v.year, mileage: v.mileage,
      body_builder: v.body_builder, capacity: v.capacity, equipment: v.equipment,
      valuation_price: v.valuation_price, valuation_date: new Date().toISOString().slice(0, 10),
      purchase_price: null, purchase_date: "", sale_price: null, sale_date: "",
      notes: v.notes, images: [],
    };
    setEditing({ ...copy, id: "__copy__", user_id: "", created_at: "", updated_at: "" });
    setDetail(null);
    setModalOpen(true);
  }

  async function deleteValuation(v: Valuation) {
    if (!confirm(`Delete valuation for ${v.brand ?? ""} ${v.model ?? ""}?`)) return;
    const { error } = await supabase.from("valuations" as any).delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    setValuations((prev) => prev.filter((x) => x.id !== v.id));
    if (detail?.id === v.id) setDetail(null);
    toast.success("Valuation deleted");
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    const Icon = active ? (sortDir === "desc" ? ChevronDown : ChevronUp) : ChevronsUpDown;
    return (
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] uppercase transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        {label} <Icon className="size-3" />
      </button>
    );
  }

  const hasFilters = !!(fBrand || fType || fAxle || fBuilder || fYearMin || fYearMax || fMileMin || fMileMax || fPriceMin || fPriceMax);

  return (
    <div className="p-8 space-y-6 w-full">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-wide uppercase">Värderingar</h1>
          <p className="text-sm text-muted-foreground mt-1">{valuations.length} värderingar totalt</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
        >
          <Plus className="size-4" /> Ny värdering
        </button>
      </header>

      {/* Search + filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sök märke, modell, typ, utrustning…"
              className="w-full pl-9 pr-3 py-2.5 rounded-full border bg-card text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full border text-sm transition-colors ${hasFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
          >
            Filter {hasFilters ? `(${[fBrand, fType, fAxle, fBuilder, fYearMin || fYearMax, fMileMin || fMileMax, fPriceMin || fPriceMax].filter(Boolean).length})` : ""}
            <ChevronDown className={`size-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          {hasFilters && (
            <button
              onClick={() => { setFBrand(""); setFType(""); setFAxle(""); setFBuilder(""); setFYearMin(""); setFYearMax(""); setFMileMin(""); setFMileMax(""); setFPriceMin(""); setFPriceMax(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Rensa filter
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="rounded-xl border bg-card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Märke</label>
              <select value={fBrand} onChange={(e) => setFBrand(e.target.value)} className="w-full text-sm px-2 py-1.5 rounded-md border bg-background">
                <option value="">Alla</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fordonstyp</label>
              <select value={fType} onChange={(e) => setFType(e.target.value)} className="w-full text-sm px-2 py-1.5 rounded-md border bg-background">
                <option value="">Alla</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Axelkonfiguration</label>
              <select value={fAxle} onChange={(e) => setFAxle(e.target.value)} className="w-full text-sm px-2 py-1.5 rounded-md border bg-background">
                <option value="">Alla</option>
                {axles.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Påbyggare</label>
              <select value={fBuilder} onChange={(e) => setFBuilder(e.target.value)} className="w-full text-sm px-2 py-1.5 rounded-md border bg-background">
                <option value="">Alla</option>
                {builders.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Årsmodell</label>
              <div className="flex gap-1 items-center">
                <input type="number" value={fYearMin} onChange={(e) => setFYearMin(e.target.value)} placeholder="Från" className="w-full text-sm px-2 py-1.5 rounded-md border bg-background" />
                <span className="text-muted-foreground">–</span>
                <input type="number" value={fYearMax} onChange={(e) => setFYearMax(e.target.value)} placeholder="Till" className="w-full text-sm px-2 py-1.5 rounded-md border bg-background" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Miltal (mil)</label>
              <div className="flex gap-1 items-center">
                <input type="number" value={fMileMin} onChange={(e) => setFMileMin(e.target.value)} placeholder="Min" className="w-full text-sm px-2 py-1.5 rounded-md border bg-background" />
                <span className="text-muted-foreground">–</span>
                <input type="number" value={fMileMax} onChange={(e) => setFMileMax(e.target.value)} placeholder="Max" className="w-full text-sm px-2 py-1.5 rounded-md border bg-background" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Värderingspris (kr)</label>
              <div className="flex gap-1 items-center">
                <input type="number" value={fPriceMin} onChange={(e) => setFPriceMin(e.target.value)} placeholder="Min" className="w-full text-sm px-2 py-1.5 rounded-md border bg-background" />
                <span className="text-muted-foreground">–</span>
                <input type="number" value={fPriceMax} onChange={(e) => setFPriceMax(e.target.value)} placeholder="Max" className="w-full text-sm px-2 py-1.5 rounded-md border bg-background" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sort row */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-muted-foreground">{filtered.length} resultat · Sortera:</span>
        <SortBtn k="valuation_date" label="Datum" />
        <SortBtn k="year" label="År" />
        <SortBtn k="mileage" label="Miltal" />
        <SortBtn k="valuation_price" label="Pris" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-12 justify-center">
          <Loader2 className="size-4 animate-spin" /> Laddar…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm">
          {valuations.length === 0 ? 'Inga värderingar än. Klicka "Ny värdering" för att börja.' : "Inga värderingar matchar dina filter."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => (
            <ValuationCard
              key={v.id}
              v={v}
              onClick={() => setDetail(v)}
              onEdit={() => openEdit(v)}
              onCopy={() => copyValuation(v)}
              onDelete={() => deleteValuation(v)}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <ValuationDetail
          v={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onCopy={() => copyValuation(detail)}
          onDelete={() => deleteValuation(detail)}
          onUpdated={(updated) => {
            setValuations((prev) => prev.map((x) => x.id === updated.id ? updated : x));
            setDetail(updated);
          }}
        />
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <ValuationModal
          initial={editing}
          userId={user?.id ?? ""}
          onClose={() => setModalOpen(false)}
          onSaved={(saved) => {
            setValuations((prev) => {
              const exists = prev.find((x) => x.id === saved.id);
              return exists ? prev.map((x) => x.id === saved.id ? saved : x) : [saved, ...prev];
            });
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Valuation Card ───────────────────────────────────────────────────────────

function ValuationCard({ v, onClick, onEdit, onCopy, onDelete }: {
  v: Valuation;
  onClick: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const thumb = v.images[0] ? imageUrl(v.images[0]) : null;
  return (
    <div
      className="flex gap-4 bg-card border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="shrink-0 size-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-lg truncate">
              {[v.brand, v.model].filter(Boolean).join(" ") || "Okänt fordon"}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {v.vehicle_type && <span>{v.vehicle_type}</span>}
              {v.axle_config && <span>{v.axle_config}</span>}
              {v.year && <span>{v.year}</span>}
              {v.mileage != null && <span>{fmt(v.mileage)} mil</span>}
              {v.body_builder && <span>{v.body_builder}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            {v.valuation_price != null && (
              <div className="font-semibold text-sm">{fmt(v.valuation_price)} kr</div>
            )}
            {v.valuation_date && (
              <div className="text-xs text-muted-foreground">{new Date(v.valuation_date).toLocaleDateString("sv-SE")}</div>
            )}
          </div>
        </div>
        {(v.purchase_price != null || v.sale_price != null) && (
          <div className="flex gap-3 mt-1.5 text-xs">
            {v.purchase_price != null && (
              <span className="text-info">Inköp: {fmt(v.purchase_price)} kr</span>
            )}
            {v.sale_price != null && (
              <span className="text-success">Försäljning: {fmt(v.sale_price)} kr</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onEdit} className="size-7 inline-flex items-center justify-center rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
        <button onClick={onCopy} className="size-7 inline-flex items-center justify-center rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Copy className="size-3.5" /></button>
        <button onClick={onDelete} className="size-7 inline-flex items-center justify-center rounded-md border hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ValuationDetail({ v, onClose, onEdit, onCopy, onDelete, onUpdated }: {
  v: Valuation;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onUpdated: (v: Valuation) => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState(v.purchase_price != null ? String(v.purchase_price) : "");
  const [purchaseDate, setPurchaseDate] = useState(v.purchase_date ?? "");
  const [salePrice, setSalePrice] = useState(v.sale_price != null ? String(v.sale_price) : "");
  const [saleDate, setSaleDate] = useState(v.sale_date ?? "");

  async function savePurchase() {
    setSavingPurchase(true);
    const { data, error } = await supabase.from("valuations" as any)
      .update({ purchase_price: purchasePrice ? parseInt(purchasePrice) : null, purchase_date: purchaseDate || null })
      .eq("id", v.id).select().single();
    setSavingPurchase(false);
    if (error) return toast.error(error.message);
    onUpdated(data as unknown as Valuation);
    toast.success("Inköp sparat");
  }

  async function saveSale() {
    setSavingSale(true);
    const { data, error } = await supabase.from("valuations" as any)
      .update({ sale_price: salePrice ? parseInt(salePrice) : null, sale_date: saleDate || null })
      .eq("id", v.id).select().single();
    setSavingSale(false);
    if (error) return toast.error(error.message);
    onUpdated(data as unknown as Valuation);
    toast.success("Försäljning sparat");
  }

  const margin = v.purchase_price != null && v.sale_price != null ? v.sale_price - v.purchase_price : null;
  const valuationDiff = v.purchase_price != null && v.valuation_price != null ? v.purchase_price - v.valuation_price : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-background shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl truncate">{[v.brand, v.model].filter(Boolean).join(" ") || "Okänt fordon"}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted"><Pencil className="size-3.5" /> Redigera</button>
            <button onClick={onCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted"><Copy className="size-3.5" /> Kopiera</button>
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive/30 text-destructive text-sm hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
            <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded-md border hover:bg-muted"><X className="size-4" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Images */}
          {v.images.length > 0 && (
            <div className="space-y-2">
              <img src={imageUrl(v.images[imgIdx])} alt="" className="w-full aspect-video object-cover rounded-xl border" />
              {v.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {v.images.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)} className={`shrink-0 size-16 rounded-lg overflow-hidden border-2 transition-colors ${i === imgIdx ? "border-primary" : "border-transparent"}`}>
                      <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Specs */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Fordonsuppgifter</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Märke" value={v.brand} />
              <Field label="Modell" value={v.model} />
              <Field label="Fordonstyp/påbyggnad" value={v.vehicle_type} />
              <Field label="Axelkonfiguration" value={v.axle_config} />
              <Field label="Årsmodell" value={v.year?.toString()} />
              <Field label="Miltal" value={v.mileage != null ? `${fmt(v.mileage)} mil` : null} />
              <Field label="Påbyggare" value={v.body_builder} />
              <Field label="Kapacitet" value={v.capacity} />
              {v.equipment && <div className="col-span-2"><Field label="Utrustning" value={v.equipment} /></div>}
            </dl>
          </section>

          {/* Valuation */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Värdering</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Värderat inköpspris" value={v.valuation_price != null ? `${fmt(v.valuation_price)} kr` : null} />
              <Field label="Datum för värdering" value={v.valuation_date ? new Date(v.valuation_date).toLocaleDateString("sv-SE") : null} />
            </dl>
          </section>

          {/* Purchase */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Faktiskt inköp</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Inköpspris (kr)</label>
                <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="—" className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Inköpsdatum</label>
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
            </div>
            <button onClick={savePurchase} disabled={savingPurchase} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-50">
              {savingPurchase ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Spara inköp
            </button>
            {valuationDiff != null && (
              <p className={`mt-2 text-xs ${valuationDiff > 0 ? "text-destructive" : "text-success"}`}>
                {valuationDiff > 0 ? `Betalade ${fmt(valuationDiff)} kr mer än värderat` : `Betalade ${fmt(Math.abs(valuationDiff))} kr mindre än värderat`}
              </p>
            )}
          </section>

          {/* Sale */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Försäljning</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Försäljningspris (kr)</label>
                <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="—" className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Försäljningsdatum</label>
                <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
            </div>
            <button onClick={saveSale} disabled={savingSale} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-50">
              {savingSale ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Spara försäljning
            </button>
            {margin != null && (
              <p className={`mt-2 text-xs ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                {margin >= 0 ? `Marginal: +${fmt(margin)} kr` : `Förlust: ${fmt(margin)} kr`}
              </p>
            )}
          </section>

          {/* Notes */}
          {v.notes && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Anteckningar</h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{v.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

function ValuationModal({ initial, userId, onClose, onSaved }: {
  initial: Valuation | null;
  userId: string;
  onClose: () => void;
  onSaved: (v: Valuation) => void;
}) {
  const isCopy = initial?.id === "__copy__";
  const isEdit = !!initial && !isCopy;

  const [form, setForm] = useState<FormData>(() => {
    if (!initial || isCopy) return initial ? {
      brand: initial.brand, model: initial.model, vehicle_type: initial.vehicle_type,
      axle_config: initial.axle_config, year: initial.year, mileage: initial.mileage,
      body_builder: initial.body_builder, capacity: initial.capacity,
      equipment: initial.equipment, valuation_price: initial.valuation_price,
      valuation_date: new Date().toISOString().slice(0, 10),
      purchase_price: null, purchase_date: "", sale_price: null, sale_date: "",
      notes: initial.notes, images: [],
    } : { ...EMPTY, valuation_date: new Date().toISOString().slice(0, 10) };
    return {
      brand: initial.brand, model: initial.model, vehicle_type: initial.vehicle_type,
      axle_config: initial.axle_config, year: initial.year, mileage: initial.mileage,
      body_builder: initial.body_builder, capacity: initial.capacity,
      equipment: initial.equipment, valuation_price: initial.valuation_price,
      valuation_date: initial.valuation_date ?? "",
      purchase_price: initial.purchase_price, purchase_date: initial.purchase_date ?? "",
      sale_price: initial.sale_price, sale_date: initial.sale_date ?? "",
      notes: initial.notes, images: initial.images,
    };
  });

  const [busy, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadImages(files: FileList) {
    setUploading(true);
    const paths: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("valuation-images").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      paths.push(path);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...paths] }));
    setUploading(false);
  }

  async function removeImage(path: string) {
    await supabase.storage.from("valuation-images").remove([path]);
    setForm((f) => ({ ...f, images: f.images.filter((p) => p !== path) }));
  }

  async function save() {
    setSaving(true);
    const payload = {
      brand: form.brand || null, model: form.model || null,
      vehicle_type: form.vehicle_type || null, axle_config: form.axle_config || null,
      year: form.year, mileage: form.mileage,
      body_builder: form.body_builder || null, capacity: form.capacity || null,
      equipment: form.equipment || null, valuation_price: form.valuation_price,
      valuation_date: form.valuation_date || null,
      purchase_price: form.purchase_price, purchase_date: form.purchase_date || null,
      sale_price: form.sale_price, sale_date: form.sale_date || null,
      notes: form.notes || null, images: form.images,
    };

    let data: any, error: any;
    if (isEdit) {
      ({ data, error } = await supabase.from("valuations" as any).update(payload).eq("id", initial!.id).select().single());
    } else {
      ({ data, error } = await supabase.from("valuations" as any).insert({ ...payload, user_id: userId }).select().single());
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Värdering uppdaterad" : "Värdering skapad");
    onSaved(data as Valuation);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{isEdit ? "Redigera värdering" : isCopy ? "Kopiera värdering" : "Ny värdering"}</h2>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded-md border hover:bg-muted"><X className="size-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vehicle */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fordonsuppgifter</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field2 label="Märke" value={form.brand ?? ""} onChange={(v) => set("brand", v)} placeholder="Volvo" />
              <Field2 label="Modell" value={form.model ?? ""} onChange={(v) => set("model", v)} placeholder="FH540" />
              <Field2 label="Fordonstyp/påbyggnad" value={form.vehicle_type ?? ""} onChange={(v) => set("vehicle_type", v)} placeholder="Lastväxlare" />
              <Field2 label="Axelkonfiguration" value={form.axle_config ?? ""} onChange={(v) => set("axle_config", v)} placeholder="8×4" />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Årsmodell</label>
                <input type="number" value={form.year ?? ""} onChange={(e) => set("year", e.target.value ? parseInt(e.target.value) : null)} placeholder="2021" className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Miltal (mil)</label>
                <input type="number" value={form.mileage ?? ""} onChange={(e) => set("mileage", e.target.value ? parseInt(e.target.value) : null)} placeholder="40 000" className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
              <Field2 label="Påbyggare" value={form.body_builder ?? ""} onChange={(v) => set("body_builder", v)} placeholder="JOAB" />
              <Field2 label="Kapacitet" value={form.capacity ?? ""} onChange={(v) => set("capacity", v)} placeholder="24 ton" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Utrustning och övrig information</label>
              <input value={form.equipment ?? ""} onChange={(e) => set("equipment", e.target.value)} placeholder="T.ex. backamera, dragkrok, AC…" className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
            </div>
          </section>

          {/* Valuation */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Värdering</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Värderat inköpspris (kr)</label>
                <input type="number" value={form.valuation_price ?? ""} onChange={(e) => set("valuation_price", e.target.value ? parseInt(e.target.value) : null)} placeholder="0" className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Datum för värdering</label>
                <input type="date" value={form.valuation_date ?? ""} onChange={(e) => set("valuation_date", e.target.value)} className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Anteckningar</h3>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={5}
              placeholder="Skick, däck, servicehistorik, skador, extrautrustning, resonemang kring värderingen…"
              className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
            />
          </section>

          {/* Images */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Bilder</h3>
            <div className="flex flex-wrap gap-2">
              {form.images.map((path) => (
                <div key={path} className="relative size-20 rounded-lg overflow-hidden border group">
                  <img src={imageUrl(path)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(path)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="size-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="size-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <><ImageIcon className="size-4" /><span className="text-[10px]">Lägg till</span></>}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(e.target.files)} />
          </section>
        </div>

        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-muted">Avbryt</button>
          <button onClick={save} disabled={busy || uploading} className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isEdit ? "Spara ändringar" : "Skapa värdering"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field2({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
    </div>
  );
}
