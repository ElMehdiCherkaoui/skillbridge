export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box =
    size === "sm" ? "h-8 w-8 rounded-[10px] text-sm" : size === "lg" ? "h-14 w-14 rounded-2xl text-2xl" : "h-10 w-10 rounded-xl text-base";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${box} flex items-center justify-center bg-gradient-to-br from-brand-500 via-indigo-500 to-violet-600 font-extrabold text-white shadow-glow`}
      >
        SB
      </div>
      <div className={`${text} font-extrabold tracking-tight text-ink`}>
        Skill<span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">Bridge</span>
      </div>
    </div>
  );
}