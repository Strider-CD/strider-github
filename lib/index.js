'use strict';

var _ = require('lodash');
var config = require('./config');
var crypto = require('crypto');
var debug = require('debug')('strider-github:index');
var keypair = require('ssh-keypair');
var step = require('step');
var superagent = require('superagent');
var url = require('url');
var User = require('./models').User;

var GITHUB_API_ENDPOINT = 'https://api.github.com';

/**
 * get_oauth2()
 *
 * Do a HTTP GET w/ OAuth2 token
 * @param {String} url URL to GET
 * @param {Object} q_params Object representing the query params to be added to GET request
 * @param {String} access_token OAuth2 access token
 * @param {Function} callback function(error, response, body)
 * @param {Object} client An alternative superagent instance to use.
 */
var get_oauth2 = module.exports.get_oauth2 = function (url, q_params, access_token, callback, client) {
  // If the user provided a superagent instance, use that.
  client = client || superagent;
  // Construct the query. Allow the user to override the access_token through q_params.
  var query = _.assign({}, {access_token : access_token}, q_params);
  console.debug('GET OAUTH2 URL:', url);
  client
    .get(url)
    .query(query)
    .set('User-Agent', 'StriderCD (http://stridercd.com)')
    .end(callback);
};

/**
 * api_call()
 *
 * Simple HTTP GET Github API wrapper.
 * Makes it easy to call most read API calls.
 * @param {String} path API call URL path
 * @param {String} access_token OAuth2 access token
 * @param {Function} callback function(error, response, de-serialized json)
 * @param {Object} client An alternative superagent instance to use.
 */
var api_call = module.exports.api_call = function (path, access_token, callback, client) {
  // If the user provided a superagent instance, use that.
  client = client || superagent;
  var url = GITHUB_API_ENDPOINT + path;
  debug('github api_call(): path %s', path);
  get_oauth2(url, {}, access_token, function (error, res, body) {
    if (!error && res.statusCode == 200) {
      var data = JSON.parse(body);
      callback(null, res, data);
    } else {
      callback(error, res, null);
    }
  }, client);
};

/**
 * parse_link_header()
 *
 * Parse the Github Link HTTP header used for pageination
 * http://developer.github.com/v3/#pagination
 */
var parse_link_header = module.exports.parse_link_header = function parse_link_header(header) {
  if (header.length === 0) {
    throw new Error('input must not be of zero length');
  }

  // Split parts by comma
  var parts = header.split(',');
  var links = {};
  // Parse each part into a named link
  _.each(parts, function (p) {
    var section = p.split(';');
    if (section.length != 2) {
      throw new Error('section could not be split on \';\'');
    }
    var url = section[0].replace(/<(.*)>/, '$1').trim();
    var name = section[1].replace(/rel="(.*)"/, '$1').trim();
    links[name] = url;
  });

  return links;
};

/**
 * pageinated_api_call()
 *
 * Simple HTTP Get Github API wrapper with support for pageination via Link header.
 * See: http://developer.github.com/v3/#pagination
 *
 * @param {String} path API call URL path
 * @param {String} access_token OAuth2 access token
 * @param {Function} callback function(error, response, de-serialized json)
 * @param {Object} client An alternative superagent instance to use.
 */
var pageinated_api_call = module.exports.pageinated_api_call = function (path, access_token, callback, client) {
  // If the user provided a superagent instance, use that.
  client = client || superagent;

  var base_url = GITHUB_API_ENDPOINT + path;
  debug('github pageinated_api_call(): path %s', path);

  if (!access_token) {
    debug('Error in request - no access token');
    debug(new Error().stack);
  }

  // This is a left fold,
  // a recursive function closed over an accumulator

  var pages = [];

  function loop(uri, page) {
    get_oauth2(uri, {per_page: 30, page: page}, access_token, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var data;
        try {
          data = JSON.parse(body);
        } catch (e) {
          return callback(e, null);
        }
        pages.push(data);

        var link = response.headers['link'];
        var r;
        if (link) {
          r = parse_link_header(link);
        }
        // Stop condition: No link header or we think we just read the last page
        if (!link || (r.next === undefined && r.first !== undefined)) {
          callback(null, {data: _.flatten(pages), response: response});
        } else {
          // Request next page and continue
          var next_page = url.parse(r.next, true).query.page;
          loop(base_url, next_page);
        }
      } else {
        if (!error) {
          return callback('Status code is ' + response.statusCode + ' not 200. Body: ' + body)
        } else {
          return callback(error, null);
        }
      }
    }, client);
  }

  // Start from page 1
  loop(base_url, 1);
};

/**
 * get_github_repos()
 *
 * Fetch a list of all the repositories a given user has
 * "admin" privileges. Because of the structure of the Github API,
 * this can require many separate HTTP requests. We attempt to
 * parallelize as many of these as we can to do this as quickly as possible.
 *
 * @param {Object} <user> User object
 * @param {Function} <callback> function(error, result-object) where result-object has properties:
 *  -team_repos
 *  -org_memberships
 */
module.exports.get_github_repos = function (user, callback) {
  var token = user.get('github.accessToken');
  var org_memberships = [];
  var team_repos = [];
  var repos = [];
  debug('Fetching Github repositories for user: %s', user.email);
  step(
    function fetchReposAndOrgs() {
      debug('Repos API call for user: %s', user.email);
      // First fetch the user's repositories and organizations in parallel.
      pageinated_api_call('/user/repos', token, this.parallel());
      pageinated_api_call('/user/orgs', token, this.parallel());
    },
    function fetchOrgTeams(err, r, o) {
      if (err) {
        debug('get_github_repos() - Error fetching repos & orgs: %s', err);
        throw err;
      }
      if (!r) {
        throw 'Response is null'
      }
      debug('Repos API call returned for user: %s status: %s', user.email, r.response.statusCode);
      debug('Orgs API call returned for user: %s status: %s', user.email, o.response.statusCode);

      org_memberships = o.data;
      repos = r.data;

      // For each Org, fetch the teams it has in parallel
      var group = this.group();
      _.each(org_memberships, function (org) {
        debug('Fetching teams for Org: %s', org.login);
        api_call('/orgs/' + org.login + '/teams', token, group());
      });
    },
    function fetchTeamDetails(err, results) {
      if (err) {
        debug('get_github_repos() - Error fetching Org Teams response - %s', err);
        throw err;
      }
      var teams = [];
      _.each(results, function (result) {
        try {
          debug('For Organizations: %s', result.request.uri.path.split('/')[2]);
          var team_data = JSON.parse(result.body);
          _.each(team_data, function (t) {
            debug('Team details: %j', t);
            teams.push(t);
          });
        } catch (e) {
          debug('get_github_repos(): Error parsing JSON in Org Teams response - %s', e);
        }
      });

      // For each Team, fetch the detailed info (including privileges)
      var group = this.group();
      _.each(teams, function (team) {
        debug('Teams detail API call for user: %s', team.name);
        api_call('/teams/' + team.id, token, group());
      });
    },
    function filterTeams(err, results) {
      if (err) {
        debug('get_github_repos() - Error fetching detailed team response - %s', err);
        throw err;
      }
      var team_details = [];
      _.each(results, function (result) {
        try {
          var td = JSON.parse(result.body);
          team_details.push(td);
        } catch (e) {
          debug('get_github_repos(): Error parsing JSON in detail team response - %s', e);
        }
      });
      // For each Team with admin privs, test for membership
      var group = this.group();
      var team_detail_requests = {};
      _.each(team_details, function (team_details) {
        if (team_details.permission != 'admin') {
          debug('Problem with team_details: %j', team_details);
          debug('Team %s does not have admin privs, ignoring', team_details.name);
          return;
        }
        team_detail_requests[team_details.id] = team_details;
        var url = GITHUB_API_ENDPOINT + '/teams/' + team_details.id + '/members/' + user.github.login;
        debug('Starting admin team membership API call for user: %s team: %s',
          user.email, team_details.id);
        get_oauth2(url, {}, token, group());
      });
      this.team_detail_requests = team_detail_requests;
    },
    // For each team with admin privileges of which user is a member, fetch
    // the list of repositories it has access to.
    function fetchFilteredTeamRepos(err, results) {
      if (err) {
        debug('get_github_repos(): Error with admin team memberships: %s', err);
        throw err;
      }
      var team_detail_requests = this.team_detail_requests;
      var group = this.group();
      _.each(results, function (response) {
        var team_id = response.request.uri.path.split('/')[2];
        var team_detail = team_detail_requests[parseInt(team_id, 10)];
        debug('Team membership API call returned %s for team %s (id: %s)',
          response.statusCode, team_detail.name, team_detail.id);
        if (response.statusCode === 204) {
          debug('User is a member of team %s (id: %s)', team_detail.name, team_detail.id);
          pageinated_api_call('/teams/' + team_id + '/repos', token, group());
        } else {
          debug('User is NOT a member of team %s (id: %s)', team_detail.name, team_detail.id);
        }

      });
    },
    // Reduce all the results and call output callback.
    function finalize(err, results) {
      if (err) {
        debug('get_github_repos(): Error with team repos request: %s', err);
        throw err;
      }
      _.each(results, function (result) {
        if (result && result.data) {
          _.each(result.data, function (team_repo) {
            team_repos.push(team_repo);
          });
        } else {
          debug('get_github_repos(): finalize result was null for user %s', user.email);
        }
      });
      // Sometimes we can get multiple copies of the same team repo, so we uniq it
      team_repos = _.uniq(team_repos, false, function (item) {
        return item.html_url;
      });
      debug('Github results for user %s - Repos: %j Team Repos w/ admin: %j Org memberships: %j',
        user.email, _.pluck(repos, 'name'), _.pluck(team_repos, 'name'),
        _.pluck(org_memberships, 'login'));
      callback(null, {repos: repos, orgs: {team_repos: team_repos, org_memberships: org_memberships}});
    }
  );
};

/**
 * generate_webhook_secret()
 *
 * Generate a short shared secret to send to Github to use
 * for verifying the Webhook data origins.
 *
 * @param {Function} callback function(secret)
 */
var generate_webhook_secret = module.exports.generate_webhook_secret = function (callback) {
  crypto.randomBytes(32, function (e, buf) {
    callback(buf.toString('hex'));
  });
};

/**
 * setup_int_deploy_keys()
 *
 * Persist an SSH keypair and a randomly generated
 * webhook secret to the github_config property of a supplied Mongoose ODM user object.
 * Keypairs are keyed by github repository ID.
 * Schema is user_obj["github_config"]["github_repo_id"]
 *
 * @param {Object} user_obj User object
 * @param {String} gh_repo_url URL of the git repository to configure (repo.html_url)
 * @param {String} privkey String containing SSH private key
 * @param {String} pubkey String containing SSH public key
 * @param {Function} callback function(err, user_obj)
 */
var save_repo_deploy_keys = module.exports.save_repo_deploy_keys = function (user_obj, gh_repo_url, privkey, pubkey, callback) {
  generate_webhook_secret(function (secret) {
    var config = {};
    config.privkey = privkey;
    config.pubkey = pubkey;
    config.url = gh_repo_url.toLowerCase();
    config.display_url = gh_repo_url;
    config.secret = secret;
    user_obj.github_config.push(config);
    user_obj.save(callback);
  });
};

/**
 * add_deploy_key()
 *
 * Add a deploy key to the repo. Must have admin privileges for this to work.
 * @param {String} gh_repo_path is "/<org or user>/<repo name>" e.g. "/BeyondFog/Strider". This doesn't add slashes, caller must get it right.
 * @param {String} pubkey String containing SSH public key
 * @param {String} title Title for key
 * @param {String} token OAuth2 access token
 * @param {Function} callback function(error, response, body)
 * @param {Object} client An alternative superagent instance to use.
 */
var add_deploy_key = module.exports.add_deploy_key = function (gh_repo_path, pubkey, title, token, callback, client) {
  client = client || superagent;
  var qpm = {access_token: token};
  var data = {title: title, key: pubkey};
  var url = GITHUB_API_ENDPOINT + '/repos' + gh_repo_path + '/keys';

  client
    .post(url)
    .query(qpm)
    .send(data)
    .set('User-Agent', 'StriderCD (http://stridercd.com)')
    .end(callback);
};

/**
 * set_push_hook()
 *
 * Set a push hook via the Github API for the supplied repository. Must have admin privileges for this to work.
 *
 * @param {String} gh_repo_path is "/<org or user>/<repo name>" e.g. "/BeyondFog/Strider". This doesn't add slashes, caller must get it right.
 * @param {String} name is the name of the Github hook (e.g. webhook) to set up.
 * @param {String} url is the URL for the webhook to post to.
 * @param {String} secret is the Webhook secret, which will be used to generate the HMAC-SHA1 header in the Github request.
 * @param {String} token OAuth2 access token
 * @param {Function} callback function(error, response, body)
 * @param {Object} client An alternative superagent instance to use.
 */
var set_push_hook = module.exports.set_push_hook = function (gh_repo_path, name, url, secret, token, callback, client) {
  client = client || superagent;
  var data = {name: name, active: true, config: {url: url, secret: secret}};
  var qpm = {access_token: token};
  var post_url = GITHUB_API_ENDPOINT + '/repos' + gh_repo_path + '/hooks';

  client
    .post(post_url)
    .query(qpm)
    .send(data)
    .set('User-Agent', 'StriderCD (http://stridercd.com)')
    .end(callback);
};

/**
 * unset_push_hook()
 *
 * Delete push hook via the Github API for the supplied repository. Must have admin privileges for this to work.
 *
 * @param {String} gh_repo_path is "/<org or user>/<repo name>" e.g. "/BeyondFog/Strider". This doesn't add slashes, caller must get it right.
 * @param {String} token OAuth2 access token
 * @param {Function} callback function(error, response, body)
 * @param {Object} client An alternative superagent instance to use.
 */
var unset_push_hook = module.exports.unset_push_hook = function (gh_repo_path, token, callback, client) {
  client = client || superagent;
  var qpm = {access_token: token};

  debug('github.unset_push_hook() deleting Github webhooks for repo path %s', gh_repo_path);
  step(
    function () {
      api_call('/repos' + gh_repo_path + '/hooks', token, this);
    },
    function (error, response, results) {
      if (error) throw error;
      if (response.statusCode !== 200) {
        debug('github.unset_push_hook() GH API status code is not 200 but %s. Body: %s', response.statusCode, results);
        return callback(error, response, results);
      }
      // Unset all hooks where the URL matches our webhook handler.
      var strider_url = config.strider_server_name + '/webhook';
      var group = this.group();
      _.each(results, function (hook) {
        if (hook.config.url === strider_url) {
          debug('github.unset_push_hook() found hook: %j for repo %s, deleting',
            hook, gh_repo_path);
          client
            .del(GITHUB_API_ENDPOINT + '/repos' + gh_repo_path + '/hooks/' + hook.id)
            .query(qpm)
            .set('User-Agent', 'StriderCD (http://stridercd.com)')
            .end(group());
        }
      });
    },
    function (error, args) {
      if (error) throw error;
      debug('github.unset_push_hook() Hooks successfully deleted');
      return callback(error, args);
    }
  );
};

/**
 * setup_integration()
 *
 * Wraps the entire process for generating & adding a new deploy key to Github and
 * saving to local DB. Must have admin privileges for this to work.
 *
 * @param {Object} user_obj User object.
 * @param {String} gh_repo_path is "/<org or user>/<repo name>" e.g. "/BeyondFog/Strider". This doesn't add slashes, caller must get it right.
 * @param {String} token OAuth2 access token.
 * @param {Function} callback function().
 * @param {Object} socket Socket.IO handle to emit messages to.
 * @param {Boolean} no_ssh don't setup ssh keys; for public repos
 */
var setup_integration = module.exports.setup_integration = function (user_obj, gh_repo_id, token, callback, socket, no_ssh) {
  var gh_metadata = user_obj.github_metadata[user_obj.github.id].repos;
  var repo = _.find(gh_metadata, function (repo) {
    return gh_repo_id == repo.id;
  });
  var config_key = repo.html_url;
  var gh_repo_path = url.parse(repo.html_url).pathname;
  if (no_ssh) {
    return step(
      function () {
        socket.emit('update', {msg: 'skipping ssh keys'});
        save_repo_deploy_keys(user_obj, config_key, null, null, this);
      }, get_repo_config,
      function (err, repo) {
        if (err) {
          debug('setup_integration() - error fetching repo config for url %s: %s',
            config_key, err);
          throw new Error(err);
        }
        this.repo = repo;
        this();
      }, set_hook, done
    );
  }
  function get_repo_config(err, user_obj) {
    if (err) {
      socket.emit('update', {msg: 'an error occurred'});
      debug('setup_integration() - error fetching repo config for url %s: %s',
        config_key, err);
      throw new Error(err);
    }
    user_obj.get_repo_config(config_key, this);
  }

  function set_hook() {
    socket.emit('update', {msg: 'configuring secure Github commit hook'});
    var name = 'web';
    var url = config.strider_server_name + '/webhook';
    var secret = this.repo.get('secret');
    set_push_hook(gh_repo_path, name, url, secret, token, this);
  }

  function done(err, res, body) {
    socket.emit('update', {msg: 'done'});
    callback();
  }

  step(
    function make_keys() {
      socket.emit('update', {msg: 'generating deploy keys'});
      keypair(user_obj.github.login, function save_keys(err, privkey, pubkey) {
        socket.emit('update', {msg: 'persisting deploy keys'});
        if (err) throw err;
        save_repo_deploy_keys(user_obj, config_key, privkey.toString(), pubkey.toString(), this);
      });
    },
    get_repo_config,
    function push_deploy_key(err, repo_config) {
      if (err) {
        debug('setup_integration() - error fetching repo config for url %s: %s',
          config_key, err);
        throw new Error(err);
      }
      this.repo = repo_config;
      socket.emit('update', {msg: 'sending deploy key to Github'});
      var title = 'StriderDeployKey - ' + config.strider_server_name + ' - ' + user_obj.email;
      add_deploy_key(gh_repo_path, this.repo.pubkey, title, token, this);
    },
    set_hook, done
  );

};

/**
 * setup_integration_manual()
 *
 * Wraps the entire process for generating & adding a new deploy key to Github and
 * saving to local DB. Must have admin privileges for this to work.
 *
 * @param {Object} req Express request object.
 * @param {Function} callback function().
 */
var setup_integration_manual = module.exports.setup_integration_manual = function (req, org, github_url, callback) {
  var config_key = github_url;
  step(
    function make_keys() {
      keypair(org, function save_keys(err, privkey, pubkey) {
        if (err) throw err;
        save_repo_deploy_keys(req.user, config_key, privkey.toString(), pubkey.toString(), this);
      });
    },
    function get_repo_config(err, user_obj) {
      if (err) throw err;
      user_obj.get_repo_config(config_key, this);
    },
    function push_deploy_key(err, repo_config) {
      if (err) {
        debug('setup_integration() - error fetching repo config for url %s: %s',
          config_key, err);
        throw new Error(err);
      }
      this.repo = repo_config;
    },
    function done(err) {
      var deploy_key_title = 'StriderDeployKey - ' + config.strider_server_name + ' - ' + req.user.email;


      var deploy_public_key = this.repo.pubkey;
      var webhook = config.strider_server_name + '/webhook/' + this.repo.get('secret');

      callback(webhook, deploy_key_title, deploy_public_key);
    }
  );
};

/**
 * verify_webhook_sig()
 *
 * Verify HMAC-SHA1 signatures.
 *
 * @param {String} sig Signature.
 * @param {String} secret Shared secret, the HMAC-SHA1 was supposedly generated with this.
 * @param {String} body The message body to sign.
 */
var verify_webhook_sig = module.exports.verify_webhook_sig = function (sig, secret, body) {
  var hmac = crypto.createHmac('sha1', secret);
  hmac.update(body);
  var digest = hmac.digest('hex');
  return sig == digest;
};

/**
 * verify_webhook_req_signature()
 *
 * Verify the X-Hub-Signature HMAC-SHA1 header used by Github webhooks.
 *
 * @param {Object} req Express request object.
 * @param {Function} callback function(boolean result, repository object, user object)
 */
var verify_webhook_req_signature = module.exports.verify_webhook_req_signature = function (req, callback) {
  var sig = req.headers['x-hub-signature'];
  if (sig === undefined) {
    debug('verify_webhook_req() signature missing');
    callback(false);
    return;
  }
  if (req.body.payload === undefined) {
    debug('verify_webhook_req_signature() payload missing');
    callback(false);
    return;
  }
  sig = sig.replace('sha1=', '');


  var payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch (e) {
    debug('verify_webhook_req_signature() JSON parse exception');
    callback(false);
    return;
  }
  User.findOne({'github_config.url': payload.repository.url.toLowerCase()},
    function (err, user) {
      if (err || user === null || user === undefined) {
        return callback(false);
      }
      user.get_repo_config(payload.repository.url, function (err, repo_config) {
        return callback(
          verify_webhook_sig(sig, repo_config.get('secret'), req.post_body),
          repo_config, user, payload);
      });
    });
};

/**
 * verify_webhook_req_secret()
 *
 * Verify the secret in the URL for a github webhook of a manually configured project
 *
 * @param {Object} req Express request object.
 * @param {Function} callback function(boolean result, repository object, user object)
 */
var verify_webhook_req_secret = module.exports.verify_webhook_req_secret = function (req, callback) {
  if (req.body.payload === undefined) {
    debug('verify_webhook_req_secret() payload missing');
    callback(false);
    return;
  }

  var payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch (e) {
    debug('verify_webhook_req_secret() JSON parse exception');
    callback(false);
    return;
  }
  User.findOne({'github_config.url': payload.repository.url.toLowerCase()},
    function (err, user) {
      if (err || user === null || user === undefined) {
        return callback(false);
      }
      user.get_repo_config(payload.repository.url, function (err, repo_config) {
        return callback(req.params.secret === repo_config.get('secret'), repo_config, user, payload);
      });
    });
};

/**
 * webhook_commit_is_to_master()
 *
 * Verify the supplied payload object represents a commit to the master branch.
 *
 * @param {Object} payload Decoded JSON commit object.
 */
var webhook_commit_is_to_master = module.exports.webhook_commit_is_to_master = function (payload) {
  if (payload === undefined)
    return false;

  return (payload.ref === 'refs/heads/master');
};

/**
 * webhook_extract_latest_commit_info()
 *
 * Extract the author, id, message and timestamp from the latest commit mentioned in the
 * webhook. This is mainly to be attached to Job objects triggered by the webhook firing.
 *
 * @param {Object} payload Decoded JSON commit object.
 */
var webhook_extract_latest_commit_info = module.exports.webhook_extract_latest_commit_info = function (payload) {
  var commit_id = payload.after;

  var commit_data = _.find(payload.commits, function (commit) {
    return commit_id == commit.id;
  });

  return {
    id: commit_data.id,
    author: commit_data.author,
    message: commit_data.message,
    timestamp: commit_data.timestamp
  };
};

/**
 * parse_github_url()
 *
 * Parse a Github URL and return the organization and repo. If there is a trailing ".git"
 * in the path, assume it is a Git URL and strip it off.
 * @param {String} gh_url The URL to parse
 * @returns {Object} {org: "org", repo: "repo"}
 */
var parse_github_url = module.exports.parse_github_url = function (gh_url) {
  var myRegexp = /(?:https*:\/\/)*github\.com\/(\S+)\/(\S+)\/?/;
  var match = myRegexp.exec(gh_url);

  if (match === null) {
    return null;
  } else {
    var org = match[1];
    var repo = match[2];

    // Check whether suffix is .git and if so, remove
    var suffix = repo.substr(repo.length - '.git'.length, repo.length);
    if (suffix === '.git') {
      repo = repo.substr(0, repo.length - '.git'.length);
    }

    return {org: org, repo: repo};
  }
};

/**
 * make_ssh_url()
 *
 * Make a Github SSH-protocol Git URL for the supplied org/user and repository.
 *
 * @param {String} org Organization or user
 * @param {String} repo Respository name
 * @returns {String} like git@github.com/org/repo
 */
var make_ssh_url = module.exports.make_ssh_url = function (org, repo) {
  return 'git@github.com:' + org + '/' + repo + '.git';
};
