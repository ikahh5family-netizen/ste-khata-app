import type { ActionResult } from "./shop-service";

export async function parseRequestData(req: Request): Promise<{ data: Record<string, unknown>; isJson: boolean }> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    return { data: json ?? {}, isJson: true };
  }
  if (ct.includes("form")) {
    const fd = await req.formData();
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") data[k] = v;
    });
    return { data, isJson: req.headers.get("x-fetch") === "1" };
  }
  try {
    const json = (await req.json()) as Record<string, unknown>;
    return { data: json ?? {}, isJson: true };
  } catch {
    return { data: {}, isJson: true };
  }
}

export function respondResult(req: Request, result: ActionResult, isJson: boolean, fallbackRedirect = "/"): Response {
  if (isJson) {
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  const target = result.redirectTo || req.headers.get("referer") || fallbackRedirect;
  return new Response(null, {
    status: 303,
    headers: { Location: target },
  });
}
