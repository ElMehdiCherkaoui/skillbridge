import { Role } from "@/types";

const roleGradients: Record<Role, string> = {
  admin: "bg-gradient-to-br from-brand-500 to-violet-600",
  student: "bg-gradient-to-br from-sky-500 to-indigo-600",
};

export function initialsFor(name: string): string {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({
  name,
  role = "student",
  size = "md",
}: {
  name: string;
  role?: Role;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";
  return (
    <div
      aria-hidden
      className={`${box} ${roleGradients[role]} flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white/60 dark:ring-white/10`}
    >
      {initialsFor(name)}
    </div>
  );
}