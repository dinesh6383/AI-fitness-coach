import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

type Handler = (request: Request) => Response | Promise<Response>;
type ApiModule = Record<string, Handler | undefined>;

/** Turns a Node request into a Web Request, calls the handler, and writes the Response back. */
export async function handleNodeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  load: () => Promise<ApiModule>,
) {
  const method = req.method ?? "GET";

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const hasBody = method !== "GET" && method !== "HEAD";

  const request = new Request(
    `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`,
    {
      method,
      headers,
      body: hasBody ? Buffer.concat(chunks).toString("utf8") : undefined,
    },
  );

  const handler = (await load())[method];
  if (!handler) {
    res.statusCode = 405;
    res.end();
    return;
  }

  const response = await handler(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** Serves every file in api/ (for example api/burn.ts at /api/burn) while running `npm run dev`. */
export function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api", (req, res, next) => {
        // Only simple names like /burn or /coach, so a request can never point at other files
        const name = /^\/([a-z0-9-]+)\/?(?:\?.*)?$/.exec(req.url ?? "")?.[1];
        if (!name) return next();

        handleNodeRequest(
          req,
          res,
          () => server.ssrLoadModule(`/api/${name}.ts`) as Promise<ApiModule>,
        ).catch((error) => {
          // A missing file in api/ is a 404, anything else is a real server error
          const missing =
            /Failed to load url|Cannot find module|does not exist/i.test(
              String(error),
            );
          if (!missing) server.config.logger.error(String(error));
          res.statusCode = missing ? 404 : 500;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: missing ? "not_found" : "server_error",
            }),
          );
        });
      });
    },
  };
}
