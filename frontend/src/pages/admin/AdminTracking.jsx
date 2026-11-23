import { useEffect, useState } from "react";
import { Avatar, Button, Input, Table, Tooltip } from "antd";
import {
  CalendarOutlined,
  ClearOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  CustomerServiceOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import API from "../../api/api";
import "./AdminTracking.css";

/**
 * CoreLynx — Operations Dashboard content.
 * The parent AdminLayout owns the sidebar and top header.
 * Authentication, API endpoint, summary calculations, search submission,
 * refresh, and paginated tracking records retain their existing behavior.
 */

const REMARK_TONES = {
  Interested: "success",
  "Not Interested": "danger",
  "Call Back Later": "info",
  "No Answer": "warning",
  "Wrong Number": "danger",
  "Already Dispatched": "info",
  "Need Follow Up": "purple",
  Voicemail: "purple",
  "Number Busy": "warning",
};

const AVATAR_TONES = ["azure", "violet", "mint", "peach", "rose"];

function getAvatarTone(name = "") {
  const total = Array.from(name).reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return AVATAR_TONES[total % AVATAR_TONES.length];
}

function Sparkline() {
  // Decorative SVG only; no made-up historical KPI values.
  return (
    <svg className="cl-tracking-spark" viewBox="0 0 200 70" aria-hidden="true" focusable="false">
      <path className="cl-tracking-spark-fill" d="M0 63 C15 57 20 42 37 43 S64 58 79 43 S101 34 112 41 S138 17 153 24 S177 34 194 7 L200 5 L200 70 L0 70 Z" />
      <path className="cl-tracking-spark-line" d="M0 63 C15 57 20 42 37 43 S64 58 79 43 S101 34 112 41 S138 17 153 24 S177 34 194 7 L200 5" />
    </svg>
  );
}

function MetricCard({ title, value, icon, tone, label }) {
  return (
    <div
      className={`cl-tracking-metric cl-tracking-metric--${tone}`}
      aria-label={`${title}: ${label ?? value}`}
    >
      <div className="cl-tracking-metric-inner">

        <div className="cl-tracking-metric-icon">
          <img
            src={icon}
            alt=""
            className="cl-tracking-custom-icon"
          />
        </div>

        <div className="cl-tracking-metric-copy">
          <span className="cl-tracking-metric-label">{title}</span>

          <strong className="cl-tracking-metric-value">
            {Number(value).toLocaleString("en-US")}
          </strong>
        </div>

        <Sparkline />

      </div>
    </div>
  );
}

function RemarkBadge({ remark }) {
  const tone = remark ? REMARK_TONES[remark] || "neutral" : "neutral";
  return (
    <span className={`cl-tracking-remark cl-tracking-remark--${tone}`}>
      {remark || "Not Started"}
    </span>
  );
}

function ProgressCell({ completed, total }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  // Some real sheets report more completed records than their lead count;
  // keep the true percentage visible and cap only the rendered bar at 100%.
  const visualPercent = Math.max(0, Math.min(percentage, 100));
  const tone = percentage >= 100 ? "complete" : percentage >= 50 ? "steady" : "starting";

  return (
    <div className={`cl-tracking-progress cl-tracking-progress--${tone}`}>
      <div className="cl-tracking-progress-top">
        <div
          className="cl-tracking-progress-track"
          role="progressbar"
          aria-label="Leads completed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={visualPercent}
          aria-valuetext={`${completed} of ${total} leads completed, ${percentage}%`}
        >
          <div className="cl-tracking-progress-fill" style={{ width: `${visualPercent}%` }} />
        </div>
        <strong className="cl-tracking-progress-value">{percentage}%</strong>
      </div>
      <span className="cl-tracking-progress-description">
        {completed.toLocaleString("en-US")} of {total.toLocaleString("en-US")} leads completed
      </span>
    </div>
  );
}

export default function AdminTracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const res = await API.get("/lead-sheets/admin/tracking/all");
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch tracking data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, []);

  const handleSearch = () => {
    setAppliedSearch(searchText.trim());
  };

  const handleClearSearch = () => {
    setSearchText("");
    setAppliedSearch("");
  };

  // Keep the existing search scope: agent name, email and sheet name.
  const filteredData = data.filter((item) => {
    if (!appliedSearch) return true;
    const query = appliedSearch.toLowerCase();
    const agentName = item.agent?.name?.toLowerCase() || "";
    const agentEmail = item.agent?.email?.toLowerCase() || "";
    const sheetName = item.leadSheet?.sheetName?.toLowerCase() || "";
    return agentName.includes(query) || agentEmail.includes(query) || sheetName.includes(query);
  });

  const totalAgents = new Set(data.map((item) => item.agent?._id).filter(Boolean)).size;
  const totalSheets = data.length;
  const completedLeads = data.reduce(
    (sum, item) => sum + (item.completedLeads?.length || 0),
    0
  );

  const columns = [
    {
      title: "Agent",
      key: "agent",
      width: 260,
      sorter: (a, b) => (a.agent?.name || "").localeCompare(b.agent?.name || ""),
      render: (_, row) => {
        const name = row.agent?.name || "Unknown Agent";
        return (
          <div className="cl-tracking-agent">
            <Avatar className={`cl-tracking-agent-avatar cl-tracking-agent-avatar--${getAvatarTone(name)}`} size={35}>
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <div className="cl-tracking-agent-details">
              <Tooltip title={name} mouseEnterDelay={0.7}>
                <span className="cl-tracking-agent-name">{name}</span>
              </Tooltip>
              <Tooltip title={row.agent?.email || ""} mouseEnterDelay={0.7}>
                <span className="cl-tracking-agent-email">{row.agent?.email || "-"}</span>
              </Tooltip>
            </div>
          </div>
        );
      },
    },
    {
      title: "Lead Sheet",
      key: "sheet",
      width: 183,
      sorter: (a, b) => (a.leadSheet?.sheetName || "").localeCompare(b.leadSheet?.sheetName || ""),
      render: (_, row) => (
        <span className="cl-tracking-sheet-pill" title={row.leadSheet?.sheetName || ""}>
          <FolderOpenOutlined aria-hidden="true" />
          <span>{row.leadSheet?.sheetName || "-"}</span>
        </span>
      ),
    },
    {
      title: "Progress",
      key: "progress",
      width: 255,
      render: (_, row) => (
        <ProgressCell
          completed={row.completedLeads?.length || 0}
          total={row.leadSheet?.leads?.length || 0}
        />
      ),
    },
    {
      title: "Current Row",
      key: "currentRow",
      width: 118,
      render: (_, row) => (
        <span className="cl-tracking-row-pill">Row {(row.currentIndex ?? 0) + 1}</span>
      ),
    },
    {
      title: "Last Remark",
      key: "remark",
      width: 153,
      render: (_, row) => <RemarkBadge remark={row.completedLeads?.at(-1)?.remark} />,
    },
    {
      title: "Last Updated",
      key: "lastUpdated",
      width: 189,
      sorter: (a, b) => {
        const aTime = a.completedLeads?.at(-1)?.submittedAt;
        const bTime = b.completedLeads?.at(-1)?.submittedAt;
        return (aTime ? new Date(aTime).getTime() : 0) - (bTime ? new Date(bTime).getTime() : 0);
      },
      render: (_, row) => {
        const timestamp = row.completedLeads?.at(-1)?.submittedAt;
        return (
          <span className="cl-tracking-updated">
            <CalendarOutlined aria-hidden="true" />
            <span>{timestamp ? new Date(timestamp).toLocaleString() : "-"}</span>
          </span>
        );
      },
    },
  ];

  return (
    <section className="cl-tracking-dashboard" aria-label="Operations dashboard">
    <div className="cl-tracking-kpis">

  <MetricCard
    title="Active Agents"
    value={totalAgents}
    icon="/images/personsIcon.png"
    tone="blue"
  />

  <MetricCard
    title="Assigned Sheets"
    value={totalSheets}
    icon="/images/excel.png"
    tone="purple"
  />

  <MetricCard
    title="Completed Leads"
    value={completedLeads}
    icon="/images/completeCallIcon.png"
    tone="green"
  />

</div>

      <section id="live-tracking" className="cl-tracking-panel" aria-labelledby="cl-tracking-title">
        <header className="cl-tracking-panel-header">
          <div className="cl-tracking-panel-heading">
            <div className="cl-tracking-panel-title-icon"><CustomerServiceOutlined aria-hidden="true" /></div>
            <h2 id="cl-tracking-title">Live Agent Lead Tracking</h2>
          </div>
          <div className="cl-tracking-toolbar">
         <Input
  className="cl-tracking-search"
  placeholder="Search by agent, lead sheet or email..."
  aria-label="Search tracking records"
  allowClear
  value={searchText}
  onChange={(event) => setSearchText(event.target.value)}
  onPressEnter={handleSearch}
  prefix={
    <button
      type="button"
      className="cl-search-icon-btn"
      onClick={handleSearch}
      aria-label="Search"
    >
      <SearchOutlined />
    </button>
  }
/>
            <Button
              type="primary"
              className="cl-tracking-refresh"
              icon={<ReloadOutlined spin={loading} />}
              loading={loading}
              onClick={fetchTracking}
            >
              Refresh Data
            </Button>
            <Button
              className="cl-tracking-clear"
              icon={<ClearOutlined />}
              onClick={handleClearSearch}
              disabled={!searchText && !appliedSearch}
            >
              Clear
            </Button>
          </div>
        </header>

        <Table
          className="cl-tracking-table"
          loading={loading}
          rowKey="_id"
          columns={columns}
          dataSource={filteredData}
          scroll={{ x: 1160 }}
          size="middle"
          tableLayout="fixed"
          pagination={{
            defaultPageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: ["8", "10", "20", "50", "100"],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} records`,
            position: ["bottomRight"],
          }}
          locale={{
            emptyText: appliedSearch
              ? `No results found for "${appliedSearch}"`
              : "No tracking records found",
          }}
        />
      </section>
    </section>
  );
}
