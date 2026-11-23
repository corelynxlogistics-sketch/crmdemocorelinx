import { useState } from "react";
import { Button, Form, Input, message } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  EyeOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import "./CreateAgent.css";

const onboardingFeatures = [
  {
    key: "attendance",
    title: "Auto Attendance",
    description: "Login timestamp saved automatically",
    icon: "/images/calender.png",
  },
  {
    key: "assignment",
    title: "Lead Assignment",
    description: "Only assigned sheets are visible",
    icon: "/images/folderIcon.png",
  },
  {
    key: "visibility",
    title: "Admin Visibility",
    description: "Progress and remarks tracked live",
    icon: "/images/eye.png",
  },
];

export default function CreateAgent() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Existing endpoint, payload, success feedback, and reset behavior preserved.
  const createAgent = async (values) => {
    try {
      setSubmitting(true);
      await API.post("/agents", values);
      message.success("Agent created successfully");
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  };

  const backToAgents = () => navigate("/admin/agents");

  return (
    <main className="cl-create-agent">
      <div className="cl-create-agent-top">
        <Button
          className="cl-create-agent-back"
          icon={<ArrowLeftOutlined />}
          onClick={backToAgents}
        >
          Back to Agents
        </Button>

        <div className="cl-create-agent-heading">
        <span className="cl-create-agent-heading-icon" aria-hidden="true">
  <img
    src="/images/personsIcon.png"
    alt=""
    className="cl-create-agent-custom-icon"
  />
</span>
          <div className="cl-create-agent-heading-copy">
            <h1>Create New Agent</h1>
            <p>Add a new dispatch calling agent and generate secure dashboard access.</p>
          </div>
        </div>
      </div>

      <div className="cl-create-agent-grid">
        <section className="cl-create-agent-panel cl-create-agent-form-panel" aria-labelledby="cl-create-agent-form-heading">
          <div className="cl-create-agent-section-heading">
          <span className="cl-create-agent-section-icon cl-create-agent-section-icon--blue" aria-hidden="true">
  <img
    src="/images/leadIcon.png"
    alt=""
    className="cl-create-agent-custom-icon"
  />
</span>
            <div>
              <h2 id="cl-create-agent-form-heading">Agent Information</h2>
              <p>Enter the agent details below to create a new account.</p>
            </div>
          </div>

          <Form
            className="cl-create-agent-form"
            requiredMark={false}
            form={form}
            layout="vertical"
            onFinish={createAgent}
            autoComplete="off"
          >
            <Form.Item
              label="Agent Full Name"
              name="name"
              rules={[{ required: true, message: "Please enter agent name" }]}
            >
              <Input
                size="large"
                prefix={<IdcardOutlined aria-hidden="true" />}
                placeholder="Enter agent full name (e.g., John Doe)"
                autoComplete="name"
              />
            </Form.Item>

            <Form.Item
              label="Agent Email"
              name="email"
              rules={[
                { required: true, message: "Please enter email" },
                { type: "email", message: "Please enter valid email" },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined aria-hidden="true" />}
                placeholder="Enter agent email (e.g., john@corelynx.com)"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              label="Temporary Password"
              name="password"
              rules={[
                { required: true, message: "Please enter password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined aria-hidden="true" />}
                placeholder="Enter a temporary password"
                autoComplete="new-password"
              />
            </Form.Item>

            <div className="cl-create-agent-access-note" role="note">
              <InfoCircleOutlined className="cl-create-agent-access-note-icon" aria-hidden="true" />
              <div>
                <h3>Agent login access</h3>
                <p>
                  After creation, the agent can login immediately. Attendance will be
                  automatically marked when the agent signs in.
                </p>
              </div>
            </div>

            <div className="cl-create-agent-actions">
              <Button
                className="cl-create-agent-cancel"
                size="large"
                onClick={backToAgents}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="cl-create-agent-submit"
                type="primary"
                htmlType="submit"
                size="large"
                icon={!submitting ? <UserAddOutlined /> : undefined}
                loading={submitting}
              >
                {submitting ? "Creating Agent..." : "Create Agent"}
              </Button>
            </div>
          </Form>
        </section>

        <aside className="cl-create-agent-panel cl-create-agent-security" aria-labelledby="cl-create-agent-security-heading">
          <div className="cl-create-agent-security-lead">
        <span className="cl-create-agent-section-icon cl-create-agent-section-icon--shield" aria-hidden="true">
  <img
    src="/images/completetaskIcon.png"
    alt=""
    className="cl-create-agent-custom-icon"
  />
</span>
            <h2 id="cl-create-agent-security-heading">Secure Agent Onboarding</h2>
          </div>
          <p className="cl-create-agent-security-description">
            Every agent receives controlled access to assigned lead sheets only.
            Admin can track current row, call remarks, sheet progress, and daily
            login attendance in real time.
          </p>

          <div className="cl-create-agent-feature-list">
          {onboardingFeatures.map(({ key, title, description, icon }) => (
              <div className={`cl-create-agent-feature cl-create-agent-feature--${key}`} key={key}>
              <span className="cl-create-agent-feature-icon" aria-hidden="true">
  <img
    src={icon}
    alt=""
    className="cl-create-agent-feature-image"
  />
</span>
                <div className="cl-create-agent-feature-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <CheckCircleFilled className="cl-create-agent-feature-check" aria-hidden="true" />
              </div>
            ))}
          </div>

          <div className="cl-create-agent-security-footer">
            <SafetyCertificateOutlined aria-hidden="true" />
            <span>Role-based access for every dispatch agent</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
