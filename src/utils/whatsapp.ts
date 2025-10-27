const CLINIC_WHATS_E164 = "5511996378518"; // keep without "+"

export function normalizePhoneBR(input: string): string {
  const digitsOnly = input.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`;
}

export function formatBRPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  // Minimal UX mask for BR numbers, allows typing without jumping cursor too much
  if (digits.length <= 11) {
    return digits.replace(
      /^(\d{0,2})(\d{0,5})(\d{0,4}).*$/,
      (_m, ddd: string, mid: string, tail: string) =>
        [ddd && `(${ddd})`, mid, tail && `-${tail}`].filter(Boolean).join(" ")
    );
  }
  return digits;
}

export function buildWhatsMessage(params: { name: string; phone: string; reason: string }): string {
  const phoneNormalized = normalizePhoneBR(params.phone);
  const readableReason = params.reason === "marcar_banho" ? "Marcar banho" : params.reason;
  return `Olá, aqui é ${params.name}. Telefone: +${phoneNormalized}. Motivo: ${readableReason}. Vim pelo site da Vettale.`;
}

export function buildWhatsLink(payload: { name: string; phone: string; reason: string }): string {
  const text = encodeURIComponent(buildWhatsMessage(payload));
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // On desktop, use api.whatsapp.com so the pre-filled text is preserved
  const base = isMobile ? "whatsapp://send" : "https://api.whatsapp.com/send";
  return `${base}?phone=${CLINIC_WHATS_E164}&text=${text}`;
}

export async function maybeEmailIntake(payload: { name: string; phone: string; reason: string }) {
  const to = (import.meta as any).env?.VITE_CONTACT_EMAIL_TO as string | undefined;
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  if (!to || !supabaseUrl) return;

  await fetch(`${supabaseUrl}/functions/v1/send-contact-intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, to }),
  });
}


