
# Strider-github

A provider for strider that integrates with github to provide easy setup of
your projects. It registers webhooks and sets up ssh keys (if you so choose).

## Required Configuration

If you are running on `localhost:3000` the default settings should work just fine.

### Custom hostname

if you are *not* using localhost:3000 as your hostname:

- you need to register your own github app, with the authentication URL set to your server's hostname
- set the env variables `strider_github_app_id` and `strider_github_secret` to those of your app
- you need to set the ENV variable `strider_github_hostname` to your server's hostname (uncluding `http://` or `https://`)
