import { z } from "zod";
import { NextResponse } from "next/server";
import {
  getNutritionDayLog,
  saveNutritionDayLog,
} from "@/lib/nutrition/persistence";

const mealSlotSchema = z.enum([
  "desayuno",
  "almuerzo",
  "pre_entreno",
  "post_entreno",
  "cena",
  "snack",
]);

const nutritionDayLogSchema = z.object({
  targets: z.object({
    kcal: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fats: z.number().min(0),
    waterMl: z.number().min(0),
  }),
  extraWaterMl: z.number().min(0),
  meals: z.array(
    z.object({
      id: z.string().min(1),
      slot: mealSlotSchema,
      name: z.string().min(1),
      time: z
        .string()
        .regex(/^\d{2}:\d{2}$/),
      kcal: z.number().min(0),
      protein: z.number().min(0),
      carbs: z.number().min(0),
      fats: z.number().min(0),
      hydrationMl: z.number().min(0),
      notes: z.string().max(240).optional(),
    }),
  ),
});

const dayRequestSchema = z.object({
  clientId: z.string().uuid(),
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  dayLog: nutritionDayLogSchema,
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    const dateKey = url.searchParams.get("date");

    if (!clientId) {
      throw new Error("Falta clientId para consultar nutricion.");
    }

    if (!dateKey) {
      throw new Error("Falta date para consultar nutricion.");
    }

    const defaultTargets = {
      kcal: Number(url.searchParams.get("defaultKcal") ?? "0"),
      protein: Number(url.searchParams.get("defaultProtein") ?? "0"),
      carbs: Number(url.searchParams.get("defaultCarbs") ?? "0"),
      fats: Number(url.searchParams.get("defaultFats") ?? "0"),
      waterMl: Number(url.searchParams.get("defaultWaterMl") ?? "0"),
    };

    const response = await getNutritionDayLog({
      clientId,
      dateKey,
      defaultTargets,
    });

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo leer el dia de nutricion.",
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = dayRequestSchema.parse(await request.json());
    const response = await saveNutritionDayLog(payload);

    return NextResponse.json(response);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo guardar el dia de nutricion.",
      },
      { status: 400 },
    );
  }
}
