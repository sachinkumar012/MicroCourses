const crypto = require("crypto");

const idempotencyMiddleware = (req, res, next) => {
  // Only apply to POST, PUT, PATCH requests
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return next();
  }

  // Generate a hash of the request for idempotency tracking
  const requestHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
      })
    )
    .digest("hex");

  // Store original send function
  const originalSend = res.send;

  // Override send function to store response
  res.send = function (data) {
    // Store the idempotency key and response if DB is available
    if (global.pool && global.dbConnected) {
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        // response wasn't JSON, store as string
        parsed = data && data.toString ? data.toString() : null;
      }

      global.pool
        .query(
          `INSERT INTO idempotency_keys (id, user_id, request_hash, response_data, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
       response_data = EXCLUDED.response_data,
       created_at = EXCLUDED.created_at`,
          [
            idempotencyKey,
            req.user?.id || null,
            requestHash,
            JSON.stringify({
              statusCode: res.statusCode,
              data: parsed,
            }),
          ]
        )
        .catch((err) => {
          console.error(
            "Error storing idempotency key:",
            err && err.message ? err.message : err
          );
        });
    }

    // Call original send
    originalSend.call(this, data);
  };

  // Check if we've seen this idempotency key before
  global.pool
    .query("SELECT response_data FROM idempotency_keys WHERE id = $1", [
      idempotencyKey,
    ])
    .then((result) => {
      if (result.rows.length > 0) {
        const { statusCode, data } = result.rows[0].response_data;
        res.status(statusCode).json(data);
        return;
      }

      next();
    })
    .catch((err) => {
      console.error("Error checking idempotency key:", err);
      next();
    });
};

module.exports = idempotencyMiddleware;
