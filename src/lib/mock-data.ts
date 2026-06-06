export type SetType = "normal" | "drop" | "failure" | "rest-pause";

export interface ExerciseSet {
  id: string;
  reps: string;
  type?: SetType;
  prevLoad?: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  restSeconds: number;
  note?: string;
  image: string;
}

export interface Workout {
  id: string;
  letter: string;
  title: string;
  muscles: string;
  exercises: Exercise[];
  estimatedMinutes: number;
}

export const todayWorkout: Workout = {
  id: "w-today",
  letter: "A",
  title: "Peito, Ombro e Tríceps",
  muscles: "Peitoral · Deltoides · Tríceps",
  estimatedMinutes: 70,
  exercises: [
    {
      id: "e1",
      name: "Supino Reto com Halteres",
      muscleGroup: "Peitoral",
      restSeconds: 90,
      image: "💪",
      sets: [
        { id: "s1", reps: "12", prevLoad: 28 },
        { id: "s2", reps: "10", prevLoad: 30 },
        { id: "s3", reps: "10", prevLoad: 30 },
        { id: "s4", reps: "8", prevLoad: 32 },
      ],
    },
    {
      id: "e2",
      name: "Supino Inclinado com Halteres",
      muscleGroup: "Peitoral Superior",
      restSeconds: 90,
      note: "Última série em Drop Set",
      image: "🏋️",
      sets: [
        { id: "s1", reps: "12", prevLoad: 24 },
        { id: "s2", reps: "10", prevLoad: 26 },
        { id: "s3", reps: "10", prevLoad: 26 },
        { id: "s4", reps: "8", type: "drop", prevLoad: 28 },
      ],
    },
    {
      id: "e3",
      name: "Cross Over",
      muscleGroup: "Peitoral",
      restSeconds: 60,
      image: "🔀",
      sets: [
        { id: "s1", reps: "12", prevLoad: 15 },
        { id: "s2", reps: "10", prevLoad: 17 },
        { id: "s3", reps: "10", prevLoad: 17 },
        { id: "s4", reps: "8", prevLoad: 20 },
      ],
    },
    {
      id: "e4",
      name: "Peck Deck Peitoral",
      muscleGroup: "Peitoral",
      restSeconds: 60,
      image: "🦋",
      sets: [
        { id: "s1", reps: "12", prevLoad: 40 },
        { id: "s2", reps: "10", prevLoad: 45 },
        { id: "s3", reps: "10", prevLoad: 45 },
        { id: "s4", reps: "8", prevLoad: 50 },
      ],
    },
    {
      id: "e5",
      name: "Desenvolvimento com Halteres",
      muscleGroup: "Ombros",
      restSeconds: 90,
      image: "🪖",
      sets: [
        { id: "s1", reps: "12", prevLoad: 18 },
        { id: "s2", reps: "10", prevLoad: 20 },
        { id: "s3", reps: "8", prevLoad: 22 },
      ],
    },
    {
      id: "e6",
      name: "Elevação Lateral",
      muscleGroup: "Deltoide Lateral",
      restSeconds: 45,
      image: "👐",
      sets: [
        { id: "s1", reps: "15", prevLoad: 10 },
        { id: "s2", reps: "12", prevLoad: 12 },
        { id: "s3", reps: "12", prevLoad: 12 },
        { id: "s4", reps: "10", prevLoad: 14 },
      ],
    },
    {
      id: "e7",
      name: "Tríceps Corda",
      muscleGroup: "Tríceps",
      restSeconds: 60,
      image: "🪢",
      sets: [
        { id: "s1", reps: "15", prevLoad: 22 },
        { id: "s2", reps: "12", prevLoad: 25 },
        { id: "s3", reps: "10", prevLoad: 27 },
        { id: "s4", reps: "8", prevLoad: 30 },
      ],
    },
    {
      id: "e8",
      name: "Tríceps Barra Reta no Pully",
      muscleGroup: "Tríceps",
      restSeconds: 60,
      image: "📏",
      sets: [
        { id: "s1", reps: "12", prevLoad: 30 },
        { id: "s2", reps: "10", prevLoad: 32 },
        { id: "s3", reps: "10", prevLoad: 32 },
        { id: "s4", reps: "8", type: "failure", prevLoad: 35 },
      ],
    },
    {
      id: "e9",
      name: "Tríceps Francês",
      muscleGroup: "Tríceps",
      restSeconds: 60,
      image: "🇫🇷",
      sets: [
        { id: "s1", reps: "12", prevLoad: 14 },
        { id: "s2", reps: "10", prevLoad: 16 },
        { id: "s3", reps: "8", prevLoad: 18 },
      ],
    },
  ],
};

export const weekSchedule = [
  { day: "S", label: "Seg", done: true, today: false },
  { day: "T", label: "Ter", done: true, today: false },
  { day: "Q", label: "Qua", done: false, today: true },
  { day: "Q", label: "Qui", done: false, today: false },
  { day: "S", label: "Sex", done: false, today: false },
  { day: "S", label: "Sáb", done: false, today: false },
  { day: "D", label: "Dom", done: false, today: false },
];

export const stats = {
  streak: 12,
  totalWorkouts: 87,
  weekVolume: "32.450",
};
