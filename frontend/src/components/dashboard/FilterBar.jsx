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
  <div className="cr-filter">
    <div className="cr-filter-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onStatusFilterChange(tab.key)}
          className={`cr-filter-tab${statusFilter === tab.key ? " active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    <div className="cr-filter-search">
      <span className="ico">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search candidate…"
      />
    </div>
  </div>
);

export default FilterBar;