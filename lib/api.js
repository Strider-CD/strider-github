'use strict';

var _ = require('lodash');
var async = require('async');
var debug = require('debug')('strider-github:api');
var Step = require('step');
var superagent = require('superagent');
var url = require('url');
var util = require('util');

var GITHUB_API_ENDPOINT = process.env.PLUGIN_GITHUB_API_ENDPOINT || 'https://api.github.com';

module.exports = {
  getRepos: getRepos,
  getFile: getFile,
  getBranches: getBranches,
  createHooks: createHooks,
  deleteHooks: deleteHooks
};

/**
 * set_push_hook()
 *
 * Set a push hook via the Github API for the supplied repository. Must have admin privileges for this to work.
 *
 * @param {String} reponame is "<org or user>/<repo name>" e.g. "BeyondFog/Strider".
 * @param {String} url is the URL for the webhook to post to.
 * @param {String} secret is the Webhook secret, which will be used to generate the HMAC-SHA1 header in the Github request.
 * @param {String} token OAuth2 access token
 * @param {Function} callback function(error)
 */
function createHooks(reponame, url, secret, token, callback) {
  var qpm = {access_token: token};
  var post_url = GITHUB_API_ENDPOINT + '/repos/' + reponame + '/hooks';
  debug('CREATE WEBHOOK URL:', post_url, url);
  superagent
    .post(post_url)
    .query(qpm)
    .send({
      name: 'web',
      active: true,
      events: ['push', 'pull_request', 'issue_comment'],
      config: {
        url: url,
        secret: secret
      }
    })
    .set('User-Agent', 'StriderCD (http://stridercd.com)')
    .end(function (err, res) {
      if (err) return callback(err);

      if (res.statusCode !== 201) {
        var badStatusErr = new Error('Bad status code: ' + res.statusCode);
        badStatusErr.statusCode = res.statusCode;
        return callback(badStatusErr);
      }
      callback(null, true);
    });
}

/**
 * unset_push_hook()
 *
 * Delete push hook via the Github API for the supplied repository. Must have admin privileges for this to work.
 *
 * @param {String} reponame is "<org or user>/<repo name>" e.g. "BeyondFog/Strider".
 * @param {String} url The url to match
 * @param {String} token OAuth2 access token
 * @param {Function} callback function(error, response, body)
 */
function deleteHooks(reponame, url, token, callback) {
  var apiUrl = GITHUB_API_ENDPOINT + '/repos/' + reponame + '/hooks';
  debug('Delete hooks for ' + reponame + ', identified by ' + url);
  superagent
    .get(apiUrl)
    .set('Authorization', 'token ' + token)
    .set('User-Agent', 'StriderCD (http://stridercd.com)')
    .end(function (err, res) {
      if(err) return callback(err);
      if (res.status > 300) {
        debug('Error getting hooks', res.status, res.text);
        return callback(res.status);
      }
      var hooks = [];
      debug('All hooks:', res.body.length);
      res.body.forEach(function (hook) {
        if (hook.config.url !== url) return;
        hooks.push(function (next) {
          superagent
            .del(hook.url)
            .set('Authorization', 'token ' + token)
            .set('User-Agent', 'StriderCD (http://stridercd.com)')
            .end(function (err, res) {
              if(err) return next(new Error('Failed to delete webhook ' + hook.url + 'Error: ' + err));
              if (res.status !== 204) {
                debug('bad status', res.status, hook.id, hook.url);
                return next(new Error('Failed to delete a webhook: status for url ' + hook.url + ': ' + res.status));
              }
              next();
            });
        });
      });
      debug('our hooks:', hooks.length);
      if (!hooks.length) return callback(null, false);
      async.parallel(hooks, function (err) {
        callback(err, true);
      });
    });
}


function getBranches(accessToken, owner, repo, done) {
  var path = '/repos/' + owner + '/' + repo + '/git/refs/heads';
  pageinated_api_call(path, accessToken, function (err, res) {
    var branches = [];
    if (res && res.data) {
      branches = res.data.map(function (h) {
        return h.ref.replace('refs/heads/', '');
      });
    }
    done(err, branches);
  });
}

function getFile(filename, ref, accessToken, owner, repo, done) {
  var uri = GITHUB_API_ENDPOINT + '/repos/' + owner + '/' + repo + '/contents/' + filename;
  var req = superagent.get(uri).set('User-Agent', 'StriderCD (http://stridercd.com)');
  if (ref) {
    req = req.query({ref: ref});
  }
  if (accessToken) {
    req = req.set('Authorization', 'token ' + accessToken);
  }
  req.end(function (err, res) {
    if(err) return done(err, null);
    if (res.error) return done(res.error, null);
    if (!res.body.content) {
      return done();
    }
    done(null, new Buffer(res.body.content, 'base64').toString());
  });
}

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
  debug('GET OAUTH2 URL:', url);
  debug('Inside get_oauth2: Callback type: ' + typeof callback + ' Number of arguments expected by: ' + callback.length);
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
  debug('API CALL:', url, access_token);
  get_oauth2(url, {}, access_token, function (error, res) {
    if (!error && res.statusCode == 200) {
      var data = res.body;
      callback(null, res, data);
    } else {
      debug("We get an error from the API: " + error);
      callback(error, res, null);
    }
  }, client);
};

/**
 * parse_link_header()
 *
 * Parse the Github Link HTTP header used for pagination
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
 * Simple HTTP Get Github API wrapper with support for pagination via Link header.
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

  if (!access_token) {
    debug('Error in request - no access token');
    debug(new Error().stack);
  }

  // This is a left fold,
  // a recursive function closed over an accumulator

  var pages = [];

  function loop(uri, page) {
    debug('PAGINATED API CALL URL:', uri);
    get_oauth2(uri, {per_page: 30, page: page}, access_token, function (error, res) {

      if (!error && res.statusCode == 200) {
        var data;
        try {
          data = res.body;
        } catch (e) {
          return callback(e, null);
        }
        pages.push(data);

        var link = res.headers['link'];
        var r;
        if (link) {
          r = parse_link_header(link);
        }
        // Stop condition: No link header or we think we just read the last page
        if (!link || r.next === undefined) {
          callback(null, {data: _.flatten(pages), response: res});
        } else {
          // Request next page and continue
          var next_page = url.parse(r.next, true).query.page;
          loop(base_url, next_page);
        }
      } else {
        if (!error) {
          debug("We did not get an error, but status code was: " + res.statusCode);
          if (res.statusCode === 401 || res.statusCode === 403) {
            return callback(new Error('Github app is not authorized. Did you revoke access?'))
          }
          return callback(new Error('Status code is ' + res.statusCode + ' not 200. Body: ' + res.body))
        } else {
          debug("We did get an error from the API " + error);
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
 * @param {String} token the github oauth access token
 * @param {String} username the github username
 * @param {Function} callback function(error, result-object)
 */
function getRepos(token, username, callback) {
  var org_memberships = [];
  var team_repos = [];
  var repos = [];
  // needs callback(null, {groupname: [repo, ...], ...})
  // see strider-extension-loader for details

  /* jshint -W064 */
  /* jshint -W040 */
  Step(
    function fetchReposAndOrgs() {
      // First fetch the user's repositories and organizations in parallel.
      pageinated_api_call('/user/repos', token, this.parallel());
      pageinated_api_call('/user/orgs', token, this.parallel());
    },
    function fetchOrgTeams(err, githubRepos, githubOrgas) {
      if (err) {
        debug('get_github_repos() - Error fetching repos & orgs: %s', err);
        return callback(err);
      }
      if (!githubRepos) return callback('Get repos failed; no response');

      org_memberships = githubOrgas.data;

      githubRepos.data.forEach(function parseRepo(githubRepo) {
        repos.push({
          id: githubRepo.id,
          name: githubRepo.full_name.toLowerCase(),
          display_name: githubRepo.full_name,
          group: githubRepo.owner.login,
          display_url: githubRepo.html_url,
          config: {
            url: 'git://' + githubRepo.clone_url.split('//')[1],
            owner: githubRepo.owner.login,
            repo: githubRepo.name,
            auth: {
              type: 'https'
            }
          }
        });
      });

      // For each Org, fetch the teams it has in parallel
      var group = this.group();
      _.each(org_memberships, function (org) {
        api_call('/orgs/' + org.login + '/teams', token, group());
      });
    },
    function fetchTeamDetails(err, results) {
      if (err) {
        debug(err.message);
        debug(err.name);
        debug(err.stack);
        debug('get_github_repos() - Error fetching Org Teams response - %s', err);
        return callback(err);
      }
      var teams = [];
      _.each(results, function (result) {
        try {
          var team_data = result.body;
          _.each(team_data, function (t) {
            teams.push(t);
          });
        } catch (e) {
          debug('get_github_repos(): Error parsing JSON in Org Teams response - %s', e);
        }
      });

      // For each Team, fetch the detailed info (including privileges)
      var group = this.group();
      _.each(teams, function (team) {
        api_call('/teams/' + team.id, token, group());
      });
    },
    function filterTeams(err, results) {
      if (err) {
        debug('get_github_repos() - Error fetching detailed team response - %s', err);
        return callback(err);
      }
      var team_details = [];
      _.each(results, function (result) {
        try {
          var td = result.body;
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
          return;
        }
        team_detail_requests[team_details.id] = team_details;
        var url = '/teams/' + team_details.id + '/members/' + username;
        debug('TEAM DETAIL URL', url);
        api_call(url, token, group());
      });
      this.team_detail_requests = team_detail_requests;
    },
    // For each team with admin privileges of which user is a member, fetch
    // the list of repositories it has access to.
    function fetchFilteredTeamRepos(err, results) {
      if (err) {
        debug('get_github_repos(): Error with admin team memberships: %s', err);
        return callback(err)
      }
      var team_detail_requests = this.team_detail_requests;
      var group = this.group();

      _.each(results, function (result) {
        var team_id = result.req.path.split('/');
        debug("We get the following repo path: " + util.inspect(result.req.path));
        team_id = team_id[2];

        var team_detail = team_detail_requests[parseInt(team_id, 10)];
        if (result.statusCode === 204) {
          pageinated_api_call('/teams/' + team_id + '/repos', token, group());
        }

      });
    },
    // Reduce all the results and call output callback.
    function finalize(err, results) {
      if (err) {
        debug('get_github_repos(): Error with team repos request: %s', err);
        return callback(err);
      }

      _.each(results, function (result) {
        if (result && result.data) {
          _.each(result.data, function (team_repo) {
            team_repos.push({
              id: team_repo.id,
              display_url: team_repo.html_url,
              name: team_repo.full_name.toLowerCase(),
              display_name: team_repo.full_name,
              group: team_repo.owner.login,
              config: {
                url: 'git://' + team_repo.clone_url.split('//')[1],
                owner: team_repo.owner.login,
                repo: team_repo.name,
                auth: {
                  type: 'https'
                }
              }
            });
          });
        }
      });

      // Sometimes we can get multiple copies of the same team repo, so we uniq it
      team_repos = _.uniq(team_repos, false, function (item) {
        return item.id;
      });

      callback(null, repos.concat(team_repos));
    }
  );
}
