import { CacheFirst, NetworkOnly, RangeRequestsPlugin, Serwist } from "serwist";

type OfflinePrecacheEntry =
  | string
  | { url: string; revision?: string; integrity?: string };

// @ts-expect-error Serwist injects this manifest into the worker at build time.
const buildAssets = self.__SW_MANIFEST as OfflinePrecacheEntry[];
const assetManifest = buildAssets
  .map((entry) =>
    typeof entry === "string"
      ? entry
      : `${entry.url}:${entry.revision ?? ""}`,
  )
  .join("|");
let offlineShellRevision = 0;
for (let index = 0; index < assetManifest.length; index += 1) {
  offlineShellRevision = Math.imul(31, offlineShellRevision) + assetManifest.charCodeAt(index);
}

const offlineFallback = {
  handlerDidError: async () =>
    Response.redirect(new URL("/offline", self.location.origin).href, 302),
};

const serwist = new Serwist({
  precacheEntries: [
    ...buildAssets,
    // This route contains no user data and renders lesson contents from Dexie.
    { url: "/offline", revision: (offlineShellRevision >>> 0).toString(36) },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        url.pathname !== "/offline" &&
        !url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/__offline-pdf/") &&
        [
          "/feed",
          "/classes",
          "/library",
          "/grades",
          "/assignments",
          "/lessons",
        ].some(
          (prefix) =>
            url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
        ),
      handler: new NetworkOnly({ plugins: [offlineFallback] }),
    },
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/__offline-pdf/"),
      handler: new CacheFirst({
        cacheName: "pdf-cache",
        plugins: [new RangeRequestsPlugin()],
      }),
    },
  ],
});

serwist.addEventListeners();
