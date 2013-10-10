
var git = require('strider-git/webapp')
  , webhooks = require('./webhooks')
  , config = require('./config')
  , api = require('./api')

module.exports = {
  fastFile: true,
  getBranches: function(account, config, project, done) {
    api.getBranches(account.accessToken, config.owner, config.repo, done)
  },
  getFile: function (filename, ref, account, config, project, done) {
    var baseref = ref.id || ref.branch || ref.tag || 'master'
    api.getFile(filename, baseref, account.accessToken, config.owner, config.repo, done)
  },
  // this is config stored on the user object under "accounts"
  // the account config page is expected to set it
  accountConfig: {
    accessToken: String,
    login: String,
    id: Number,
    email: String,
    gravatarId: String,
    name: String
  },
  // this is the project-level config
  // project.provider.config
  config: {
    url: String,
    owner: String,
    repo: String,
    pull_requests: {type: String, enum: ['all', 'none', 'whitelist']},
    whitelist: [{
      name: String,
      level: {type: String, enum: ['tester', 'admin']}
    }],
    // used for the webhook
    secret: String,
    // type: https || ssh
    auth: {}
  },
  // this is called when building the "manage projects" page. The
  // results are passed to the angular controller as "repos".
  listRepos: function (account, next) {
    api.getRepos(account.accessToken, account.login, function (err, repos) {
      next(err, repos)
    })
  },
  // if this provider plugin needs setup (in github's case, oauth) this string
  // represents the href link to the page to handle that.
  setupLink: "/ext/github/oauth",

  // will be namespaced under /:org/:repo/api/github
  routes: function (app, context) {
    app.post('/hook', function (req, res) {
      var url = context.serverName + '/' + req.project.name + '/api/github/webhook'
        , account = req.accountConfig()
        , config = req.providerConfig()
      if (!account.accessToken) return res.send(400, 'Github account not configured')
      api.createHooks(req.project.name, url, config.secret, account.accessToken, function (err) {
        if (err) return res.send(500, err.message)
        res.send(200, 'Webhook registered')
      })
    })
    app.delete('/hook', function (req, res) {
      var url = context.serverName + '/' + req.project.name + '/api/github/webhook'
        , account = req.accountConfig()
      if (!account.accessToken) return res.send(400, 'Github account not configured')
      api.deleteHooks(req.project.name, url, account.accessToken, function (err, deleted) {
        console.log(err)
        if (err) return res.send(500, err.message)
        res.send(200, deleted ? 'Webhook removed' : 'No webhook to delete')
      })
    })

    // github should hit this endpoint
    app.post('/webhook', webhooks.postWebhook)
  },
  // namespaced to /ext/github
  globalRoutes: function (app, context) {
    app.get('/oauth', passport.authenticate('github'))
    app.get(
      '/oauth/callback',
      passport.authenticate('github', { failureRedirect: '/login' }),
      function(req, res){
        res.redirect('/projects')
      })
  }
}
  

