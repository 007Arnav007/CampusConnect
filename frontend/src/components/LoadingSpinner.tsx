export default function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-12 w-12" : "h-8 w-8";
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sz} animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500`} />
    </div>
  );
}
