import { Serwist } from "serwist";

// Serwist replaces this identifier at build time. It is read and discarded so
// the worker can compile, without precaching those URLs.
// @ts-expect-error Injected into the service worker bundle. Not a window property.
void self.__SW_MANIFEST;

// Foundation stub. The worker can register, but it precaches nothing and
// applies no runtime caching. Offline lesson caching waits for real pages.
const serwist = new Serwist({
  precacheEntries: [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [],
});

serwist.addEventListeners();
