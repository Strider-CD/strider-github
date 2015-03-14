strider-github
==============

A provider for strider that integrates with github to provide easy setup of
your projects. It registers webhooks and sets up ssh keys (if you so choose).

[![NPM](https://nodei.co/npm/strider-github.png)](https://nodei.co/npm/strider-github/)  
[![Build Status](https://travis-ci.org/Strider-CD/strider-github.svg)](https://travis-ci.org/Strider-CD/strider-github)

## Required Configuration

If you are running on `localhost:3000` the default settings should work just fine.

### Use custom hostname and port

To use a custom hostname and port:

- set this environment variables with you hosname/port information

```
PORT=9999
SERVER_NAME="http://your.strider.hostname:9999"
PLUGIN_GITHUB_APP_ID="hereComesTheId"
PLUGIN_GITHUB_APP_SECRET="theSecretFromGithub"
```

- register your own github app [here](https://github.com/settings/applications/new) and set authentication URL your server's hostname:port + `/auth/github/callback`, for example:

```
http://your.strider.hostname:9999/auth/github/callback
```

- also make sure your github profile has a public email set
  * Go to https://github.com/settings/profile and select an email under "Public email".
