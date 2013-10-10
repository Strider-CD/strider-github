
module.exports = {
  postWebhook: postWebhook,
  verifySignature: verifySignature
}

// push hook
// pull request
// ... ? anything else ?

function makeJob(uid, project, config) {
  var now = new Date()
    , deploy = false
    , commit
    , trigger
    , branch
    , ref
    , job
  branch = project.branch(config.branch)
  if (!branch.active) return false
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
    ref: config.ref,
    user_id: uid,
    created: now
  }
  return job
}

function startFromCommit(uid, project, payload) {
  var job = makeJob(uid, project, pushJob(payload))
  if (!job) return false
  common.emitter.emit('job.prepare', job)
}

// post a comment to the pull request asking for confirmation by a
// whitelisted user
function askToTestPr(account, pull_request) {
  superagent.post(pull_request._links.comments)
    .set('Authorization', 'token ' + account.accessToken)
    .send({
      body: 'Should I test this PR?'
    })
    .end(function (res) {
      if (res.status !== 201) {
        console.warn('Unexpected response to comment creation.', res.status, res.text)
      }
    })
}

function startFromPullRequest(uid, account, config, project, payload) {
  if (payload.action !== 'opened' && payload.action !== 'synchronize') return
  if (config.pull_requests === 'whitelist') {
    if (config.whitelist.indexOf(payload.pull_request.user.login) === -1) {
      if (payload.action !=== 'opened') return
      return askToTestPr(account, payload)
    }
  }
  var job = makeJob(uid, project, prJob(payload))
  if (!job) return false
  common.emitter.emit('job.prepare', job)
}

function pullRequestJob(pr, event) {
  trigger = {
    type: 'pull-request',
    author: {
      user: pr.user.login,
      image: pr.user.avatar_url
    },
    url: pr.url,
    message: pr.title,
    timestamp: event === 'opened' ? pr.created_at : pr.updated_at,
    source: {
      type: 'plugin',
      plugin: 'github'
    }
  }
  return {
    branch: pr.base.name,
    trigger: trigger,
    deploy: false,
    ref: {
      fetch: 'refs/pull/' + pr.number + '/merge'
    }
  }
}

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

function startFromComment(uid, account, config, payload) {
  // not for a PR
  if (!payload.issue.pull_request || !payload.issue.pull_request.html_url) return
  
}

function postWebhook(req, res) {
  var secret = req.providerConfig().secret
    , account = req.accountConfig()
    , config = req.providerConfig()
  var valid = verifySignature(req.headers['x-hub-signature'], secret, req.post_body)
  if (!valid) {
    console.warn('Someone hit the webhook for ' + req.project.name + ' and it failed to validate')
    return req.send(401, 'Invalid signature')
  }
  console.log('got a body:', req.body)
  var payload
  try {
    payload = JSON.parse(req.body.payload)
  } catch (e) {
    console.error('Webhook payload failed to parse as JSON')
    return req.send(400, 'Invalid JSON in the payload')
  }
  res.send(204)
  // a new pull request was created
  var getConfig
  if (payload.pull_request) {
    if (config.pull_requests === 'none') {
      return console.log('Got pull request, but testing pull requests is disabled')
    }
    return startFromPullRequest(config, account, payload.pull_request)
  }
  // pull request comment
  if (payload.comment) {
    return startFromComment(uid, account, config, payload)
  }
  // otherwise, this is a commit
  startFromCommit(uid, req.project, payload)
}

/*
 * verifySignature
 *
 * Verify HMAC-SHA1 signatures.
 *
 * <sig> Signature.
 * <secret> Shared secret, the HMAC-SHA1 was supposedly generated with this.
 * <body> The message body to sign.
 */
function verifySignature(sig, secret, body) {
  if (!sig || !payload) return false
  sig = sig.replace('sha1=','');
  var hmac = crypto.createHmac('sha1', secret);
  hmac.update(body);
  var digest = hmac.digest('hex');
  return sig == digest;
}

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
