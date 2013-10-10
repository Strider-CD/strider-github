
var crypto = require('crypto')

module.exports = {
  generateSecret: generateSecret
}

/*
 * generate_webhook_secret()
 *
 * Generate a short shared secret to send to Github to use
 * for verifying the Webhook data origins.
 *
 * <callback> function(secret)
 */
function generateSecret(callback) {
  crypto.randomBytes(32, function (err, buf) {
    callback(err, buf && buf.toString('hex'))
  })
}
