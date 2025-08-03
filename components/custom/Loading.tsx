import { cn } from "@/lib/utils";

interface Props {
  full?: boolean;
  custom?: boolean;
}

const Loading = ({ full = false, custom }: Props) => {
  return (
    <div
      className={cn(
        "loader-wrapper",
        full && "absolute inset-0 z-10 !min-h-screen bg-white",
      )}
    >
      <div className={custom ? "loader-custom" : "loader"}></div>
    </div>
  );
};

export default Loading;
