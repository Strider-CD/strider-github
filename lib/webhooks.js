
/*
 * POST /webhook - Github push webhook handler
 */
exports.webhook_signature = function(req, res) {
  gh.verify_webhook_req_signature(req, function(isOk, repo, user, payload) {
    var active = false;
    // Repo can be undefined
    if (isOk && repo) {
      active = repo.active;
    }
    // Default to active if property is missing.
    if (active === undefined) {
      active = true;
    }
    if (active && isOk && gh.webhook_commit_is_to_master(payload)) {
      console.log("received a correctly signed webhook for repo %s on master branch - starting task on user %s's behalf", repo.url, user.email);
      var github_commit_id = payload.after;
      var github_commit_info = gh.webhook_extract_latest_commit_info(payload);
      var repo_ssh_url;
      var repo_metadata;
      if (user.github.id) {
        repo_metadata = _.find(user.github_metadata[user.github.id].repos, function(item) {
          return repo.url == item.html_url.toLowerCase();
        });
      }
      // If we have Github metadata, use that. It is loosely coupled and can self-heal things like
      // a configured Github Repo being renamed in Github (such as happened with Klingsbo)
      // We do not have metadata in the manual setup case
      if (repo_metadata) {
        repo_ssh_url = repo_metadata.ssh_url;
      } else {
        // Manual setup case - try to synthesize a Github SSH url from the display URL.
        // This is brittle because display urls can change, and the user (currently) has
        // no way to change them (other than deleting and re-adding project).
        var p = gh.parse_github_url(repo.display_url);
        repo_ssh_url = gh.make_ssh_url(p.org, p.repo);
      }
      console.debug("POST to Github /webhook payload: %j", payload);
      if (repo.has_prod_deploy_target) {
        var deploy_config = _.find(user[repo.prod_deploy_target.provider], function(item) {
          return item.account_id === repo.prod_deploy_target.account_id;
        });
        jobs.startJob(user, repo, deploy_config, github_commit_info, repo_ssh_url, TEST_AND_DEPLOY);
      } else {
        jobs.startJob(user, repo, deploy_config, github_commit_info, repo_ssh_url, TEST_ONLY);
      }
      res.end("webhook good");
    } else {
      console.log("received an incorrecly signed webhook or is not to master branch.");
      res.end("webhook bad or irrelevant");
    }
 });
};

exports.webhook_secret = function(req, res) {
  gh.verify_webhook_req_secret(req, function(isOk, repo, user, payload) {
    var active = repo.active;
    // Default to active if property is missing.
    if (active === undefined)
      active = true;
    if (active && isOk && gh.webhook_commit_is_to_master(payload)) {
      console.log("received a correctly signed webhook for repo %s on master branch - starting task on user %s's behalf", repo.url, user.email);
      var github_commit_id = payload.after;
      var github_commit_info = gh.webhook_extract_latest_commit_info(payload);
      // We don't have github metadata unless we have a linked github account.
      var repo_metadata;
      var repo_ssh_url;
      if (user.github.id) {
          repo_metadata = _.find(user.github_metadata[user.github.id].repos, function(item) {
              return repo.url == item.html_url.toLowerCase();
          });
      }
      // If we have Github metadata, use that. It is loosely coupled and can self-heal things like
      // a configured Github Repo being renamed in Github (such as happened with Klingsbo)
      // We do not have metadata in the manual setup case
      if (repo_metadata) {
        repo_ssh_url = repo_metadata.ssh_url;
      } else {
        // Manual setup case - try to synthesize a Github SSH url from the display URL.
        // This is brittle because display urls can change, and the user (currently) has
        // no way to change them (other than deleting and re-adding project).
        var p = gh.parse_github_url(repo.display_url);
        repo_ssh_url = gh.make_ssh_url(p.org, p.repo);
      }
      console.debug("POST to Github /webhook payload: %j", payload);
      if (repo.has_prod_deploy_target) {
        var deploy_config = _.find(user[repo.prod_deploy_target.provider], function(item) {
          return item.account_id === repo.prod_deploy_target.account_id;
        });
        jobs.startJob(user, repo, deploy_config, github_commit_info, repo_ssh_url, TEST_AND_DEPLOY);
      } else {
        jobs.startJob(user, repo, deploy_config, github_commit_info, repo_ssh_url, TEST_ONLY);
      }
      res.end("webhook good");
    } else {
      console.log("gh: " + gh.webhook_commit_is_to_master(payload));
      console.log("received an incorrecly signed webhook or is not to master branch.");
      res.end("webhook bad or irrelevant");
    }
 });
};
