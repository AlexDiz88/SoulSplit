import type { HeroGender } from "../art/portraits";

/** Английские / американские имена для генерации при создании героя. */
export const HERO_NAMES_BY_GENDER: Record<HeroGender, readonly string[]> = {
  male: [
    "Alex",
    "Andrew",
    "Anthony",
    "Brian",
    "Charles",
    "Christopher",
    "Daniel",
    "David",
    "Donald",
    "Edward",
    "George",
    "James",
    "Jason",
    "Jeffrey",
    "John",
    "Joseph",
    "Joshua",
    "Kenneth",
    "Kevin",
    "Mark",
    "Matthew",
    "Max",
    "Michael",
    "Paul",
    "Richard",
    "Robert",
    "Ronald",
    "Ryan",
    "Steven",
    "Thomas",
    "Timothy",
    "William",
  ],
  female: [
    "Amanda",
    "Ashley",
    "Barbara",
    "Betty",
    "Carol",
    "Cynthia",
    "Deborah",
    "Donna",
    "Dorothy",
    "Elizabeth",
    "Emily",
    "Jennifer",
    "Jessica",
    "Karen",
    "Kimberly",
    "Laura",
    "Linda",
    "Lisa",
    "Margaret",
    "Mary",
    "Melissa",
    "Michelle",
    "Nancy",
    "Patricia",
    "Rebecca",
    "Sandra",
    "Sarah",
    "Sharon",
    "Stephanie",
    "Susan",
  ],
};

/** Случайное имя из пула пола. Предпочитает имя, отличное от текущего. */
export function pickRandomHeroName(gender: HeroGender, current?: string): string {
  const pool = HERO_NAMES_BY_GENDER[gender];
  if (pool.length === 0) return "";
  if (pool.length === 1) return pool[0]!;

  const trimmed = current?.trim() ?? "";
  let name = pool[Math.floor(Math.random() * pool.length)]!;
  let guard = 0;
  while (name === trimmed && guard < 8) {
    name = pool[Math.floor(Math.random() * pool.length)]!;
    guard += 1;
  }
  return name;
}
