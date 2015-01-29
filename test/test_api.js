
var expect = require('expect.js')
  , api = require('../lib/api')

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

})
