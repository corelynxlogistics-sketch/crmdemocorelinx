import { useEffect, useState } from "react";
import { Button, Form, Input, Select, Upload, message } from "antd";
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TruckOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import "./AssignLeadSheet.css";

const FEATURES = [
  {
    title: "CSV Header Detection",
    description: "Columns are mapped automatically.",
    icon: "/images/excel.png",
    tone: "green",
  },
  {
    title: "Agent-Level Access",
    description: "Agents only see their own sheets.",
    icon: "/images/personsIcon.png",
    tone: "purple",
  },
  {
    title: "Live Admin Tracking",
    description: "Remarks and row progress update live.",
    icon: "/images/progressIcon.png",
    tone: "blue",
  },
];

export default function AssignLeadSheet() {
  const [agents, setAgents] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Keep the existing data source and agent selection behavior.
  const fetchAgents = async () => {
    try {
      const res = await API.get("/agents");
      setAgents(res.data);
    } catch {
      message.error("Failed to load agents");
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Existing upload endpoint, FormData keys, notifications and reset behavior.
  const handleSubmit = async (values) => {
    if (!fileList.length) {
      return message.error("Please select CSV file");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("sheetName", values.sheetName);
      formData.append("assignedTo", values.assignedTo);
      formData.append("file", fileList[0].originFileObj);

      const res = await API.post("/lead-sheets/upload-csv", formData);

      message.success(`CSV uploaded successfully. Total Leads: ${res.data.totalLeads}`);

      form.resetFields();
      setFileList([]);
    } catch (error) {
      message.error(error.response?.data?.message || "CSV upload failed");
    } finally {
      setLoading(false);
    }
  };

  // Preserve the exact sample CSV headers used by your current system.
  const downloadSampleCSV = () => {
    const headers = [
      "Entity Type",
      "Status",
      "Company Date",
      "MC Number",
      "Name",
      "Physical Address",
      "Phone",
      "Power units",
      "Drivers",
      "REMARKS",
    ];

    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "sample-lead-sheet.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
  };

  return (
    <main className="cl-assign-page">
      <div className="cl-assign-intro">
        <Button
          className="cl-assign-back"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/admin/agents")}
        >
          Back to Agents
        </Button>

        <div className="cl-assign-heading">
        <span className="cl-assign-heading-icon" aria-hidden="true">
  <img
    src="/images/excel.png"
    alt=""
    className="cl-assign-custom-icon"
  />
</span>
          <div className="cl-assign-heading-copy">
            <h1>Upload &amp; Assign Lead Sheet</h1>
            <p>Import truck dispatch lead files and assign them directly to an agent.</p>
          </div>
          <TruckOutlined className="cl-assign-truck-watermark" aria-hidden="true" />
        </div>
      </div>

      <div className="cl-assign-grid">
        <section className="cl-assign-panel cl-assign-form-panel" aria-label="Upload and assign lead sheet">
          <Form
            className="cl-assign-form"
            requiredMark={false}
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="sheetName"
              label={<span className="cl-assign-label"><FileTextOutlined /> Lead Sheet Name <span className="cl-assign-required">*</span></span>}
              rules={[{ required: true, message: "Please enter sheet name" }]}
            >
              <Input
                size="large"
                placeholder="Enter sheet name (e.g., hafza po 3)"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="assignedTo"
              label={<span className="cl-assign-label"><UserOutlined /> Assign to Agent <span className="cl-assign-required">*</span></span>}
              rules={[{ required: true, message: "Please select agent" }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Search and select agent"
                optionFilterProp="label"
                options={agents.map((agent) => ({
                  label: `${agent.name} - ${agent.email}`,
                  value: agent._id,
                }))}
              />
            </Form.Item>

            <Form.Item
              className="cl-assign-upload-field"
              label={<span className="cl-assign-label"><CloudUploadOutlined /> Upload CSV Lead File <span className="cl-assign-required">*</span></span>}
              required
            >
              <Upload.Dragger
                className={`cl-assign-dropzone${fileList.length ? " cl-assign-dropzone--selected" : ""}`}
                accept=".csv"
                maxCount={1}
                multiple={false}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
                disabled={loading}
              >
                <div className="cl-assign-drop-content">
                 <span className="cl-assign-file-symbol" aria-hidden="true">
  <img
    src="/images/excel.png"
    alt=""
    className="cl-assign-upload-image"
  />
</span>
                  <strong>
                    {fileList.length ? "Change CSV file or drop another here" : "Drop CSV file here or click to upload"}
                  </strong>
                  <span className="cl-assign-file-format">Supported: .csv</span>
                </div>
              </Upload.Dragger>

              <div className="cl-assign-file-tools">
                <span>CSV headers will automatically become lead fields for the agent view.</span>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={downloadSampleCSV}
                  className="cl-assign-sample-link"
                >
                  Sample CSV
                </Button>
              </div>
            </Form.Item>

           

            <div className="cl-assign-actions">
              <Button className="cl-assign-cancel" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                className="cl-assign-submit"
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={loading}
                icon={!loading ? <UploadOutlined /> : undefined}
              >
                {loading ? "Uploading..." : "Upload & Assign"}
              </Button>
            </div>
          </Form>
        </section>

        <aside className="cl-assign-aside" aria-label="Lead assignment benefits">
          <section className="cl-assign-distribution cl-assign-panel">
            <div className="cl-assign-distribution-head">
            <span className="cl-assign-feature-icon cl-assign-feature-icon--blue" aria-hidden="true">
  <img
    src="/images/leadIcon.png"
    alt=""
    className="cl-assign-custom-icon"
  />
</span>
              <div>
                <h2>Intelligent Lead Distribution</h2>
                <p>
                  Upload carrier lead data and assign it instantly to the correct dispatch agent.
                  The system tracks each row, remark, and progress without manual spreadsheet sharing.
                </p>
              </div>
            </div>
          </section>

          <section className="cl-assign-benefits cl-assign-panel" aria-label="Assignment features">
            {FEATURES.map(({ title, description, icon, tone }) => (
              <div className="cl-assign-benefit" key={title}>
               <span
  className={`cl-assign-feature-icon cl-assign-feature-icon--${tone}`}
  aria-hidden="true"
>
  <img
    src={icon}
    alt=""
    className="cl-assign-custom-icon"
  />
</span>
                <div className="cl-assign-benefit-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <CheckCircleOutlined className="cl-assign-benefit-check" aria-hidden="true" />
              </div>
            ))}
          </section>

        </aside>
      </div>
    </main>
  );
}
