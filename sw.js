/* 통독 — 오프라인 캐싱 서비스워커
   ① HTML = 네트워크 우선(온라인이면 항상 최신 → index.html 고쳐 배포하면 자동 반영)
   ② 같은 도메인 정적(plan·book-meta·아이콘·본문 data/bible) = 캐시 우선 + 받으면 캐시(오프라인 영구)
   ③ 그 외 = 네트워크
   ※ sw.js 자체나 PRECACHE 목록을 바꿀 때만 버전(tongdok-vN)을 올린다. */
const CACHE = "tongdok-v2";
const PRECACHE = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
  "./data/plan-90.json", "./data/plan-180.json", "./data/plan-300.json", "./data/plan-365.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  const isHTML = req.mode === "navigation" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) { // ① 네트워크 우선
    e.respondWith(
      fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)).catch(() => {}); return r; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }
  if (url.origin === self.location.origin) { // ② 캐시 우선(앱 셸·플랜·본문)
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((r) => {
        const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => {}); return r;
      }).catch(() => cached))
    );
    return;
  }
  // ③ 그 외
});
