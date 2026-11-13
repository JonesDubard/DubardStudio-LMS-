/** Shows a short id only when another class in the same list uses the same name. */
export function classDisplayName(name: string, id: string, names: readonly string[]): string {
  const key = name.trim().toLowerCase();
  const shared = names.filter((item) => item.trim().toLowerCase() === key).length;
  if (shared < 2) return name;
  return `${name} (${id.slice(0, 8)})`;
}
