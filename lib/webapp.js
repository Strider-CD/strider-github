
var git = require('strider-git/webapp')
  , webhooks = require('./webhooks')
  , api = require('./api')
  , GithubStrategy = require('passport-github').Strategy

// returns : {trigger, branch, deploy}
function pushJob(payload) {
  var branchname
    , trigger
    , commit
    , ref
  if (payload.ref.indexOf('refs/heads/') === 0) {
    branchname = payload.ref.substring('refs/heads/'.length)
    ref = {
      branch: branchname,
      id: payload.after
    }
  } else {
    ref = {
      fetch: payload.ref
    }
  }
  trigger = {
    type: 'commit',
    author: {
      email: commit.author.email,
      image: utils.gravatar(commit.author.email)
    },
    url: commit.url,
    message: commit.message,
    timestamp: commit.timestamp,
    source: {
      type: 'plugin',
      plugin: 'github'
    }
  }
  return {
    branch: branchname,
    trigger: trigger,
    deploy: true,
    ref: ref
  }
}

// push hook
// pull request
// ... ? anything else ?

function makeJob(user, project, payload) {
  var now = new Date()
    , config = pushJob(payload)
    , deploy = false
    , commit
    , trigger
    , branch
    , ref
    , job
  branch = project.branch(config.branch)
  if (config.branch !== 'master' && branch.mirror_master) {
    // mirror_master branches don't deploy
    deploy = false
  } else {
    deploy = config.deploy && branch.deploy_on_green
  }
  job = {
    type: deploy ? 'TEST_AND_DEPLOY' : 'TEST_ONLY',
    trigger: config.trigger,
    project: project.name,
    user_id: user._id,
    ref: config.ref,
    created: now
  }
  return job
}

function kickoffJob(user, project, payload) {
  common.emitter.emit('job.prepare', makeJob(user, project, payload))
}

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

    // Setup Github OAuth stuff.
    var config = context.config
    context.app.registerAuthStrategy(new GithubStrategy({
          clientID : config.github.appId
        , clientSecret: config.github.appSecret
        , callbackURL : config.github.myHostname + "/ext/github/oauth/callback"
        , scope: ['repo']
        , passReqToCallback: true
        },
        function(req, accessToken, refreshToken, profile, done){
          console.log("!!! GITHUB")
          if (!req.user){
            return done("Cannot sign up with github - you must link it to account");
          } 
          ghUserLink(profile, accessToken, req.user);
          req.user.save(function(e){
              if(e) throw e;
              done(null, req.user);
            });
          })
      )
    // end oauth


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
    app.post('/webhook/:secret', function (req, res) {
      // trigger new build
      res.send('Not Implemeneted')
    })

    app.post('/webhook', webhooks.webhook_signature);
  },
  // namespaced to /ext/github
  globalRoutes: function (app, context) {
    app.get('/oauth', context.app.authenticate('github'))
    app.get(
      '/oauth/callback',
      context.app.authenticate('github', { failureRedirect: '/login' }),
      function(req, res){
        res.redirect('/projects')
      })
  }
}
  

