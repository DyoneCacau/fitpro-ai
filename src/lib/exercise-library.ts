export type ExerciseCategory =
  | "peito"
  | "costas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "pernas"
  | "gluteos"
  | "abdomen"
  | "cardio"
  | "funcional";

export const EXERCISE_CATEGORIES: { id: ExerciseCategory | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "peito", label: "Peito" },
  { id: "costas", label: "Costas" },
  { id: "ombros", label: "Ombros" },
  { id: "biceps", label: "Bíceps" },
  { id: "triceps", label: "Tríceps" },
  { id: "pernas", label: "Pernas" },
  { id: "gluteos", label: "Glúteos" },
  { id: "abdomen", label: "Abdômen" },
  { id: "cardio", label: "Cardio" },
  { id: "funcional", label: "Funcional" },
];

export const EXERCISE_LIBRARY: {
  name: string;
  category: ExerciseCategory;
  muscle_group: string;
}[] = [
  { name: "Supino reto com barra", category: "peito", muscle_group: "Peitoral" },
  { name: "Supino inclinado com halteres", category: "peito", muscle_group: "Peitoral superior" },
  { name: "Crucifixo na polia", category: "peito", muscle_group: "Peitoral" },
  { name: "Flexão de braços", category: "peito", muscle_group: "Peitoral" },
  { name: "Puxada frontal na polia", category: "costas", muscle_group: "Dorsal" },
  { name: "Remada curvada com barra", category: "costas", muscle_group: "Dorsal" },
  { name: "Remada unilateral com halter", category: "costas", muscle_group: "Dorsal" },
  { name: "Barra fixa pronada", category: "costas", muscle_group: "Dorsal" },
  { name: "Desenvolvimento com halteres", category: "ombros", muscle_group: "Deltoide" },
  { name: "Elevação lateral", category: "ombros", muscle_group: "Deltoide lateral" },
  { name: "Elevação frontal", category: "ombros", muscle_group: "Deltoide anterior" },
  { name: "Crucifixo invertido", category: "ombros", muscle_group: "Deltoide posterior" },
  { name: "Rosca direta com barra", category: "biceps", muscle_group: "Bíceps" },
  { name: "Rosca alternada com halteres", category: "biceps", muscle_group: "Bíceps" },
  { name: "Rosca martelo", category: "biceps", muscle_group: "Braquial" },
  { name: "Tríceps testa com barra W", category: "triceps", muscle_group: "Tríceps" },
  { name: "Tríceps na polia", category: "triceps", muscle_group: "Tríceps" },
  { name: "Mergulho no banco", category: "triceps", muscle_group: "Tríceps" },
  { name: "Agachamento livre", category: "pernas", muscle_group: "Quadríceps" },
  { name: "Leg press 45°", category: "pernas", muscle_group: "Quadríceps" },
  { name: "Cadeira extensora", category: "pernas", muscle_group: "Quadríceps" },
  { name: "Mesa flexora", category: "pernas", muscle_group: "Posterior" },
  { name: "Stiff com barra", category: "pernas", muscle_group: "Posterior" },
  { name: "Afundo com halteres", category: "pernas", muscle_group: "Quadríceps" },
  { name: "Panturrilha em pé", category: "pernas", muscle_group: "Panturrilha" },
  { name: "Elevação pélvica", category: "gluteos", muscle_group: "Glúteos" },
  { name: "Abdução na polia", category: "gluteos", muscle_group: "Glúteo médio" },
  { name: "Abdominal crunch", category: "abdomen", muscle_group: "Reto abdominal" },
  { name: "Prancha isométrica", category: "abdomen", muscle_group: "Core" },
  { name: "Abdominal infra", category: "abdomen", muscle_group: "Infra abdominal" },
  { name: "Esteira corrida", category: "cardio", muscle_group: "Cardio" },
  { name: "Bike ergométrica", category: "cardio", muscle_group: "Cardio" },
  { name: "Elíptico", category: "cardio", muscle_group: "Cardio" },
  { name: "Burpee", category: "funcional", muscle_group: "Corpo inteiro" },
  { name: "Kettlebell swing", category: "funcional", muscle_group: "Posterior" },
  { name: "Farmer walk", category: "funcional", muscle_group: "Core" },
];

export const WORKOUT_CATEGORY_LABELS: Record<string, string> = {
  forca: "Força",
  hipertrofia: "Hipertrofia",
  cardio: "Cardio",
  funcional: "Funcional",
  mobilidade: "Mobilidade",
};

export const SET_TYPE_LABELS: Record<string, string> = {
  normal: "Normal",
  drop: "Drop",
  falha: "Falha",
  rest_pause: "Rest-pause",
};
