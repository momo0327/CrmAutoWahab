// Server-only helpers: research a Swedish company via Firecrawl.
const FIRECRAWL_KEY = () => process.env.FIRECRAWL_API_KEY;

export type Vehicle = {
  registration?: string;
  brand?: string;
  model?: string;
  type?: string;
  year?: string;
  fuel?: string;
  weight?: string;
};

export type ResearchResult = {
  website?: string;
  phones: string[];
  trucks_info?: string;
  fleet_size?: string;
  contact_person?: string;
  address?: string;
  vehicles: Vehicle[];
  sources: string[];
  fordonMd?: string;
  debug?: { query: string; contextChars: number; toolCallRaw?: string };
};

async function firecrawlSearch(query: string, limit = 6) {
  const key = FIRECRAWL_KEY();
  if (!key) throw new Error("FIRECRAWL_API_KEY not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "sv", country: "se" }),
    });
    if (res.status === 429) {
      const wait = (attempt + 1) * 5000;
      console.warn(`[firecrawl] search rate limited, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`Firecrawl search failed: ${res.status} ${await res.text()}`);
    return res.json();
  }
  throw new Error("Firecrawl search failed after retries");
}

async function firecrawlScrape(url: string, opts?: { waitFor?: number }) {
  const key = FIRECRAWL_KEY();
  if (!key) throw new Error("FIRECRAWL_API_KEY not configured");
  const body: any = { url, formats: ["markdown"], onlyMainContent: true };
  if (opts?.waitFor) body.waitFor = opts.waitFor;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      const wait = (attempt + 1) * 5000;
      console.warn(`[firecrawl] rate limited, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

function pickResults(json: any): Array<{ url: string; title?: string; markdown?: string; description?: string }> {
  const data = json?.data;
  if (Array.isArray(data)) return data;
  if (data?.web && Array.isArray(data.web)) return data.web;
  return [];
}

function extractSwedishPhones(text: string): string[] {
  const re = /(?:\+46|0046|0)\s*[\d\s\-().]{6,18}\d/g;
  const found = new Set<string>();
  for (const m of text.match(re) ?? []) {
    const cleaned = m.replace(/[\s\-().]/g, "");
    if (cleaned.length >= 8 && cleaned.length <= 14) found.add(cleaned);
  }
  return Array.from(found);
}

function parseMerinfoVehicles(md: string): Vehicle[] {
  // Merinfo renders each vehicle as an inline summary line:
  //   "Brand Model\nREG12X · Color · type · year\n[Visa fordonsinfo](url)"
  // We parse by finding the inline "REG · color · type · year" lines
  // which always appear just before a [Visa fordonsinfo] link.

  const vehicles: Vehicle[] = [];

  // Parse the compact inline summary line merinfo renders per vehicle:
  // "REG · Color · type · year"  e.g. "DAF23P · Vit · lätt lastbil · 2026"
  // Brand+model is found by looking backward a few lines from the summary.

  const lines = md.split("\n").map((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Format 1: inline summary "REG · color · type · year"
    const inlineMatch = l.match(/^([A-ZÅÄÖ]{2,3}\d{2,3}[A-Z0-9]?)\s*·\s*([^·\n]+?)\s*·\s*([^·\n]+?)\s*·\s*((?:19|20)\d{2})$/i);
    if (inlineMatch) {
      const reg = inlineMatch[1].toUpperCase();
      // inlineMatch[2] = color (ignored), inlineMatch[3] = type, inlineMatch[4] = year
      const type = inlineMatch[3].trim().toLowerCase();
      const year = inlineMatch[4].trim();

      // The brand+model header is the line just before this block's "[Visa fordonsinfo]"
      // Look backward for "Brand Model" line (contains a capital letter, not a reg plate)
      let brand: string | undefined;
      let model: string | undefined;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prev = lines[j];
        if (!prev || /^\[|^#|^!\[|^Se |^Visa/.test(prev)) continue;
        // Skip pure registration lines
        if (/^[A-ZÅÄÖ]{2,3}\d{2,3}[A-Z0-9]?$/.test(prev)) continue;
        // Skip color-only lines (single word starting with capital)
        if (/^[A-ZÅÄÖ][a-zåäö]+$/.test(prev) && prev.split(" ").length === 1) continue;
        // This should be the brand model header
        const parts = prev.replace(/\s*\(\d{4}\)$/, "").trim().split(/\s+/);
        brand = parts[0] || undefined;
        model = parts.slice(1).join(" ") || undefined;
        break;
      }

      vehicles.push({ registration: reg, brand, model, type, year });
      continue;
    }
  }

  // Dedupe by registration — keep first occurrence
  const seen = new Set<string>();
  return vehicles.filter((v) => {
    if (!v.registration || seen.has(v.registration)) return false;
    seen.add(v.registration);
    return true;
  });
}

const NOISE_WORDS = ["behandlingen", "personuppgifter", "dataskydd", "integritetspolicy", "cookies", "samtycke", "tillgänglig", "närvarande", "teckna", "firman", "rätt", "bolaget", "aktier", "registrerad"];

function isRealName(s: string): boolean {
  const lower = s.toLowerCase();
  if (NOISE_WORDS.some((w) => lower.includes(w))) return false;
  // Must have at least 2 capitalized words
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  if (!words.every((w) => /^[A-ZÅÄÖ]/.test(w))) return false;
  if (s.length > 60) return false;
  return true;
}

function normalizeSwedishName(s: string): string {
  const m = s.match(/^([A-ZÅÄÖ][a-zåäö\-]+),\s*([A-ZÅÄÖ][a-zåäö\- A-ZÅÄÖ]+)$/);
  if (m) return `${m[2].trim()} ${m[1].trim()}`;
  return s;
}


const SKIP_PHRASES = /^(bolagsinformation|bolagsfakta|fordonsinnehav|styrelseledamot|styrelseordf|verkst[äa]llande|kontaktperson|org\.?nummer|e-post|hemsida|adress|telefon|antal|snittl|utdelning|telefonabonnemang)/i;

function extractContactPerson(md: string): string | undefined {
  // Find the bolagsinformation section, then grab the first proper person name.
  const bolagsIdx = md.toLowerCase().indexOf("bolagsinformation");
  const section = bolagsIdx !== -1 ? md.slice(bolagsIdx, bolagsIdx + 800) : md.slice(0, 800);

  // Remove the org.nummer line, then scan for first 2+ capitalized word sequence
  // that isn't a known heading or role label.
  const afterOrg = section.replace(/org\.?nummer[^\n]*/i, "");
  const nameRe = /\b([A-ZÅÄÖ][a-zåäö\-]+(?:\s+[A-ZÅÄÖ][a-zåäö\-]+)+)/g;
  for (const m of afterOrg.matchAll(nameRe)) {
    const candidate = m[1].trim().replace(/,\s*$/, "");
    if (SKIP_PHRASES.test(candidate)) continue;
    if (isRealName(candidate)) return candidate;
  }
  return undefined;
}

function extractAddress(md: string): string | undefined {
  const cleaned = md.replace(/\bAdress\s*/g, "");
  const m = cleaned.match(/([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ ]+\s+\d+[A-Za-z]?)[,\n\r]+\s*(\d{3}\s*\d{2}\s+[A-ZÅÄÖ][a-zåäö]+)/);
  if (m) return `${m[1].trim()}, ${m[2].trim()}`;
  const m2 = cleaned.match(/(\d{3}\s*\d{2})\s+([A-ZÅÄÖ][a-zåäö]{2,})/);
  if (m2) return `${m2[1]} ${m2[2]}`;
  return undefined;
}

// Strip subpage suffix from a merinfo URL to get the company base URL.
function merinfoBase(url: string): string {
  return url
    .replace(/\/(fordon|telefonnummer|adresser|styrelse-koncern|verklig-huvudman|nyckeltal|kontakt|ekonomi|styrelse)(\/.*)?$/i, "")
    .replace(/\/$/, "");
}

export async function researchCompany(name: string, orgNumber?: string | null): Promise<ResearchResult> {
  if (!FIRECRAWL_KEY()) throw new Error("FIRECRAWL_API_KEY not configured");

  // ── Phase 1: search directly for the /fordon page on merinfo ────────────
  // Searching for the vehicles page means the search result markdown often
  // already contains page 1 of vehicles — saving a separate scrape.
  const cleanedOrg = orgNumber ? orgNumber.replace(/\D/g, "") : "";
  const query = cleanedOrg
    ? `${cleanedOrg} fordon site:merinfo.se`
    : `"${name}" fordon site:merinfo.se`;

  const searchResponse = await firecrawlSearch(query, 6).catch((e) => { console.warn("search failed", e); return null; });
  const searchHits: Array<{ url: string; markdown?: string }> = searchResponse ? pickResults(searchResponse) : [];

  // ── Phase 2: resolve merinfo base URL from search results ─────────────────
  // Only use search results to find the URL — we'll do our own explicit scrapes.
  let merinoBaseUrl: string | undefined;
  const fordonHit = searchHits.find((r) => /merinfo\.se\/foretag\/.+\/fordon/i.test(r.url))
    ?? searchHits.find((r) => /merinfo\.se\/foretag\//i.test(r.url));
  if (fordonHit) merinoBaseUrl = merinfoBase(fordonHit.url);

  // Cache /fordon markdown from search if it came back with content.
  const fordonFromSearch = searchHits.find((r) => /merinfo\.se\/foretag\/.+\/fordon$/i.test(r.url))?.markdown ?? "";

  // Fallback: scrape merinfo search page if URL not found.
  if (!merinoBaseUrl) {
    const fallbackQuery = cleanedOrg
      ? `site:merinfo.se/foretag ${cleanedOrg}`
      : `"${name}" site:merinfo.se/foretag`;
    const fallback = await firecrawlSearch(fallbackQuery, 5).catch(() => null);
    if (fallback) {
      const hit = pickResults(fallback).find((h) => /merinfo\.se\/foretag\//i.test(h.url));
      if (hit) merinoBaseUrl = merinfoBase(hit.url);
    }
  }

  if (!merinoBaseUrl && cleanedOrg) {
    const searchScrape = await firecrawlScrape(`https://www.merinfo.se/sok?q=${cleanedOrg}`, { waitFor: 3000 }).catch(() => null);
    const searchMd = searchScrape?.data?.markdown || searchScrape?.markdown || "";
    const m = searchMd.match(/https:\/\/www\.merinfo\.se\/foretag\/[^\s)"']+/i);
    if (m) merinoBaseUrl = merinfoBase(m[0]);
  }

  if (!merinoBaseUrl) console.warn("[research] merinfo /foretag page not found for", name, orgNumber);

  // ── Phase 3: scrape merinfo subpages ─────────────────────────────────────
  let parsedVehicles: Vehicle[] = [];
  let totalFleetFromMerinfo: string | undefined;
  let merinoMainMd = "";

  const sources: string[] = [];
  let allMd = "";

  if (merinoBaseUrl) {
    const fordon1Url = `${merinoBaseUrl}/fordon`;

    // Scrape main page and /fordon in parallel.
    // Reuse /fordon markdown from search if it was already returned.
    const [mainRes, fordon1Res] = await Promise.all([
      firecrawlScrape(merinoBaseUrl).catch(() => null),
      fordonFromSearch
        ? Promise.resolve(null)
        : firecrawlScrape(fordon1Url, { waitFor: 2500 }).catch(() => null),
    ]);

    merinoMainMd = mainRes?.data?.markdown || mainRes?.markdown || "";
    if (merinoMainMd) sources.push(merinoBaseUrl);

    // Debug: log the bolagsinformation section so we can tune the regex.
    const bolagsIdx = merinoMainMd.toLowerCase().indexOf("bolagsinformation");
    if (bolagsIdx !== -1) {
      console.log("[research] bolagsinformation snippet:\n", merinoMainMd.slice(bolagsIdx, bolagsIdx + 600));
    } else {
      console.log("[research] 'bolagsinformation' not found in main page markdown. First 800 chars:\n", merinoMainMd.slice(0, 800));
    }

    const fordon1Md = fordonFromSearch || (fordon1Res as any)?.data?.markdown || (fordon1Res as any)?.markdown || "";

    if (fordon1Md) {
      sources.push(fordon1Url);
      const totalMatch = fordon1Md.match(/Totalt antal fordon:\s*(\d+)/i);
      if (totalMatch) totalFleetFromMerinfo = totalMatch[1];
      const expectedTotal = parseInt(totalFleetFromMerinfo ?? "0", 10) || 0;
      const page1Vehicles = parseMerinfoVehicles(fordon1Md);
      parsedVehicles.push(...page1Vehicles);
      allMd += fordon1Md;

      const needsMorePages = expectedTotal > 0
        ? parsedVehicles.length < expectedTotal
        : page1Vehicles.length >= 20; // fetch more if page 1 looks full

      if (needsMorePages) {
        const remainingPages = expectedTotal > 0
          ? Math.min(Math.ceil((expectedTotal - parsedVehicles.length) / 25) + 1, 19)
          : 19;

        for (let page = 2; page <= remainingPages + 1; page++) {
          const fordonUrl = `${merinoBaseUrl}/fordon?page=${page}`;
          const fordon = await firecrawlScrape(fordonUrl, { waitFor: 2500 }).catch(() => null);
          const fordonMd = fordon?.data?.markdown || fordon?.markdown;
          if (!fordonMd) break;

          const pageVehicles = parseMerinfoVehicles(fordonMd);
          if (pageVehicles.length === 0) break;
          parsedVehicles.push(...pageVehicles);
          sources.push(fordonUrl);
          allMd += "\n\n" + fordonMd;

          if (expectedTotal > 0 && parsedVehicles.length >= expectedTotal) break;
          if (pageVehicles.length < 25) break;
        }
      }
    }

    allMd = merinoMainMd + "\n\n" + allMd;

    // Dedupe vehicles by registration.
    const seenReg = new Set<string>();
    parsedVehicles = parsedVehicles.filter((v) => {
      const r = (v.registration ?? "").toUpperCase();
      if (!r || seenReg.has(r)) return false;
      seenReg.add(r);
      return true;
    });
  }

  // ── Phase 4: extract data from collected content ─────────────────────────
  const context = allMd.slice(0, 24000);

  const phones = Array.from(new Set(extractSwedishPhones(context))).slice(0, 10);
  const contactPerson = extractContactPerson(merinoMainMd) ?? extractContactPerson(context);
  const address = extractAddress(merinoMainMd) ?? extractAddress(context);

  const brandCounts: Record<string, number> = {};
  for (const v of parsedVehicles) {
    if (v.brand) brandCounts[v.brand] = (brandCounts[v.brand] ?? 0) + 1;
  }
  const brandSummary = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([brand, count]) => `${count} ${brand}`)
    .join(", ");
  const trucks_info = parsedVehicles.length > 0
    ? `Fleet of ${parsedVehicles.length} vehicles${brandSummary ? `: ${brandSummary}` : ""}.`
    : undefined;

  return {
    phones,
    trucks_info,
    fleet_size: totalFleetFromMerinfo ?? (parsedVehicles.length ? String(parsedVehicles.length) : undefined),
    contact_person: contactPerson,
    address,
    vehicles: parsedVehicles,
    sources,
    fordonMd: allMd.slice(0, 8000),
    debug: { query, contextChars: context.length },
  };
}
