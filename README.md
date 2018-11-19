# NodeJS Server (No Dependencies!)
A complete web server written in NodeJS without any dependencies whatsoever.

This will run a complete NodeJS webserver (both HTTP and HTTPS), and it is implemented without using any dependencies (NPM or otherwise) whatsoever. The server provides the following additional functionalities via its API:
* Users (all CRUD functionalities)
* Token generation (all CRUD functionalities)
* Check generation (all CRUD functionalities)

Users can generate "checks," which are tasks that will be performed by the app. Specifically, the app will, every minute, determine whether the server specified in the check is currently "up" or "down." If there is a change in status, the app will use Twilio to send an SMS to the user notifying him or her of the change.

Moreover, the server comes with the following additional features:
* Automatic generation of logs, which detail all data relevant to the uptime checking functionality.
* Automatic rotation of logs on a daily basis (including zipping them).

## Configuration
### Required Folders
For the application to work, you must (in the root directory, alongside `index.js`) create three folders:
1. `https`, containing your `key.pem` and `cert.pem`.
2. `.data`, containing three empty folders: `users`, `checks`, and `tokens`.
3. `.logs`, an empty folder to hold the automatically generated server logs.

### Environment Variables
You will also need to create (again, in the root directory, alongside `index.js`) a file called `config.js`. Include the following code, replacing the configuration variables with your own information as appropriate:
```
const environments = {};

environments.staging = {
        httpPort: 3000,
        httpsPort: 3001,
        envName: 'staging',
        hashingSecret: 'thisIsASecret',
        tokenLength: 20,
        maxChecks: 5,
        checkIdLength: 20,
        phoneNumberLength: 10,
        twilio: {
                maxCharsSMS: 1600,
                apiVersion: '2010-04-01',
                fromPhone: '+1[YOUR_TWILIO_NUMBER]',
                toCountryCode: '+1',
                accountSID: '[YOUR_TWILIO_TEST_ACCOUNT_SID]',
                authToken: '[YOUR_TWILIO_TEST_AUTH_TOKEN]'
        }
};

environments.production = {
        httpPort: process.env.PORT,
        httpsPort: process.env.PORT,
        envName: 'production',
        hashingSecret: 'thisIsAlsoASecret',
        tokenLength: 20,
        maxChecks: 5,
        checkIdLength: 20,
        phoneNumberLength: 10,
        twilio: {
                maxCharsSMS: 1600,
                apiVersion: '2010-04-01',
                fromPhone: '+1[YOUR_TWILIO_NUMBER]',
                toCountryCode: '+1',
                accountSID: '[YOUR_TWILIO_LIVE_ACCOUNT_SID]',
                authToken: '[YOUR_TWILIO_LIVE_AUTH_TOKEN]'
        }
};

const currentEnvironment = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const environmentToExport = typeof environments[currentEnvironment] === 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;

```

You may, of course, specify additional environments as needed.

## Running the Server
You can run the server in default (staging) mode simply by executing:

    $ node index.js

To specify a different environment, use the `NODE_ENV` environment variable. For example:

    $ NODE_ENV=production node index.js

### Console Logging Enhancements
This app is set to use NodeJS's built-in `util` module. By default, `workers.js` and `server.js` will not output any logging to the console (other than an initialization message). To enable additional logging, start the server with the command:

    $ NODE_DEBUG=workers node index.js

or:

    $ NODE_DEBUG=server node index.js
