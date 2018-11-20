const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const path = require('path');
const fs = require('fs');

const config = require('../config');
const globals = require('../globals');

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

const interpolate = (str, data) => {
	str = typeof str === 'string' && str.length > 0 ? str : '';
	data = typeof data === 'object' && data !== null ? data : {};

	for (let keyName in globals) {
		if (globals.hasOwnProperty(keyName)) {
			data[`global.${keyName}`] = globals[keyName];
		}
	}

	for (let key in data) {
		if (data.hasOwnProperty(key) && typeof data[key] === 'string') {
			const replace = data[key];
			const find = `{${key}}`;

			str = str.replace(find, replace);
		}
	}

	return str;
};

helpers.getTemplate = (templateName, data, callback) => {
	templateName = typeof templateName === 'string' && templateName.length > 0 ? templateName : false;
	data = typeof data === 'object' && data !== null ? data : {};

	if (templateName) {
		const templatesDir = path.join(__dirname, '/../templates/');

		fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', (err, str) => {
			if (!err && str && str.length > 0) {
				const finalString = interpolate(str, data);

				callback(false, finalString);
			} else {
				callback('No template could be found.');
			}
		});
	} else {
		callback('A valid template name was not specified.');
	}
};

helpers.addUniversalTemplates = (str, data, callback) => {
	str = typeof str === 'string' && str.length > 0 ? str : '';
	data = typeof data === 'object' && data !== null ? data : {};

	helpers.getTemplate('_header', data, (err, headerString) => {
		if (!err && headerString) {
			helpers.getTemplate('_footer', data, (err, footerString) => {
				if (!err && footerString) {
					const fullString = `${headerString}${str}${footerString}`;

					callback(false, fullString);
				} else {
					callback('Could not find the footer template.');
				}
			});
		} else {
			callback('Could not find the header template.');
		}
	});
};

helpers.getStaticAsset = (fileName, callback) => {
	fileName = typeof fileName === 'string' && fileName.length > 0 ? fileName : false;

	if (fileName) {
		const publicDir = path.join(__dirname, '/../public/');

		fs.readFile(`${publicDir}${fileName}`, (err, data) => {
			if (!err && data) {
				callback(false, data);
			} else {
				callback('No file could be found.');
			}
		});
	} else {
		callback('A valid file name was not specified.');
	}
};

module.exports = helpers;
