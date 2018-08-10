'use strict';

var api = require('./api');
var debug = require('debug')('strider-github:webapp');
var GithubStrategy = require('passport-github').Strategy;
var utils = require('./utils');
var webhooks = require('./webhooks');

module.exports = {
  appConfig: {
    hostname: process.env.SERVER_NAME || 'http://localhost:3000',
    // you only need to override these if you are connecting to github enterprise
    // if you are on github enterprise, you'll need to create a new app: http://github.whatever.com/applications/new
    appId: process.env.PLUGIN_GITHUB_APP_ID || 'a3af4568e9d8ca4165fe',
    appSecret: process.env.PLUGIN_GITHUB_APP_SECRET || '18651128b57787a3336094e2ba1af240dfe44f6c',
    // used for web auth
    apiDomain: process.env.PLUGIN_GITHUB_API_DOMAIN || 'https://github.com',
    // enterprise endpoint urls end in /api/v3
    apiEndpoint: process.env.PLUGIN_GITHUB_API_ENDPOINT || 'https://api.github.com'
  },
  fastFile: true,
  getBranches: function (account, config, project, done) {
    api.getBranches(account.accessToken, config.owner, config.repo, done);
  },
  getFile: function (filename, ref, account, config, project, done) {
    var baseref = ref.id || ref.branch || ref.tag || 'master';
    api.getFile(filename, baseref, account.accessToken, config.owner, config.repo, done);
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
    release: Boolean,
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
    api.getRepos(account.accessToken, account.login, next);
  },

  // this attempts to connect to the github server with the stored credentials
  auth: function (passport) {
    var config = this.appConfig;

    if (!config.appId || !config.appSecret || !config.hostname) {
      throw new Error('Github plugin misconfigured! Need `appId`, `appSecret` and `hostname`.');
    }

    var callbackURL = `${config.hostname}/auth/github/callback`;

    passport.use(new GithubStrategy({
      clientID: config.appId,
      clientSecret: config.appSecret,
      callbackURL: callbackURL,
      authorizationURL: `${config.apiDomain}/login/oauth/authorize`,
      tokenURL: `${config.apiDomain}/login/oauth/access_token`,
      userProfileURL: `${config.apiEndpoint}/user`,
      scope: ['repo'],
      passReqToCallback: true
    }, validateAuth));
  },

  setupRepo: function (account, config, project, done) {
    var url = `${this.appConfig.hostname}/${project.name}/api/github/webhook`;
    if (!account.accessToken) return done(new Error('Github account not configured'));
    utils.generateSecret(function (err, secret) {
      if (err) return done(err);
      config.secret = secret;
      api.createHooks(project.name, url, config.secret, account.accessToken, function (err) {
        if (err) return done(err);
        done(null, config);
      });
    });
  },

  teardownRepo: function (account, config, project, done) {
    var url = `${this.appConfig.hostname}/${project.name}/api/github/webhook`;
    if (!account.accessToken) return done(new Error('Github account not configured'));
    api.deleteHooks(project.name, url, account.accessToken, function (err) {
      if (err) return done(err);
      done();
    });
  },

  // will be namespaced under /:org/:repo/api/github
  routes: function (app, context) {
    var config = this.appConfig;

    app.post('/hook', function (req, res) {
      var url = `${config.hostname}/${req.project.name}/api/github/webhook`;
      var account = req.accountConfig();
      var pconfig = req.providerConfig();
      if (!account.accessToken) return res.status(400).send('Github account not configured');
      api.createHooks(req.project.name, url, pconfig.secret, account.accessToken, function (err) {
        if (err) return res.status(500).send(err.message);
        res.status(200).send('Webhook registered');
      });
    });
    app.delete('/hook', function (req, res) {
      var url = `${config.hostname}/${req.project.name}/api/github/webhook`;
      var account = req.accountConfig();
      if (!account.accessToken) return res.status(400).send('Github account not configured');
      api.deleteHooks(req.project.name, url, account.accessToken, function (err, deleted) {
        if (err) return res.status(500).send(err.message);
        res.status(200).send(deleted ? 'Webhook removed' : 'No webhook to delete');
      });
    });

    // github should hit this endpoint
    app.anon.post('/webhook', webhooks.receiveWebhook.bind(null, context.emitter));
  },
  // app is namespaced to /ext/github, app.context isn't
  // we use app.context to keep the original url structure for backwards compat
  globalRoutes: function (app, context) {
    context.app.get('/auth/github', context.passport.authenticate('github'));
    context.app.get(
      '/auth/github/callback',
      context.passport.authenticate('github', {failureRedirect: '/login'}),
      function (req, res) {
        res.redirect('/projects');
      });
  }
};

function validateAuth(req, accessToken, refreshToken, profile, done) {
  if (!req.user) {
    debug('Github OAuth but no logged-in user');
    req.flash('account', 'Cannot link a github account if you aren\'t logged in');
    return done();
  }

  var account = req.user.account('github', profile.id);

  if (account) {
    debug('Trying to attach a github account that\'s already attached...');
    req.flash('account', 'That github account is already linked. <a target="_blank" href="https://github.com/logout">Sign out of github</a> before you click "Add Account"');
    return done(null, req.user);
  }

  req.user.accounts.push(makeAccount(accessToken, profile));
  req.user.save(function (err) {
    done(err, req.user);
  });
}

function makeAccount(accessToken, profile) {
  if (!profile.emails || !profile.emails.length) {
    throw new Error('A public email needs to be setup in your Github profile');
  }

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
  };
}
