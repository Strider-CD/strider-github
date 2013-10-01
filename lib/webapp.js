
var git = require('strider-git/webapp')
  , webhooks = require('./webhooks')
  , passport = require('passport')
  , api = require('./api')

module.exports = {
  fastFile: true,
  getBranches: function(userConfig, config, project, done) {
    api.getBranches(userConfig.accessToken, config.owner, config.repo, done)
  },
  getFile: function (filename, ref, userConfig, config, project, done) {
    var baseref = ref.id || ref.branch || ref.tag || 'master'
    api.getFile(filename, baseref, userConfig.accessToken, config.owner, config.repo, done)
  },
  // this is config stored on the user object under "providers.[id]"
  // the config page is expected to set it
  userConfig: {
    accessToken: String,
    login: String,
    id: Number,
    email: String,
    gravatarId: String,
    name: String
  },
  // this is the project-level config
  config: {
    url: String,
    owner: String,
    repo: String,
    // type: https || ssh
    auth: {}
  },
  // this is called when building the "manage projects" page. The
  // results are passed to the angular controller as "repos".
  listRepos: function (userConfig, next) {
    api.getRepos(userConfig.accessToken, userConfig.username, function (err, repos) {
      next(err, repos)
    })
  },
  // will be namespaced under /repo/name/api/github
  routes: function (app, context) {
    app.put('/hook', function (req, res) {
      if (!req.userConfig.accessToken) return res.end(400)
      api.createHook(req.userConfig.username, req.userConfig.accessToken, res.repo.name, function (err, success) {
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
    app.get('/oauth', passport.authenticate('github'));

    app.get(
      '/oauth/callback',
      passport.authenticate('github', { failureRedirect: '/login' }),
      function(req, res){
        res.redirect('/projects')
    })
  }
}
  

