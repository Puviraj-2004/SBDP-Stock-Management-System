export function startOfToday() {
  const now = new Date();
  return dateInputToDate([
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-"));
}

export function inTwoMonths() {
  const date = startOfToday();
  date.setUTCMonth(date.getUTCMonth() + 2);
  return date;
}

export function dateInputToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = typeof date === "string" ? new Date(date) : date;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function displayDate(date: Date | string | null | undefined) {
  const value = toDateInputValue(date);
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function money(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2
  }).format(number);
}
