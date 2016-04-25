
var expect = require('expect.js')
  , lib = require('../lib/webhooks')

describe('webhooks', function () {
  describe('commit hook', function () {
    describe('parsing', function () {
      it('should work', function () {
        var fx = require('./sample_commit.json')
          , config = lib.pushJob(fx)

        delete config.trigger.author.image

        expect(config).to.eql({
          branch: 'master',
          deploy: true,
          ref: {
            branch: 'master',
            id: '5440158e185393ddedcabcbc615f574d10134cdb'
          },
          trigger: {
            type: 'commit',
            author: {
              name: 'Jared Forsyth',
              username: 'jaredly',
              email: 'jared@jaredforsyth.com'
            },
            url: 'https://github.com/jaredly/django-colorfield/commit/5440158e185393ddedcabcbc615f574d10134cdb',
            message: 'adding mit license',
            timestamp: '2013-10-05T17:09:00-07:00',
            source: {
              type: 'plugin',
              plugin: 'github'
            }
          }
        })
      })
    })
  })

  describe('pull request hook', function () {
    describe('parsing', function () {
      it('should work', function () {
        var fx = require('./sample_pull_request.json');
        var config = lib.pullRequestJob(fx.pull_request, fx.action);

        expect(config).to.eql({
          branch: 'master',
          deploy: false,
          plugin_data: {
            github: {
              pull_request: {
                user: 'jaredly',
                repo: 'petulant-wookie',
                sha: 'f65ac3101a45bb9408c0459805b496cb73ae2d5f',
                number: 1,
                body: 'This is the body.'
              }
            }
          },
          ref: {
            fetch: 'refs/pull/1/merge',
            branch: 'master'
          },
          trigger: {
            type: 'pull-request',
            author: {
              username: 'jaredly',
              image: 'https://0.gravatar.com/avatar/313878fc8f316fc3fe4443b13913d0a4?d=https%3A%2F%2Fidenticons.github.com%2Fb12c483d8922cb5945bd4ffdae6d591d.png'
            },
            url: 'https://github.com/jaredly/petulant-wookie/pull/1',
            message: 'Example pull request',
            timestamp: '2013-10-10T18:04:25Z',
            source: {
              type: 'plugin',
              plugin: 'github'
            }
          }
        })
      })
    })
  })

  describe('verifySignature', function () {
    // `X-Hub-Signature` request header value from a github test hook request
    var goodSig = 'sha1=0a09a56a74e9e68928a35f712afaae72b010c11f'
      , secret = 'testsecret123'
      , body = 'payload=%7B%22zen%22%3A%22Avoid+administrative+distraction.%22%2C%22hook_id%22%3A1881347%7D'
    it('should verify valid signature', function (done) {
      var valid = lib.verifySignature(goodSig, secret, body)
      expect(valid).to.be(true)
      done()
    })
    it('should not verify invalid signature', function (done) {
      var badSig = goodSig.replace(/.{1}$/, 'a')
      var valid = lib.verifySignature(badSig, secret, body)
      expect(valid).to.be(false)
      done()
    })
  })

})
