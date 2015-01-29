'use strict';

var crypto = require('crypto');

/*
 * generateSecret()
 *
 * Generate a short shared secret to send to Github to use
 * for verifying the Webhook data origins.
 *
 * <callback> function(secret)
 */
exports.generateSecret = function generateSecret(callback) {
  crypto.randomBytes(32, function (err, buf) {
    callback(err, buf && buf.toString('hex'));
  });
};
