"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center">
      <div className="text-muted-foreground">Ladowanie dokumentacji API...</div>
    </div>
  ),
});

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Nie udalo sie pobrac specyfikacji API");
        }
        return res.json();
      })
      .then((data) => setSpec(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Blad</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-muted-foreground">Ladowanie dokumentacji API...</div>
      </div>
    );
  }

  return (
    <div className="api-docs-container">
      <style jsx global>{`
        /* Custom Swagger UI styling to match app theme */
        .api-docs-container .swagger-ui {
          font-family: inherit;
        }

        .api-docs-container .swagger-ui .topbar {
          display: none;
        }

        .api-docs-container .swagger-ui .info {
          margin: 20px 0;
        }

        .api-docs-container .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }

        .api-docs-container .swagger-ui .info .description {
          font-size: 0.95rem;
        }

        .api-docs-container .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 20px 0;
        }

        .api-docs-container .swagger-ui .opblock-tag {
          font-size: 1.1rem;
          font-weight: 600;
          border-bottom: 1px solid hsl(var(--border));
          margin: 0;
          padding: 15px 0;
        }

        .api-docs-container .swagger-ui .opblock {
          margin: 10px 0;
          border-radius: 8px;
          box-shadow: none;
          border: 1px solid hsl(var(--border));
        }

        .api-docs-container .swagger-ui .opblock .opblock-summary {
          border: none;
          padding: 10px 15px;
        }

        .api-docs-container .swagger-ui .opblock .opblock-summary-method {
          border-radius: 4px;
          min-width: 70px;
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .api-docs-container .swagger-ui .opblock .opblock-summary-path {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.95rem;
        }

        .api-docs-container .swagger-ui .opblock .opblock-summary-description {
          font-size: 0.9rem;
          color: hsl(var(--muted-foreground));
        }

        .api-docs-container .swagger-ui .opblock.opblock-get {
          background: rgba(97, 175, 254, 0.1);
          border-color: rgba(97, 175, 254, 0.3);
        }

        .api-docs-container .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #61affe;
        }

        .api-docs-container .swagger-ui .opblock.opblock-post {
          background: rgba(73, 204, 144, 0.1);
          border-color: rgba(73, 204, 144, 0.3);
        }

        .api-docs-container .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #49cc90;
        }

        .api-docs-container .swagger-ui .opblock.opblock-put {
          background: rgba(252, 161, 48, 0.1);
          border-color: rgba(252, 161, 48, 0.3);
        }

        .api-docs-container .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #fca130;
        }

        .api-docs-container .swagger-ui .opblock.opblock-patch {
          background: rgba(80, 227, 194, 0.1);
          border-color: rgba(80, 227, 194, 0.3);
        }

        .api-docs-container .swagger-ui .opblock.opblock-patch .opblock-summary-method {
          background: #50e3c2;
        }

        .api-docs-container .swagger-ui .opblock.opblock-delete {
          background: rgba(249, 62, 62, 0.1);
          border-color: rgba(249, 62, 62, 0.3);
        }

        .api-docs-container .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #f93e3e;
        }

        .api-docs-container .swagger-ui .opblock-body {
          background: transparent;
        }

        .api-docs-container .swagger-ui .opblock-section-header {
          background: hsl(var(--muted));
          border-radius: 4px;
          padding: 8px 12px;
        }

        .api-docs-container .swagger-ui .opblock-section-header h4 {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .api-docs-container .swagger-ui table.parameters {
          margin: 10px 0;
        }

        .api-docs-container .swagger-ui .parameter__name {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9rem;
        }

        .api-docs-container .swagger-ui .parameter__type {
          font-size: 0.85rem;
          color: hsl(var(--muted-foreground));
        }

        .api-docs-container .swagger-ui .response-col_status {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 600;
        }

        .api-docs-container .swagger-ui .btn {
          border-radius: 6px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .api-docs-container .swagger-ui .btn.execute {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }

        .api-docs-container .swagger-ui .btn.execute:hover {
          background-color: hsl(var(--primary) / 0.9);
        }

        .api-docs-container .swagger-ui .model-box {
          background: hsl(var(--muted));
          border-radius: 8px;
        }

        .api-docs-container .swagger-ui .model {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
        }

        .api-docs-container .swagger-ui section.models {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
        }

        .api-docs-container .swagger-ui section.models h4 {
          font-size: 1.1rem;
          font-weight: 600;
          padding: 15px 20px;
          margin: 0;
          border-bottom: 1px solid hsl(var(--border));
        }

        .api-docs-container .swagger-ui section.models .model-container {
          margin: 10px 0;
          background: transparent;
        }

        .api-docs-container .swagger-ui .servers-title {
          font-size: 1rem;
          font-weight: 600;
        }

        .api-docs-container .swagger-ui select {
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
          padding: 6px 12px;
        }

        /* Dark mode adjustments */
        .dark .api-docs-container .swagger-ui {
          filter: none;
        }

        .dark .api-docs-container .swagger-ui .info .title,
        .dark .api-docs-container .swagger-ui .info .description,
        .dark .api-docs-container .swagger-ui .opblock-tag,
        .dark .api-docs-container .swagger-ui .opblock-summary-path,
        .dark .api-docs-container .swagger-ui .parameter__name,
        .dark .api-docs-container .swagger-ui table thead tr th,
        .dark .api-docs-container .swagger-ui table tbody tr td,
        .dark .api-docs-container .swagger-ui .response-col_description,
        .dark .api-docs-container .swagger-ui section.models h4,
        .dark .api-docs-container .swagger-ui .model-title,
        .dark .api-docs-container .swagger-ui .prop-type,
        .dark .api-docs-container .swagger-ui .servers-title,
        .dark .api-docs-container .swagger-ui label {
          color: hsl(var(--foreground));
        }

        .dark .api-docs-container .swagger-ui .opblock-description-wrapper p,
        .dark .api-docs-container .swagger-ui .opblock-external-docs-wrapper p,
        .dark .api-docs-container .swagger-ui .opblock-summary-description,
        .dark .api-docs-container .swagger-ui .parameter__type,
        .dark .api-docs-container .swagger-ui .response-col_status {
          color: hsl(var(--muted-foreground));
        }

        .dark .api-docs-container .swagger-ui .opblock-section-header {
          background: hsl(var(--muted));
        }

        .dark .api-docs-container .swagger-ui .opblock-section-header h4 {
          color: hsl(var(--foreground));
        }

        .dark .api-docs-container .swagger-ui .model-box,
        .dark .api-docs-container .swagger-ui .model-box-control {
          background: hsl(var(--muted));
        }

        .dark .api-docs-container .swagger-ui .model {
          color: hsl(var(--foreground));
        }

        .dark .api-docs-container .swagger-ui pre {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        .dark .api-docs-container .swagger-ui .microlight {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
      `}</style>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dokumentacja API</h1>
        <p className="text-muted-foreground">
          Interaktywna dokumentacja REST API systemu Bakus TMS
        </p>
      </div>

      <SwaggerUI
        spec={spec}
        docExpansion="list"
        defaultModelsExpandDepth={0}
        displayRequestDuration
        filter
        showExtensions
        showCommonExtensions
        tryItOutEnabled={false}
      />
    </div>
  );
}
