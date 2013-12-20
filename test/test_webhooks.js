
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
        var fx = require('./sample_pull_request.json')
          , config = lib.pullRequestJob(fx.pull_request, fx.action)

        expect(config).to.eql({
          branch: 'master',
          deploy: false,
          plugin_data: {
            github: {
              pull_request: {
                user: 'jaredly',
                repo: 'petulant-wookie',
                sha: 'f65ac3101a45bb9408c0459805b496cb73ae2d5f'
              }
            }
          },
          ref: {
            fetch: 'refs/pull/1/merge'
          },
          trigger: {
            type: 'pull-request',
            author: {
              user: 'jaredly',
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
})
