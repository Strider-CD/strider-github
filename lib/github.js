'use strict';

var _ = require('lodash');
var debug = require('debug')('strider-github:github');
var gh = require('../../lib/github');
var User = require('../../lib/models').User;

/*
 * Return a list of all the repository urls which have already been configured by the user
 */
function configuredReposList(user) {
  var l = [];
  var gh_config = user.github_config || [];
  gh_config.forEach(function (item) {
    if (item.url !== undefined) {
      l.push(item.url);
    }
  });
  return l;
}


function addConfiguredKeys(user, repos) {
  var already_configured = configuredReposList(user);
  repos.forEach(function (repo) {
    if (!repo) {
      debug('addConfiguredKeys(): repo is %s', repo);
      return;
    }
    if (repo.html_url === undefined) {
      debug('addConfiguredKeys(): repo.html_url is undefined. Full repo: %j', repo);
      repo.configured = false;
      return;
    }
    repo.configured = already_configured.indexOf(repo.html_url.toLowerCase()) != -1;
  });
}

/**
 * GET /api/github/metadata
 * Caches to user doc in github_metatdata: { "gh id" : data }
 * If "refresh" query param is > 0 or "true" it will refetch.
 */
module.exports.github_metadata = function (req, res) {
  res.setHeader('Content-Type', 'application/json');

  var no_existing_metadata = (req.user.github_metadata === undefined || req.user.github_metadata[req.user.github.id] === undefined);
  var refresh_requested = (req.query.refresh !== undefined && (req.query.refresh !== 'false' && req.query.refresh !== '0'));

  if (no_existing_metadata || refresh_requested) {
    gh.get_github_repos(req.user, function (err, results) {
      var data = {
        repos: results.repos.concat(results.orgs.team_repos),
        orgs: results.orgs.org_memberships
      };
      // Dedup repos - sometimes can have entries in both team_repos and repos.
      data.repos = _.uniqWith(data.repos, function (item) {
        return item.html_url;
      });
      req.user['github_metadata'] = {};
      req.user['github_metadata'][req.user.github.id] = data;
      addConfiguredKeys(req.user, data.repos);
      req.user.save(function () {
        var output = JSON.stringify(data, null, '\t');
        res.end(output);
      });
    });
  } else {
    // Read from cache
    var data = req.user.github_metadata[req.user.github.id];
    addConfiguredKeys(req.user, data.repos);
    var output = JSON.stringify(data, null, '\t');
    res.end(output);
  }
};

/**
 * POST /api/github/webhooks/unset
 *
 * Unset all Strider webhooks for a particular Github project.
 * Requires query param <url> which is the Github html_url of the project.
 */
module.exports.github_webhooks_unset = function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var url;
  res.statusCode = 200;
  var results;
  if ((url = req.param('url')) === undefined) {
    results = {status: 'error', errors: [{message: 'you must supply a url parameter'}]};
    res.statusCode = 400;
    res.end(JSON.stringify(results, null, '\t'));
    return;
  }
  var token = req.user.get('github.accessToken');
  debug('url: %s', url);
  req.user.get_repo_config(url, function (err, repo) {
    if (err || !repo) {
      results = {status: 'error', errors: [{message: 'invalid url for this user'}]};
      res.statusCode = 400;
      return res.end(JSON.stringify(results, null, '\t'));
    }
    var gh_repo_path = url.replace(/^.*com/gi, '');

    debug('github.github_webhooks_unset(): unsetting hooks for user %s on repo %s',
      req.user.email, gh_repo_path);
    gh.unset_push_hook(gh_repo_path, token, function () {
      results = {status: 'ok', errors: []};
      res.end(JSON.stringify(results, null, '\t'));
    });
  });
};

/**
 * POST /api/github/manual_setup
 */
module.exports.post_manual_setup = function (req, res) {
  var github_url = req.param('github_url');
  // check to see if this project already exists. if it does, error on that
  // Check whether someone else has already configured this repository
  User.findOne({'github_config.url': github_url.toLowerCase()}, function (err, user) {
    var r;
    if (user) {
      debug(`Dupe repo: ${github_url} requested by ${req.user.email}`);
      res.statusCode = 400;
      r = {
        status: 'error',
        errors: 'Repo Already Configured'
      };
      return res.end(JSON.stringify(r), null, '\t');

    }
    // validate again (after backbone validation) bc api request could be from other source
    var p = gh.parse_github_url(github_url);
    if (p === null) {
      debug(`invalid github url: ${github_url}`);
      res.statusCode = 400;
      r = {
        status: 'error',
        errors: 'Not a valid Github URL'
      };
      return res.end(JSON.stringify(r), null, '\t');
    }
    debug(`org: ${p.org} - name: ${p.repo}`);

    var repo_url = `https://github.com/${p.org}/${p.repo}`;

    gh.setup_integration_manual(req, p.org, repo_url,
      function (webhook, deploy_key_title, deploy_public_key) {

        var obj = {
          webhook: webhook,
          deploy_key_title: deploy_key_title,
          deploy_public_key: deploy_public_key,
          org: p.org,
          repo: p.repo
        };

        var output = JSON.stringify(obj, null, '\t');
        debug('post_manual_setup() - output: %j', output);
        res.end(output);
      });
  });
};
