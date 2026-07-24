import { handleOpenAlexRequest } from "../lib/openalex-proxy";

interface VercelRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  const hostHeader = request.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const url = new URL(
    request.url ?? "/api/openalex",
    `https://${host ?? "localhost"}`,
  );
  const proxyResponse = await handleOpenAlexRequest(
    new Request(url, { method: request.method ?? "GET" }),
    { OPENALEX_API_KEY: process.env.OPENALEX_API_KEY },
  );

  response.status(proxyResponse.status);
  proxyResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });
  response.send(await proxyResponse.text());
}
