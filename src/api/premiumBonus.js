const BASE = import.meta.env.VITE_PB_BASE_URL;

function assertEnv() {
  if (!BASE) throw new Error("VITE_PB_BASE_URL is missing");
}

export function normalizePhonePB(input = "") {
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) digits = "7" + digits.slice(1);
  if (digits.length === 10 && /^[9]\d{9}$/.test(digits)) digits = "7" + digits;
  return digits;
}

async function http(path, body) {
  assertEnv();
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && (data.error || data.error_description)) || `API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  if (data && data.success === false) {
    const msg = data.error_description || data.error || "PB returned success:false";
    const err = new Error(msg);
    err.status = 422;
    err.body = data;
    throw err;
  }
  return data;
}

/* ------------ API wrappers ------------ */

export async function buyerInfo(phoneRaw) {
  const phone = normalizePhonePB(phoneRaw);
  return http("/buyer-info", { phone });
}

export async function sendRegisterCode(phoneRaw) {
  const phone = normalizePhonePB(phoneRaw);
  return http("/send-register-code", { phone });
}

export async function sendCustomCode(phoneRaw, text) {
  const phone = normalizePhonePB(phoneRaw);
  return http("/send-custom-code", { phone, text: text || "Код подтверждения: {{code}}" });
}

export async function verifyConfirmationCode({ phone, code }) {
  const p = normalizePhonePB(phone);
  return http("/verify-confirmation-code", { phone: p, code });
}

export async function buyerRegister(payload) {
  const p = {
    phone: normalizePhonePB(payload.phone),
    name: payload.name || payload.first_name || "",
    first_name: payload.first_name || payload.name || "",
    birth_date:
      payload.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(payload.birth_date)
        ? payload.birth_date
        : "1900-01-01",
    email: payload.email || undefined,
    marketing_consent: !!payload.marketing_consent,
    card_number: payload.card_number || undefined,
    token: payload.token || undefined,
    code: payload.code || undefined, // важен для некоторых инсталляций
  };
  return http("/register", p);
}

/**
 * Нормализуем разнородные ответы card-get-info:
 * - старый вариант: { url / download_url / link / pkpass_url / googlepay_url / file[_base64] }
 * - новый вариант PB: { success:true, result:{ wallet_link, gpay_link, gpay_jwt, applications:[] } }
 * Возвращаем объект унифицированного вида:
 * { url, fileBase64, mime, filename, applications, raw }
 */
export async function cardGetInfo({ phone, design_id }) {
  const p = normalizePhonePB(phone);
  const data = await http("/card-get-info", { phone: p, design_id });

  // Уже унифицированные/старые поля
  const directUrl =
    data?.url ||
    data?.download_url ||
    data?.link ||
    data?.pkpass_url ||
    data?.googlepay_url;

  const fileBase64 = data?.file_base64 || data?.file;

  // Новый формат PremiumBonus
  const r = data?.result;
  const resultUrl = r?.wallet_link || r?.gpay_link || r?.apple_link || null;

  return {
    url: directUrl || resultUrl || null,
    fileBase64: fileBase64 || null,
    mime: data?.mime || null,
    filename: data?.filename || null,
    applications: r?.applications || data?.applications || [],
    raw: data,
  };
}