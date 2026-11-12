import { carBodySchema } from "./car-body";
import { healthSchema } from "./supplementary-health";
import { travelSchema } from "./travel";
import { homeFireSchema } from "./home-fire";
import { thirdPartySchema } from "./third-party";
import { lifeSchema } from "./life";
import { petSchema } from "./pet";
// scaffold:imports
import type { InsuranceSchema } from "./contracts";

// Schema registration only: the pipeline and comparison view do not branch on type.
export const insuranceSchemas: InsuranceSchema[] = [
  carBodySchema,
  healthSchema,
  travelSchema,
  homeFireSchema,
  thirdPartySchema,
  lifeSchema,
  petSchema,
  // scaffold:items
];
export const activeSchemas = insuranceSchemas.filter((schema) => schema.status === "active");
export function getInsuranceSchema(slug: string): InsuranceSchema | undefined {
  return insuranceSchemas.find((schema) => schema.slug === slug);
}
