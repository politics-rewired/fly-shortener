import * as Url from "url-parse";

import cache, { normalize } from "./cache";
import {
  refreshCache,
  lookupPath,
  resourceNotFoundResponse
} from "./shortener";

export const parseReq = (req: Request) => {
  const url = new Url(req.url, true);
  const { pathname, query: params } = url;
  return { url, pathname, params };
};

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
    await cache.clearGoogle();
    await cache.clearEntries();
    return new Response("Cleared", { status: 200 });
  }

  if (pathname.includes("/refresh")) {
    await cache.clearEntries();
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
  try {
    await refreshCache();
  } catch (err) {
    const message = "An internal error occured. Please try again later.";
    return new Response(message, { status: 500 });
  }

  // Re-check for match
  matchingResponse = await lookupPath(path);
  if (matchingResponse) {
    return matchingResponse;
  }

  await cache.set404Entry(path);
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
