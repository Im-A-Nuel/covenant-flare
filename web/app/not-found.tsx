import Link from "next/link";
import { CovenantMark } from "@/components/covenant-mark";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
        gap: 4,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 16px 30px -18px rgba(0,0,0,.2)",
          marginBottom: 22,
        }}
      >
        <CovenantMark size={32} />
      </div>
      <div className="crumb" style={{ color: "var(--accent)" }}>
        Error 404
      </div>
      <h1 className="display" style={{ fontSize: 44, margin: "2px 0 12px" }}>
        This page stepped outside the covenant
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: "46ch", margin: "0 0 28px", lineHeight: 1.55 }}>
        The page you are looking for does not exist or has been moved. Let us get you back inside policy.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link className="btn btn-dark" href="/">
          Back to home
        </Link>
        <Link className="btn btn-ghost" href="/dashboard">
          Open the app
        </Link>
      </div>
    </div>
  );
}
