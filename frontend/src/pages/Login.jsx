import { useState } from "react";
import { Button, Form, Input, message } from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  FileTextOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  SignalFilled,
  TeamOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "./Login.css";

// Files go in public/images/. If the actual extensions differ,
// change just these two paths and the CSS background-image URL.
const LOGO_URL = "/images/logo.png";


const features = [
  {
    icon: "/images/live.png",
    title: "Live",
    subtitle: "Tracking",
    live: true,
  },
  {
    icon: "/images/personsIcon.png",
    title: "Agent",
    subtitle: "Tracking",
  },
  {
    icon: "/images/excel.png",
    title: "CSV",
    subtitle: "Lead Sheets",
  },
  {
    icon: "/images/pc.png",
    title: "Auto",
    subtitle: "Attendance",
  },
  {
    icon: "/images/protect.png",
    title: "Secure",
    subtitle: "Access",
  },
];


export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Business logic intentionally preserved from your existing Login.jsx.
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const [res] = await Promise.all([
        API.post("/auth/login", values),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      message.success("Login successful");

      if (res.data.user.role === "admin") {
        navigate("/admin/tracking");
      } else {
        navigate("/agent/leads");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cl-login">
      <div className="cl-login__backdrop" aria-hidden="true" />
      <div className="cl-login__blue-ribbon" aria-hidden="true" />
      <div className="cl-login__shell">
        <section className="cl-login__left" aria-label="CoreLynx Logistics portal">
          <div className="cl-login__brand cl-enter cl-enter--1">
            <img className="cl-login__logo" src={LOGO_URL} alt="CoreLynx" />
          </div>

          <div className="cl-login__editorial cl-enter cl-enter--2">
            <h1>Dispatch Operations<br />Made <em>Simple.</em></h1>
            <p>Everything your dispatch team needs, beautifully connected in one secure workspace.</p>

            <div className="cl-login__features" aria-label="CoreLynx features">
              {features.map((item) => (
                <div className="cl-login__feature" key={item.title + item.subtitle}>
                  {item.live && <span className="cl-login__live-tag">Live</span>}
                 
<span className="cl-login__feature-icon" aria-hidden="true">
  <img
    src={item.icon}
    alt=""
    className="cl-login__feature-image"
    draggable={false}
  />
</span>

                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cl-login__landscape cl-enter cl-enter--3" aria-hidden="true" />
        </section>

        <section className="cl-login__right" aria-label="Account login">
          <div className="cl-login__card cl-enter cl-enter--3">
            <header className="cl-login__card-brand">
              <span className="cl-login__sro">SRO</span>
            </header>

           
<img
  src="/images/truck.png"
  alt=""
  className="cl-login__watermark"
  aria-hidden="true"
  draggable={false}
/>

            <div className="cl-login__intro">
              <span className="cl-login__overline">WELCOME TO YOUR WORKSPACE</span>
              <h2>Welcome Back<span>.</span></h2>
            </div>

            <Form name="corelynx-login" layout="vertical" requiredMark={false} onFinish={handleLogin} className="cl-login__form" autoComplete="on">
              <Form.Item label="Email Address" name="email" rules={[{ required: true, message: "Please enter email" }]}>
                <Input prefix={<MailOutlined />} placeholder="Enter your email address" autoComplete="username" size="large" />
              </Form.Item>
              <Form.Item label="Password" name="password" rules={[{ required: true, message: "Please enter password" }]}>
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                
iconRender={(visible) =>
  visible ? (
    <img
      src="/images/eye.png"
      alt=""
      className="cl-login__password-eye"
    />
  ) : (
    <EyeInvisibleOutlined />
  )
}

                  size="large"
                />
              </Form.Item>
            
<div className="cl-login__authorized">
  <img
    src="/images/protect.png"
    alt=""
    className="cl-login__authorized-image"
    aria-hidden="true"
  />
  <span>Authorized personnel only</span>
</div>

              <Form.Item className="cl-login__submit-wrap">
                <Button type="primary" htmlType="submit" block size="large" loading={loading} disabled={loading} className="cl-login__submit">
                  {loading ? "Signing In..." : <><span>Log In</span><ArrowRightOutlined /></>}
                </Button>
              </Form.Item>
            </Form>
            <footer className="cl-login__card-footer"><span />CoreLynx Logistics · Dispatch Operations<span /></footer>
          </div>
        </section>
      </div>
    </main>
  );
}
