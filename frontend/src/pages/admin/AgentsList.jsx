import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  Tooltip,
  message,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  MailOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import "./AgentsLists.css";

/**
 * CoreLynx • Agents page
 * UI-only redesign: the original API endpoints, filtering, routing,
 * edit/delete payloads, and pagination behavior are preserved.
 * AdminLayout already renders the sidebar and header; this is content only.
 */

// Each visible agent gets a different, calm pastel tone. Assignments are made
// from a stable sorted identity list, so filtering or pagination doesn't recolor avatars.
const AVATAR_TONES = [
  "sky", "violet", "mint", "rose", "amber", "indigo",
  "teal", "coral", "lilac", "ocean", "lime", "slate",
  "peach", "plum", "aqua", "sand",
];

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function DecorativeSparkline() {
  // Purely decorative, not a representation of historical analytics.
  return (
    <svg className="cl-agent-stat-spark" viewBox="0 0 200 70" aria-hidden="true" focusable="false">
      <path
        className="cl-agent-stat-spark-fill"
        d="M0 63 C14 60 23 40 38 44 S62 56 80 42 S105 35 114 41 S140 18 154 25 S180 32 194 8 L200 5 L200 70 L0 70 Z"
      />
      <path
        className="cl-agent-stat-spark-line"
        d="M0 63 C14 60 23 40 38 44 S62 56 80 42 S105 35 114 41 S140 18 154 25 S180 32 194 8 L200 5"
      />
    </svg>
  );
}

function SummaryCard({ title, value, icon, tone, loading }) {
  return (
    <div
      className={`cl-agent-stat cl-agent-stat--${tone}`}
      aria-label={`${title}: ${value}`}
    >
      <div className="cl-agent-stat-inner">

        <div className="cl-agent-stat-icon">
          <img
            src={icon}
            alt=""
            className="cl-agent-custom-icon"
          />
        </div>

        <div className="cl-agent-stat-data">
          <span className="cl-agent-stat-label">{title}</span>

          {loading ? (
            <Skeleton.Input
              active
              size="small"
              className="cl-agent-stat-skeleton"
            />
          ) : (
            <strong className="cl-agent-stat-value">
              {value.toLocaleString("en-US")}
            </strong>
          )}
        </div>

        <DecorativeSparkline />

      </div>
    </div>
  );
}

export default function AgentsList() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await API.get("/agents");
      setAgents(res.data);
    } catch {
      message.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (id) => {
    try {
      await API.delete(`/agents/${id}`);
      message.success("Agent deleted successfully");
      fetchAgents();
    } catch {
      message.error("Failed to delete agent");
    }
  };

  const openEditModal = (agent) => {
    setSelectedAgent(agent);
    form.setFieldsValue({
      name: agent.name,
      email: agent.email,
      isActive: agent.isActive,
    });
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setSelectedAgent(null);
    form.resetFields();
  };

  const updateAgent = async () => {
    try {
      const values = await form.validateFields();
      setEditLoading(true);

      await API.put(`/agents/${selectedAgent._id}`, {
        name: values.name,
        email: values.email,
        isActive: values.isActive,
      });

      message.success("Agent updated successfully");
      closeEditModal();
      fetchAgents();
    } catch (error) {
      if (error?.errorFields) return;
      message.error("Failed to update agent");
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Same instant search behavior as your current page (name + email only).
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const value = `${agent.name} ${agent.email}`.toLowerCase();
      return value.includes(search.toLowerCase());
    });
  }, [agents, search]);

  // Give each agent a distinct pastel color for up to 16 agent accounts,
  // without colors changing when the table is searched or paginated.
  const avatarToneById = useMemo(() => {
    const sortedAgents = [...agents].sort((a, b) =>
      String(a._id || a.email || "").localeCompare(String(b._id || b.email || ""))
    );
    const tones = new Map();
    sortedAgents.forEach((agent, index) => {
      tones.set(agent._id || agent.email, AVATAR_TONES[index % AVATAR_TONES.length]);
    });
    return tones;
  }, [agents]);

  const activeAgents = agents.filter((agent) => agent.isActive).length;
  const inactiveAgents = agents.length - activeAgents;

  const columns = [
    {
      title: "Agent",
      key: "agent",
      width: 255,
      render: (_, row) => {
        const tone = avatarToneById.get(row._id || row.email) || "sky";
        return (
          <div className="cl-agent-person">
            <Avatar size={40} className={`cl-agent-avatar cl-agent-avatar--${tone}`}>
              {getInitials(row.name)}
            </Avatar>
            <div className="cl-agent-person-info">
              <Tooltip title={row.name} mouseEnterDelay={0.65}>
                <span className="cl-agent-person-name">{row.name}</span>
              </Tooltip>
              <span className="cl-agent-person-role">Dispatch Calling Agent</span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Email",
      key: "email",
      width: 260,
      render: (_, row) => (
        <Tooltip title={row.email} mouseEnterDelay={0.65}>
          <span className="cl-agent-email">
            <MailOutlined aria-hidden="true" />
            <span>{row.email}</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "status",
      width: 125,
      render: (isActive) => (
        <span className={`cl-agent-status${isActive ? " cl-agent-status--active" : " cl-agent-status--inactive"}`}>
          <span className="cl-agent-status-dot" aria-hidden="true" />
          {isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      title: "Created",
      key: "created",
      width: 154,
      render: (_, row) => (
        <span className="cl-agent-created">
          <CalendarOutlined aria-hidden="true" />
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      width: 293,
      render: (_, row) => (
        <div className="cl-agent-actions">
          <Button
            className="cl-agent-action cl-agent-action--sheets"
            icon={<FolderOpenOutlined />}
            onClick={() => navigate(`/admin/agents/${row._id}`)}
          >
            View Sheets
          </Button>
          <Button
            className="cl-agent-action cl-agent-action--edit"
            icon={<EditOutlined />}
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this agent?"
            description="This will also remove assigned lead sheets."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => deleteAgent(row._id)}
          >
            <Tooltip title={`Delete ${row.name}`}>
              <Button
                className="cl-agent-action cl-agent-action--delete"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${row.name}`}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <section className="cl-agents-page" aria-label="Registered Dispatch Agents">
      <div className="cl-agents-stats">
        <SummaryCard
  title="Total Agents"
  value={agents.length}
  icon="/images/personsIcon.png"
  tone="blue"
  loading={loading}
/>

<SummaryCard
  title="Active Agents"
  value={activeAgents}
  icon="/images/completetaskIcon.png"
  tone="green"
  loading={loading}
/>

<SummaryCard
  title="Inactive Agents"
  value={inactiveAgents}
  icon="/images/offline.png"
  tone="red"
  loading={loading}
/>
      </div>

      <div className="cl-agents-panel">
        <div className="cl-agents-panel-header">
          <div className="cl-agents-heading">
            <span className="cl-agents-heading-icon"><TeamOutlined aria-hidden="true" /></span>
            <div>
              <h2>Registered Dispatch Agents</h2>
              <p>Manage agent accounts, assigned sheets, and dashboard access.</p>
            </div>
          </div>
          <Input
            className="cl-agents-search"
            allowClear
            prefix={<SearchOutlined aria-hidden="true" />}
            placeholder="Search agent (name or email)..."
            aria-label="Search agents by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Table
          className="cl-agents-table"
          loading={loading}
          rowKey="_id"
          columns={columns}
          dataSource={filteredAgents}
          scroll={{ x: 1087 }}
          pagination={{
            defaultPageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: ["8", "10", "20", "50", "100"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
          }}
          locale={{
            emptyText: search ? "No agents match your search" : "No agents found",
          }}
        />
      </div>

      <Modal
        className="cl-agent-edit-modal"
        title={
          <div className="cl-agent-modal-heading">
            <div className="cl-agent-modal-icon"><EditOutlined aria-hidden="true" /></div>
            <div>
              <h2>Edit Agent</h2>
              <p>Update agent details and status.</p>
            </div>
          </div>
        }
        open={editOpen}
        onCancel={closeEditModal}
        onOk={updateAgent}
        confirmLoading={editLoading}
        okText="Update Agent"
        okButtonProps={{ className: "cl-agent-modal-submit", icon: <CheckCircleOutlined /> }}
        cancelButtonProps={{ className: "cl-agent-modal-cancel" }}
        cancelText="Cancel"
        centered
        width={550}
      >
        <Form form={form} layout="vertical" requiredMark="optional" className="cl-agent-edit-form">
          <Form.Item
            label="Agent Name"
            name="name"
            required
            rules={[{ required: true, message: "Please enter agent name" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter agent name" size="large" />
          </Form.Item>

          <Form.Item
            label="Agent Email"
            name="email"
            required
            rules={[
              { required: true, message: "Please enter agent email" },
              { type: "email", message: "Please enter valid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Enter agent email" size="large" />
          </Form.Item>

          <Form.Item
            label="Agent Status"
            name="isActive"
            required
            rules={[{ required: true, message: "Please select agent status" }]}
          >
            <Select
              size="large"
              options={[
                { value: true, label: <span className="cl-agent-select-value cl-agent-select-value--active"><span /> Active</span> },
                { value: false, label: <span className="cl-agent-select-value cl-agent-select-value--inactive"><span /> Inactive</span> },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
