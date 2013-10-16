
var expect = require('expect.js')
  , api = require('../lib/api')

describe('github api', function () {
  describe('getFile', function () {
    it('should get a file', function (done) {
      api.getFile('Readme.md', null, null, 'Strider-CD', 'strider-github', function (err, text) {
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
})
