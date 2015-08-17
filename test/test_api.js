var expect = require('expect.js')
  , api = require('../lib/api')
  , util = require('util')
  , nock = require('nock');

describe('github api', function () {
  describe('getFile', function () {
    it('should get a file', function (done) {
      api.getFile('README.md', null, null, 'Strider-CD', 'strider-github', function (err, text) {
        expect(err).to.not.be.ok()
        expect(text).to.be.ok()
        done()
      })
    })

    it('should get @ a ref', function (done) {
      api.getFile('Readme.md', '80b2afcf786ac0eceb0c5405a06e2bb5fc9170af', null, 'Strider-CD', 'strider-github', function (err, text) {
        expect(err).to.not.be.ok()
        expect(text).to.match(/What we want from a provider/)
        done()
      })
    })
  })

  describe('createHooks', function () {
    it('should fail on bad credentials', function (done) {
      api.createHooks('github/github-services', 'http://example.com/hook', 'testsecret', 'invalidtoken', function (err) {
        expect(err).to.be.a(Error)
        done()
      })
    })

    // if test environment hasn't been set-up with test values then
    // just make mocha report them as pending, rather than fail
    var env = process.env
      , t = env.TEST_HOOK_REPONAME ? 'it' : 'xit'

    global[t]('should create a hook', function (done) {
      api.createHooks(env.TEST_HOOK_REPONAME, env.TEST_HOOK_URL, 'testsecret123', env.TEST_HOOK_TOKEN, function (err) {
        expect(err).to.equal(null)
        done()
      })
    })
  })

  /*
    Simulate a case where a user Strider Tester is registered
    with github and has admin access to TWO repositories
    one which belongs to him (stridertester/proj1) and one that
    belongs to a team Strider Testers Union (stridertestersunion/union-proj-1)
    getRepos should return an array containing the two repositories
    we are using actual responses received from github.com - as recorded
    and mocked by nock to simulate.
  */

  describe('getRepos', function() {
    this.timeout(10000);
    before(function() {
        nock.cleanAll();
        nock.disableNetConnect();
    	require('./mocks/setup_nock_repos')();
    });
    it('should return a list of repos for a given user', function (done) {
      api.getRepos("35e31a04c04b09174d20de8287f2e8ddad7d2095", "stridertester", function(err, repos) {
        expect(err).to.not.be.ok();
        expect(repos).to.be.an('array');
        expect(repos.length).to.eql(2);
        expect(repos).to.eql(
          [ { id: 40900282,
              name: 'stridertester/proj1',
              display_name: 'stridertester/proj1',
              group: 'stridertester',
              display_url: 'https://github.com/stridertester/proj1',
              config:
                { url: 'git://github.com/stridertester/proj1.git',
                  owner: 'stridertester',
                  repo: 'proj1',
                  auth: { type: 'https' } } },
           {  id: 40900394,
              name: 'stridertestersunion/union-proj-1',
              display_name: 'stridertestersunion/union-proj-1',
              group: 'stridertestersunion',
              display_url: 'https://github.com/stridertestersunion/union-proj-1',
              config:
                { url: 'git://github.com/stridertestersunion/union-proj-1.git',
                  owner: 'stridertestersunion',
                  repo: 'union-proj-1',
                  auth: { type: 'https' } } }
          ]
        );
        ///console.log(util.inspect(repos, false, 10, true));
        done()
      });
    });
    after(function() {
      nock.cleanAll();
      nock.enableNetConnect();
    });
  });
})
