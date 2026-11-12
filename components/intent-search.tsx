"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Search, Sparkles, X } from "lucide-react";
import { userIntentSchema, type UserIntent } from "@/lib/schemas/contracts";
import { containsSensitiveContact } from "@/lib/domain/text";
import { formatMoney } from "@/lib/domain/format";
import { activeSchemas } from "@/lib/schemas/registry";
import { Button } from "./ui/button";
import { Badge } from "./ui/surfaces";

const examples = [
  { label: "سفر شنگن", text: "برای سفر شنگن بیمه با پوشش درمان می‌خواهم" },
  { label: "خسارت جزئی خودرو", text: "برای خودرو بیمه بدنه با پوشش خسارت جزئی می‌خواهم" },
  { label: "درمان خانواده", text: "برای خانواده بیمه درمان تکمیلی با پوشش دندان می‌خواهم" },
];
export function IntentSearch({ aiEnabled }: { aiEnabled: boolean }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [clarify, setClarify] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<UserIntent | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const selectedSchema = activeSchemas.find((schema) => schema.slug === intent?.typeSlug);

  async function analyze(value: string, chosenSlug?: string) {
    if (loading) return;
    if (value.trim().length < 3) {
      setError("لطفاً نیاز خود را کمی بیشتر توضیح دهید.");
      textArea.current?.focus();
      return;
    }
    if (containsSensitiveContact(value)) {
      setError("لطفاً شماره تماس، ایمیل، کد ملی، شماره کارت یا شبا وارد نکنید.");
      textArea.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setIntent(null);
    try {
      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, chosenSlug }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "در پردازش درخواست مشکلی پیش آمد؛ دوباره تلاش کنید.";
        throw new Error(message);
      }
      const result = userIntentSchema.parse(await response.json());
      if (!result.typeSlug) setClarify(result.clarification ?? "دنبال کدام نوع بیمه هستید؟");
      else {
        setClarify(null);
        setIntent(result);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "در پردازش درخواست مشکلی پیش آمد؛ دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }
  function continueToComparison() {
    if (!intent?.typeSlug) return;
    const params = new URLSearchParams();
    if (intent.priorities.length) params.set("priorities", intent.priorities.join(","));
    if (intent.constraints.length)
      params.set("required", intent.constraints.map((constraint) => constraint.fieldKey).join(","));
    if (intent.budgetToman !== null && intent.budgetToman > 0)
      params.set("budget", String(intent.budgetToman));
    // This is an untrusted URL hint, not proof of a model call; the comparison does not claim it as model provenance.
    params.set("intent", intent.mode);
    router.push(`/compare/${intent.typeSlug}?${params.toString()}`);
  }
  return (
    <div>
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          void analyze(text);
        }}
        className="rounded-2xl border border-border bg-surface-raised p-2 shadow-float transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
      >
        <label htmlFor="insurance-need" className="sr-only">
          نیاز بیمه‌ای خود را بنویسید
        </label>
        <div className="flex items-start gap-3 px-3 pt-4">
          <Search size={21} className="mt-1 shrink-0 text-brand-strong" aria-hidden="true" />
          <textarea
            ref={textArea}
            id="insurance-need"
            value={text}
            onFocus={() => setExampleIndex((i) => (i + 1) % examples.length)}
            onChange={(event) => {
              setText(event.target.value);
              setClarify(null);
              setIntent(null);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault();
                form.current?.requestSubmit();
              }
            }}
            rows={2}
            maxLength={500}
            placeholder={`مثلاً ${examples[exampleIndex].text}...`}
            className="min-h-[72px] w-full resize-none border-0 bg-transparent text-base leading-8 text-text placeholder:text-text-muted"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-2 pt-2">
          <span className="flex items-center gap-2 text-xs text-text-muted">
            <Sparkles size={16} className="text-brand-strong" aria-hidden="true" /> نیاز خود را به
            زبان ساده بنویسید
          </span>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
            {loading ? "در حال بررسی..." : "بگرد و مقایسه کن"}
            {!loading && <ArrowLeft size={17} aria-hidden="true" />}
          </Button>
        </div>
      </form>
      <p className="mt-3 text-xs leading-6 text-text-muted">
        {aiEnabled
          ? "برای تحلیل، متن شما به Anthropic ارسال می‌شود. "
          : "تحلیل در این نسخه قانون‌محور و آفلاین است. "}
        لطفاً اطلاعات شخصی یا پزشکی حساس وارد نکنید.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {clarify && (
        <div
          className="mt-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-card"
          aria-live="polite"
        >
          <p className="text-sm font-bold">{clarify}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeSchemas.map((schema) => (
              <Button
                key={schema.slug}
                variant="secondary"
                disabled={loading}
                onClick={() => void analyze(text, schema.slug)}
              >
                {schema.nameFa}
              </Button>
            ))}
          </div>
        </div>
      )}
      {intent && selectedSchema && (
        <section
          aria-label="تأیید برداشت از نیاز"
          aria-live="polite"
          className="mt-4 rounded-2xl border border-brand bg-surface-raised p-4 shadow-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold">فهمیدم:</h2>
            <Badge tone={intent.mode === "ai" ? "info" : "neutral"}>
              {intent.mode === "ai" ? "تشخیص با مدل" : "تشخیص قانون‌محور"}
            </Badge>
          </div>
          <label className="mt-3 block text-xs font-bold text-text-muted" htmlFor="intent-type">
            نوع بیمه
          </label>
          <select
            id="intent-type"
            value={intent.typeSlug ?? ""}
            onChange={(event) =>
              setIntent({
                ...intent,
                typeSlug: event.target.value,
                priorities: [],
                constraints: [],
              })
            }
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text"
          >
            {activeSchemas.map((schema) => (
              <option key={schema.slug} value={schema.slug}>
                {schema.nameFa}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            {intent.priorities.map((key) => {
              const field = selectedSchema.fields.find((item) => item.key === key);
              return field ? (
                <button
                  type="button"
                  key={key}
                  onClick={() =>
                    setIntent({
                      ...intent,
                      priorities: intent.priorities.filter((item) => item !== key),
                    })
                  }
                  aria-label={`حذف اولویت ${field.labelFa}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-info-soft px-3 text-xs font-bold text-info"
                >
                  اولویت: {field.labelFa}
                  <X size={15} aria-hidden="true" />
                </button>
              ) : null;
            })}
            {intent.constraints.map(({ fieldKey }) => {
              const field = selectedSchema.fields.find((item) => item.key === fieldKey);
              return field ? (
                <button
                  type="button"
                  key={fieldKey}
                  onClick={() =>
                    setIntent({
                      ...intent,
                      constraints: intent.constraints.filter((item) => item.fieldKey !== fieldKey),
                    })
                  }
                  aria-label={`حذف شرط ${field.labelFa}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-warning-soft px-3 text-xs font-bold text-warning"
                >
                  الزامی: {field.labelFa}
                  <X size={15} aria-hidden="true" />
                </button>
              ) : null;
            })}
            {intent.budgetToman !== null && intent.budgetToman > 0 && (
              <button
                type="button"
                onClick={() => setIntent({ ...intent, budgetToman: null })}
                aria-label="حذف بودجه"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-warning-soft px-3 text-xs font-bold text-warning"
              >
                بودجه سالانه: {formatMoney(intent.budgetToman)}
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-3 text-xs leading-6 text-text-muted">
            می‌توانید موردی را حذف کنید یا برای تغییر متن دوباره جست‌وجو کنید. بودجه فقط با حق‌بیمه
            سالانه نمونه سنجیده می‌شود.
          </p>
          <Button onClick={continueToComparison} className="mt-3 w-full sm:w-auto">
            ادامه به مقایسه <ArrowLeft size={17} aria-hidden="true" />
          </Button>
        </section>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-text-muted">برای نمونه:</span>
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={loading}
            onClick={() => {
              setText(example.text);
              setIntent(null);
              setClarify(null);
              setError(null);
              textArea.current?.focus();
            }}
            className="min-h-11 rounded-xl border border-border bg-surface-raised px-3 text-xs font-bold text-text-muted transition hover:border-brand hover:text-brand-strong disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}
