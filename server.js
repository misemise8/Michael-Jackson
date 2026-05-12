const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const PORT = Number(process.env.PORT || 3000);

const files = {
  products: path.join(DATA_DIR, "products.json"),
  orders: path.join(DATA_DIR, "orders.json"),
  counter: path.join(DATA_DIR, "counter.json")
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

let eventClients = [];

function defaultProducts() {
  return [
    {
      id: "p001",
      name: "ムーンウォークコーラ",
      price: 200,
      stock: 30,
      enabled: true,
      sortOrder: 1
    },
    {
      id: "p002",
      name: "スリラーポップコーン",
      price: 300,
      stock: 25,
      enabled: true,
      sortOrder: 2
    },
    {
      id: "p003",
      name: "ビートイットポテト",
      price: 350,
      stock: 20,
      enabled: true,
      sortOrder: 3
    },
    {
      id: "p004",
      name: "ビリージーンセット",
      price: 600,
      stock: 15,
      enabled: true,
      sortOrder: 4
    }
  ];
}

async function ensureDataFiles() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await ensureFile(files.products, defaultProducts());
  await ensureFile(files.orders, []);
  await ensureFile(files.counter, { day: todayKey(), value: 0 });
}

async function ensureFile(filePath, value) {
  try {
    await fsp.access(filePath);
  } catch (error) {
    await writeJson(filePath, value);
  }
}

async function readJson(filePath) {
  const text = await fsp.readFile(filePath, "utf8");
  return JSON.parse(text || "null");
}

async function writeJson(filePath, value) {
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function nowIso() {
  return new Date().toISOString();
}

function sortProducts(products) {
  return [...products].sort((a, b) => {
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function readBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 1024 * 1024) {
      throw new Error("Request body is too large.");
    }
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

function normalizeProduct(input, fallback = {}) {
  return {
    id: fallback.id,
    name: String(input.name || "").trim(),
    price: Number(input.price),
    stock: Number(input.stock),
    enabled: input.enabled !== false,
    sortOrder: Number(input.sortOrder || fallback.sortOrder || 0)
  };
}

function validateProduct(product) {
  if (!product.name) {
    return "商品名を入力してください。";
  }

  if (!Number.isInteger(product.price) || product.price < 0) {
    return "値段は0以上の整数にしてください。";
  }

  if (!Number.isInteger(product.stock) || product.stock < 0) {
    return "在庫数は0以上の整数にしてください。";
  }

  return "";
}

function makeProductId(products) {
  const used = new Set(products.map((product) => product.id));

  for (let i = 1; i <= 999; i += 1) {
    const id = `p${String(i).padStart(3, "0")}`;

    if (!used.has(id)) {
      return id;
    }
  }

  return `p${Date.now()}`;
}

async function nextOrderNumbers() {
  const day = todayKey();
  const counter = await readJson(files.counter);
  let value = Number(counter.value || 0);

  if (counter.day !== day) {
    value = 0;
  }

  value += 1;

  await writeJson(files.counter, { day, value });

  const suffix = String(value).padStart(3, "0");
  return {
    id: `${day}-${suffix}`,
    ticketNo: `MJ-${suffix}`
  };
}

function broadcast(type, payload = {}) {
  const event = JSON.stringify({
    type,
    payload,
    at: nowIso()
  });

  eventClients = eventClients.filter((client) => !client.destroyed);
  eventClients.forEach((client) => {
    client.write(`event: update\n`);
    client.write(`data: ${event}\n\n`);
  });
}

async function handleProducts(req, res, segments) {
  if (req.method === "GET" && segments.length === 2) {
    const products = await readJson(files.products);
    sendJson(res, 200, sortProducts(products));
    return;
  }

  if (req.method === "POST" && segments.length === 2) {
    const input = await readBody(req);
    const products = await readJson(files.products);

    if (products.length >= 9) {
      sendError(res, 400, "商品は最大9個までです。");
      return;
    }

    const product = normalizeProduct(input, {
      id: makeProductId(products),
      sortOrder: products.length + 1
    });
    const error = validateProduct(product);

    if (error) {
      sendError(res, 400, error);
      return;
    }

    products.push(product);
    await writeJson(files.products, sortProducts(products));
    broadcast("products");
    sendJson(res, 201, product);
    return;
  }

  if (segments.length === 3) {
    const productId = decodeURIComponent(segments[2]);
    const products = await readJson(files.products);
    const index = products.findIndex((product) => product.id === productId);

    if (index === -1) {
      sendError(res, 404, "商品が見つかりません。");
      return;
    }

    if (req.method === "PUT") {
      const input = await readBody(req);
      const product = normalizeProduct(
        { ...products[index], ...input },
        products[index]
      );
      const error = validateProduct(product);

      if (error) {
        sendError(res, 400, error);
        return;
      }

      products[index] = product;
      await writeJson(files.products, sortProducts(products));
      broadcast("products");
      sendJson(res, 200, product);
      return;
    }

    if (req.method === "DELETE") {
      const removed = products.splice(index, 1)[0];
      await writeJson(files.products, sortProducts(products));
      broadcast("products");
      sendJson(res, 200, removed);
      return;
    }
  }

  sendError(res, 404, "APIが見つかりません。");
}

async function handleOrders(req, res, url, segments) {
  if (req.method === "GET" && segments.length === 2) {
    const status = url.searchParams.get("status");
    const orders = await readJson(files.orders);
    const filtered = status
      ? orders.filter((order) => order.status === status)
      : orders;

    sendJson(res, 200, sortOrders(filtered));
    return;
  }

  if (req.method === "POST" && segments.length === 2) {
    const input = await readBody(req);
    const order = await createOrder(input);
    broadcast("orders", { id: order.id });
    broadcast("products");
    sendJson(res, 201, order);
    return;
  }

  if (req.method === "GET" && segments.length === 3) {
    const order = await findOrder(decodeURIComponent(segments[2]));

    if (!order) {
      sendError(res, 404, "注文が見つかりません。");
      return;
    }

    sendJson(res, 200, order);
    return;
  }

  if (req.method === "PUT" && segments.length === 4 && segments[3] === "status") {
    const body = await readBody(req);
    const order = await updateOrderStatus(decodeURIComponent(segments[2]), body.status);
    broadcast("orders", { id: order.id });
    sendJson(res, 200, order);
    return;
  }

  if (
    req.method === "PUT" &&
    segments.length === 6 &&
    segments[3] === "items" &&
    segments[5] === "check"
  ) {
    const body = await readBody(req);
    const order = await updateItemCheck(
      decodeURIComponent(segments[2]),
      decodeURIComponent(segments[4]),
      Boolean(body.checked)
    );
    broadcast("orders", { id: order.id });
    sendJson(res, 200, order);
    return;
  }

  sendError(res, 404, "APIが見つかりません。");
}

async function findOrder(orderId) {
  const orders = await readJson(files.orders);
  return orders.find((order) => order.id === orderId || order.ticketNo === orderId);
}

async function createOrder(input) {
  const requestedItems = Array.isArray(input.items) ? input.items : [];

  if (requestedItems.length === 0) {
    const error = new Error("注文内容が空です。");
    error.status = 400;
    throw error;
  }

  const products = await readJson(files.products);
  const items = requestedItems.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const quantity = Number(item.quantity || 0);

    if (!product || !product.enabled) {
      const error = new Error("商品が見つかりません。");
      error.status = 400;
      throw error;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error("注文個数が正しくありません。");
      error.status = 400;
      throw error;
    }

    if (product.stock < quantity) {
      const error = new Error(`${product.name} の在庫が足りません。`);
      error.status = 409;
      throw error;
    }

    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      amount: product.price * quantity,
      checked: false
    };
  });

  requestedItems.forEach((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    product.stock -= Number(item.quantity);
  });

  const numbers = await nextOrderNumbers();
  const order = {
    id: numbers.id,
    ticketNo: numbers.ticketNo,
    status: "preparing",
    createdAt: nowIso(),
    items,
    total: items.reduce((sum, item) => sum + item.amount, 0)
  };

  const orders = await readJson(files.orders);
  orders.push(order);
  await writeJson(files.products, sortProducts(products));
  await writeJson(files.orders, sortOrders(orders));
  return order;
}

async function updateOrderStatus(orderId, status) {
  const allowed = new Set(["preparing", "calling", "completed", "cancelled"]);

  if (!allowed.has(status)) {
    const error = new Error("注文状態が正しくありません。");
    error.status = 400;
    throw error;
  }

  const orders = await readJson(files.orders);
  const order = orders.find((entry) => entry.id === orderId || entry.ticketNo === orderId);

  if (!order) {
    const error = new Error("注文が見つかりません。");
    error.status = 404;
    throw error;
  }

  order.status = status;
  order.updatedAt = nowIso();
  await writeJson(files.orders, sortOrders(orders));
  return order;
}

async function updateItemCheck(orderId, productId, checked) {
  const orders = await readJson(files.orders);
  const order = orders.find((entry) => entry.id === orderId || entry.ticketNo === orderId);

  if (!order) {
    const error = new Error("注文が見つかりません。");
    error.status = 404;
    throw error;
  }

  const item = order.items.find((entry) => entry.productId === productId);

  if (!item) {
    const error = new Error("注文商品が見つかりません。");
    error.status = 404;
    throw error;
  }

  item.checked = checked;
  order.updatedAt = nowIso();
  await writeJson(files.orders, sortOrders(orders));
  return order;
}

function handleEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write("\n");
  eventClients.push(res);

  req.on("close", () => {
    eventClients = eventClients.filter((client) => client !== res);
  });
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/") {
    pathname = "/regi.html";
  }

  const filePath = path.normalize(path.join(ROOT_DIR, pathname));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendError(res, 403, "アクセスできません。");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendError(res, 404, "ファイルが見つかりません。");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

async function router(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === "/api/events") {
      handleEvents(req, res);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      const segments = url.pathname.split("/").filter(Boolean);

      if (segments[1] === "products") {
        await handleProducts(req, res, segments);
        return;
      }

      if (segments[1] === "orders") {
        await handleOrders(req, res, url, segments);
        return;
      }

      sendError(res, 404, "APIが見つかりません。");
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    sendError(res, error.status || 500, error.message || "サーバーエラーです。");
  }
}

ensureDataFiles()
  .then(() => {
    http.createServer(router).listen(PORT, "0.0.0.0", () => {
      console.log(`S3文化祭システム: http://localhost:${PORT}/regi.html`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
