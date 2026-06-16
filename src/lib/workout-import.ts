import type { ParsedExercise, ParsedSet, ParsedWorkoutBlock } from "@/lib/workout-text-parser";
import { supabase } from "@/integrations/supabase/client";

export async function replaceExerciseSets(exerciseId: string, sets: ParsedSet[]) {
  const { error: delError } = await supabase
    .from("exercise_sets")
    .delete()
    .eq("exercise_id", exerciseId);
  if (delError) throw delError;

  if (sets.length === 0) return;

  const { error } = await supabase.from("exercise_sets").insert(
    sets.map((s) => ({
      exercise_id: exerciseId,
      position: s.position,
      target_reps: s.target_reps,
      target_load: s.target_load,
      set_type: s.set_type,
    })),
  );
  if (error) throw error;
}

export async function appendExercisesToWorkout(
  workoutId: string,
  exercises: ParsedExercise[],
  startPosition: number,
) {
  for (let i = 0; i < exercises.length; i++) {
    const parsed = exercises[i];
    const { data: exercise, error } = await supabase
      .from("exercises")
      .insert({
        workout_id: workoutId,
        name: parsed.name,
        position: startPosition + i,
        rest_seconds: 90,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: setsError } = await supabase.from("exercise_sets").insert(
      parsed.sets.map((s) => ({
        exercise_id: exercise.id,
        position: s.position,
        target_reps: s.target_reps,
        target_load: s.target_load,
        set_type: s.set_type,
      })),
    );
    if (setsError) throw setsError;
  }
}

export async function importWorkoutRotina(
  blocks: ParsedWorkoutBlock[],
  alunoId: string | null,
  personalId: string,
  existingLetters: string[],
  routineId: string | null,
) {
  const used = new Set(existingLetters.map((l) => l.toUpperCase()));
  const createdIds: string[] = [];

  for (const block of blocks) {
    let letter = "";
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      if (!used.has(c)) {
        letter = c;
        used.add(c);
        break;
      }
    }
    if (!letter) throw new Error("Limite de treinos (A–Z) atingido.");

    const { data: workout, error } = await supabase
      .from("workouts")
      .insert({
        aluno_id: alunoId,
        personal_id: personalId,
        ...(routineId ? { routine_id: routineId } : {}),
        letter,
        title: block.suggestedTitle,
        muscles: block.suggestedMuscles || null,
        category: "hipertrofia",
        estimated_minutes: Math.max(45, block.exercises.length * 5),
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;

    await appendExercisesToWorkout(workout.id, block.exercises, 1);
    createdIds.push(workout.id);
  }

  return createdIds;
}
