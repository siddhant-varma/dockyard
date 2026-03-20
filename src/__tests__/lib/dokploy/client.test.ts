import { describe, it, expect, vi, beforeEach } from "vitest";
import { DokployClient } from "@/lib/dokploy/client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  };
}

describe("DokployClient", () => {
  let client: DokployClient;

  beforeEach(() => {
    client = new DokployClient("https://dokploy.example.com/api", "test-key");
    mockFetch.mockReset();
  });

  describe("listApplications", () => {
    it("lists both applications and compose services", async () => {
      // First call: application.all
      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            applicationId: "app-1",
            appName: "Project Alpha",
            applicationStatus: "done",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ])
      );
      // Second call: compose.all
      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            composeId: "compose-1",
            name: "Redis Stack",
            composeStatus: "running",
            createdAt: "2026-02-01T00:00:00Z",
          },
        ])
      );

      const apps = await client.listApplications();

      expect(apps).toHaveLength(2);
      expect(apps[0]).toMatchObject({
        id: "app-1",
        name: "Project Alpha",
        type: "application",
        status: "running",
      });
      expect(apps[1]).toMatchObject({
        id: "compose-1",
        name: "Redis Stack",
        type: "compose",
        status: "running",
      });
    });

    it("passes x-api-key header", async () => {
      mockFetch.mockResolvedValue(mockResponse([]));
      await client.listApplications();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "test-key",
          }),
        })
      );
    });

    it("handles empty responses gracefully", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      mockFetch.mockResolvedValueOnce(mockResponse([]));

      const apps = await client.listApplications();
      expect(apps).toEqual([]);
    });
  });

  describe("getApplication", () => {
    it("returns mapped application detail", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          applicationId: "app-1",
          appName: "Project Alpha",
          applicationStatus: "done",
          description: "Example web application",
          repository: "github.com/example-org/project-alpha",
          branch: "main",
          domains: [{ host: "project-alpha.example.com" }],
          env: "AI_PROVIDER=anthropic\nAI_MODEL=claude-sonnet-4-5-20250514",
          createdAt: "2026-01-01T00:00:00Z",
        })
      );

      const app = await client.getApplication("app-1");

      expect(app.id).toBe("app-1");
      expect(app.name).toBe("Project Alpha");
      expect(app.type).toBe("application");
      expect(app.domains).toEqual(["project-alpha.example.com"]);
      expect(app.env).toContain("AI_PROVIDER=anthropic");
    });
  });

  describe("redeploy", () => {
    it("returns queued deploy result", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      const result = await client.redeploy("app-1");

      expect(result.status).toBe("queued");
      expect(result.deployId).toContain("redeploy-app-1");
    });

    it("calls the correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      await client.redeploy("app-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/application.redeploy"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("app-1"),
        })
      );
    });
  });

  describe("saveEnvironment", () => {
    it("sends full env string to Dokploy", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      await client.saveEnvironment("app-1", "KEY1=value1\nKEY2=value2");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/application.saveEnvironment"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("KEY1=value1"),
        })
      );
    });
  });

  describe("getLogs", () => {
    it("parses array of log entries", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse([
          { message: "Server started", timestamp: "2026-03-19T12:00:00Z" },
          {
            message: "Error: connection refused",
            timestamp: "2026-03-19T12:01:00Z",
          },
        ])
      );

      const logs = await client.getLogs("app-1");

      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe("Server started");
      expect(logs[0].level).toBe("info");
      expect(logs[1].level).toBe("error");
    });

    it("parses raw string log output", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse("Line 1\nWarning: something\nLine 3")
      );

      const logs = await client.getLogs("app-1");

      expect(logs).toHaveLength(3);
      expect(logs[1].level).toBe("warn");
    });
  });

  describe("getMetrics", () => {
    it("parses CPU and memory metrics", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            cpu: 25.5,
            memory: { percentage: 60.2 },
            timestamp: "2026-03-19T12:00:00Z",
          },
          {
            cpu: 30.1,
            memory: { percentage: 61.0 },
            timestamp: "2026-03-19T12:01:00Z",
          },
        ])
      );

      const metrics = await client.getMetrics("app-1", {
        start: new Date("2026-03-19T12:00:00Z"),
        end: new Date("2026-03-19T13:00:00Z"),
      });

      expect(metrics).toHaveLength(2);
      expect(metrics[0].name).toBe("cpu");
      expect(metrics[0].dataPoints).toHaveLength(2);
      expect(metrics[0].dataPoints[0].value).toBe(25.5);
      expect(metrics[1].name).toBe("memory");
      expect(metrics[1].dataPoints[0].value).toBe(60.2);
    });

    it("returns empty array for no data", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));

      const metrics = await client.getMetrics("app-1", {
        start: new Date(),
        end: new Date(),
      });

      expect(metrics).toEqual([]);
    });
  });
});
