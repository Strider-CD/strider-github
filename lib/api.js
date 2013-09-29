
var request = require('superagent')

module.exports = {
  getRepos: getRepos,
  getFile: getFile
}

function getFile(filename, ref, accessToken, owner, repo, done) {
  var req = request.get('https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + filename)
  if (ref) {
    req = req.query({ref: ref})
  }
  if (accessToken) {
    req = req.set('Authorization', 'token ' + accessToken)
  }
  req.end(function (res) {
    if (!res.body.content) return done()
    done(null, new Buffer(res.body.content, 'base64').toString())
  })
}

/*
 * pageinated_api_call()
 *
 * Simple HTTP Get Github API wrapper with support for pageination via Link header.
 * See: http://developer.github.com/v3/#pagination
 *
 * <path> API call URL path
 * <access_token> OAuth2 access token
 * <callback> function(error, response, de-serialized json)
 *
 */
var pageinated_api_call = exports.pageinated_api_call = function(path, access_token, callback, client) {
    var client = client || request;
    var base_url = GITHUB_API_ENDPOINT + path;
    console.debug("github pageinated_api_call(): path %s", path);

    if (!access_token){
      console.error("Error in request - no access token")
      console.trace();
    }

    // This is a left fold,
    // a recursive function closed over an accumulator

    var pages = [];

    function loop(uri, page) {
      get_oauth2(uri, {per_page:30, page:page}, access_token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          try {
            var data = JSON.parse(body);
          } catch (e) {
            return callback(e, null);
          }
          pages.push(data);

          var link = response.headers['link'];
          if (link) {
            var r = parse_link_header(link);
          }
          // Stop condition: No link header or we think we just read the last page
          if (!link || (r.next === undefined && r.first !== undefined)) {
            callback(null, {data:_.flatten(pages), response: response});
          } else {
          // Request next page and continue
            var next_page = url.parse(r.next, true).query.page;
            console.log("pageinated_api_call(): page %s - next page %s", page, next_page);
            loop(base_url, next_page);
          }
        } else {
          if (!error){
            return callback("Status code is " + response.statusCode + " not 200. Body: " + body)
          } else {
            return callback(error, null);
          }
        }
      }, client);
    }

    // Start from page 1
    loop(base_url, 1);
}

/*
 * get_github_repos()
 *
 * Fetch a list of all the repositories a given user has 
 * "admin" privileges. Because of the structure of the Github API,
 * this can require many separate HTTP requests. We attempt to
 * parallelize as many of these as we can to do this as quickly as possible.
 *
 * <token> the github oauth access token
 * <username> the github username
 * <callback> function(error, result-object)
 */
function getRepos(token, username, callback) {
  var org_memberships = []
  var team_repos = []
  var repos = []
  // needs callback(null, {groupname: [repo, ...], ...})
  // see strider-extension-loader for details
  return callback(new Error('Not Implemented'));

  console.debug("Fetching Github repositories for %s", username)
  Step(
    function fetchReposAndOrgs() {
      console.debug("Repos API call for %s", username)
      // First fetch the user's repositories and organizations in parallel.
      pageinated_api_call('/user/repos', token, this.parallel());
      pageinated_api_call('/user/orgs', token, this.parallel());
    },
    function fetchOrgTeams(err, r, o) {
      if (err) {
        console.error("get_github_repos() - Error fetching repos & orgs: %s", err);
        throw err;
      }
      if (!r){ throw "Response is null" }
      console.debug("Repos API call returned for user: %s status: %s", username, r.response.statusCode);
      console.debug("Orgs API call returned for user: %s status: %s", username, o.response.statusCode);

      org_memberships = o.data;
      repos = r.data;

      // For each Org, fetch the teams it has in parallel
      var group = this.group();
      _.each(org_memberships, function(org) {
        console.debug("Fetching teams for Org: %s", org.login);
        api_call('/orgs/'+org.login+'/teams', token, group());
      });
    },
    function fetchTeamDetails(err, results) {
      if (err) {
        console.error("get_github_repos() - Error fetching Org Teams response - %s", err);
        throw err;
      }
      var teams = [];
      _.each(results, function(result) {
        try {
          console.debug("For Organizations: %s", result.request.uri.path.split('/')[2]);
          var team_data = JSON.parse(result.body);
          _.each(team_data, function(t) {
            console.debug("Team details: %j", t);
            teams.push(t);
          });
        } catch(e) {
          console.error("get_github_repos(): Error parsing JSON in Org Teams response - %s", e);
        }
      });

      // For each Team, fetch the detailed info (including privileges)
      var group = this.group();
      _.each(teams, function(team) {
        console.debug("Teams detail API call for user: %s", team.name);
        api_call('/teams/'+team.id, token, group());
      });
    },
    function filterTeams(err, results) {
      if (err) {
        console.error("get_github_repos() - Error fetching detailed team response - %s", err);
        throw err;
      }
      var team_details = [];
      _.each(results, function(result) {
        try {
          var td = JSON.parse(result.body);
          team_details.push(td);
        } catch(e) {
          console.error("get_github_repos(): Error parsing JSON in detail team response - %s", e);
        }
      });
      // For each Team with admin privs, test for membership
      var group = this.group();
      var team_detail_requests = {};
      _.each(team_details, function(team_details) {
        if (team_details.permission != "admin") {
          console.debug("Problem with team_details: %j", team_details);
          console.debug("Team %s does not have admin privs, ignoring", team_details.name);
          return;
        }
        team_detail_requests[team_details.id] = team_details;
        var url = GITHUB_API_ENDPOINT + '/teams/' + team_details.id + '/members/' + username;
        console.debug("Starting admin team membership API call for user: %s team: %s",
                      username, team_details.id);
        get_oauth2(url, {}, token, group());
      });
      this.team_detail_requests = team_detail_requests;
    },
    // For each team with admin privileges of which user is a member, fetch
    // the list of repositories it has access to.
    function fetchFilteredTeamRepos(err, results) {
      if (err) {
        console.debug("get_github_repos(): Error with admin team memberships: %s", err);
        throw err;
      }
      var team_detail_requests = this.team_detail_requests;
      var group = this.group();
      _.each(results, function(response) {
        var team_id = response.request.uri.path.split('/')[2];
        var team_detail = team_detail_requests[parseInt(team_id, 10)];
        console.debug("Team membership API call returned %s for team %s (id: %s)",
                      response.statusCode, team_detail.name, team_detail.id);
        if (response.statusCode === 204) {
          console.debug("User is a member of team %s (id: %s)", team_detail.name, team_detail.id);
          pageinated_api_call('/teams/' + team_id + '/repos', token, group());
        } else {
          console.debug("User is NOT a member of team %s (id: %s)", team_detail.name, team_detail.id);
        }

      });
    },
    // Reduce all the results and call output callback.
    function finalize(err, results) {
      if (err) {
        console.debug("get_github_repos(): Error with team repos request: %s", err);
        throw err;
      }
      _.each(results, function(result) {
        if (result && result.data) {
          _.each(result.data, function(team_repo) {
            team_repos.push({
              url: team_repo.clone_url.split('//')[1],
              display_url: team_repo.html_url,
              name: team_repo.full_name,
              id: team_repo.id,
              group: 'All'
            })
          })
        } else {
          console.debug("get_github_repos(): finalize result was null for user %s", username)
        }
      })
      for (var i=0; i<repos.length; i++) {
        personal.push({
          url: repos[i].clone_url.split('//')[1],
          display_url: repos[i].html_url,
          name: repos[i].full_name,
          id: repos[i].id,
          group: 'All'
        })
      }
      // Sometimes we can get multiple copies of the same team repo, so we uniq it
      team_repos = _.uniq(team_repos, false, function(item) {
        return item.id
      });
      console.debug("Github results for user %s - Repos: %j Team Repos w/ admin: %j Org memberships: %j",
                    username, _.pluck(repos, "name"), _.pluck(team_repos, "name"),
                    _.pluck(org_memberships, "login"))

      callback(null, {repos: repos, orgs:{team_repos: team_repos, org_memberships:org_memberships}})
    }
  );
};
