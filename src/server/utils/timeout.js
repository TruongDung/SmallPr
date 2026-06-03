/**
 * Returns a promise that rejects with a timeout error if the given promise
 * does not settle within `timeoutMs` milliseconds.
 */
const withTimeout = (promise, timeoutMs) => Promise.race([
  promise,
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  }),
]);

module.exports = { withTimeout };
