import { handleOpenAlexRequest } from "../lib/openalex-proxy.ts";

interface LegacyRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface LegacyResponse {
  status(code: number): LegacyResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

function toWebRequest(request: Request | LegacyRequest): Request {
  if (request instanceof Request) return request;

  const hostHeader = request.headers?.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const url = new URL(
    request.url ?? "/api/openalex",
    `https://${host ?? "localhost"}`,
  );

  return new Request(url, { method: request.method ?? "GET" });
}

export default async function handler(
  request: Request | LegacyRequest,
  response?: LegacyResponse,
): Promise<Response | void> {
  const proxyResponse = await handleOpenAlexRequest(toWebRequest(request), {
    OPENALEX_API_KEY: process.env.OPENALEX_API_KEY,
  });

  if (!response) return proxyResponse;

  response.status(proxyResponse.status);
  proxyResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });
  response.send(await proxyResponse.text());
}
