import { useEffect, useRef, useState } from "react";
import { Card, Empty, Select, Skeleton, Table, Tag, Tooltip as AntTooltip, message } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import API from "../../api/api";
import "./AgentReports.css";

// All data still comes from the existing Agent Reports API.
// Use stable colors for familiar call results so colors do not change between sheets.
const REMARK_COLORS = {
  Interested: "#15a67c",
  "Not Interested": "#0874f9",
  "Call Back Later": "#eea342",
  "No Answer": "#f08b55",
  "Wrong Number": "#e56e78",
  "Already Dispatched": "#785df7",
  "Need Follow Up": "#a15fe7",
  Voicemail: "#23a6ba",
  "Number Busy": "#c48f32",
};
const FALLBACK_COLORS = ["#0874f9", "#14a880", "#785df7", "#f0a13b", "#22a1bb"];
const getRemarkColor = (name, index = 0) =>
  REMARK_COLORS[name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

function NumberCard({ title, value, icon, tone, progress }) {
  return (
    <div className={`cl-report-kpi cl-report-kpi--${tone}`}>
      <div className="cl-report-kpi-icon" aria-hidden="true">{icon}</div>
      <div className="cl-report-kpi-body">
        <div className="cl-report-kpi-label">{title}</div>
        <div className="cl-report-kpi-number">{value}</div>
        {progress !== undefined && (
          <div
            className="cl-report-progress-track"
            role="progressbar"
            aria-label="Sheet completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, Number(progress) || 0))}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, Number(progress) || 0))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function PanelTitle({ icon, children, description }) {
  return (
    <div className="cl-report-panel-heading">
      <span className="cl-report-panel-icon" aria-hidden="true">{icon}</span>
      <div className="cl-report-panel-heading-text">
        <h2>{children}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

export default function AgentReports() {
  const [sheets, setSheets] = useState([]);
  const [sheetId, setSheetId] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const latestRequest = useRef(0);

  const fetchSheets = async () => {
    try {
      setSheetsLoading(true);
      const res = await API.get("/lead-sheets/assigned");
      setSheets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load assigned sheets:", error);
      message.error("Failed to load assigned sheets");
    } finally {
      setSheetsLoading(false);
    }
  };

  const fetchReport = async (id) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const url = id
        ? `/lead-sheets/agent/report/summary?sheetId=${id}`
        : "/lead-sheets/agent/report/summary";
      const res = await API.get(url);
      // Preserve the original response contract: a list, with the first summary used.
      if (requestId === latestRequest.current) {
        setReport(res.data?.[0] || null);
      }
    } catch (error) {
      console.error("Failed to load performance report:", error);
      if (requestId === latestRequest.current) {
        setReport(null);
        message.error("Failed to load performance report");
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
    fetchReport();
    return () => { latestRequest.current += 1; };
  }, []);

  const handleSheetChange = (value) => {
    const nextId = value || null;
    setSheetId(nextId);
    fetchReport(nextId);
  };

  const remarkStats = Array.isArray(report?.remarkStats)
    ? report.remarkStats.filter((item) => Number(item?.value) > 0)
    : [];
  const dateStats = Array.isArray(report?.dateStats) ? report.dateStats : [];
  const activity = Array.isArray(report?.recentActivity) ? report.recentActivity : [];
  const remarkTotal = remarkStats.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const progressPercent = Number(report?.progressPercent) || 0;
  const chartHeight = Math.min(450, Math.max(250, dateStats.length * 45 + 76));

  const columns = [
    {
      title: "Row",
      dataIndex: "row",
      key: "row",
      width: 110,
      render: (row) => <span className="cl-report-row-label">Row {row ?? "—"}</span>,
    },
    {
      title: "Remark",
      dataIndex: "remark",
      key: "remark",
      width: 190,
      render: (remark) => (
        <Tag className="cl-report-remark" style={{
          color: getRemarkColor(remark),
          background: `${getRemarkColor(remark)}14`,
          borderColor: `${getRemarkColor(remark)}25`,
        }}>
          <span className="cl-report-remark-dot" style={{ background: getRemarkColor(remark) }} />
          {remark || "—"}
        </Tag>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      render: (note) => (
        <AntTooltip title={note || undefined}>
          <span className="cl-report-note">{note || "—"}</span>
        </AntTooltip>
      ),
    },
    {
      title: "Time",
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 210,
      render: (time) => (
        <span className="cl-report-timestamp">
          <CalendarOutlined aria-hidden="true" />
          {time ? new Date(time).toLocaleString() : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="cl-report-page">
      <section className="cl-report-selector-card" aria-label="Report sheet selection">
        <div className="cl-report-selector-copy">
          <div className="cl-call-iconbox cl-call-iconbox--hero">
  <img
    src="/images/folderIcon.png"
    alt="Excel Lead Sheet"
    className="cl-call-hero-excel-icon"
  />
</div>
          <div>
            <h2>Selected Sheet</h2>
            <p>Choose a lead sheet to view its calling performance.</p>
          </div>
        </div>
        <div className="cl-report-selector-control">
          <Select
            className="cl-report-sheet-select"
            size="large"
            value={sheetId || undefined}
            allowClear
            showSearch
            optionFilterProp="label"
            loading={sheetsLoading}
            placeholder="All assigned sheets"
            onChange={handleSheetChange}
            options={sheets.map((sheet) => ({
              label: `${sheet.sheetName} (${sheet.totalLeads || sheet.leads?.length || 0})`,
              value: sheet._id,
            }))}
            aria-label="Select assigned lead sheet"
          />
          <span className="cl-report-selector-help">Reports update when you choose a sheet.</span>
        </div>
      </section>

      {loading ? (
        <div className="cl-report-loading" aria-label="Loading performance report">
          <div className="cl-report-kpi-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="cl-report-skeleton-card" key={index}><Skeleton active title paragraph={{ rows: 1 }} /></div>
            ))}
          </div>
          <div className="cl-report-chart-grid">
            <div className="cl-report-skeleton-card"><Skeleton active title paragraph={{ rows: 5 }} /></div>
            <div className="cl-report-skeleton-card"><Skeleton active title paragraph={{ rows: 5 }} /></div>
          </div>
        </div>
      ) : !report ? (
        <Card className="cl-report-empty-card">
          <Empty description="No report data yet. Select a lead sheet to view its performance." />
        </Card>
      ) : (
        <>
         <section className="cl-report-kpi-grid" aria-label="Performance summary">

  <NumberCard
    title="Total Leads"
    value={report.totalLeads ?? 0}
    tone="blue"
    icon={
      <img
        src="/images/leadIcon.png"
        alt=""
        className="cl-report-custom-icon"
      />
    }
  />

  <NumberCard
    title="Completed"
    value={report.completed ?? 0}
    tone="green"
    icon={
      <img
        src="/images/completetaskIcon.png"
        alt=""
        className="cl-report-custom-icon"
      />
    }
  />

  <NumberCard
    title="Remaining"
    value={report.remaining ?? 0}
    tone="amber"
    icon={
      <img
        src="/images/remainingtaskIcon.png"
        alt=""
        className="cl-report-custom-icon"
      />
    }
  />

  <NumberCard
    title="Progress"
    value={`${progressPercent}%`}
    tone="violet"
    icon={
      <img
        src="/images/progressIcon.png"
        alt=""
        className="cl-report-custom-icon"
      />
    }
    progress={progressPercent}
  />

</section>

          <div className="cl-report-chart-grid">
            <section className="cl-report-panel cl-report-chart-panel" aria-label="Call remarks breakdown">
              <PanelTitle icon={<PhoneOutlined />} description="Distribution of recorded call outcomes">
                Call Remarks Breakdown
              </PanelTitle>
              {remarkStats.length === 0 ? (
                <div className="cl-report-chart-empty"><Empty description="No call remarks recorded yet" /></div>
              ) : (
                <div className="cl-report-donut-layout">
                  <div className="cl-report-donut-legend">
                    {remarkStats.map((item, index) => (
                      <div className="cl-report-legend-line" key={`${item.name}-${index}`}>
                        <span className="cl-report-legend-swatch" style={{ background: getRemarkColor(item.name, index) }} />
                        <span className="cl-report-legend-name">{item.name}</span>
                        <span className="cl-report-legend-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cl-report-donut-plot">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={remarkStats}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="69%"
                          outerRadius="90%"
                          paddingAngle={remarkStats.length > 1 ? 2 : 0}
                          stroke="none"
                          isAnimationActive
                          animationDuration={650}
                        >
                          {remarkStats.map((item, index) => (
                            <Cell key={`${item.name}-${index}`} fill={getRemarkColor(item.name, index)} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} leads`, "Calls"]} contentStyle={{ borderRadius: 12, border: "1px solid #dce8fa", fontFamily: "Inter, sans-serif", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="cl-report-donut-center" aria-hidden="true">
                      <strong>{remarkTotal}</strong>
                      <span>{remarkTotal === 1 ? "Lead" : "Leads"}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="cl-report-panel cl-report-chart-panel" aria-label="Date wise completed leads">
              <PanelTitle icon={<BarChartOutlined />} description="Completed calls across working days">
                Date Wise Completed Leads
              </PanelTitle>
              {dateStats.length === 0 ? (
                <div className="cl-report-chart-empty"><Empty description="No completed activity to chart yet" /></div>
              ) : (
                <div className="cl-report-bar-wrap">
                  <div className="cl-report-bar-plot" style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dateStats} layout="vertical" margin={{ top: 12, right: 24, bottom: 12, left: 4 }} barCategoryGap="38%">
                        <CartesianGrid stroke="#e4edfb" strokeDasharray="3 5" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: "#7083a3" }} axisLine={{ stroke: "#d8e4f5" }} tickLine={false} domain={[0, "dataMax + 1"]} />
                        <YAxis type="category" dataKey="date" width={96} tick={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: "#40597b" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "#edf5ff" }} formatter={(value) => [value, "Completed leads"]} contentStyle={{ borderRadius: 12, border: "1px solid #dce8fa", fontFamily: "Inter, sans-serif", fontSize: 12 }} />
                        <Bar dataKey="count" name="Completed leads" fill="#0a72f5" radius={[0, 6, 6, 0]} maxBarSize={27} isAnimationActive animationDuration={700}>
                          <LabelList dataKey="count" position="right" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: "#1b3f75", fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="cl-report-axis-label">Completed Leads</p>
                </div>
              )}
            </section>
          </div>

          <section className="cl-report-panel cl-report-activity-panel" aria-label="Recent lead activity">
            <PanelTitle icon={<HistoryOutlined />} description="Most recently recorded call remarks and notes">
              Recent Lead Activity
            </PanelTitle>
            <Table
              className="cl-report-activity-table"
              rowKey={(row) => `${row.row}-${row.submittedAt}`}
              columns={columns}
              dataSource={activity}
              scroll={{ x: 700 }}
              pagination={{
                defaultPageSize: 8,
                showSizeChanger: true,
                pageSizeOptions: ["8", "10", "20", "50", "100"],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
              }}
              locale={{ emptyText: "No recent lead activity" }}
            />
          </section>
        </>
      )}
    </div>
  );
}
