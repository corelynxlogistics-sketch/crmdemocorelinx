import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Empty, Input, Skeleton, Table, Tag, Tooltip, message } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import API from "../../api/api";
import "./LeadSheetView.css";

// Uses the same downloaded Excel artwork as your Agent Detail page.
// Save the image at frontend/public/images/excel.png.
const EXCEL_ICON = "/images/excel.png";

function initialsFor(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "A";
  return (words.length === 1 ? words[0][0] : words[0][0] + words.at(-1)[0]).toUpperCase();
}
function MetricCard({ tone, icon, label, value, isLoading, badge }) {
  return (
    <div className={`clsv-metric clsv-metric--${tone}`}>
      <div className="clsv-metric-icon" aria-hidden="true">
        <img
          src={icon}
          alt=""
          className="clsv-custom-icon"
        />
      </div>

      <div className="clsv-metric-copy">
        <span className="clsv-metric-label">{label}</span>

        {isLoading ? (
          <Skeleton.Input
            size="small"
            active
            className="clsv-metric-skeleton"
          />
        ) : badge ? (
          <span className="clsv-metric-status">
            <span className="clsv-status-dot" />
            {value}
          </span>
        ) : (
          <strong className="clsv-metric-value">
            {Number(value).toLocaleString("en-US")}
          </strong>
        )}
      </div>

      <div className="clsv-metric-curve" aria-hidden="true" />
    </div>
  );
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

function remarkKind(value) {
  const remark = String(value || "").trim().toLowerCase();
  if (!remark || remark === "pending") return "pending";
  if (remark === "interested" || remark === "already dispatched") return "success";
  if (remark.includes("not interested") || remark.includes("wrong number")) return "danger";
  if (remark.includes("callback") || remark.includes("call back") || remark.includes("follow up")) return "info";
  if (remark.includes("no answer") || remark.includes("busy")) return "warning";
  if (remark.includes("voicemail")) return "violet";
  return "neutral";
}

// Export only the data currently shown by the search. No backend changes.
// Escape CSV formula prefixes so opening a downloaded CSV in Excel is safer.
function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r\n ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function LeadSheetView() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // The original API contract is unchanged.
  const fetchSheet = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/lead-sheets/${sheetId}/view`);
      setSheet(res.data);
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to load lead sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch("");
    setPage(1);
    fetchSheet();
    // Preserve re-fetch on sheetId change from the original component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  // Keep CSV header order exactly as returned by the backend.
  const headers = useMemo(() => {
    return sheet?.headers?.length > 0
      ? sheet.headers
      : Object.keys(sheet?.leads?.[0]?.rawData || {});
  }, [sheet]);

  // Preserves the original search behavior: searches across every rawData value.
  const filteredLeads = useMemo(() => {
    const rows = sheet?.leads || [];
    if (!search) return rows;
    return rows.filter((lead) =>
      Object.values(lead.rawData || {})
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [sheet, search]);

  // Preserves original count (all records with a REMARKS value).
  const completedRemarks = (sheet?.leads || []).filter(
    (lead) => lead.rawData?.REMARKS
  ).length;
  const totalLeads = sheet?.totalLeads || sheet?.leads?.length || 0;
  const agentName = sheet?.assignedTo?.name || "Assigned Agent";

  const columns = useMemo(() => {
    return [
      {
        title: "#",
        key: "rowNumber",
        width: 62,
        align: "center",
        fixed: "left",
        render: (_value, _row, index) => (
          <span className="clsv-row-number">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      ...headers.map((header) => {
       const field = String(header).toLowerCase();

const isTimestamp =
  field === "phone copied at" ||
  field === "remark saved at";

const longField =
  field.includes("address") ||
  field.includes("name");

const width = isTimestamp
  ? 225
  : longField
    ? 228
    : 152;
        return {
          title: header,
          dataIndex: ["rawData", header],
          key: header,
          width,
          ellipsis: { showTitle: false },
          sorter: (a, b) =>
            String(a.rawData?.[header] ?? "").localeCompare(
              String(b.rawData?.[header] ?? ""),
              undefined,
              { numeric: true, sensitivity: "base" }
            ),
     render: (value) => {
  const text = displayValue(value);
  let display;

  if (isTimestamp) {
    display =
      text === "–" ? (
        <span className="clsv-empty-value">–</span>
      ) : (
        <span className="clsv-tracking-timestamp">
          {text}
        </span>
      );
  } else if (field.includes("remarks")) {
              const isPending = text === "–" || text.toLowerCase() === "pending";
              display = (
                <Tag className={`clsv-pill clsv-pill--${remarkKind(value)}`}>
                  {isPending ? "Pending" : text}
                </Tag>
              );
            } else if (field.includes("status")) {
              const kind = text.toLowerCase() === "active" ? "success" : "neutral";
              display = <Tag className={`clsv-pill clsv-pill--${kind}`}>{text}</Tag>;
            } else if (field.includes("entity type")) {
              display = <span className="clsv-entity">{text}</span>;
            } else if (field.includes("phone")) {
              display = <span className="clsv-phone">{text}</span>;
            } else if (field.includes("mc")) {
              display = <span className="clsv-mc">{text}</span>;
            } else if (field.includes("name")) {
              display = <span className="clsv-name">{text}</span>;
            } else if (text === "–") {
              display = <span className="clsv-empty-value">–</span>;
            } else {
              display = <span>{text}</span>;
            }
            return <Tooltip title={text === "–" ? undefined : text} placement="topLeft">{display}</Tooltip>;
          },
        };
      }),
    ];
  }, [headers, page, pageSize]);

  const exportCsv = () => {
    if (!headers.length || !filteredLeads.length) {
      message.info("No lead records available to export");
      return;
    }
    const rows = [
      headers.map(csvCell).join(","),
      ...filteredLeads.map((lead) =>
        headers.map((header) => csvCell(lead.rawData?.[header])).join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF", rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(sheet?.sheetName || "lead-sheet").replace(/[^a-z0-9-_]+/gi, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="clsv-page" id="clsv-lead-sheet">
      <section className="clsv-hero" aria-label="Lead sheet overview">
        <Button
          className="clsv-back"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          Back to Assigned Sheets
        </Button>
        <div className="clsv-hero-content">
          <div className="clsv-hero-heading">
            <div className="clsv-excel-icon" aria-hidden="true">
              <img src={EXCEL_ICON} alt="" draggable={false} />
            </div>
            <div className="clsv-hero-title-group">
              <div className="clsv-eyebrow">CSV LEAD PREVIEW</div>
              <h1 title={sheet?.sheetName || "Lead Sheet"}>{sheet?.sheetName || "Lead Sheet"}</h1>
              <p>Excel-style lead preview with live agent remarks and tracking data.</p>
            </div>
          </div>
        <div className="clsv-metrics" aria-label="Lead sheet statistics">

  <MetricCard
    tone="blue"
    icon="/images/leadIcon.png"
    label="Total Leads"
    value={totalLeads}
    isLoading={loading && !sheet}
  />

  <MetricCard
    tone="violet"
    icon="/images/progressIcon.png"
    label="Updated Remarks"
    value={completedRemarks}
    isLoading={loading && !sheet}
  />

  <MetricCard
    tone="green"
    icon="/images/completetaskIcon.png"
    label="Sheet Status"
    value="Active"
    badge
    isLoading={loading && !sheet}
  />

</div>
        </div>
      </section>

      <section className="clsv-table-panel" aria-label="Sheet lead records">
        <div className="clsv-toolbar">
          <div className="clsv-assignee">
            <div className="clsv-assignee-avatar" aria-hidden="true">{initialsFor(agentName)}</div>
            <div className="clsv-assignee-copy">
              <strong title={agentName}>{agentName}</strong>
              <span><UserOutlined aria-hidden="true" /> Assigned Agent</span>
            </div>
          </div>

          <div className="clsv-toolbar-actions">
            <Input
              className="clsv-search"
              prefix={<SearchOutlined />}
              placeholder="Search company, MC number, phone..."
              aria-label="Search records in this sheet"
              allowClear
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Button
              className="clsv-toolbar-btn clsv-refresh"
              icon={<ReloadOutlined spin={loading} />}
              onClick={fetchSheet}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              className="clsv-toolbar-btn clsv-export"
              icon={<DownloadOutlined />}
              onClick={exportCsv}
              disabled={loading || filteredLeads.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="clsv-table-wrap">
          <Table
            className="clsv-table"
            loading={loading}
            rowKey="_id"
            columns={columns}
            dataSource={filteredLeads}
            size="middle"
            scroll={{ x: "max-content", y: 580 }}
            rowClassName={(_row, index) => (index % 2 === 0 ? "clsv-even" : "clsv-odd")}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? "No matching lead records" : "No leads in this sheet"} />,
            }}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: ["8", "10", "20", "50", "100"],
              showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} records`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
              onShowSizeChange: (_current, nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}
