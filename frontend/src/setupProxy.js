const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/generate_bookmarklet",
    createProxyMiddleware({
      target: "http://localhost:5000", // Your Flask app's URL
      changeOrigin: true,
    })
  );
};
