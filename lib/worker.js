
var git = require('strider-git/worker')

module.exports = {
  init: function (dirs, cache, account, config, job, done) {
    return done(null, {
      config: config,
      account: account,
      fetch: function (context, done) {
        module.exports.fetch(dirs.data, cache, account, config, job, context, done)
      }
    })
  },
  fetch: function (dest, cache, account, config, job, context, done) {
    if (config.auth.type === 'https' && !config.auth.username) {
      config.auth.username = account.accessToken
      config.auth.password = ''
    }
    git.fetch(dest, cache, config, job, context, done)
  }
}
