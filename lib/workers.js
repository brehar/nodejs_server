const https = require('https');
const http = require('http');
const url = require('url');

const config = require('../config');
const helpers = require('./helpers');
const _data = require('./data');

const alertUserToStatusChange = newCheckData => {
	const msg = `Alert: Your check for ${newCheckData.method} ${newCheckData.protocol}://${
		newCheckData.url
	} resulted in a status change. The server is now ${newCheckData.state}.`;

	helpers.sendTwilioSMS(newCheckData.userPhone, msg, err => {
		if (err) {
			console.log(
				`Unable to send text message to ${
					newCheckData.userPhone
				} regarding a status change on the check with ID ${newCheckData.id}. Error: ${err}`
			);
		}
	});
};

const processCheckOutcome = (originalCheckData, checkOutcome) => {
	const state =
		!checkOutcome.error &&
		checkOutcome.responseCode &&
		originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
			? 'up'
			: 'down';
	const alertWarranted = !!(originalCheckData.lastChecked && originalCheckData.state !== state);
	const newCheckData = Object.assign({}, originalCheckData);

	newCheckData.state = state;
	newCheckData.lastChecked = Date.now();

	_data.update('checks', newCheckData.id, newCheckData, err => {
		if (!err) {
			if (alertWarranted) {
				alertUserToStatusChange(newCheckData);
			}
		} else {
			console.log(`Error trying to save updates to check with ID ${newCheckData.id}.`);
		}
	});
};

const performCheck = originalCheckData => {
	let checkOutcome = {
		error: false,
		responseCode: false
	};
	let outcomeSent = false;

	const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
	const hostName = parsedUrl.hostname;
	const path = parsedUrl.path;
	const requestDetails = {
		protocol: `${originalCheckData.protocol}:`,
		hostname: hostName,
		method: originalCheckData.method,
		path,
		timeout: originalCheckData.timeoutSeconds * 1000
	};
	const moduleToUse = originalCheckData.protocol === 'http' ? http : https;
	const req = moduleToUse.request(requestDetails, res => {
		checkOutcome.responseCode = res.statusCode;

		if (!outcomeSent) {
			processCheckOutcome(originalCheckData, checkOutcome);

			outcomeSent = true;
		}
	});

	req.on('error', e => {
		checkOutcome.error = {
			error: true,
			value: e
		};

		if (!outcomeSent) {
			processCheckOutcome(originalCheckData, checkOutcome);

			outcomeSent = true;
		}
	});

	req.on('timeout', e => {
		checkOutcome.error = {
			error: true,
			value: 'timeout'
		};

		if (!outcomeSent) {
			processCheckOutcome(originalCheckData, checkOutcome);

			outcomeSent = true;
		}
	});

	req.end();
};

const validateCheckData = originalCheckData => {
	originalCheckData = typeof originalCheckData === 'object' && originalCheckData !== null ? originalCheckData : {};
	originalCheckData.id =
		typeof originalCheckData.id === 'string' && originalCheckData.id.trim().length === config.checkIdLength
			? originalCheckData.id.trim()
			: false;
	originalCheckData.userPhone =
		typeof originalCheckData.userPhone === 'string' &&
		originalCheckData.userPhone.trim().length === config.phoneNumberLength
			? originalCheckData.userPhone.trim()
			: false;
	originalCheckData.protocol =
		typeof originalCheckData.protocol === 'string' &&
		['http', 'https'].indexOf(originalCheckData.protocol.trim().toLowerCase()) > -1
			? originalCheckData.protocol.trim()
			: false;
	originalCheckData.url =
		typeof originalCheckData.url === 'string' && originalCheckData.url.trim().length > 0
			? originalCheckData.url.trim()
			: false;
	originalCheckData.method =
		typeof originalCheckData.method === 'string' &&
		['POST', 'GET', 'PUT', 'DELETE'].indexOf(originalCheckData.method.trim().toUpperCase()) > -1
			? originalCheckData.method.trim().toUpperCase()
			: false;
	originalCheckData.successCodes =
		typeof originalCheckData.successCodes === 'object' &&
		originalCheckData.successCodes instanceof Array &&
		originalCheckData.successCodes.length > 0
			? originalCheckData.successCodes
			: false;
	originalCheckData.timeoutSeconds =
		typeof originalCheckData.timeoutSeconds === 'number' &&
		originalCheckData.timeoutSeconds % 1 === 0 &&
		originalCheckData.timeoutSeconds >= 1 &&
		originalCheckData.timeoutSeconds <= 5
			? originalCheckData.timeoutSeconds
			: false;
	originalCheckData.state =
		typeof originalCheckData.state === 'string' &&
		['up', 'down'].indexOf(originalCheckData.state.trim().toLowerCase()) > -1
			? originalCheckData.state.trim()
			: 'down';
	originalCheckData.lastChecked =
		typeof originalCheckData.lastChecked === 'number' &&
		originalCheckData.lastChecked % 1 === 0 &&
		originalCheckData.lastChecked > 0
			? originalCheckData.lastChecked
			: false;

	if (
		originalCheckData.id &&
		originalCheckData.userPhone &&
		originalCheckData.protocol &&
		originalCheckData.url &&
		originalCheckData.method &&
		originalCheckData.successCodes &&
		originalCheckData.timeoutSeconds
	) {
		performCheck(originalCheckData);
	} else {
		console.log(`Error: Check with ID ${originalCheckData.id} is not properly formatted. Skipping.`);
	}
};

const gatherAllChecks = () => {
	_data.list('checks', (err, checks) => {
		if (!err && checks && checks.length > 0) {
			checks.forEach(check => {
				_data.read('checks', check, (err, originalCheckData) => {
					if (!err && originalCheckData) {
						validateCheckData(originalCheckData);
					} else {
						console.log(`Error reading data for check ${check}: ${err}`);
					}
				});
			});
		} else {
			console.log(`Error finding checks to process: ${err}`);
		}
	});
};

const loop = () => {
	setInterval(() => {
		gatherAllChecks();
	}, 1000 * 60);
};

const workers = {};

workers.init = () => {
	gatherAllChecks();
	loop();
};

module.exports = workers;
