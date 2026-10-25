"use client";

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  if (!res.ok || data.ok === false) {
    throw new Error(typeof data.error === "string" ? data.error : "Save nahi ho saka, dobara try karein");
  }
  return data as T;
}

export type JobPayload = {
  customerName: string;
  phone?: string;
  deviceModel: string;
  imei?: string;
  passcode?: string;
  repairType: string;
  issue?: string;
  total?: number;
  partsCost?: number;
  paid?: number;
  warrantyDays?: number;
  technician?: string;
  notes?: string;
};

export type PartPayload = {
  name: string;
  category?: string;
  model?: string;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  minStock?: number;
};

export type SaleItemPayload = { partId: number | null; name: string; qty: number; price: number; cost: number };

export type SalePayload = {
  customerName?: string;
  phone?: string;
  discount?: number;
  paid?: number;
  paymentMode?: string;
  items: SaleItemPayload[];
};
