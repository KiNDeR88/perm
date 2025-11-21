// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  buyerInfo,
  sendRegisterCode,
  sendCustomCode,
  verifyConfirmationCode,
  buyerRegister,
  cardGetInfo,
} from "./api/premiumBonus";

import LogoImg from "./assets/icon@0.5x.png";

// Бейджи-картинки (убедись, что файлы реально лежат в /src/assets)
import AppleWalletBadgeImg from "./assets/add-to-apple-wallet-badge.png";
import AppStoreBadgeImg from "./assets/app-store.png";
import GooglePlayBadgeRu from "./assets/google_play_app.png";
import PassesWalletBadge from "./assets/passeswallet.jpg";

/* ============== UI helpers ============== */

// Иконки для кнопок (используются в ветке "other")
const GooglePlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d="M3.6 1.8c-.5.3-.8.9-.8 1.6v17.2c0 .7.3 1.3.8 1.6l10.6-10.2L3.6 1.8z"/>
    <path d="M15.8 11.4 18.5 8.8c1.1-1 1.6-1.6 1.6-2.4 0-.8-.5-1.4-1.6-2.4L16.7 2l-4.1 4 3.2 3.4z"/>
    <path d="M12.6 18 16.7 22l2.4-1.9c1.1-1 1.6-1.6 1.6-2.4 0-.8-.5-1.4-1.6-2.4l-2.7-2.6-3.8 3.3z"/>
  </svg>
);
const WalletIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d="M2 7a3 3 0 0 1 3-3h11a1 1 0 1 1 0 2H5a1 1 0 0 0-1 1v1h17a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7zm19 4H15a2 2 0 0 0 0 4h6v-4z"/>
  </svg>
);

// Кнопка-контрол
const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  as = "button",
  href,
  className = "",
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-semibold transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const styles = {
    primary:   "bg-[#DE2A1B] text-white hover:brightness-110 focus-visible:ring-[#DE2A1B]",
    secondary: "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 focus-visible:ring-zinc-400",
    store:     "bg-[#243369] text-white hover:brightness-110 focus-visible:ring-[#243369]",
    play:      "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600",
    black:     "bg-black text-white hover:bg-zinc-900 focus-visible:ring-black",
  }[variant];

  const cls = `${base} ${styles} ${className}`.trim();

  if (as === "a" && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} no-underline text-center`}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${cls} disabled:opacity-60 disabled:cursor-not-allowed`}>
      {children}
    </button>
  );
};

// «Кнопка»-бейдж (картинка): className — для оболочки, imgClass — для самого изображения
const BadgeLink = ({ href, onClick, src, alt, className = "", imgClass = "h-20 sm:h-24" }) => (
  <a
    href={href}
    onClick={onClick}
    target={href ? "_blank" : undefined}
    rel={href ? "noopener noreferrer" : undefined}
    className={`inline-block align-middle ${className}`}
    aria-label={alt}
    style={{ lineHeight: 0 }}
  >
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${imgClass} block w-auto object-contain`}
      style={{ display: 'block' }}
    />
  </a>
);

/* ============== Utils ============== */
const normalizeOtp = (s = "") => s.replace(/\s+/g, "");
const maskPhone = (phone = "") => {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length < 6) return digits;
  return digits.replace(/(\+?\d{1,3})(\d{3})(\d{2})(.*)/, "$1 *** ** $4").trim();
};
const formatCard = (s = "") => String(s).replace(/(.{4})/g, "$1 ").trim();

const isBuyerExists = (info) =>
  info?.is_register === true ||
  info?.is_registered === true ||
  info?.exists === true ||
  !!info?.buyer ||
  info?.status === "registered" ||
  (info?.success === true && (info?.card_number || info?.buyer?.card_number));

// Определение платформы (с поддержкой UA-CH)
function getPlatform() {
  if (typeof navigator === "undefined") return "other";
  if (navigator.userAgentData?.platform) {
    const p = navigator.userAgentData.platform.toLowerCase();
    if (p.includes("android")) return "android";
    if (p.includes("ios") || p.includes("iphone") || p.includes("ipad") || p.includes("macos") || p.includes("mac")) {
      if (p.includes("mac") && navigator.maxTouchPoints > 1) return "ios";
      return p.includes("mac") ? "other" : "ios";
    }
  }
  const ua = navigator.userAgent || navigator.vendor || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  if (iOS) return "ios";
  if (android) return "android";
  return "other";
}

/* ============== Env ============== */
const CARD_DESIGN_ID = import.meta.env.VITE_CARD_DESIGN_ID || "default";
const APPSTORE_URL   = import.meta.env.VITE_APPSTORE_URL   || "";
const GOOGLEPLAY_URL = import.meta.env.VITE_GOOGLEPLAY_URL || "";
const TERMS_URL      = import.meta.env.VITE_TERMS_URL      || "#";
const PRIVACY_URL    = import.meta.env.VITE_PRIVACY_URL    || "#";

/* ============== Component ============== */
export default function App() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const platform = useMemo(() => getPlatform(), []);
  const [form, setForm] = useState({
    phone: "",
    first_name: "",
    birth_date: "",
    email: "",
    terms: false,
    promo: false,
    token: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("fill"); // fill | otp-register | otp-login | done
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [cardNumber, setCardNumber] = useState("");

  // Берём t= из URL (номер карты/токен) и показываем в readOnly поле
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t") || "";
    if (token) {
      setForm((s) => ({ ...s, token }));
      setCardNumber(token);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    if (!form.phone || !form.first_name || !form.birth_date || !form.terms) {
      setStatus({ type: "error", text: "Проверьте обязательные поля." });
      return;
    }

    setLoading(true);
    try {
      const info = await buyerInfo(form.phone);
      setProfile(info || null);

      if (isBuyerExists(info)) {
        await sendCustomCode(form.phone);
        setStep("otp-login");
        setStatus({ type: "ok", text: "Мы отправили код входа на ваш номер." });
      } else {
        await sendRegisterCode(form.phone);
        setStep("otp-register");
        setStatus({ type: "ok", text: "Мы отправили код подтверждения на ваш номер." });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: err?.message || "Ошибка при обработке." });
    } finally {
      setLoading(false);
    }
  };

  // verify → buyerInfo → (buyerRegister если нужно) → buyerInfo → done
  const confirmOtp = async () => {
    const phone = form.phone.trim();
    const code = normalizeOtp(otp);
    if (!code || code.length < 3) {
      setStatus({ type: "error", text: "Введите корректный код из SMS." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", text: "" });

    try {
      const verifyResp = await verifyConfirmationCode({ phone, code });
      console.log("[PB] verify-confirmation-code →", verifyResp);

      let info = await buyerInfo(phone);
      console.log("[PB] buyer-info (после verify) →", info);
      let exists = isBuyerExists(info);

      if (!exists) {
        const payload = {
          phone,
          name: (form.first_name || "").trim(),
          first_name: (form.first_name || "").trim(),
          birth_date:
            form.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(form.birth_date)
              ? form.birth_date
              : "1900-01-01",
          email: form.email?.trim() || undefined,
          marketing_consent: !!form.promo,
          card_number: (form.token || "").trim() || undefined,
          token: form.token || undefined,
          code,
        };

        console.log("[PB] buyer-register → payload", payload);
        const regResp = await buyerRegister(payload);
        console.log("[PB] buyer-register ←", regResp);

        info = await buyerInfo(phone);
        console.log("[PB] buyer-info (после register) →", info);
        exists = isBuyerExists(info);
        if (!exists) {
          setStatus({
            type: "error",
            text: "Регистрация не подтвердилась в PB. Проверьте параметры/права в консоли.",
          });
          setLoading(false);
          return;
        }
      }

      setProfile(info || {});
      setStep("done");
      setStatus({
        type: "ok",
        text: exists ? "Телефон подтверждён. Добро пожаловать!" : "Регистрация завершена. Карта активирована.",
      });
    } catch (err) {
      console.error("[PB] confirmOtp error:", err);
      setStatus({
        type: "error",
        text: err?.message || "Не удалось подтвердить код/зарегистрировать.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Скачать/получить e-карту
  const downloadECard = async () => {
    if (!profile) {
      setStatus({ type: "error", text: "Сначала завершите регистрацию (подтвердите код)." });
      return;
    }
    setDownloading(true);
    setStatus({ type: "", text: "" });

    try {
      const data = await cardGetInfo({ phone: form.phone, design_id: CARD_DESIGN_ID });
      const result = data?.result || data;

      const url =
        result?.wallet_link ||
        result?.gpay_link ||
        result?.url ||
        result?.download_url ||
        result?.link ||
        result?.pkpass_url ||
        result?.googlepay_url;

      // Открываем прямую ссылку на e-карту
      if (url) {
        if (platform === "android") {
          // На Android Passes Wallet обычно перехватывает deep-link сам
          window.location.href = url;
          setStatus({ type: "ok", text: "Открываем Passes Wallet (или Google Play)..." });
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
          setStatus({ type: "ok", text: "Ссылка на карту открыта в новой вкладке." });
        }
        setDownloading(false);
        return;
      }

      const fileB64 = result?.fileBase64 || result?.file_base64 || result?.file;
      if (fileB64) {
        const mime =
          result?.mime ||
          (fileB64.startsWith("UEtwYXNz")
            ? "application/vnd.apple.pkpass"
            : "application/octet-stream");
        const bin = atob(fileB64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = result?.filename || (mime.includes("pkpass") ? "card.pkpass" : "card.bin");
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStatus({ type: "ok", text: "Карта загружена." });
        setDownloading(false);
        return;
      }

      if (result?.applications?.length) {
        const first = result.applications[0];
        setStatus({
          type: "error",
          text:
            "Не удалось открыть ссылку кошелька. Установите рекомендованное приложение: " +
            (first?.url || first?.name || "Passes Wallet"),
        });
        setDownloading(false);
        return;
      }

      setStatus({ type: "error", text: "Не удалось получить ссылку/файл карты." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: err?.message || "Не удалось получить карту." });
    } finally {
      setDownloading(false);
    }
  };

  const phoneMasked = maskPhone(form.phone);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEEEEE] p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 ring-1 ring-black/5">
        {/* Большой логотип */}
        <div className="flex justify-center mb-5">
          <img src={LogoImg} alt="Invest In Perm" className="h-40 sm:h-48 md:h-56 lg:h-64 w-auto" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center uppercase tracking-wider text-[#243369]">
          Регистрация в программе лояльности
        </h1>

        {status.text && (
          <div
            className={`mb-4 p-2 text-sm rounded ${
              status.type === "error" ? "bg-red-100 text-[#DE2A1B]" : "bg-green-100 text-green-700"
            }`}
          >
            {status.text}
          </div>
        )}

        {/* Шаг 1: форма */}
        {step === "fill" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="tel"
              name="phone"
              placeholder="Телефон"
              value={form.phone}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#243369]"
              required
            />
            <input
              type="text"
              name="first_name"
              placeholder="Имя"
              value={form.first_name}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#243369]"
              required
            />
            <input
              type="date"
              name="birth_date"
              placeholder="Дата рождения"
              value={form.birth_date}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#243369]"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email (необязательно)"
              value={form.email}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#243369]"
            />

            {/* Единственное поле номера карты — readOnly из t= */}
            <input
              type="text"
              value={cardNumber ? formatCard(cardNumber) : ""}
              readOnly
              placeholder="Номер карты (если уже есть)"
              className="w-full border p-2 rounded bg-gray-100 text-gray-700 placeholder-gray-400"
            />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="terms" checked={form.terms} onChange={handleChange} />
              <span>
                Согласен с{" "}
                <a
                  href={TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#243369] underline underline-offset-2"
                >
                  условиями программы
                </a>{" "}
                и{" "}
                <a
                  href={PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#243369] underline underline-offset-2"
                >
                  политикой обработки персональных данных
                </a>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="promo" checked={form.promo} onChange={handleChange} />
              <span>
                Хочу получать акции и предложения в соответствии с{" "}
                <a
                  href={PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#243369] underline underline-offset-2"
                >
                  политикой обработки персональных данных
                </a>
              </span>
            </label>

            <Button variant="primary" disabled={loading}>
              {loading ? "Обработка..." : "Продолжить"}
            </Button>
          </form>
        )}

        {/* Шаг 2: подтверждение кода */}
        {(step === "otp-register" || step === "otp-login") && (
          <div className="space-y-4">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Код из SMS"
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#243369]"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <Button onClick={confirmOtp} disabled={loading} variant="store">
              {loading ? "Проверка..." : "Подтвердить"}
            </Button>
            {step === "otp-register" ? (
              <Button onClick={() => sendRegisterCode(form.phone.trim())} disabled={loading} variant="secondary">
                Отправить код ещё раз
              </Button>
            ) : (
              <Button onClick={() => sendCustomCode(form.phone.trim())} disabled={loading} variant="secondary">
                Отправить код ещё раз
              </Button>
            )}
          </div>
        )}

        {/* Шаг 3: финальный экран */}
        {step === "done" && (
          <div className="space-y-4">
            {/* Карточка (без логотипа на самой карте) */}
            <div className="rounded-2xl p-4 sm:p-5 bg-[#243369] text-white shadow-xl ring-1 ring-white/10 relative overflow-hidden">
              <svg className="absolute -right-4 -top-4 w-28 h-28 text-white/10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 12h10l-3.5-3.5L13 7l6 5-6 5-1.5-1.5L15 12H5z" />
              </svg>
              <div className="text-xs uppercase tracking-widest opacity-90">Investor Card</div>
              <div className="text-xl sm:text-2xl tracking-wide mt-1">
                {profile?.buyer?.name || form.first_name || "Пользователь"}
              </div>
              <div className="text-sm opacity-90 mt-1">{phoneMasked}</div>
              <div className="mt-3 sm:mt-4 font-mono text-base sm:text-[1.25rem] tracking-widest">
                {formatCard(cardNumber || "—")}
              </div>
              <div className="mt-4 inline-flex items-center gap-2 bg-[#DE2A1B] text-white px-3 py-1 rounded-md text-xs uppercase tracking-wider">
                <span className="inline-block w-1.5 h-1.5 bg-white rounded-sm" />
                Активирована
              </div>
            </div>

            {/* Платформенные бейджи/кнопки */}
            <div className="space-y-3 mt-3">
              {/* iOS — два больших бейджа, горизонтально */}
              {platform === "ios" && (
                <div className="flex items-center justify-center gap-4">
                  <BadgeLink
                    onClick={downloadECard}
                    src={AppleWalletBadgeImg}
                    alt="Add to Apple Wallet"
                    imgClass="h-20 sm:h-24"
                  />
                  {APPSTORE_URL && (
                    <BadgeLink
                      href={APPSTORE_URL}
                      src={AppStoreBadgeImg}
                      alt="Download on the App Store"
                      imgClass="h-20 sm:h-24"
                    />
                  )}
                </div>
              )}

              {/* ANDROID — аккуратные графические бейджи горизонтально */}
              {platform === "android" && (
                <div className="flex items-center justify中心 gap-4">
                  <BadgeLink
                    onClick={downloadECard}
                    src={PassesWalletBadge}
                    alt="Add to Passes Wallet"
                    imgClass="h-20 sm:h-24"
                  />
                  {GOOGLEPLAY_URL && (
                    <BadgeLink
                      href={GOOGLEPLAY_URL}
                      src={GooglePlayBadgeRu}
                      alt="Доступно в Google Play"
                      imgClass="h-20 sm:h-24"
                    />
                  )}
                </div>
              )}

              {/* Desktop/Other — чёрная кнопка + при наличии бейджи магазинов */}
              {platform === "other" && (
                <>
                  <Button onClick={downloadECard} variant="black">Скачать электронную карту</Button>

                  {(APPSTORE_URL || GOOGLEPLAY_URL) && (
                    <div className="flex items-center justify-center gap-4">
                      {APPSTORE_URL && (
                        <BadgeLink
                          href={APPSTORE_URL}
                          src={AppStoreBadgeImg}
                          alt="Download on the App Store"
                          imgClass="h-20 sm:h-24"
                        />
                      )}
                      {GOOGLEPLAY_URL && (
                        <Button as="a" href={GOOGLEPLAY_URL} variant="play" className="!w-auto">
                          <GooglePlayIcon />
                          Открыть в Google&nbsp;Play
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}

              <p className="text-xs text-zinc-500 text-center">
                {platform === "ios" && (
                  <>Скачается файл <span className="font-mono">.pkpass</span> для Apple Wallet.</>
                )}
                {platform === "android" && (
                  <>Откроется Passes Wallet. Если приложение не установлено, откроется Google Play для установки.</>
                )}
                {platform === "other" && (
                  <>Будет загружен файл e-карты. Откройте его в совместимом приложении.</>
                )}
              </p>
            </div>
          </div>
        )}

        <footer className="mt-6 text-xs text-gray-500 text-center">© {year}</footer>
      </div>
    </div>
  );
}