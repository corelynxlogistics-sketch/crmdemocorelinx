import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Empty, Form, Input, Popconfirm, Skeleton, Upload, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/api";
import "./AgentDetail.css";

// Place your downloaded icon at public/images/excel.png.
// Public assets are referenced from the site root in Vite.
const EXCEL_ICON_SRC = "/images/excel.png";

const leadCount = (sheet) => sheet.totalLeads || sheet.leads?.length || 0;

const formatDate = (value) => {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "–"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
};

function SummaryCard({ tone, icon, label, value, loading }) {
  return (
    <div className={`cl-detail-stat cl-detail-stat--${tone}`}>
      <div className="cl-detail-stat-inner">

        <span className="cl-detail-stat-icon" aria-hidden="true">
          <img
            src={icon}
            alt=""
            className="cl-detail-custom-icon"
          />
        </span>

        <div className="cl-detail-stat-copy">
          <span className="cl-detail-stat-label">{label}</span>

          {loading ? (
            <Skeleton.Input
              active
              size="small"
              className="cl-detail-stat-skeleton"
            />
          ) : (
            <strong className="cl-detail-stat-value">{value}</strong>
          )}
        </div>

        <div
          className="cl-detail-stat-decoration"
          aria-hidden="true"
        />

      </div>
    </div>
  );
}

function SheetCard({ sheet, deleting, onOpen, onDelete }) {
  const count = leadCount(sheet);

  return (
    <article className="cl-detail-sheet-card">
      <button
        type="button"
        className="cl-detail-sheet-main"
        onClick={onOpen}
        aria-label={`Open ${sheet.sheetName || "lead sheet"}, ${count} leads`}
      >
        <div className="cl-detail-sheet-top">
          <span className="cl-detail-csv-icon" aria-hidden="true">
            <img
              className="cl-detail-csv-image"
              src={EXCEL_ICON_SRC}
              alt=""
              draggable={false}
            />
            <span>CSV</span>
          </span>
          <span className="cl-detail-sheet-heading">
            <strong title={sheet.sheetName || "Untitled sheet"}>
              {sheet.sheetName || "Untitled sheet"}
            </strong>
            <span className="cl-detail-sheet-count">
              <FileTextOutlined /> {count.toLocaleString("en-US")} Leads
            </span>
          </span>
          <RightOutlined className="cl-detail-sheet-chevron" aria-hidden="true" />
        </div>
      </button>

      <div className="cl-detail-sheet-bottom">
        <span className="cl-detail-sheet-date">
          <CalendarOutlined aria-hidden="true" />
          Uploaded: {formatDate(sheet.createdAt)}
        </span>
        <Popconfirm
          title="Delete this lead sheet?"
          description="This action cannot be undone."
          okText="Delete sheet"
          cancelText="Cancel"
          okButtonProps={{ danger: true, loading: deleting }}
          placement="topRight"
          onConfirm={() => onDelete(sheet._id)}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            className="cl-detail-sheet-delete"
            aria-label={`Delete ${sheet.sheetName || "lead sheet"}`}
          />
        </Popconfirm>
      </div>
    </article>
  );
}

export default function AgentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [sheets, setSheets] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  // Existing API contract: GET /agents/:id/sheets
  const fetchSheets = async () => {
    try {
      setFetching(true);
      const res = await API.get(`/agents/${id}/sheets`);
      setSheets(res.data);
    } catch {
      message.error("Failed to load agent sheets");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSheets();
    // Re-fetch when the selected agent changes, as in the original component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Existing API contract: POST /lead-sheets/upload-csv (FormData keys unchanged)
  const uploadSheet = async (values) => {
    if (!fileList.length) return message.error("Please select CSV file");

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("sheetName", values.sheetName);
      formData.append("assignedTo", id);
      formData.append("file", fileList[0].originFileObj);

      await API.post("/lead-sheets/upload-csv", formData);
      message.success("New lead sheet added successfully");
      form.resetFields();
      setFileList([]);
      await fetchSheets();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to upload sheet");
    } finally {
      setUploading(false);
    }
  };

  // Existing API contract: DELETE /lead-sheets/:sheetId
  const deleteSheet = async (sheetId) => {
    try {
      setDeletingId(sheetId);
      await API.delete(`/lead-sheets/${sheetId}`);
      message.success("Lead sheet deleted");
      await fetchSheets();
    } catch {
      message.error("Failed to delete sheet");
    } finally {
      setDeletingId(null);
    }
  };

  const totalLeads = sheets.reduce((sum, sheet) => sum + leadCount(sheet), 0);

  return (
    <div className="cl-detail-page">
      <div className="cl-detail-intro">
        <Button
          className="cl-detail-back"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/admin/agents")}
        >
          Back to Agents
        </Button>
        <div className="cl-detail-title-line">
          <span className="cl-detail-title-icon" aria-hidden="true">
            <FolderOpenOutlined />
          </span>
          <div>
            <h1>Assigned Sheets</h1>
            <p>Manage this agent’s lead files, assignments, and CSV uploads.</p>
          </div>
        </div>
      </div>

     <section
  className="cl-detail-stats"
  aria-label="Assigned lead sheet overview"
>
  <SummaryCard
    tone="blue"
    icon="/images/folderIcon.png"
    label="Assigned Sheets"
    value={sheets.length}
    loading={fetching && sheets.length === 0}
  />

  <SummaryCard
    tone="green"
    icon="/images/leadIcon.png"
    label="Total Leads"
    value={totalLeads.toLocaleString("en-US")}
    loading={fetching && sheets.length === 0}
  />

  <SummaryCard
    tone="rose"
    icon="/images/completetaskIcon.png"
    label="Agent Access"
    value={
      <span className="cl-detail-active">
        <span className="cl-detail-active-dot" />
        Active
      </span>
    }
  />
</section>

      <div className="cl-detail-workspace">
        <section className="cl-detail-panel cl-detail-upload-panel" aria-labelledby="cl-detail-upload-heading">
          <div className="cl-detail-panel-head">
            <span className="cl-detail-panel-icon cl-detail-panel-icon--blue" aria-hidden="true">
              <CloudUploadOutlined />
            </span>
            <div>
              <h2 id="cl-detail-upload-heading">Add Lead Sheet</h2>
              <p>Upload a new CSV sheet directly to this agent.</p>
            </div>
          </div>

          <Form
            className="cl-detail-form"
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={uploadSheet}
          >
            <Form.Item
              label="Sheet Name"
              name="sheetName"
              rules={[{ required: true, message: "Please enter sheet name" }]}
            >
              <Input
                prefix={<FileExcelOutlined />}
                placeholder="e.g. hafza box 4"
                size="large"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item label="CSV File" required>
              <Upload.Dragger
                className="cl-detail-dragger"
                accept=".csv"
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: nextFiles }) => setFileList(nextFiles)}
                disabled={uploading}
              >
                <div className="cl-detail-dragger-icon" aria-hidden="true">
                  <CloudUploadOutlined />
                </div>
                <div className="cl-detail-dragger-title">Drop CSV or <span>click to upload</span></div>
                <div className="cl-detail-dragger-hint">Headers will be mapped automatically.</div>
                <span className="cl-detail-format">CSV only</span>
              </Upload.Dragger>
            </Form.Item>

            <div className="cl-detail-form-info">
              <InfoCircleOutlined aria-hidden="true" />
              <span>CSV columns become lead fields for this agent automatically.</span>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={uploading}
              icon={<UploadOutlined />}
              className="cl-detail-submit"
            >
              {uploading ? "Uploading Sheet..." : "Upload Sheet"}
            </Button>
          </Form>
        </section>

        <section className="cl-detail-panel cl-detail-sheets-panel" aria-labelledby="cl-detail-sheets-heading">
          <div className="cl-detail-panel-head cl-detail-sheets-head">
            <span className="cl-detail-panel-icon cl-detail-panel-icon--green" aria-hidden="true">
              <img className="cl-detail-heading-excel" src={EXCEL_ICON_SRC} alt="" draggable={false} />
            </span>
            <div className="cl-detail-sheets-head-copy">
              <h2 id="cl-detail-sheets-heading">Agent Lead Sheets</h2>
              <p>Click any sheet to open its Excel-style preview.</p>
            </div>
            <span className="cl-detail-count-pill" aria-label={`${sheets.length} sheets`}>
              {sheets.length} {sheets.length === 1 ? "sheet" : "sheets"}
            </span>
          </div>

          {fetching && sheets.length === 0 ? (
            <div className="cl-detail-sheet-grid" aria-label="Loading sheets">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="cl-detail-sheet-skeleton" key={index}>
                  <Skeleton active paragraph={{ rows: 2 }} title={{ width: "75%" }} />
                </div>
              ))}
            </div>
          ) : sheets.length === 0 ? (
            <div className="cl-detail-empty">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No lead sheets assigned yet"
              />
              <p>Upload a CSV using the form to add the first sheet.</p>
            </div>
          ) : (
            <div className="cl-detail-sheet-grid" aria-busy={fetching}>
              {sheets.map((sheet, index) => (
                <div className="cl-detail-sheet-enter" key={sheet._id} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
                  <SheetCard
                    sheet={sheet}
                    deleting={deletingId === sheet._id}
                    onOpen={() => navigate(`/admin/lead-sheets/${sheet._id}`)}
                    onDelete={deleteSheet}
                  />
                </div>
              ))}
            </div>
          )}

          {sheets.length > 0 && (
            <div className="cl-detail-panel-note">
              <CheckCircleOutlined aria-hidden="true" />
              Sheets are available only to their assigned agent.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
