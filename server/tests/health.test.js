import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Health API (/api/v1/health)", () => {
  it("should return 200 OK and report health status", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.data).toHaveProperty("status", "ok");
    expect(res.body.data).toHaveProperty("database");
    expect(res.body.data).toHaveProperty("timestamp");
  });

  it("should support /api/health alias for backward compatibility", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("should return standard 404 error shape for undefined routes", async () => {
    const res = await request(app).get("/api/v1/non-existent-route");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
    expect(res.body.error).toHaveProperty("message");
  });
});
