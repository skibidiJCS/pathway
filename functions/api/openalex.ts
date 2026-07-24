import { handleOpenAlexRequest } from "../../lib/openalex-proxy";

interface Env {
  OPENALEX_API_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export function onRequestGet(context: PagesContext): Promise<Response> {
  return handleOpenAlexRequest(context.request, context.env);
}
