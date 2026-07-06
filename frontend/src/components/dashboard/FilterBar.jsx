const TABS = [
  { key: "ALL", label: "All" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REVIEWED", label: "Reviewed" },
];

/**
 * Status tabs + candidate search — pure controlled component,
 * filtering logic lives in Dashboard.jsx.
 */
const FilterBar = ({ statusFilter, onStatusFilterChange, search, onSearchChange }) => (
  <div className="flex items-center gap-3 flex-wrap">
    <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onStatusFilterChange(tab.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            statusFilter === tab.key
              ? "bg-[#238636] text-white"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    <div className="relative">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8b949e"
        strokeWidth="2"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search candidate..."
        className="bg-[#161b22] border border-[#30363d] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-[#484f58] focus:outline-none focus:border-[#3fb950] transition-colors w-44"
      />
    </div>
  </div>
);

export default FilterBar;
