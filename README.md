strider-github
==============

A provider for strider that integrates with github to provide easy setup of
your projects. It registers webhooks and sets up ssh keys (if you so choose).

[![NPM](https://nodei.co/npm/strider-github.png)](https://nodei.co/npm/strider-github/)
[![Build Status](https://travis-ci.org/Strider-CD/strider-github.svg)](https://travis-ci.org/Strider-CD/strider-github)

Note: Supports using '[skip ci]' in your commit message to skip commits triggering a job.

## Required Configuration

If you are running on `localhost:3000` the default settings should work just fine.

### Environment Variables

**`SERVER_NAME`** The url of your strider server. Defaults to `http://localhost:3000`.

The following variables only need to be overridden if you are using github enterprise. See 'Enterprise Setup' below.

**`PLUGIN_GITHUB_APP_ID`** Defaults to client ID of Strider-CD Github App

**`PLUGIN_GITHUB_APP_SECRET`** Defaults to client secret of Strider-CD Github App

**`PLUGIN_GITHUB_API_DOMAIN`** Defaults to `https://github.com`

**`PLUGIN_GITHUB_API_ENDPOINT`** Defaults to `https://api.github.com`

### Enterprise Setup

1) You'll need to create an Application on your GitHub Enterprise Server. Log in to GitHub Enterprise and navigate to
`https://your-github-url.com/settings/applications/new` and set authentication URL to
`https://your-strider-server:port/auth/github/callback`.
2) Define the environment variables. Here is an example:
   ```
   export SERVER_NAME="http://111.11.11.111:3000"
   export PLUGIN_GITHUB_APP_ID="a342d32c23c23"
   export PLUGIN_GITHUB_APP_SECRET="5af64a67af586847afbc6796769769d97a961"
   export PLUGIN_GITHUB_API_DOMAIN="https://github.my-organization.com"
   export PLUGIN_GITHUB_API_ENDPOINT="https://github.my-organization.com/api/v3"
   ```
   **NOTE** `SERVER_NAME` must be the same exact host that you used for the 'Authentication URL' in step 1. For example,
   if you used `http://111.11.11.111:3000/auth/guthub/callback` in step 1, your `SERVER_NAME` **must** be
   `http://111.11.11.111:3000`. Also note that the protocol must be the same between the two (if you used `http://`
   in step 1, you must use `http://` in `SERVER_NAME` and not `https://`).
3) Reboot strider and navigate link a github account as normal, you should see your enterprise repos!

#### Known Issues with Enterprise

- If you get 'Error: Could not fetch user profile': Somehow, passport will fail to retrieve the user profile unless all
of the following are set. On GitHub Enterprise, log in to the profile you are trying to link to, and navigate to
`/settings/profile`. Make sure the following are defined and set properly.
   - Public Email
   - Homepage URL

#### Known Issues with GitHub.com

- Make sure your github profile has a public email set
  * Go to https://github.com/settings/profile and select an email under "Public email".
- Make sure you have admin rights on the projects before adding them,
since strider will need to create webhooks for the integration to work.
