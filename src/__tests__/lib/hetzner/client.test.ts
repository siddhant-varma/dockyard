import { describe, it, expect, vi, beforeEach } from "vitest";
import { HetznerClient } from "@/lib/hetzner/client";

// Mock fetch globally
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

describe("HetznerClient", () => {
  let client: HetznerClient;

  beforeEach(() => {
    client = new HetznerClient("test-token");
    mockFetch.mockReset();
  });

  describe("listServers", () => {
    it("returns mapped server summaries", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          servers: [
            {
              id: 123,
              name: "prod-1",
              status: "running",
              public_net: {
                ipv4: { ip: "1.2.3.4" },
                ipv6: { ip: "::1" },
              },
              datacenter: { name: "fsn1-dc14" },
              server_type: { name: "cx22", description: "CX22" },
            },
          ],
        })
      );

      const servers = await client.listServers();

      expect(servers).toHaveLength(1);
      expect(servers[0]).toEqual({
        id: "123",
        name: "prod-1",
        status: "running",
        publicIpv4: "1.2.3.4",
        publicIpv6: "::1",
        datacenter: "fsn1-dc14",
        serverType: "cx22",
      });
    });

    it("passes auth header", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ servers: [] }));
      await client.listServers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/servers"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("getServerMetrics", () => {
    it("parses time series data correctly", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          metrics: {
            time_series: {
              cpu: {
                values: [
                  [1710864000, "25.5"],
                  [1710864060, "30.2"],
                ],
              },
            },
          },
        })
      );

      const metrics = await client.getServerMetrics("123", "cpu", {
        start: new Date("2026-03-19T12:00:00Z"),
        end: new Date("2026-03-19T13:00:00Z"),
        step: 60,
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe("cpu");
      expect(metrics[0].dataPoints).toHaveLength(2);
      expect(metrics[0].dataPoints[0].value).toBe(25.5);
      expect(metrics[0].dataPoints[1].value).toBe(30.2);
    });

    it("handles multiple metric types", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          metrics: {
            time_series: {
              cpu: { values: [[1710864000, "25"]] },
              "disk.0.iops.read": { values: [[1710864000, "100"]] },
              "disk.0.iops.write": { values: [[1710864000, "50"]] },
            },
          },
        })
      );

      const metrics = await client.getServerMetrics("123", ["cpu", "disk"], {
        start: new Date("2026-03-19T12:00:00Z"),
        end: new Date("2026-03-19T13:00:00Z"),
      });

      expect(metrics).toHaveLength(3);
      expect(metrics.map((m) => m.name)).toContain("cpu");
      expect(metrics.map((m) => m.name)).toContain("disk.0.iops.read");
    });
  });

  describe("getVolumes", () => {
    it("maps volume data correctly", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          volumes: [
            { id: 1, name: "data", size: 50, server: 123, status: "attached" },
            {
              id: 2,
              name: "backup",
              size: 100,
              server: null,
              status: "available",
            },
          ],
        })
      );

      const volumes = await client.getVolumes();

      expect(volumes).toHaveLength(2);
      expect(volumes[0]).toEqual({
        id: "1",
        name: "data",
        size: 50,
        serverId: "123",
        status: "attached",
      });
      expect(volumes[1].serverId).toBeUndefined();
      expect(volumes[1].status).toBe("available");
    });
  });

  describe("getPricing", () => {
    it("parses pricing data with correct types", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          pricing: {
            server_types: [
              {
                server_type: { name: "cx22" },
                prices: [
                  {
                    location: "fsn1",
                    price_hourly: { gross: "0.0065" },
                    price_monthly: { gross: "3.85" },
                  },
                ],
              },
            ],
            traffic: { price_per_tb: { gross: "1.19" } },
            currency: "EUR",
          },
        })
      );

      const pricing = await client.getPricing();

      expect(pricing.currency).toBe("EUR");
      expect(pricing.serverTypes).toHaveLength(1);
      expect(pricing.serverTypes[0].name).toBe("cx22");
      expect(pricing.serverTypes[0].priceHourly).toBe(0.0065);
      expect(pricing.serverTypes[0].priceMonthly).toBe(3.85);
      expect(pricing.trafficPerTb).toBe(1.19);
    });
  });

  describe("getFloatingIps", () => {
    it("maps floating IP data", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          floating_ips: [
            {
              id: 10,
              ip: "5.6.7.8",
              type: "ipv4",
              server: 123,
              dns_ptr: [{ ip: "5.6.7.8", dns_ptr: "prod.example.com" }],
            },
          ],
        })
      );

      const ips = await client.getFloatingIps();

      expect(ips).toHaveLength(1);
      expect(ips[0]).toEqual({
        id: "10",
        ip: "5.6.7.8",
        type: "ipv4",
        serverId: "123",
        dnsPtr: "prod.example.com",
      });
    });
  });

  describe("getLoadBalancers", () => {
    it("maps load balancer data", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          load_balancers: [
            {
              id: 5,
              name: "lb-1",
              public_net: { ipv4: { ip: "10.0.0.1" } },
              targets: [{}, {}, {}],
              load_balancer_type: { name: "lb11" },
            },
          ],
        })
      );

      const lbs = await client.getLoadBalancers();

      expect(lbs).toHaveLength(1);
      expect(lbs[0]).toEqual({
        id: "5",
        name: "lb-1",
        publicIpv4: "10.0.0.1",
        targetCount: 3,
        status: "running",
      });
    });
  });
});
