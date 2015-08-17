var nock = require('nock');

/*
    Set up the mocks for getting a list of repositories for the stridertest user
    The stridertest user is an admin of two organizations 
        stridertestersunion and
        stridertesters1
    and has two repositories to which he has admin access
        stridertestersunion/union-proj-1
        stridertester/proj1

    This file sets up mock responses as received from github for each request fired
    during the get repositories operation
*/

module.exports = function() {
	nock('https://api.github.com:443')
          .persist()
	  .get('/user/repos')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095","per_page":"30","page":"1"})
	  .reply(200, ["1f8b0800000000000003ed9adb6ee33610865f25d06d9dc88e93366ba0d8be412fdadeb4280c5aa62d36922890548244c8bb7786a48ea07ca0e8bbbdc9da0aff6f463ccf9ffda78ed83eda3c2dbf2d978f2f8f8ba820398d365129f87fab68111daa2cdbda675209b6a74251a9a8889b16fcbda022dad451c68fac00e9a0192090bf5abfac9f9e5f5e161179238a886d2532689a2a55ca4d1c9b87f2e1c8545aed2a4945c20b450bf590f03caee246fefdedd735108fc252101dc18311ad649664e48093f138ab54e5d9280b135d6bc6ad0f3ccbf8","3b70c6899f0d15b752ec4d8d61c5d11703d23ae62aa5d083f05a5fd8194c2a8fb4b4ac8ef19f2ddb2348c2b808babf3e352b84c4702a7cd5b1a025d7c46a2713c14ac578e191e2400e382e8ea4609fc413077209144cce23192d03397d8369e9a137ba1a960d7b23c907768fa009656fd0e3becc110090eaa3c4d5fb17cc0dec7fa6e896ec735c96079249fab580850df11534d20f16b0042f5e07ed92dfd3765821d88109a9ee703ba08982a8072e5e5bfcc995a9fb74b8d6da184839d3cd937258732086545ee9873703b5750c3fedf24860ed921d1744f173dbc0746203481df7bfe28c5094e4de096b314052cefd7b4e8b01c2a4ace8451373fa653543c6cdcc2faa7c67b6ac4be6fb34d6a8214722253b16947af7580ba8e36637dd095224a93fb2d1d7b1f9a447951cbd53442d207619df7933e05c8b35a08e654acc99a1b673b24222ea0740410fb352447d0b5462c6b8eaf410d0e2e0885230c4def935fab8b63d9891e25891a33fb105c0e8e2017a249f67af17d36ba223000eef4e82edaa791b55c7c00ccd490eebd7bf0b3b4407d45783d3378e132fddbb5ee8d7ce7376ee689ea659f9604acf44e23c1c63f1fbf91bc4e934515fc7dd7e6a366b4bf6ed4dbb5b37f9f5f9f632ee3df48d3eae7f2a894a710782302511d437592b8feb1d815bcdc3c3439d52a26fb139153356a5510386882485bb996f7e75a3879b484e94be131f30bd3ddc91334ef6de7dd902006686cc3747a3ee8f7309c59e77625adca7e52c834a9117fe7b6447e8730baed88125979401d3cb6800a9bf4b56247441b26c01b352b184c13c855a0b470c2e7dd4bf578c1ad287b2dadcf9330a53d6bb970535fa3a36455b2228dce6f75ba2e026feb85c3ddf2f5fee57bffcb97a829a7bb37efe1bdea02af767db94954ccf606037b3530d3e41d13e552e9b2b3c56e0105bcab413fdd649360e33c14a920ce6cc68525f16eb6d7c949c96417a29cf6909c778b42960fa62c5f4099f97832339e15501bd0b0fdf8982bb211c81dda3e6186f0029915bb3b0a28d12151658f0a45bb4bd87efec95f51b611eb22d9c4cfdd305ca9910dcfa2626575ed2c2c6ea25644a1fccb6f7fb41f6facb9e1e4895a9adb9a5c2dcc909ba3ad025251539bc0196ece8ead8f2d1bc0bce9226655cefe6f3d7d7a2e722adbf3db52e525500e61e4bc3fb936692d40de351f3d3ce92d1e02ed8f84b3fafd673fc259087f297dadcaea8ae5b8dbfd764bb318ce3348005f39d2c359cfb648137f2a01a7adfc8822937cf89b2d0597e9465e8030e12baa4a2c61277e4b658ca0dbca936bf81c505995a87eaf79e9787c74458a7ca461fed2743dbea0fe366df193b5bdee9c68d8d75a7b7ab3946963b053f57cbc19a6771b98061fd2e57849b985fae40f39c301731882de60287f6c85c31021866","2e6c48f7ccc50f66a5b9e0b37c3517106bfd4026db143e8ce336450f60bf4da10379712e7c4063ce850fe4d2b9d0e12c3b17bdef01e2f93ac3bf73e17bbc8eee67e69dc06b20f07d6d38177aecc761551b928ffbc03846e3a95dedd44cbd405803d015e5166ea02b4e406bd08dd73663389fd01564b669e882dec0417485096027bab0a1bc45173ba4d1e8e2dfc27574c5b9b905e90a1acc8f74c1af31279f36cfab73e664d3e68439d934c16ddcfc5f03f874c29c74a47d955339adbfc6b69ca6c88b3d4c07038eca1f86a6fe03fe5c43f3dfff01dbcdd52a18270000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:18 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4997',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  etag: 'W/"b1f3322cba51768ca7bd6d366be82d1c"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': '',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:7C7D:AC542C2:55D1F1D9',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': '4c8b2d4732c413f4b9aefe394bd65569',
	  'content-encoding': 'gzip' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/user/orgs')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095","per_page":"30","page":"1"})
	  .reply(200, ["1f8b0800000000000003b591cb0ac2301045ff25eb622c119182f82122d2c7500369126626dd88ff6e6c147ce0c2a8bb30cc3ddcccd91e8571bdb6a212c4a83b400662402a45217427aa52add4623957850868e2d681d9532565edf5acd77c08cdac758374d8937c25207847fb8f9372cac5063082e51c400a46c2004313bf93d1e19a3ccaf43845980f8dd1ed3e9ff908b847d763cd353ed79c86743d7420c0d6598e27996e1ee44dce665c","ab58af036a517bd62efab4c19853f14e6fb097a57bc56586e21b254ff394fe5675827cad3b617eaf3c71ffa2bd546fb5efce2e833594d7030000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:18 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4996',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  etag: 'W/"f574132e1ed75cc6bfb5d99facddc93f"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:1CB8:C04DED1:55D1F1D9',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': 'a7f8a126c9ed3f1c4715a34c0ddc7290',
	  'content-encoding': 'gzip' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/orgs/stridertestersunion/teams')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095"})
	  .reply(200, ["1f8b0800000000000003958dc10ec2200c86dfa567325c3ca8bc840f608c61a3d99a502014e261d9bb4b16bcebadeddfeffb1f1b04cb0806eeef805940013930e3e5741e6f5705e2ebd2c2f80d1dca9c29158a014ca8de2b489899448e0b58c7149aa466dfb6b59424466b9b6858a8ac751ae6c8baa065d1bda33d33f2d4ba5fbf43ba235b1ff666c998a2508999f02fd5c1c1fefc00bfe427760b010000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:18 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4995',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  etag: 'W/"d8f97268999d9593cee3aee8084e3316"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:7C7E:B8F4286:55D1F1DA',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': 'dc1ce2bfb41810a06c705e83b388572d',
	  'content-encoding': 'gzip' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/orgs/stridertesters1/teams')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095"})
	  .reply(200, ["1f8b0800000000000003958dd10ac2300c45ff25cf6575088afd093f4044ba356c81a62d4d8b0f63ff6e19f55ddf92dc9c731f1b04cb0806eeef805940013930e3f5741e6f1705e2ebd2c2f80d1dca9c29158a014ca8de2b489899448e0b58c7149aa466dfb6b59424466b9b6858a8ac751ae6c8baa065d1bda33d33f2d4ba5fbf43ba235b1ff666c998a2508999f02fd5c1c1fefc00a61ff3c40b010000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:18 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4994',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  etag: 'W/"e803d410fb05ad5ac5773236d6c53a3b"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:3D4C:8F50E71:55D1F1DA',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': '474556b853193c38f1b14328ce2d1b7d',
	  'content-encoding': 'gzip' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/teams/1703196')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095"})
	  .reply(200, ["1f8b08000000000000039d53cb6ec23010fc179f038e1bcac352d54fe8a5a75e2293b8c1925fb2d7a016f1ef5d12a352880aedcdebf58e676776f7c40a2309272f3b2b432405512de16c51566c352f48d4a9c3a43b255b199ba03c286709b749eb8278198c8ab1bf21a235ca22480a1aa30d808f9c52e1d5b453b049eb","69e30c05294ca4f90f7c6ca459e3dff5fd453497ecf3e18028417a1715b8a0e49fa0faba33168d4b1650828c58e7b82c880b9db0ea530cddef89761d36cb4984a05a194046c036d849c36a59cde66575430c048df41aa167f5bb226395f4d48ddc4a0bff01180aef756594c388393eadb56aeabb9c1ec5fc0970eebbd80a10e152aafe32e6a94b5186c6594049fa014c9465739eb74f15f63a36d603e3414f8eee67069d8a10c9f1e2dd69ed76c7a5f98e94c575c1dc068cbea074b600d77637410a906d2d70f2c843c91e27e572c216af6cc6cb0567abb7e34ef9f6e61bf8f0fd329f4feae1f0055b70c80fe5030000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:19 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4993',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  'last-modified': 'Mon, 17 Aug 2015 14:07:19 GMT',
	  etag: 'W/"2cc59cbb0d16681eb561d3565e4f0a32"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:3D49:AFC581B:55D1F1DB',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': '8a5c38021a5cd7cef7b8f49a296fee40',
	  'content-encoding': 'gzip' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/teams/1703198')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095"})
	  .reply(200, ["1f8b08000000000000039d53cb6ec32010fc17ce4e3071dab848553fa1979e7ab1884d1d245e82c5511be5df8b6da2b891d3a4bdb12c3bcccece1e90668a238a5ef79a3b8f32241a44c9262fc85399212f431b93e6946cb8af9db0208c465407293364b953c2fbe106b146091d41829331da01584f3166562c5b01bbb0","5dd64661e04c799cfe888f1557dbf877757f114e258774384614c7adf1028c13fc4f5043dd84456d8286284142acceb1712dd3e28b8ddd1f90346d6c96220f4e34dc01f710db08ba9722e95894c5fa9114370489c01ecfa30cec7e57e65a353e75c63baee1bf2063f1bd53baca656660366ca5a8abbba67f15f727c8d40fac63c0dca574c3a54f6e0c9ebbda6888f20cc60c98a481bd74cf45ec79ceee23eb51dbde2589412b3c7844f30c7d1829cdbe5fa67324745ca398db81921794268b316f81da7106bca95874255ae5e46191970bb279236b9a9794acdefb7db3cdcd37f06987459fbaf878fc065c6ab24001040000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:19 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4992',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  'last-modified': 'Mon, 17 Aug 2015 14:08:12 GMT',
	  etag: 'W/"ec5c565e40d06277bb4f481f9545f347"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:7C7B:80FD6DC:55D1F1DB',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': '01d096e6cfe28f8aea352e988c332cd3',
	  'content-encoding': 'gzip' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/teams/1703198/members/stridertester')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095"})
	  .reply(204, "", { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:20 GMT',
	  connection: 'close',
	  status: '204 No Content',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4991',
	  'x-ratelimit-reset': '1439825816',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:5BA9:BB87F3B:55D1F1DC',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  vary: 'Accept-Encoding',
	  'x-served-by': '7f48e2f7761567e923121f17538d7a6d' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/teams/1703196/members/stridertester')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095"})
	  .reply(204, "", { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:20 GMT',
	  connection: 'close',
	  status: '204 No Content',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4990',
	  'x-ratelimit-reset': '1439825816',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:5BAB:8E9EAA7:55D1F1DC',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  vary: 'Accept-Encoding',
	  'x-served-by': '2d7a5e35115884240089368322196939' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/teams/1703196/repos')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095","per_page":"30","page":"1"})
	  .reply(200, [], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:21 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'content-length': '2',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4989',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  etag: '"9c458f5e39f517ebb1d513d09d33a48d"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:5BA6:7EC3E47:55D1F1DD',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': 'a30e6f9aa7cf5731b87dfb3b9992202d' });

	nock('https://api.github.com:443')
          .persist()
	  .get('/teams/1703198/repos')
	  .query({"access_token":"35e31a04c04b09174d20de8287f2e8ddad7d2095","per_page":"30","page":"1"})
	  .reply(200, ["1f8b0800000000000003ad98d16ee33610457f25d06b1dd35e67db5d03c5ee1ff4a17d6a5118b4444b6c245120290709e17fef1d52b264c18815874090d88a7878399c19cef01f97c82cd93eadbeaf569bef4f8ba4e69548b6495b4b553f365afdf7b84e16c9a12dcb5df72f63b5cc84b6c258a18d7f914d5e572fb5d0c9d625a5ca650ddc9531a0d2ccebcdb7cdd3afebcd22e1476eb9deb5bac480c2dac66c190b0fcd3297b668f7ad11","3a55b515b55da6aa622deb87ff38febe0131d71d85d0091e4c688dec48613870865dd756d8aa9c68091afcc8eb630eaa2cd50b98d345cc9c969d0164720f9375fe3918008e295b085816cb3d9191a4b1774bf4831da33f3b9911ce60d7b4c8ee95d90d8748729a93635a34ca73dbbd49b56c2c1cec6eb917104095ce792ddff8a7a08018b048e8ddc2fc6040c411ce7c37258c76acd1f2c8d357329b16a99047ecc7e7c8130cc0f6b5a1ccf0c7c882b44bd28a1dcf2a0af3032f8d382d12afc6e265ff608160fe602c4df34926ce9e00057f8604f4d065a0079f7c1e285789d43ef874a5f4f379f6775380df866be13c9540c81bdb348f85200709229fc56b1c20811cc3ef2e2053640ebe579a5b752b15cd947c41746cfc955cce0a5ec5598a2781582815c9da9e04a234a615b36262a64d3cd0b03e02ebb6da87f43a27ee66ce115050cf8d91792d441c2b9f698ef567c25ef33a2d22f17b9863e193f7119ec7114f20f0f6a5dac701e258679ee69829783820ed2e9a5ec213ec82aec5219e78829de956c7f2122f9c6867368e6a0b8789a3bc8731d759bde475def23c12fe4c83af508991f3b79b85d9cca81c70605339aae5be8d986b0720690f5510724b24b30fbc81ee6bacf70bb8b9b619156dde3a55256f953733d11deb228e62f2c9dfa773d0f7dbf5d907164030c786c3221c4bdd345176a03b977ae5e3c9bad6298e23f530e67e69b82d286f62ce866b1165191d8bb93d474db95c2e5d21b8ef372aa1632589800293ebb440d11c45b9eb6128f42a6e7d477320e1193a9c52f12c8efdcf3490c39e47511f5063af69d0fbc791ec496374254bdc22a83a52ce1f70e3496a65e541a6735abe99817c41743f8cac53b1e065b980f75b994ac403da6eda72d4e12292f1020a0bc3054de8f34a81d088b3335a049863a1a74fb5400397edb845bff565b5fefab8faf6b8feedaff5d3163f5fd77f636d6d93dd7ca7694d710383b4db392e3ee1c6e7fd5b968bb68cee7220c4986220fc1cc66fafdcd25c1b9f96f0c049f0dca1e2383d413fc0c02a0a558906e54fb2ad1126d458bfe1f3eaa27a49555b6347f0f0855b94eba80986477dc5d3030a6e76219a93add52df5e17832a48dd1c317f92cc72f910e736ea043eb3b4c5449ad55775117b4aa46d4dd5c2341a1d125b5a3ff5fa8f75f3271e06d6977a15780bf559c6e16619246e80a2b406d02312ee96e19c25ac8b37ac99457c2e7d3e9dfff01e6a10cc4d2140000"], { server: 'GitHub.com',
	  date: 'Mon, 17 Aug 2015 14:38:21 GMT',
	  'content-type': 'application/json; charset=utf-8',
	  'transfer-encoding': 'chunked',
	  connection: 'close',
	  status: '200 OK',
	  'x-ratelimit-limit': '5000',
	  'x-ratelimit-remaining': '4988',
	  'x-ratelimit-reset': '1439825816',
	  'cache-control': 'private, max-age=60, s-maxage=60',
	  etag: 'W/"9edb20d1a1c134303874d4f4280a450f"',
	  'x-oauth-scopes': 'repo',
	  'x-accepted-oauth-scopes': 'admin:org, read:org, repo, user, write:org',
	  'x-oauth-client-id': 'a3af4568e9d8ca4165fe',
	  vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
	  'x-github-media-type': 'github.v3; format=json',
	  'x-xss-protection': '1; mode=block',
	  'x-frame-options': 'deny',
	  'content-security-policy': 'default-src \'none\'',
	  'access-control-allow-credentials': 'true',
	  'access-control-expose-headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
	  'access-control-allow-origin': '*',
	  'x-github-request-id': '7E57F4A7:5BAB:8E9EC6D:55D1F1DD',
	  'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
	  'x-content-type-options': 'nosniff',
	  'x-served-by': '13d09b732ebe76f892093130dc088652',
	  'content-encoding': 'gzip' });
}
