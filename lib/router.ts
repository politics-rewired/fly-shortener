import * as Url from "url-parse";
import * as queryString from "query-string";
import cache from "@fly/cache";

import {
  clearCache,
  refreshCache,
  lookupPath,
  resourceNotFoundResponse,
  CACHE_TAG,
  TTL_404
} from "./shortener";

export const parseReq = (req: Request) => {
  const url = new Url(req.url);
  const { pathname } = url;
  const params = queryString.parse(url.query);
  return { url, pathname, params };
};

const normalize = (str: string) => str.toLowerCase().trim();

/**
 * Handle admin routing
 * @param req The admin Request to be routed
 */
const routeAdmin = async (req: Request): Promise<Response> => {
  const { pathname, params } = parseReq(req);

  if (params.secret !== app.config.adminSecret) {
    return new Response("Unauthorized", { status: 403 });
  }

  if (pathname.includes("/clear")) {
    await clearCache();
    return new Response("Cleared", { status: 200 });
  }

  if (pathname.includes("/refresh")) {
    await clearCache();
    await refreshCache();
    return new Response("Refreshed", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
};

/**
 * Handle short link redirects
 * @param req The short link request to be routed
 */
const routeShortlink = async (req: Request): Promise<Response> => {
  const { pathname } = parseReq(req);
  const path = normalize(pathname);

  // Check for existing match
  let matchingResponse = await lookupPath(path);
  if (matchingResponse) {
    return matchingResponse;
  }

  // Refresh the cache if no match
  await refreshCache();

  // Re-check for match
  matchingResponse = await lookupPath(path);
  if (matchingResponse) {
    return matchingResponse;
  }

  await cache.set(path, "404", { ttl: TTL_404, tags: [CACHE_TAG] });
  return resourceNotFoundResponse();
};

/**
 * Handle routing
 * @param req The Request to be routed
 */
export const route = async (req: Request): Promise<Response> => {
  const { pathname } = parseReq(req);

  if (pathname === "/favicon.ico") {
    return new Response("", { status: 404 });
  }

  if (pathname.startsWith("/admin")) {
    return routeAdmin(req);
  }

  return routeShortlink(req);
};
