export interface LocalFatigueSlice {
  recoveryTimeHours: number;
  hoursSinceStimulus: number;
  loadScore: number;
}

export interface CentralFatigueInput {
  compoundHighRpeCount: number;
  boxingRounds: number;
}

export interface RecoveryInputs {
  sleepHours: number;
  carbsTargetRatio: number;
  hydrationTargetRatio: number;
}

export interface ReadinessInput {
  localFatigue: LocalFatigueSlice[];
  centralFatigue: CentralFatigueInput;
  recoveryInputs: RecoveryInputs;
}

export interface ReadinessScore {
  score: number;
  status: "green" | "amber" | "red";
  localPenalty: number;
  centralPenalty: number;
  recoveryBonus: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateReadinessScore(input: ReadinessInput): ReadinessScore {
  const localPenalty = Math.round(
    input.localFatigue.reduce((total, slice) => {
      const recoveryLeftRatio = clamp(
        (slice.recoveryTimeHours - slice.hoursSinceStimulus) / slice.recoveryTimeHours,
        0,
        1,
      );

      const loadPenalty = Math.min(18, slice.loadScore / 300);

      return total + recoveryLeftRatio * loadPenalty;
    }, 0),
  );

  const centralPenalty = Math.round(
    input.centralFatigue.compoundHighRpeCount * 6 + input.centralFatigue.boxingRounds * 1.5,
  );

  const recoveryBonus = Math.round(
    clamp((input.recoveryInputs.sleepHours - 6) * 3, 0, 8) +
      clamp(input.recoveryInputs.carbsTargetRatio, 0, 1) * 4 +
      clamp(input.recoveryInputs.hydrationTargetRatio, 0, 1) * 3,
  );

  const score = clamp(100 - localPenalty - centralPenalty + recoveryBonus, 0, 100);
  const status = score >= 75 ? "green" : score >= 50 ? "amber" : "red";

  return {
    score,
    status,
    localPenalty,
    centralPenalty,
    recoveryBonus,
  };
}
