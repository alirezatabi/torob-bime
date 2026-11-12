"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Search, Sparkles } from "lucide-react";
import { userIntentSchema } from "@/lib/schemas/contracts";
import { containsSensitiveContact } from "@/lib/domain/text";
import { activeSchemas } from "@/lib/schemas/registry";

const examples = [
  { label: "بیمه برای سفر شنگن", text: "برای سفر شنگن بیمه با پوشش درمان می‌خواهم" },
  { label: "خسارت جزئی ماشین", text: "ماشین نو خریدم و نگران تصادف جزئی‌ام" },
  { label: "درمان تکمیلی خانواده", text: "برای مادرم بیمه درمان تکمیلی با پوشش دندان می‌خواهم" },
];

export function IntentSearch({ aiEnabled }: { aiEnabled: boolean }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [clarify, setClarify] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  async function analyze(value: string, chosenSlug?: string) {
    if (value.trim().length < 3) {
      setError("لطفاً نیاز خود را کمی بیشتر توضیح دهید.");
      textArea.current?.focus();
      return;
    }
    if (containsSensitiveContact(value)) {
      setError("لطفاً شماره تلفن یا ایمیل وارد نکنید.");
      textArea.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, chosenSlug }),
      });
      if (!response.ok) throw new Error("در پردازش درخواست مشکلی پیش آمد؛ دوباره تلاش کنید.");
      const intent = userIntentSchema.parse(await response.json());
      if (!intent.typeSlug) {
        setClarify(intent.clarification ?? "دنبال کدام نوع بیمه هستید؟");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (intent.priorities.length) params.set("priorities", intent.priorities.join(","));
      if (intent.constraints.length)
        params.set(
          "required",
          intent.constraints.map((constraint) => constraint.fieldKey).join(","),
        );
      if (intent.budgetToman !== null) params.set("budget", String(intent.budgetToman));
      params.set("intent", intent.mode);
      router.push(`/compare/${intent.typeSlug}?${params.toString()}`);
    } catch {
      setError("در پردازش درخواست مشکلی پیش آمد؛ دوباره تلاش کنید.");
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void analyze(text);
        }}
        className="rounded-2xl border border-[#e4e7eb] bg-white p-2 shadow-[0_10px_40px_rgba(33,42,55,.07)] transition focus-within:border-[#e6a0a6] focus-within:shadow-[0_10px_40px_rgba(223,56,69,.08)]"
      >
        <label htmlFor="insurance-need" className="sr-only">
          نیاز بیمه‌ای خود را بنویسید
        </label>
        <div className="flex items-start gap-2.5 px-3 pt-3">
          <Search size={20} className="mt-0.5 shrink-0 text-[#63707d]" aria-hidden="true" />
          <textarea
            ref={textArea}
            id="insurance-need"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setClarify(null);
              setError(null);
            }}
            rows={2}
            maxLength={500}
            placeholder="مثلاً برای سفر شنگن بیمه با پوشش درمان می‌خواهم..."
            className="min-h-[58px] w-full resize-none border-0 bg-transparent text-[14px] leading-7 text-ink outline-none placeholder:text-[#63707d] focus-visible:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#f1f2f4] px-2 pt-2">
          <span className="flex items-center gap-1.5 text-[11px] text-[#63707d] sm:text-[12px]">
            <Sparkles size={14} className="text-[#a34d55]" aria-hidden="true" /> نیازت رو به زبان
            خودت بنویس
          </span>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? (
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            ) : null}
            {loading ? "در حال بررسی..." : "بگرد و مقایسه کن"}
            {!loading && <ArrowLeft size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
      <p className="mt-2 text-[11px] leading-6 text-[#63707d]">
        {aiEnabled
          ? "برای تحلیل، متن به Anthropic ارسال می‌شود. "
          : "تحلیل در این نسخه قانون‌محور و آفلاین است. "}
        لطفاً اطلاعات شخصی یا پزشکی حساس وارد نکنید.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-xs leading-6 text-[#c52f3d]">
          {error}
        </p>
      )}
      {clarify && (
        <div
          className="mt-4 rounded-xl border border-[#eed8da] bg-white p-4 shadow-sm"
          aria-live="polite"
        >
          <p className="text-sm font-bold">{clarify}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeSchemas.map((schema) => (
              <button
                key={schema.slug}
                disabled={loading}
                type="button"
                onClick={() => void analyze(text, schema.slug)}
                className="rounded-lg border border-[#e8eaed] px-3 py-2 text-xs font-medium text-[#5f6977] hover:border-brand hover:text-brand disabled:opacity-50"
              >
                {schema.nameFa}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="me-1 text-[#63707d]">یا مثلاً:</span>
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={loading}
            onClick={() => {
              setText(example.text);
              void analyze(example.text);
            }}
            className="rounded-lg border border-[#e8eaed] bg-white px-2.5 py-1.5 text-[#63707d] transition hover:border-[#e7a4aa] hover:text-brand disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}
