import {
  cleanAbstractText,
  cleanMetadataText,
} from "../lib/openalex.ts";
import { handleOpenAlexRequest } from "../lib/openalex-proxy.ts";

export { cleanAbstractText, cleanMetadataText };

interface VercelRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  const hostHeader = request.headers?.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const proxyResponse = await handleOpenAlexRequest(
    new Request(
      new URL(
        request.url ?? "/api/openalex",
        `https://${host ?? "localhost"}`,
      ),
      { method: request.method ?? "GET" },
    ),
    { OPENALEX_API_KEY: process.env.OPENALEX_API_KEY },
  );
  response.setHeader(
    "Cache-Control",
    proxyResponse.headers.get("Cache-Control") ?? "no-store",
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.status(proxyResponse.status).json(await proxyResponse.json());
}
