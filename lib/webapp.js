
var git = require('strider-git/webapp')
  , webhooks = require('./webhooks')
  , passport = require('passport')
  , api = require('./api')

module.exports = {
  fastFile: true,
  getBranches: function(account, config, project, done) {
    api.getBranches(account.config.accessToken, config.owner, config.repo, done)
  },
  getFile: function (filename, ref, account, config, project, done) {
    var baseref = ref.id || ref.branch || ref.tag || 'master'
    api.getFile(filename, baseref, account.config.accessToken, config.owner, config.repo, done)
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
    // type: https || ssh
    auth: {}
  },
  // this is called when building the "manage projects" page. The
  // results are passed to the angular controller as "repos".
  listRepos: function (account, next) {
    api.getRepos(account.config.accessToken, account.config.login, function (err, repos) {
      next(err, repos)
    })
  },
  // if this provider plugin needs setup (in github's case, oauth) this string
  // represents the href link to the page to handle that.
  setupLink: "/ext/github/oauth",

  // determine whether or not this provider is setup for this user.
  // e.g. for github, that we have an oauth key
  // returns boolean
  isSetup: function (account) {
    return account.config.accessToken !== undefined && account.config.login !== undefined
  },
  // will be namespaced under /repo/name/api/github
  routes: function (app, context) {
    app.put('/hook', function (req, res) {
      var account = req.accountConfig()
      if (!account.config.accessToken) return res.end(400)
      api.createHook(account.config.login, account.config.accessToken, res.repo.name, function (err, success) {
        if (err) res.end({error: err})
        res.end({success: success})
      })
    })
    app.delete('/hook', function (req, res) {
      res.send('Not Implemented')
    })
    // github should hit this endpoint
    app.post('/hook', function (req, res) {
      // trigger new build
      res.send('Not Implemeneted')
    })

    app.post('/webhook', webhooks.webhook_signature);
    app.post('/webhook/:secret', webhooks.webhook_secret);
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
  

