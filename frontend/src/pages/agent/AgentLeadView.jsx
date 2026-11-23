import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Progress,
  Select,
  Skeleton,
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  ArrowRightOutlined,
  BarsOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  MailOutlined,
  MoonOutlined,
  PhoneOutlined,
  PushpinOutlined,
  SaveOutlined,
  ScheduleOutlined,
  TeamOutlined,
  TruckOutlined,
  UserOutlined,
} from "@ant-design/icons";
import API from "../../api/api";
import "./AgentLeadView.css";

// Existing, backend-supported disposition values — unchanged.
const REMARKS = [
  "Interested",
  "Not Interested",
  "Call Back Later",
  "No Answer",
  "Wrong Number",
  "Already Dispatched",
  "Need Follow Up",
  "Voicemail",
  "Number Busy",
];

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "–";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getCompanyName = (raw = {}) =>
  raw.Name || raw.name || raw.Company || raw["Legal Name"] || "–";

const iconForField = (name) => {
  const key = name.toLowerCase();
  if (key.includes("name") || key.includes("company")) return <UserOutlined />;
  if (key.includes("date")) return <CalendarOutlined />;
  if (key.includes("avatar") || key.includes("image")) return <IdcardOutlined />;
  if (key.includes("time") || key.includes("hour")) return <ClockCircleOutlined />;
  if (key.includes("shift") || key.includes("night")) return <MoonOutlined />;
  if (key.includes("address") || key.includes("location")) return <EnvironmentOutlined />;
  if (key.includes("branch")) return <ApartmentOutlined />;
  if (key.includes("agent") || key.includes("driver")) return <TeamOutlined />;
  if (key.includes("phone") || key.includes("mobile")) return <PhoneOutlined />;
  if (key.includes("email")) return <MailOutlined />;
  if (key.includes("remark") || key.includes("note")) return <BarsOutlined />;
  if (key.includes("status") || key.includes("behavior")) return <ScheduleOutlined />;
  return <AppstoreOutlined />;
};

export default function AgentLeadView() {
  const [sheets, setSheets] = useState([]);
  const [sheetId, setSheetId] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [pinnedLeads, setPinnedLeads] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAdvance, setSavedAdvance] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [form] = Form.useForm();
  const fetchSequence = useRef(0);

  const fetchSheets = async () => {
    try {
      setSheetsLoading(true);
      const res = await API.get("/lead-sheets/assigned");
      setSheets(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error("Failed to load assigned lead sheets");
    } finally {
      setSheetsLoading(false);
    }
  };

  const fetchPinned = async (id) => {
    if (!id) return;
    try {
      const res = await API.get(`/lead-sheets/${id}/pinned`);
      setPinnedLeads(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error("Failed to load pinned follow-ups");
    }
  };

  const fetchCurrentLead = async (id) => {
    if (!id) return;
    const sequence = ++fetchSequence.current;
    setLoading(true);
    try {
      const res = await API.get(`/lead-sheets/${id}/current`);
      if (sequence !== fetchSequence.current) return;
      setLeadData(res.data);
      setSavedAdvance(false);
      form.resetFields();
      await fetchPinned(id);
    } catch (error) {
      if (sequence === fetchSequence.current) {
        message.error(error.response?.data?.message || "Failed to load current lead");
      }
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
    return () => { fetchSequence.current += 1; };
  }, []);

  const changeSheet = (value) => {
    setSheetId(value);
    setLeadData(null);
    setPinnedLeads([]);
    setDrawerOpen(false);
    setSavedAdvance(false);
    form.resetFields();
    fetchCurrentLead(value);
  };

  const openPinnedLead = async (index) => {
    if (!sheetId || saving) return;
    try {
      setLoading(true);
      const res = await API.get(`/lead-sheets/${sheetId}/lead/${index}`);
      setLeadData(res.data);
      setSavedAdvance(false);
      form.setFieldsValue({
        remark: res.data.savedRemark || undefined,
        note: res.data.savedNote || "",
      });
      setDrawerOpen(false);
    } catch {
      message.error("Failed to open pinned lead");
    } finally {
      setLoading(false);
    }
  };

  const pinLead = async () => {
    if (!sheetId || !leadData || savedAdvance) return;
    try {
      setPinLoading(true);
      await API.post(`/lead-sheets/${sheetId}/pin`, {
        reason: "Call back later",
        note: "Pinned by agent for follow-up",
      });
      message.success("Lead pinned for follow-up");
      await fetchPinned(sheetId);
    } catch {
      message.error("Failed to pin lead");
    } finally {
      setPinLoading(false);
    }
  };

  const removePin = async (index) => {
    try {
      await API.delete(`/lead-sheets/${sheetId}/pinned/${index}`);
      message.success("Removed from pinned leads");
      await fetchPinned(sheetId);
    } catch {
      message.error("Failed to remove pinned lead");
    }
  };


const copyPhone = async (phone, leadIndex) => {
  if (!phone || phone === "-" || phone === "–") {
    message.warning("No phone number available");
    return;
  }

  // First copy the phone number.
  try {
    await navigator.clipboard.writeText(String(phone));
  } catch {
    message.error("Unable to copy phone number");
    return;
  }

  // Then ask the backend to record the server time.
  try {
    await API.post(
      `/lead-sheets/${sheetId}/phone-copied`,
      { leadIndex }
    );

    message.success("Phone copied and timestamp recorded");
  } catch (error) {
    message.warning(
      error.response?.data?.message
        ? `Phone copied, but timestamp was not saved: ${error.response.data.message}`
        : "Phone copied, but timestamp could not be recorded"
    );
  }
};


  // The existing /next endpoint saves AND advances the server cursor.
  // To match the reference's two-button design, Save Remark commits once,
  // and Next Lead then fetches the already-advanced current row.
  const saveRemark = async (values) => {
    if (!sheetId || savedAdvance) return;
    try {
      setSaving(true);
    await API.post(`/lead-sheets/${sheetId}/next`, {
  ...values,
  leadIndex: leadData.currentIndex,
});
      setSavedAdvance(true);
      message.success("Remark saved. Click Next Lead to continue.");
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to save remark");
    } finally {
      setSaving(false);
    }
  };

  const goToNextLead = () => {
    if (sheetId && savedAdvance && !loading) fetchCurrentLead(sheetId);
  };

  const downloadCompletedLeads = async () => {
    if (!sheetId) return message.error("Please select a lead sheet first");
    try {
      setDownloading(true);
      const res = await API.get(`/lead-sheets/${sheetId}/download-completed`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "completed-leads.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Completed leads downloaded");
    } catch {
      message.error("Failed to download completed leads");
    } finally {
      setDownloading(false);
    }
  };

  const rawData = leadData?.lead?.rawData || {};
  const completed = leadData?.currentIndex || 0;
  const total = leadData?.totalLeads || 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const row = completed + 1;
  const companyName = getCompanyName(rawData);
  const phone = rawData.Phone || rawData.phone || "-";
  const address = rawData["Physical Address"] || rawData.Address || "-";
  const phoneAvailable = phone !== "-" && phone !== "–";

  return (
    <div className="cl-call-page">
      <section className="cl-call-hero" aria-label="Lead calling queue">
        <div className="cl-call-hero-intro">
        <div className="cl-call-iconbox cl-call-iconbox--hero">
  <img
    src="/images/excel.png"
    alt="Excel Lead Sheet"
    className="cl-call-hero-excel-icon"
  />
</div>
          <div className="cl-call-hero-copy">
            <h2>Agent Lead Calling Queue</h2>
            <p>Process leads one by one, pin follow-ups, copy phone numbers, and save remarks.</p>
          </div>
        </div>
        <div className="cl-call-hero-selector">
          <label htmlFor="cl-call-sheet-select">Select assigned lead sheet</label>
          <Select
            id="cl-call-sheet-select"
            className="cl-call-sheet-select"
            placeholder="Select assigned lead sheet"
            showSearch
            optionFilterProp="label"
            value={sheetId || undefined}
            onChange={changeSheet}
            loading={sheetsLoading}
            disabled={saving}
            options={sheets.map((sheet) => ({
              label: `${sheet.sheetName} (${sheet.totalLeads || sheet.leads?.length || 0})`,
              value: sheet._id,
            }))}
          />
          <div className="cl-call-hero-under">
            <span>{sheetId ? "Your assigned lead sheet is ready for calling." : "Please select a lead sheet to start calling."}</span>
            <div className="cl-call-hero-tools">
              <Tooltip title="Download completed leads">
                <Button
                  type="text"
                  aria-label="Download completed leads"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  disabled={!leadData || completed === 0}
                  onClick={downloadCompletedLeads}
                />
              </Tooltip>
              <Tooltip title="Pinned follow-up leads">
                <Badge size="small" count={pinnedLeads.length} offset={[-2, 2]}>
                  <Button
                    type="text"
                    aria-label="Open pinned follow-up leads"
                    icon={<PushpinOutlined />}
                    disabled={!sheetId}
                    onClick={() => setDrawerOpen(true)}
                  />
                </Badge>
              </Tooltip>
            </div>
          </div>
        </div>
      </section>

      {loading && !leadData && (
        <div className="cl-call-empty cl-call-empty--loading">
          <Skeleton active paragraph={{ rows: 8 }} title={{ width: "45%" }} />
        </div>
      )}

      {!leadData && !loading && (
        <div className="cl-call-empty">
          <div className="cl-call-iconbox cl-call-iconbox--hero">
  <img
    src="/images/folderIcon.png"
    alt="Excel Lead Sheet"
    className="cl-call-hero-excel-icon"
  />
</div>
          <h3>Ready to start calling?</h3>
          <p>Please select an assigned lead sheet above to start calling.</p>
        </div>
      )}

      {leadData?.completed && (
        <div className="cl-call-empty">
          <div className="cl-call-empty-art cl-call-empty-art--green"><CheckCircleOutlined /></div>
          <h3>All leads completed</h3>
          <p>You've completed every lead in this sheet.</p>
          <Button onClick={downloadCompletedLeads} loading={downloading} icon={<DownloadOutlined />}>
            Download completed leads
          </Button>
        </div>
      )}

      {leadData && !leadData.completed && (
        <>
          <div className="cl-call-stats" aria-label="Current lead progress">
            <div className="cl-call-stat">
              <div className="cl-call-iconbox">
  <img
    src="/images/currentrowIcon.png"
    alt=""
    className="cl-call-custom-icon"
  />
</div>
              <div className="cl-call-stat-copy">
                <div className="cl-call-stat-label">Current Row</div>
                <div className="cl-call-stat-value">{row} <small>/ {total}</small></div>
              </div>
            </div>
            <div className="cl-call-stat cl-call-stat--green">
             <div className="cl-call-iconbox">
  <img
    src="/images/completetaskIcon.png"
    alt=""
    className="cl-call-custom-icon"
  />
</div>
              <div className="cl-call-stat-copy">
                <div className="cl-call-stat-label">Completed Leads</div>
                <div className="cl-call-stat-value">{completed}</div>
              </div>
            </div>
            <div className="cl-call-stat cl-call-stat--purple">
             <div className="cl-call-iconbox">
  <img
    src="/images/progressIcon.png"
    alt=""
    className="cl-call-custom-icon"
  />
</div>
              <div className="cl-call-stat-copy">
                <div className="cl-call-stat-label">Sheet Progress</div>
                <div className="cl-call-stat-value">{percent}%</div>
                <Progress
                  className="cl-call-progress"
                  percent={Math.min(100, Math.max(0, percent))}
                  showInfo={false}
                  strokeColor="#0969f5"
                  trailColor="#cfdef7"
                />
              </div>
            </div>
          </div>

          <div className="cl-call-columns">
            <section className="cl-call-panel" aria-label="Current carrier lead">
              <header className="cl-call-panel-header">
                <div className="cl-call-panel-title">
                  <span className="cl-call-iconbox cl-call-iconbox--small"><TruckOutlined /></span>
                  <h3>Current Carrier Lead</h3>
                  <span className="cl-call-row-pill">Row {row}</span>
                  {leadData.isPinnedView && <Tag color="gold">Pinned Follow-up</Tag>}
                </div>
                {!leadData.isPinnedView && (
                  <Tooltip title="Pin this lead for follow-up">
                    <Button
                      className="cl-call-pin-icon"
                      type="text"
                      icon={<PushpinOutlined />}
                      loading={pinLoading}
                      disabled={savedAdvance}
                      onClick={pinLead}
                      aria-label="Pin current lead"
                    />
                  </Tooltip>
                )}
              </header>
              <div className="cl-call-data">
                <div className="cl-call-data-row">
                  <span className="cl-call-data-icon"><ApartmentOutlined /></span>
                  <span className="cl-call-data-label">Company Name</span>
                  <span className="cl-call-data-value" title={displayValue(companyName)}>{displayValue(companyName)}</span>
                </div>
                {Object.entries(rawData).map(([key, value]) => (
                  <div className="cl-call-data-row" key={key}>
                    <span className="cl-call-data-icon">{iconForField(key)}</span>
                    <span className="cl-call-data-label" title={key}>{key}</span>
                    <span className="cl-call-data-value" title={displayValue(value)}>{displayValue(value)}</span>
                  </div>
                ))}
                {!Object.keys(rawData).length && (
                  <div className="cl-call-data-blank">No carrier information available.</div>
                )}
              </div>
            </section>

            <section className="cl-call-panel cl-call-disposition" aria-label="Call disposition">
              <header className="cl-call-panel-header">
                <div className="cl-call-panel-title">
                  <span className="cl-call-iconbox cl-call-iconbox--small"><PhoneOutlined /></span>
                  <h3>Call Disposition</h3>
                </div>
              </header>
              <div className="cl-call-disposition-inner">
                <Form
                  className="cl-call-form"
                  form={form}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={saveRemark}
                >
                  <Form.Item
                    label="Call Remark"
                    name="remark"
                    rules={[{ required: true, message: "Please select a call result" }]}
                  >
                    <Select
                      placeholder="Select call result"
                      options={REMARKS.map((item) => ({ label: item, value: item }))}
                      disabled={savedAdvance || saving}
                    />
                  </Form.Item>
                  <Form.Item label="Extra Note" name="note">
                    <Input.TextArea
                      placeholder="Add any additional details, follow-up notes, or important information..."
                      rows={3}
                      disabled={savedAdvance || saving}
                    />
                  </Form.Item>
                  <div className="cl-call-contact">
                    <div className="cl-call-contact-row">
                      <PhoneOutlined />
                      <span title={displayValue(companyName)}>{displayValue(companyName)}</span>
                      <Tooltip title="Copy phone number">
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          disabled={!phoneAvailable}
                          onClick={() => copyPhone(phone, leadData.currentIndex)}
                          aria-label="Copy phone number"
                        />
                      </Tooltip>
                    </div>
                    <div className="cl-call-contact-row">
                      <MailOutlined />
                      <span>{displayValue(rawData.Email || rawData.email || "-")}</span>
                    </div>
                    <div className="cl-call-contact-row">
                      <EnvironmentOutlined />
                      <span title={displayValue(address)}>{displayValue(address)}</span>
                    </div>
                  </div>
                  {savedAdvance && (
                    <div className="cl-call-saved" role="status">
                      <CheckCircleOutlined /> Remark saved successfully. Select Next Lead to continue.
                    </div>
                  )}
                  <div className="cl-call-actions">
                    <Button
                      className="cl-call-save-btn"
                      htmlType="submit"
                      icon={savedAdvance ? <CheckCircleOutlined /> : <SaveOutlined />}
                      loading={saving}
                      disabled={savedAdvance || loading}
                    >
                      {savedAdvance ? "Saved" : "Save Remark"}
                    </Button>
                    <Button
                      className="cl-call-next-btn"
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      iconPosition="end"
                      onClick={goToNextLead}
                      loading={loading}
                      disabled={!savedAdvance || saving}
                    >
                      Next Lead
                    </Button>
                  </div>
                </Form>
              </div>
            </section>
          </div>
        </>
      )}

      <Drawer
        title={<span className="cl-call-drawer-heading"><PushpinOutlined /> Pinned Follow-up Leads <Tag color="blue">{pinnedLeads.length}</Tag></span>}
        className="cl-call-drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={430}
      >
        {!pinnedLeads.length ? (
          <Empty description="No pinned leads yet" />
        ) : (
          <List
            dataSource={pinnedLeads}
            renderItem={(item) => {
              const data = item.lead?.rawData || {};
              const name = getCompanyName(data);
              const number = data.Phone || data.phone || "-";
              return (
                <List.Item className="cl-call-drawer-item">
                  <div className="cl-call-drawer-card">
                    <strong>{displayValue(name)}</strong>
                    <span className="cl-call-drawer-meta">Row {item.leadIndex + 1}</span>
                    <span className="cl-call-drawer-meta"><PhoneOutlined /> {displayValue(number)}</span>
                    {item.reason && <p>{item.reason}</p>}
                    <div className="cl-call-drawer-buttons">
                      <Button type="primary" onClick={() => openPinnedLead(item.leadIndex)}>Open Lead</Button>
                      <Button icon={<CopyOutlined />} onClick={() => copyPhone(number, item.leadIndex)}>Copy</Button>
                      <Button danger icon={<DeleteOutlined />} onClick={() => removePin(item.leadIndex)}>Remove</Button>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
