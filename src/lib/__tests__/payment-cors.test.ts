import { describe, expect, it } from "vitest";

import { corsHeaders } from "../../../supabase/functions/_shared/payments/http/cors";

describe("payment Edge Function CORS", () => {
  it("allows the browser checkout from development and preview origins", () => {
    const headers = corsHeaders(
      "https://tranquilicare01.vercel.app",
      "http://localhost:5173",
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("accepts the headers sent by the current Supabase browser client", () => {
    const headers = corsHeaders("https://tranquilicare01.vercel.app");

    expect(headers["Access-Control-Allow-Headers"]).toContain("x-retry-count");
  });

  it("does not trust a Vercel hostname only because it starts with the project name", () => {
    const headers = corsHeaders(
      "https://tranquilicare01.vercel.app",
      "https://tranquilicare01-malicious.vercel.app",
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://tranquilicare01.vercel.app",
    );
  });

  it("accepts only preview origins that were explicitly configured", () => {
    const preview = "https://tranquilicare01-git-main-team.vercel.app";
    const headers = corsHeaders(
      "https://tranquilicare01.vercel.app",
      preview,
      [preview],
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe(preview);
  });
});
