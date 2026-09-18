"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="kn">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            ದೋಷ ಸಂಭವಿಸಿದೆ
          </h1>
          <p style={{ color: "#78716c", marginBottom: "1.5rem" }}>
            Something went wrong. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#c2410c",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.9375rem",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
