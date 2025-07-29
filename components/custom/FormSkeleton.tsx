import { Skeleton } from "../ui/Skeleton";

const FormSkeleton = () => {
  return (
    <div className="space-y-8 pb-8">
      {/* Name Field */}
      <div className="space-y-2">
        <div>
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Subject Field */}
      <div className="space-y-2">
        <div>
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Topic Field */}
      <div className="space-y-2">
        <div>
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Style Field */}
      <div className="space-y-2">
        <div>
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Voice Field */}
      <div className="space-y-2">
        <div>
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Duration Field */}
      <div className="space-y-2">
        <div>
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

export default FormSkeleton;
