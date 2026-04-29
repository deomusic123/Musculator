import { z } from "zod";

export const mealSourceSchema = z.enum(["manual", "vision"]);

export const nutritionDetectionItemSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  grams: z.number().positive().optional(),
});

export const nutritionDetectionPayloadSchema = z.object({
  source: mealSourceSchema,
  items: z.array(nutritionDetectionItemSchema).min(1),
});

export type MealSource = z.infer<typeof mealSourceSchema>;
export type NutritionDetectionItem = z.infer<typeof nutritionDetectionItemSchema>;
export type NutritionDetectionPayload = z.infer<typeof nutritionDetectionPayloadSchema>;
