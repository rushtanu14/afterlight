import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { GEOCODE_MAX_BODY_BYTES } from "./geocodeService";
import { createLocalGeocodeHandler } from "./geocodeRuntime";

type WebHandler = (request: Request) => Promise<Response> | Response;
type NextFunction = () => void;

function copyHeaders(headers: IncomingHttpHeaders) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => result.append(name, item));
    else if (value !== undefined) result.set(name, value);
  }
  return result;
}

async function readBoundedBody(request: IncomingMessage) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk) : new Uint8Array(chunk);
    total += bytes.byteLength;
    if (total > GEOCODE_MAX_BODY_BYTES) {
      request.resume();
      return null;
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function requestOrigin(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",", 1)[0]?.trim() || "http";
  const host = request.headers.host || "127.0.0.1:5173";
  return `${protocol}://${host}`;
}

async function writeWebResponse(response: ServerResponse, webResponse: Response) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  const body = await webResponse.arrayBuffer();
  response.end(Buffer.from(body));
}

function writeAdapterError(response: ServerResponse, status: number, code: string, message: string) {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify({ success: false, error: { code, message } }));
}

export function createViteGeocodeMiddleware(handler: WebHandler) {
  return (request: IncomingMessage, response: ServerResponse, _next: NextFunction) => {
    void (async () => {
      try {
        const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readBoundedBody(request);
        if (body === null) {
          writeAdapterError(response, 413, "request_too_large", "Location request is too large.");
          return;
        }
        const webRequest = new Request(`${requestOrigin(request)}/api/geocode`, {
          method: request.method,
          headers: copyHeaders(request.headers),
          body
        });
        await writeWebResponse(response, await handler(webRequest));
      } catch {
        writeAdapterError(response, 500, "proxy_error", "Location proxy could not process the request.");
      }
    })();
  };
}

export function afterlightGeocodeDevPlugin(): Plugin {
  return {
    name: "afterlight-geocode-dev-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/geocode", createViteGeocodeMiddleware(createLocalGeocodeHandler()));
    }
  };
}
