
var git = require('strider-git/worker')

module.exports = {
  init: function (dest, userConfig, config, job, done) {
    return done(null, {
      config: config,
      userConfig: userConfig,
      fetch: function (context, done) {
        module.exports.fetch(dest, userConfig, config, job, context, done)
      }
    })
  },
  fetch: function (dest, userConfig, config, job, context, done) {
    console.log('gh fetch')
    if (config.auth.type === 'https' && !config.auth.username) {
      config.auth.username = userConfig.accessToken
      config.auth.password = ''
    }
    git.fetch(dest, null, config, job, context, done)
  }
}
