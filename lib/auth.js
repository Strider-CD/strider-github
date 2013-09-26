

var passport = require('passport')
  , GithubStrategy = require('passport-github').Strategy

function ghUserLink(ghProfile, ghAccessToken, user) {
  var ghUser = ghProfile._json

  var github = {
    id: ghUser.id
    , type: ghUser.type
    , login: ghUser.login
    , accessToken: ghAccessToken
    , gravatarId: ghUser.gravatar_id
    , name: ghUser.name
    , email: ghUser.email
    , publicRepoCount: ghUser.public_repo_count
    , publicGistCount: ghUser.public_gist_count
    , followingCount: ghUser.following_count
    , followersCount: ghUser.followers_count
    , company: ghUser.company
    , blog: ghUser.blog
    , location: ghUser.location
    , permission: ghUser.permission
    , createdAt: ghUser.created_at
    // Private data
    , totalPrivateRepoCount: ghUser.total_private_repo_count
    , collaborators: ghUser.collaborators
    , diskUsage: ghUser.disk_usage
    , ownedPrivateRepoCount: ghUser.owned_private_repo_count
    , privateGistCount: ghUser.private_gist_count
    , plan: (ghUser.plan) ? 
      {
        name: (ghUser.plan.name) ? ghUser.plan.name : ""
        , collaborators: (ghUser.plan.collaborators) ? ghUser.plan.collaborators: ""
        , space: (ghUser.plan.space) ? ghUser.plan.space : ""
        , privateRepos: (ghUser.plan.private_repos) ? ghUser.plan.private_repos : ""
      } : {}
  };
  user.set('github', github);

}

var setupGithubAuth = function(app){
  passport.use(new GithubStrategy({
      clientID : config.github.appId
    , clientSecret: config.github.appSecret
    , callbackURL : config.github.myHostname + "/auth/github/callback"
    , scope: ['repo']
    , passReqToCallback: true
  }, function(req, accessToken, refreshToken, profile, done){
    if (!req.user){
      return done("Cannot sign up with github - you must link it to account");
    } 
    ghUserLink(profile, accessToken, req.user);
    req.user.save(function(e){
      if(e) throw e;
      done(null, req.user);
    });
  }))
}
