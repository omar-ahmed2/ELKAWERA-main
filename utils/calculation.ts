import { Player, Position, PhysicalStats } from '../types';

export const computeOverall = (stats: PhysicalStats, position: Position): number => {
  // Weights based on position
  let weights: Partial<Record<keyof PhysicalStats, number>> = {};

  switch (position) {
    case 'CF':
      // Forward: Shooting, Pace, Dribbling, Physical, Acceleration
      weights = { shooting: 0.25, pace: 0.15, dribbling: 0.15, physical: 0.15, passing: 0.05, acceleration: 0.1, agility: 0.1, stamina: 0.05 };
      break;

    case 'CB':
      // Defender: Defending, Physical, Pace, Stamina
      weights = { defending: 0.35, physical: 0.3, pace: 0.1, passing: 0.1, stamina: 0.1, acceleration: 0.05 };
      break;

    case 'GK':
      // Goalkeeper: Agility (Reflexes), Physical (Strength), Defending (Positioning), Passing
      weights = { agility: 0.3, physical: 0.2, defending: 0.25, passing: 0.15, stamina: 0.1 };
      break;

    default:
      // Fallback for any legacy positions (should not happen)
      weights = { passing: 0.2, dribbling: 0.2, shooting: 0.2, defending: 0.2, physical: 0.2 };
  }

  let totalScore = 0;
  let totalWeight = 0;

  (Object.keys(stats) as Array<keyof PhysicalStats>).forEach((key) => {
    const weight = weights[key] || 0.01; // default low weight if not specified
    totalScore += stats[key] * weight;
    totalWeight += weight;
  });

  // Normalize if weights don't add exactly to 1 (though they should)
  return Math.round(totalScore / totalWeight);
};

export const getCardType = (overall: number): 'Silver' | 'Gold' | 'Elite' | 'Platinum' => {
  if (overall >= 90) return 'Platinum';
  if (overall >= 80) return 'Elite';
  if (overall >= 70) return 'Gold';
  return 'Silver';
};

interface PerformanceMetrics {
  goals?: number;
  assists?: number;
  defensiveContributions?: number;
  cleanSheets?: number;
  saves?: number;
  penaltySaves?: number; // Not used in specific formula yet but kept for completeness
  ownGoals?: number;
  goalsConceded?: number;
  penaltyMissed?: number;
  matchesPlayed?: number; // Not used in new formula but kept signature compatible conceptually
}

export const computeOverallWithPerformance = (
  baseScore: number,
  position: Position,
  perf: PerformanceMetrics
): number => {
  let bonus = 0;

  const goals = perf.goals || 0;
  const assists = perf.assists || 0;
  const defContrib = perf.defensiveContributions || 0;
  const cleanSheets = perf.cleanSheets || 0;
  const saves = perf.saves || 0;
  const ownGoals = perf.ownGoals || 0;
  const goalsConceded = perf.goalsConceded || 0;
  const penaltyMissed = perf.penaltyMissed || 0;

  // --- GENERAL RULES (All Players) ---
  // 2 penalty miss = -1 ovr
  if (penaltyMissed > 0) {
    bonus -= Math.floor(penaltyMissed / 2);
  }
  // 2 own goals = -1 ovr
  if (ownGoals > 0) {
    bonus -= Math.floor(ownGoals / 2);
  }

  // --- POSITION SPECIFIC RULES ---
  switch (position) {
    case 'CF':
      // 4 goals = +1 ovr
      bonus += Math.floor(goals / 4);
      // 3 assists = +1 ovr
      bonus += Math.floor(assists / 3);
      // 10 def contribution = +1
      bonus += Math.floor(defContrib / 10);
      break;

    case 'CB':
      // 8 def con = +1 ovr
      bonus += Math.floor(defContrib / 8);
      // 1 clean sheet = +1
      bonus += Math.floor(cleanSheets / 1); // effectively +cleanSheets
      break;

    case 'GK':
      // 6 saves = +1 ovr
      bonus += Math.floor(saves / 6);
      // 1 goal = +1 ovr
      bonus += Math.floor(goals / 1); // Rare but possible
      // 2 assists = +1 ovr
      bonus += Math.floor(assists / 2);
      // 4 goals conceeced = -1 ovr
      if (goalsConceded > 0) {
        bonus -= Math.floor(goalsConceded / 4);
      }
      // 1 penalty save = +1 ovr
      bonus += Math.floor(perf.penaltySaves || 0);
      break;
  }

  // Apply bonus to base score, cap at 99 (and maybe floor at 0 or base?)
  // Assuming OVR shouldn't drop below reasonable limit, but math allows for net negative bonus.
  // Standard FIFA/EAFC methodology caps min/max.
  let finalScore = baseScore + bonus;

  if (finalScore > 99) finalScore = 99;
  if (finalScore < 1) finalScore = 1;

  return Math.round(finalScore);
};
