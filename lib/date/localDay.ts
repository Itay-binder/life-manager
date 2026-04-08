/** YYYY-MM-DD בלוח השנה המקומי של המשתמש */

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalYMD(): string {
  return toLocalYMD(new Date());
}

export function yesterdayLocalYMD(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalYMD(d);
}
