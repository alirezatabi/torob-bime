import { insuranceSchemaSchema } from "./contracts";

export const thirdPartySchema = insuranceSchemaSchema.parse({
  slug: "third-party",
  nameFa: "بیمه شخص ثالث",
  shortNameFa: "شخص ثالث",
  descriptionFa: "برای مسئولیت در برابر دیگران",
  icon: "car",
  status: "roadmap",
  intentKeywords: [],
  fields: [],
});
