import { cn } from "@/lib/utils";

const Loading = ({ full = false }: { full?: boolean }) => {
  return (
    <div
      className={cn(
        "loader-wrapper",
        full && "absolute inset-0 z-10 !min-h-screen bg-white",
      )}
    >
      <div className="loader"></div>
    </div>
  );
};

export default Loading;
