
var gitProvier = require('strider-git/lib/worker')

module.exports = {
  fetch: function (dest, userConfig, config, job, context, done) {
    if (config.auth.type === 'https' && !config.auth.username) {
      config.auth.username = userConfig.accessToken
      config.auth.password = ''
    }
    gitProvider.fetch(dest, null, config, job, context, done)
  }
}
