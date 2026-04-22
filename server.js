const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function isInsideRoot(filePath) {
  const relativePath = path.relative(root, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function getFilePath(urlPath) {
  let pathname;

  try {
    pathname = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const requestedPath = path.resolve(root, `.${pathname}`);

  if (!isInsideRoot(requestedPath)) {
    return null;
  }

  const candidates = [];

  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isDirectory()) {
    candidates.push(path.join(requestedPath, "index.html"));
  } else {
    candidates.push(requestedPath);
  }

  if (!path.extname(requestedPath)) {
    candidates.push(`${requestedPath}.html`);
    candidates.push(path.join(requestedPath, "index.html"));
  }

  candidates.push(path.join(root, "index.html"));

  return candidates.find((candidate) => {
    return isInsideRoot(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  });
}

const server = http.createServer((req, res) => {
  if (!req.url || !["GET", "HEAD"].includes(req.method)) {
    send(res, 405, "Method Not Allowed", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const filePath = getFilePath(pathname);

  if (!filePath) {
    send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Start with another port, for example:`);
    console.error("  $env:PORT=3001; npm start");
    process.exit(1);
  }

  throw error;
});

server.listen(port, () => {
  console.log(`Electrical Ai site is running at http://localhost:${port}`);
});
