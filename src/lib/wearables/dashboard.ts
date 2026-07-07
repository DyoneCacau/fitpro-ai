import { format } from "date-fns";
import { fetchStudentActiveDietPlan, fetchMealCompletions } from "@/lib/diet";
import type { HealthDashboardSummary, WearableProvider } from "./types";
import {
  fetchRecentActivities,
  fetchTodayAggregatedMetrics,
  fetchWearableConnections,
  fetchWorkoutDaysThisWeek,
} from "./wearables";

export async function buildHealthDashboard(userId: string): Promise<HealthDashboardSummary> {
  const today = format(new Date(), "yyyy-MM-dd");

  const [metrics, workoutDays, activities, connections, dietPlan] = await Promise.all([
    fetchTodayAggregatedMetrics(userId),
    fetchWorkoutDaysThisWeek(userId),
    fetchRecentActivities(userId, 5),
    fetchWearableConnections(userId),
    fetchStudentActiveDietPlan(userId).catch(() => null),
  ]);

  let mealsCompletedToday = 0;
  let mealsTotalToday = 0;

  if (dietPlan?.diet_meals?.length) {
    mealsTotalToday = dietPlan.diet_meals.length;
    const completions = await fetchMealCompletions(userId, today);
    mealsCompletedToday = completions.size;
  }

  return {
    date: today,
    steps: metrics.steps,
    activeCalories: Math.round(metrics.activeCalories),
    distanceKm: Math.round((metrics.distanceM / 1000) * 10) / 10,
    heartRateAvg: metrics.heartRateAvg,
    sleepHours: metrics.sleepMinutes != null ? Math.round((metrics.sleepMinutes / 60) * 10) / 10 : null,
    workoutDaysThisWeek: workoutDays,
    mealsCompletedToday,
    mealsTotalToday,
    recentActivities: activities,
    connectedProviders: connections.map((c) => c.provider as WearableProvider),
  };
}
