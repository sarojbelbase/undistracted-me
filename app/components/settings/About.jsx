/**
 * About — app description, version, and external links.
 */
import {
  Globe2,
  Github,
  EnvelopeFill,
  QuestionCircle,
  Heart,
  JournalText,
} from "react-bootstrap-icons";
import {
  LANDING_URL,
  GITHUB_URL,
  FEEDBACK_FORM_URL,
  SUPPORT_URL,
  MOMO_URL,
  CHANGELOG_URL,
} from "../../constants/urls";
import { APP_VERSION } from "../../constants/version";

const LinkRow = ({ icon, label, href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      background: "var(--panel-bg)",
      border: "1px solid var(--card-border)",
      textDecoration: "none",
      color: "var(--w-ink-1)",
      cursor: "pointer",
      transition: "background 0.15s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "var(--card-bg)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "var(--panel-bg)";
    }}
  >
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: 8,
        background: "color-mix(in srgb, var(--w-accent) 12%, transparent)",
        color: "var(--w-accent)",
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
  </a>
);

export const About = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <p
      style={{
        fontSize: 12.5,
        lineHeight: 1.6,
        color: "var(--w-ink-2)",
        margin: 0,
      }}
    >
      Undistracted Me is a free, open-source new tab for Chrome and Firefox. It
      replaces the noisy default page with a calm dashboard of widgets, a
      cinematic Focus Mode with a Pomodoro timer, ambient sounds and Google
      Tasks — with no account.
    </p>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <LinkRow icon={<Globe2 size={14} />} label="Website" href={LANDING_URL} />
      <LinkRow icon={<Github size={14} />} label="GitHub" href={GITHUB_URL} />
      <LinkRow icon={<JournalText size={14} />} label="Changelog" href={CHANGELOG_URL} />
      <LinkRow icon={<EnvelopeFill size={14} />} label="Feedback" href={FEEDBACK_FORM_URL} />
      <LinkRow icon={<QuestionCircle size={14} />} label="Support" href={SUPPORT_URL} />
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 10,
        borderTop: "1px solid var(--card-border)",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--w-ink-4)" }}>
        Version {APP_VERSION}
      </span>
      <a
        href={MOMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--w-accent)",
          textDecoration: "none",
        }}
      >
        <Heart size={11} /> Support the project
      </a>
    </div>
  </div>
);
