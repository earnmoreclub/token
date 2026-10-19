import http from "node:http";

// Minimal fake NewAPI token API. Masks keys in search/get results like newer builds.
const PORT = Number(process.env.MOCK_PORT ?? 4010);
const tokens = new Map();
let nextId = 1;
const calls = { create: 0, put: 0 };

const mask = (t) => ({ ...t, key: `${t.key.slice(0, 4)}****${t.key.slice(-4)}` });

const server = http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const send = (o) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(o));
  };
  if (req.headers.authorization !== "Bearer admin") return send({ success: false, message: "unauthorized" });
  const u = new URL(req.url, "http://x");

  if (req.method === "GET" && u.pathname === "/__calls") return send({ success: true, data: calls });

  if (req.method === "POST" && u.pathname === "/api/token/") {
    calls.create++;
    const b = JSON.parse(body);
    const id = nextId++;
    tokens.set(id, {
      id,
      key: `abcdefghijklmnopqrstuvwx${id}`,
      name: b.name,
      remain_quota: b.remain_quota,
      used_quota: 0,
      unlimited_quota: b.unlimited_quota,
      expired_time: b.expired_time,
      status: 1,
    });
    return send({ success: true, message: "" });
  }

  if (req.method === "GET" && u.pathname === "/api/token/search") {
    const kw = u.searchParams.get("keyword");
    const tk = u.searchParams.get("token");
    const hits = [...tokens.values()].filter((t) => (kw && t.name.includes(kw)) || (tk && t.key === tk));
    return send({ success: true, data: { items: hits.map(mask) } });
  }

  const reveal = u.pathname.match(/^\/api\/token\/(\d+)\/key$/);
  if (req.method === "POST" && reveal) {
    const t = tokens.get(Number(reveal[1]));
    return t ? send({ success: true, data: { key: t.key } }) : send({ success: false, message: "not found" });
  }

  const one = u.pathname.match(/^\/api\/token\/(\d+)$/);
  if (req.method === "GET" && one) {
    const t = tokens.get(Number(one[1]));
    return t ? send({ success: true, data: mask(t) }) : send({ success: false, message: "not found" });
  }

  if (req.method === "PUT" && u.pathname === "/api/token/") {
    calls.put++;
    const b = JSON.parse(body);
    const cur = tokens.get(b.id);
    if (!cur) return send({ success: false, message: "not found" });
    // Real gateways ignore the (masked) key field on update.
    tokens.set(b.id, { ...cur, remain_quota: b.remain_quota, status: b.status });
    return send({ success: true });
  }

  send({ success: false, message: "404" });
});

server.listen(PORT, () => console.log(`mock upstream listening on ${PORT}`));
