/** An explicitly fictional annual amount, not an insurer quote or real price. */
export const samplePremiumField = {
  key: "sample_premium",
  labelFa: "حق‌بیمه سالانه نمونه",
  kind: "number" as const,
  unit: "toman" as const,
  isPremium: true,
  higherIsBetter: false,
  weight: 1,
  keywords: ["حق‌بیمه نمونه", "حق بیمه نمونه"],
  anchors: ["حق‌بیمه سالانه نمونه", "حق بیمه سالانه نمونه"],
  group: "حق‌بیمه نمونه",
  glossaryFa: "مبلغ ساختگی سالانه فقط برای نمایش شیوه مقایسه است؛ قیمت یا پیشنهاد واقعی نیست.",
};
