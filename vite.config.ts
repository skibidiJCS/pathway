import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { handleOpenAlexRequest } from "./lib/openalex-proxy";

function openAlexDevProxy(apiKey?: string): Plugin {
  return {
    name: "openalex-dev-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== "/api/openalex") {
          next();
          return;
        }

        const proxyResponse = await handleOpenAlexRequest(
          new Request(url, { method: request.method ?? "GET" }),
          { OPENALEX_API_KEY: apiKey },
        );
        response.statusCode = proxyResponse.status;
        proxyResponse.headers.forEach((value, name) => {
          response.setHeader(name, value);
        });
        response.end(await proxyResponse.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), openAlexDevProxy(env.OPENALEX_API_KEY)],
  };
});
