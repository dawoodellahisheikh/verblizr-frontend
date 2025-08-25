// src/features/invoices/api.ts
// ----------------------------------------------------------------------------
// WHY: Isolate all HTTP + URL building for the invoices feature so the screen
// stays simple and we can change base URLs in one place.
//
// USAGE FROM UI LAYER:
//   const { token } = useAuth();
//   const list = await listInvoices({ token, from, to, page, pageSize });
//   const pdfUrl = getInvoicePdfUrl({ id });
//   const zipUrl = getInvoicesExportUrl({ from, to });
//
// NOTE: We default baseUrl to 'http://localhost:4000' for dev. If you already
// have a global config (e.g., ENDPOINTS.API_BASE), you can feed it in here.

export type InvoiceItem = {
    id: string;
    amount: number;      // in minor units (e.g., pennies)
    currency: string;    // 'GBP'
    status: 'paid' | 'open' | 'void' | string;
    createdAt: string;   // ISO timestamp
  };
  
  export type InvoiceListResponse = {
    page: number;
    pageSize: number;
    total: number;
    items: InvoiceItem[];
  };
  
  type ListParams = {
    token?: string;
    from?: string;   // 'YYYY-MM-DD'
    to?: string;     // 'YYYY-MM-DD'
    page?: number;
    pageSize?: number;
    baseUrl?: string; // optional override
  };
  
  type UrlParams = {
    id?: string;
    from?: string;
    to?: string;
    baseUrl?: string;
  };
  
// For iOS Simulator: 127.0.0.1 hits device Mac.
// If we switch to a physical device later, change to device Mac’s LAN IP, e.g. 'http://192.168.1.50:4000'.
const DEFAULT_BASE = 'http://127.0.0.1:4000'


  function buildQuery(params: Record<string, string | number | undefined>) {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return q ? `?${q}` : '';
  }
  
  // ---------- Public API ----------
  
  export async function listInvoices({
    token,
    from,
    to,
    page = 1,
    pageSize = 20,
    baseUrl = DEFAULT_BASE,
  }: ListParams): Promise<InvoiceListResponse> {
    const qs = buildQuery({ from, to, page, pageSize });
    const url = `${baseUrl}/invoices${qs}`;
  
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to list invoices (${res.status}): ${text || res.statusText}`);
    }
  
    return (await res.json()) as InvoiceListResponse;
  }
  
  /** Returns a direct URL to download one invoice PDF */
  export function getInvoicePdfUrl({
    id,
    baseUrl = DEFAULT_BASE,
  }: UrlParams & { id: string }) {
    return `${baseUrl}/invoices/${encodeURIComponent(id)}/pdf`;
  }
  
  /** Returns a direct URL to download a ZIP of invoices for a date range (or all) */
  export function getInvoicesExportUrl({
    from,
    to,
    baseUrl = DEFAULT_BASE,
  }: UrlParams) {
    const qs = buildQuery({ from, to });
    return `${baseUrl}/invoices/export${qs}`;
  }
  