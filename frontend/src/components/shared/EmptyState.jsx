const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="w-16 h-16 bg-[#161b22] border border-[#30363d] rounded-2xl flex items-center justify-center mb-5">
            {icon}
        </div>
        <h3 className="text-white font-semibold text-base mb-1.5">{title}</h3>
        <p className="text-[#8b949e] text-sm text-center max-w-xs mb-5">{subtitle}</p>
        {actionLabel && onAction && (
            <button
                onClick={onAction}
                className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
                {actionLabel}
            </button>
        )}
    </div>
);

export default EmptyState;