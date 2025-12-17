import React from "react";

export type ActionCardProps = {
  title: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
};

export function ActionCard({ 
  title, 
  description, 
  icon, 
  children, 
  variant = "default" 
}: ActionCardProps) {
  // Rahmenfarben je nach Variante
  const borderColors: Record<string, string> = {
    default: "#475569",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  // Box-Style mit sichtbarem Rahmen und Hintergrund
  const boxStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    marginBottom: "1.5rem",
    borderRadius: "1rem",
    border: `2px solid ${borderColors[variant]}`,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    padding: "1.25rem",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
  };

  // Header-Style
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    marginBottom: "0.5rem",
  };

  // Icon-Style
  const iconStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    lineHeight: 1,
  };

  // Titel-Style
  const titleStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#f8fafc",
    margin: 0,
  };

  // Beschreibungs-Style
  const descriptionStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    color: "#cbd5e1",
    margin: "0 0 1rem 0",
    lineHeight: 1.5,
  };

  // Content-Style
  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  return (
    <div style={boxStyle}>
      <div style={headerStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <h2 style={titleStyle}>{title}</h2>
      </div>
      {description && (
        <p style={descriptionStyle}>{description}</p>
      )}
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}


