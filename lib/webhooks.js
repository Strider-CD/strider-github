'use strict';

var _ = require('lodash');
var crypto = require('crypto');
var debug = require('debug')('strider-github:webhooks');
var gravatar = require('gravatar');
var scmp = require('scmp');
var superagent = require('superagent');

module.exports = {
  receiveWebhook: receiveWebhook,
  verifySignature: verifySignature,
  pushJob: pushJob,
  pullRequestJob: pullRequestJob,
};

function makeJob(project, config) {
  var now = new Date();
  var deploy = false;
  var branch;
  var job;

  branch = project.branch(config.branch) || {
    active: true,
    mirror_master: true,
    deploy_on_green: false,
    deploy_on_pull_request: false,
  };
  if (!branch.active) return false;
  if (config.branch !== 'master' && branch.mirror_master) {
    // mirror_master branches don't deploy
    deploy = false;
  } else {
    deploy = config.deploy && branch.deploy_on_green;
  }

  if (config.trigger.type === 'pull-request') {
    deploy = branch.deploy_on_pull_request === true;
  }

  job = {
    type: deploy ? 'TEST_AND_DEPLOY' : 'TEST_ONLY',
    trigger: config.trigger,
    project: project.name,
    ref: config.ref,
    plugin_data: config.plugin_data || {},
    user_id: project.creator._id,
    created: now,
  };
  return job;
}

function startFromCommit(project, payload, send) {
  var config = pushJob(payload);
  var lastCommit = payload.commits
    ? payload.commits[payload.commits.length - 1]
    : false;

  if (!lastCommit) {
    lastCommit = {};
  }
  if (!lastCommit.message) {
    lastCommit.message = 'No message.';
  }
  if (lastCommit.message.indexOf('[skip ci]') > -1) {
    return { skipCi: true };
  }

  var branch = project.branch(config.branch);
  var job;

  if (branch) {
    job = makeJob(project, config);

    if (job) return send(job);
  }

  return false;
}

/**
 * post a comment to the pull request asking for confirmation by a whitelisted user
 * @param account
 * @param pull_request
 */
function askToTestPr(account, pull_request) {
  superagent
    .post(pull_request._links.comments)
    .set('Authorization', `token ${account.accessToken}`)
    .send({
      body: 'Should this PR be tested?',
    })
    .end(function (err, res) {
      if (err) {
        return debug('got an error asking to confirm a pull-request', err);
      }

      if (res && res.status !== 201) {
        debug('Unexpected response to comment creation.', res.status, res.text);
      }
    });
}

function startFromPullRequest(account, config, project, payload, send) {
  if (payload.action !== 'opened' && payload.action !== 'synchronize') return;
  var user;
  if (config.pull_requests === 'whitelist') {
    user = _.find(config.whitelist, function (user) {
      return user.name === payload.pull_request.user.login;
    });
    if (!user) {
      if (config.askToPR) askToTestPr(account, payload.pull_request);
      return;
    }
  }
  var job = makeJob(project, pullRequestJob(payload.pull_request));
  if (!job) return false;
  send(job);
}

function startFromRelease(account, config, project, payload, send) {
  if (payload.action !== 'published' || payload.release.draft) return;
  var job = makeJob(project, releaseJob(payload.release));
  if (!job) return false;
  send(job);
}

function pullRequestJob(pr) {
  var trigger = {
    type: 'pull-request',
    author: {
      username: pr.user.login,
      image: pr.user.avatar_url,
    },
    url: pr.html_url,
    message: pr.title,
    timestamp: pr.updated_at,
    source: {
      type: 'plugin',
      plugin: 'github',
    },
  };
  return {
    branch: pr.base.ref,
    trigger: trigger,
    deploy: false,
    ref: {
      fetch: `refs/pull/${pr.number}/merge`,
      branch: pr.base.ref,
    },
    plugin_data: {
      github: {
        pull_request: {
          user: pr.head.repo.owner.login,
          repo: pr.head.repo.name,
          sha: pr.head.sha,
          number: pr.number,
          body: pr.body,
        },
      },
    },
  };
}

function releaseJob(release) {
  var trigger = {
    type: 'release',
    author: {
      username: release.author.login,
      image: release.author.avatar_url,
    },
    url: release.html_url,
    message: release.name,
    timestamp: release.published_at,
    source: {
      type: 'plugin',
      plugin: 'github',
    },
  };
  var branch = release.target_commitish;
  return {
    branch: branch,
    trigger: trigger,
    deploy: false,
    ref: {
      fetch: `refs/tags/${release.tag_name}`,
      branch: branch,
    },
    plugin_data: {
      github: {
        release: {
          user: trigger.author.username,
          tag: release.tag_name,
          body: release.body,
        },
      },
    },
  };
}

/**
 *
 * @param payload
 * @returns {Object} returns : {trigger, branch, deploy}
 */
function pushJob(payload) {
  var branchname;
  var commit = payload.head_commit;
  var trigger;
  var ref;
  if (payload.ref && payload.ref.indexOf('refs/heads/') === 0) {
    branchname = payload.ref.substring('refs/heads/'.length);
    ref = {
      branch: branchname,
      id: payload.after,
    };
  } else {
    ref = {
      fetch: payload.ref,
    };
  }
  if (!commit) {
    commit = {};
  }
  if (!commit.author) {
    commit.author = {
      name: 'No name',
      username: 'No login',
      email: 'noemail@github.com',
    };
  }
  trigger = {
    type: 'commit',
    author: {
      name: commit.author.name,
      username: commit.author.username,
      email: commit.author.email,
      image: gravatar.url(commit.author.email, {}, true),
    },
    url: commit.url,
    message: commit.message,
    timestamp: commit.timestamp,
    source: {
      type: 'plugin',
      plugin: 'github',
    },
  };
  return {
    branch: branchname,
    trigger: trigger,
    deploy: true,
    ref: ref,
  };
}

function startFromComment(account, config, project, payload, send) {
  // not for a PR
  if (!payload.issue.pull_request || !payload.issue.pull_request.html_url)
    return;
  var user = _.find(config.whitelist, function (user) {
    return user.name === payload.comment.user.login;
  });
  if (!user) return;
  user = _.find(config.whitelist, function (user) {
    return user.name === payload.issue.user.login;
  });
  // if the issue was created by a whitelisted user, we assume it's been OKd
  if (user) return;
  var body = payload.comment.body;
  if (!(/\bstrider\b/.test(body) && /\btest\b/.test(body))) {
    return; // they didn't ask us to test
  }
  var pr_number = payload.issue.pull_request.html_url.split('/').slice(-1)[0];
  superagent
    .get(payload.repository.pulls_url.replace('{/number}', pr_number))
    .set('Authorization', `token ${account.accessToken}`)
    .end(function (err, res) {
      if (err) {
        return debug('Error occcured when getting a pull-request', err);
      }

      if (res && res.status > 299) {
        return debug(
          'Failed to get pull request',
          res.text,
          res.headers,
          res.status
        );
      }

      var job = makeJob(project, pullRequestJob(res.body));
      if (!job) return false;
      send(job);
    });
}

function receiveWebhook(emitter, req, res) {
  var secret = req.providerConfig().secret;
  var account = req.accountConfig();
  var config = req.providerConfig();
  var valid = verifySignature(
    req.headers['x-hub-signature'],
    secret,
    req.post_body
  );
  if (!valid) {
    debug(
      `Someone hit the webhook for ${req.project.name} and it failed to validate`
    );
    return res.status(401).send('Invalid signature');
  }
  debug('got a body:', req.body);
  var payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch (e) {
    debug('Webhook payload failed to parse as JSON');
    return res.status(400).send('Invalid JSON in the payload');
  }

  /* Handle Ping Event
   * https://developer.github.com/webhooks/#ping-event */
  if (payload.zen) return res.sendStatus(200);

  res.sendStatus(204);

  if (payload.deleted) {
    return debug('Branch/tag was deleted, not job created');
  }

  // a release was published
  if (payload.release) {
    if (!config.release) {
      return debug('Got a release, but testing releases is disabled');
    }
    return startFromRelease(account, config, req.project, payload, sendJob);
  }

  // a new pull request was created
  if (payload.pull_request) {
    if (config.pull_requests === 'none') {
      return debug('Got pull request, but testing pull requests is disabled');
    }
    return startFromPullRequest(account, config, req.project, payload, sendJob);
  }

  // issue comment
  if (payload.comment) {
    if (config.pull_requests !== 'whitelist') return;
    return startFromComment(account, config, req.project, payload, sendJob);
  }

  // ingore new tags and branches
  if (payload.ref_type === 'tag' || payload.ref_type === 'branch') {
    return debug("New tags/branches aren't currently supported");
  }

  // otherwise, this is a commit
  var result = startFromCommit(req.project, payload, sendJob);

  if (result && result.skipCi) {
    debug('Skipping commit due to [skip ci] tag');
  } else if (!result) {
    debug('webhook received, but no branches matched or branch is not active');
  }

  function sendJob(job) {
    emitter.emit('job.prepare', job);
    return true;
  }
}

/**
 * verifySignature
 *
 * Verify HMAC-SHA1 signatures.
 *
 * @param {String} sig Signature.
 * @param {String} secret Shared secret, the HMAC-SHA1 was supposedly generated with this.
 * @param {String} body The message body to sign.
 */
function verifySignature(sig, secret, body) {
  if (!sig || !body) return false;
  sig = sig.replace('sha1=', '');
  var hmac = crypto.createHmac('sha1', secret);
  hmac.update(body);
  var digest = hmac.digest('hex');
  return scmp(sig, digest);
}
