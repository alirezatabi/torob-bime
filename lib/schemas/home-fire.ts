import { insuranceSchemaSchema } from "./contracts";

// Roadmap example: populate fields and change status to activate the generic pipeline.
export const homeFireSchema = insuranceSchemaSchema.parse({
  slug: "home-fire",
  nameFa: "بیمه آتش‌سوزی و خانه",
  shortNameFa: "خانه و آتش‌سوزی",
  descriptionFa: "برای خانه و دارایی‌های آن",
  icon: "home",
  status: "roadmap",
  intentKeywords: [],
  fields: [],
});
