
var git = require('strider-git/webapp')
  , webhooks = require('./webhooks')
  , api = require('./api')
  , GithubStrategy = require('passport-github').Strategy

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

  auth: function (passport, context) {
    var config = context.config
    passport.use(new GithubStrategy({
          clientID : config.github.appId
        , clientSecret: config.github.appSecret
        , callbackURL : config.github.myHostname + "/ext/github/oauth/callback"
        , scope: ['repo']
        , passReqToCallback: true
        },
        function(req, accessToken, refreshToken, profile, done){
          if (!req.user){
            return done("Cannot sign up with github - you must link it to account");
          } 
          for (var i=0; i<req.user.accounts.length; i++) {
            if (req.user.accounts[i].provider === 'github' &&
                req.user.accounts[i].id === profile.id) {
              console.warn("Trying to attach a github account that's already attached...")
              return done(new Error('Account already linked to this user'))
            }
          }
          req.user.accounts.push({
            provider: 'github',
            id: profile.id,
            display_url: profile.profileUrl,
            title: profile.username,
            config: {
              accessToken: accessToken,
              login: profile.username,
              email: profile.emails[0].value,
              gravatarId: profile._json.gravatar_id,
              name: profile.displayName
            },
            cache: []
          })
          req.user.save(function (err) {
            done(err, req.user);
          })
      }));
  },

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
        if (err) return res.send(500, err.message)
        res.send(200, deleted ? 'Webhook removed' : 'No webhook to delete')
      })
    })

    // github should hit this endpoint
    app.post('/webhook', webhooks.postWebhook)
  },
  // namespaced to /ext/github
  globalRoutes: function (app, context) {
    app.get('/oauth', context.passport.authenticate('github'))
    app.get(
      '/oauth/callback',
      context.passport.authenticate('github', { failureRedirect: '/login' }),
      function(req, res){
        res.redirect('/projects')
      })
  }
}
  

