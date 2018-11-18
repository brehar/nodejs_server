const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');

const config = require('../config');

const helpers = {};

helpers.hash = str => {
	if (typeof str === 'string' && str.length > 0) {
		return crypto
			.createHmac('sha256', config.hashingSecret)
			.update(str)
			.digest('hex');
	} else {
		return false;
	}
};

helpers.parseJsonToObject = str => {
	try {
		return JSON.parse(str);
	} catch (e) {
		return {};
	}
};

helpers.createRandomString = strLength => {
	strLength = typeof strLength === 'number' && strLength > 0 ? strLength : false;

	if (strLength) {
		const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

		let str = '';

		for (let i = 0; i < strLength; i++) {
			str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
		}

		return str;
	} else {
		return false;
	}
};

helpers.sendTwilioSMS = (phone, msg, callback) => {
	phone = typeof phone === 'string' && phone.trim().length === config.phoneNumberLength ? phone.trim() : false;
	msg =
		typeof msg === 'string' && msg.trim().length > 0 && msg.trim().length <= config.twilio.maxCharsSMS
			? msg.trim()
			: false;

	if (phone && msg) {
		const payload = {
			From: config.twilio.fromPhone,
			To: `${config.twilio.toCountryCode}${phone}`,
			Body: msg
		};
		const payloadString = querystring.stringify(payload);
		const requestDetails = {
			protocol: 'https:',
			hostname: 'api.twilio.com',
			method: 'POST',
			path: `/${config.twilio.apiVersion}/Accounts/${config.twilio.accountSID}/Messages.json`,
			auth: `${config.twilio.accountSID}:${config.twilio.authToken}`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(payloadString)
			}
		};
		const req = https.request(requestDetails, res => {
			const status = res.statusCode;

			if (status === 200 || status === 201) {
				callback(false);
			} else {
				callback(`Error: Twilio returned status code ${status}.`);
			}
		});

		req.on('error', e => {
			callback(e);
		});

		req.write(payloadString);
		req.end();
	} else {
		callback('Missing required parameters or provided parameters are invalid.');
	}
};

module.exports = helpers;
