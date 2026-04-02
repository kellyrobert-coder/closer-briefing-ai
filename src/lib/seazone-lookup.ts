// ─── Seazone Client Lookup ────────────────────────────────────────────────────
// Checks if a lead is already a Seazone client (SZI investor or SZS host).
// Data is loaded once from /seazone-clients.json and cached in memory.

export interface SeazoneClientInfo {
  tipo: 'SZI' | 'SZS' | 'SZI+SZS';
  nome: string;
  empreendimentos: string[];
  status: string;
  szs_anfitriao?: boolean;
}

type LookupMap = Record<string, SeazoneClientInfo>;

let cache: LookupMap | null = null;
let loading: Promise<LookupMap> | null = null;

async function loadLookup(): Promise<LookupMap> {
  if (cache) return cache;
  if (loading) return loading;

  loading = fetch('/closer-briefing-ai/seazone-clients.json')
    .then((r) => {
      if (!r.ok) throw new Error('Failed to load seazone-clients.json');
      return r.json() as Promise<LookupMap>;
    })
    .then((data) => {
      cache = data;
      loading = null;
      return data;
    })
    .catch((err) => {
      loading = null;
      throw err;
    });

  return loading;
}

/**
 * Look up a lead's email in the Seazone client database.
 * Returns the client info if found, or null if not a client.
 */
export async function lookupSeazoneClient(
  email: string
): Promise<SeazoneClientInfo | null> {
  if (!email || !email.trim()) return null;

  try {
    const map = await loadLookup();
    const key = email.trim().toLowerCase();
    return map[key] ?? null;
  } catch {
    return null;
  }
}

/** Pre-warm the cache in the background */
export function preloadSeazoneLookup(): void {
  loadLookup().catch(() => {/* silently ignore */});
}
