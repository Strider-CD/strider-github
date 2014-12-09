strider-github
==============

A provider for strider that integrates with github to provide easy setup of
your projects. It registers webhooks and sets up ssh keys (if you so choose).

[![NPM](https://nodei.co/npm/strider-github.png)](https://nodei.co/npm/strider-github/)

## Required Configuration

If you are running on `localhost:3000` the default settings should work just fine.

### Custom hostname

if you are *not* using localhost:3000 as your hostname:

- you need to register your own github app, with the authentication URL set to your server's hostname + `/auth/github/callback`, e.g. 'https://strider.example.com/auth/github/callback'. This can be done [here](https://github.com/settings/applications/new).
- set the env variables `PLUGIN_GITHUB_APP_ID` and `PLUGIN_GITHUB_APP_SECRET` to those of your app
- you need to set the ENV variable `PLUGIN_GITHUB_HOSTNAME` to your server's hostname (including `http://` or `https://`)
