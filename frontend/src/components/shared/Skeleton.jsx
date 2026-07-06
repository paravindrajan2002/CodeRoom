// Base shimmer block — building block for all skeleton layouts
export const SkeletonBlock = ({ className = '' }) => (
    <div className={`bg-[#21262d] rounded-lg overflow-hidden relative ${className}`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-[#30363d]/60 to-transparent" />
    </div>
);

// Interview/Question card skeleton — mimics the real card layout
export const CardSkeleton = () => (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex items-center justify-between">
        <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-4 w-24" />
            </div>
            <SkeletonBlock className="h-3 w-64" />
            <SkeletonBlock className="h-3 w-40" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <SkeletonBlock className="h-8 w-28 rounded-lg" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
    </div>
);

export const CardSkeletonList = ({ count = 4 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
        ))}
    </div>
);

// Question bank card skeleton — slightly different shape
export const QuestionCardSkeleton = () => (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-5 w-16" />
                </div>
                <SkeletonBlock className="h-3 w-full max-w-md" />
                <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-5 w-16 rounded-full" />
                    <SkeletonBlock className="h-5 w-20 rounded-full" />
                </div>
            </div>
            <SkeletonBlock className="h-8 w-16 rounded-lg shrink-0" />
        </div>
    </div>
);

export const QuestionCardSkeletonList = ({ count = 5 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <QuestionCardSkeleton key={i} />
        ))}
    </div>
);