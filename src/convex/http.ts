import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/health",
  method: "GET",
  handler: async () => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});

http.route({
  path: "/version",
  method: "GET",
  handler: async () => {
    return new Response(JSON.stringify({ version: "1.0.0" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});

export default http;
