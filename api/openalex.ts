import { handleOpenAlexRequest } from "../lib/openalex-proxy.ts";

export default {
  fetch(request: Request): Promise<Response> {
    return handleOpenAlexRequest(request, {
      OPENALEX_API_KEY: process.env.OPENALEX_API_KEY,
    });
  },
};
