
var git = require('strider-git/webapp')
  , webhooks = require('./webhooks')
  , api = require('./api')
  , utils = require('./utils')
  , GithubStrategy = require('passport-github').Strategy

module.exports = {
  // may be extended by strider, if it receives other config
  appConfig: {
    myHostname: "http://localhost:3000",
    appId: "a3af4568e9d8ca4165fe",
    appSecret: "18651128b57787a3336094e2ba1af240dfe44f6c",
    apiBase: process.env.GITHUB_API_ENDPOINT || "https://api.github.com"
  },
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
    cache: Boolean,
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

  auth: function (passport, context) {
    var config = this.appConfig
    if (!config.appId || !config.appSecret || !config.myHostname) {
      throw new Error('Github plugin misconfigured! Need appId and appSecret and myHostname')
    }
    var callbackURL = config.myHostname + "/auth/github/callback"
    passport.use(new GithubStrategy({
          clientID : config.appId
        , clientSecret: config.appSecret
        , callbackURL : callbackURL
        , authorizationUrl: config.apiBase + '/login/oauth/authorize'
        , tokenUrl: config.apiBase + '/login/oauth/access_token'
        , userProfileUrl: config.apiBase + '/user'
        , scope: ['repo']
        , passReqToCallback: true
        }, validateAuth));
  },

  setupRepo: function (account, config, project, done) {
    var url = this.appConfig.myHostname + '/' + project.name + '/api/github/webhook'
    if (!account.accessToken) return done(new Error('Github account not configured'))
    utils.generateSecret(function (err, secret) {
      if (err) return done(err)
      config.secret = secret
      api.createHooks(project.name, url, config.secret, account.accessToken, function (err) {
        if (err) return done(err)
        done(null, config)
      })
    })
  },

  teardownRepo: function (account, config, project, done) {
    var url = this.appConfig.myHostname + '/' + project.name + '/api/github/webhook'
    if (!account.accessToken) return done(new Error('Github account not configured'))
    api.deleteHooks(project.name, url, account.accessToken, function (err, deleted) {
      if (err) return done(err)
      done()
    })
  },

  // will be namespaced under /:org/:repo/api/github
  routes: function (app, context) {
    var config = this.appConfig

    app.post('/hook', function (req, res) {
      var url = config.myHostname + '/' + req.project.name + '/api/github/webhook'
        , account = req.accountConfig()
        , pconfig = req.providerConfig()
      if (!account.accessToken) return res.send(400, 'Github account not configured')
      api.createHooks(req.project.name, url, pconfig.secret, account.accessToken, function (err) {
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
    app.anon.post('/webhook', webhooks.receiveWebhook.bind(null, context.emitter))
  },
  // app is namespaced to /ext/github, app.context isn't
  // we use app.context to keep the original url structure for backwards compat
  globalRoutes: function (app, context) {
    context.app.get('/auth/github', context.passport.authenticate('github'))
    context.app.get(
      '/auth/github/callback',
      context.passport.authenticate('github', { failureRedirect: '/login' }),
      function(req, res){
        res.redirect('/projects')
      })
  }
}

function validateAuth(req, accessToken, refreshToken, profile, done){
  if (!req.user){
    return done("Cannot sign up with github - you must link it to account");
  }
  var account = req.user.account('github', profile.id)
  if (account) {
    console.warn("Trying to attach a github account that's already attached...")
    return done(new Error('Account already linked to this user'))
  }
  req.user.accounts.push(makeAccount(accessToken, profile))
  req.user.save(function (err) {
    done(err, req.user);
  })
}

function makeAccount(accessToken, profile) {
  return {
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
  }
}

