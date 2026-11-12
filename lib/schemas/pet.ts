import { insuranceSchemaSchema } from "./contracts";

// Roadmap only: define coverage fields before activating.
export const petSchema = insuranceSchemaSchema.parse({
  slug: "pet",
  nameFa: "بیمه حیوانات خانگی",
  shortNameFa: "بیمه حیوانات خانگی",
  descriptionFa: "به‌زودی به مقایسه اضافه می‌شود",
  icon: "shield",
  status: "roadmap",
  intentKeywords: [],
  fields: [],
});
