
var gitProvider = require('strider-git-provider')

  app.get('/auth/github',
    passport.authenticate('github'));

module.exports = {
  id: 'github',
  vcs: 'git',
  title: 'Github',
  // project config
  panel: {
    src: './templates/project_config.html',
    js: 'configPanel.js'
  }
  // user level config
  userPanel: {
    src: './templates/user_config.html',
    js: 'userPanel.js'
  },
  // this is config stored on the user object under "providers.[id]"
  // the config page is expected to set it
  userConfig: {
    accessToken: String,
    username: String
  },
  // this is called when building the "manage projects" page. The
  // results are passed to the angular controller as "repos".
  listRepos: function (userConfig, next) {
    api.getRepos(userConfig.accessToken, userConfig.username, function (err, repos) {
      next(err, repos)
    })
  },
  clone: function (userConfig, config, context, next) {
    if (config.auth.type === 'https' && !config.auth.username) {
      config.auth.username = userConfig.accessToken
      config.auth.password = ''
    }
    gitProvider.clone(null, config, context, next)
  },
  // will be accessible under /repo/name/[id]/[name]
  endpoints: {
    put: {
      // create a webhook
      hook: function (req, res) {
        if (!req.userConfig.accessToken) return res.end(400)
        api.createHook(req.userConfig.username, req.userConfig.accessToken, res.repo.name, function (err, success) {
          if (err) res.end({error: err})
          res.end({success: success})
        })
      }
    },
    post: {
      // this is hit by github
      hook: function (req, res) {
      }
    }
  },
  userEndpoints: {
    post: {
      oath: function () {}
    }
  }
}
  

