import { SupabaseClient } from "@supabase/supabase-js";

type InvokeOptions = {
  body?: any;
  timeoutMs?: number;   // per attempt
  retries?: number;     // extra attempts after first try
  backoffMs?: number;   // added delay per retry
};

export async function invokeWithRetry<T = any>(
  supabase: SupabaseClient,
  fnName: string,
  opts: InvokeOptions = {}
): Promise<T> {
  const { body, timeoutMs = 12000, retries = 1, backoffMs = 2000 } = opts;

  let attempt = 0;
  let lastErr: any;

  while (attempt <= retries) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // pass our AbortSignal through the fetch used by supabase.functions.invoke
      // @ts-ignore - supabase forwards this to fetch
      const { data, error } = await supabase.functions.invoke(fnName, {
        body,
        fetch: (url: string, init: any) =>
          fetch(url, { ...init, signal: controller.signal }),
      });

      clearTimeout(t);
      if (error) throw error;
      return data as T;
    } catch (err: any) {
      clearTimeout(t);
      lastErr = err;
      const isAbort = err?.name === "AbortError";
      const isNet = String(err?.message || "").toLowerCase().includes("failed to fetch");
      if (attempt < retries && (isAbort || isNet)) {
        await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)));
        attempt++;
        continue;
      }
      break;
    }
  }
  throw lastErr;
}
