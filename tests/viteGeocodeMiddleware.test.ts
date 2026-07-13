import { createServer } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, test } from "vitest";
import { createViteGeocodeMiddleware } from "../api/_lib/viteGeocodeMiddleware";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("Vite geocode middleware", () => {
  test("adapts a real Node request to the Web Handler without changing body or origin", async () => {
    const middleware = createViteGeocodeMiddleware(async (request) => Response.json({
      method: request.method,
      origin: request.headers.get("origin"),
      body: await request.json()
    }));
    const server = createServer((request, response) => middleware(request, response, () => {
      response.statusCode = 404;
      response.end();
    }));
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server address.");
    const origin = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${origin}/api/geocode`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Pasadena" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ method: "POST", origin, body: { query: "Pasadena" } });
  });

  test("bounds request buffering before invoking the handler", async () => {
    let invoked = false;
    const middleware = createViteGeocodeMiddleware(async () => {
      invoked = true;
      return new Response(null, { status: 204 });
    });
    const server = createServer((request, response) => middleware(request, response, () => undefined));
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server address.");
    const origin = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${origin}/api/geocode`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "x".repeat(2_000) })
    });

    expect(response.status).toBe(413);
    expect(invoked).toBe(false);
  });

  test("adapts bodyless GET requests without inventing a request body", async () => {
    const middleware = createViteGeocodeMiddleware(async (request) => Response.json({
      method: request.method,
      body: await request.text()
    }));
    const server = createServer((request, response) => middleware(request, response, () => undefined));
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server address.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/geocode`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ method: "GET", body: "" });
  });

  test("redacts adapter failures instead of leaking thrown details", async () => {
    const middleware = createViteGeocodeMiddleware(async () => {
      throw new Error("private upstream detail");
    });
    const server = createServer((request, response) => middleware(request, response, () => undefined));
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server address.");
    const origin = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${origin}/api/geocode`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Pasadena" })
    });
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).toContain("Location proxy could not process the request");
    expect(body).not.toContain("private upstream detail");
  });
});
