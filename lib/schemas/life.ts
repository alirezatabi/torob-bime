import { insuranceSchemaSchema } from "./contracts";

export const lifeSchema = insuranceSchemaSchema.parse({
  slug: "life",
  nameFa: "بیمه عمر",
  shortNameFa: "عمر",
  descriptionFa: "برای آینده و حمایت مالی خانواده",
  icon: "heart",
  status: "roadmap",
  intentKeywords: [],
  fields: [],
});
