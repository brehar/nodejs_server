const crypto = require('crypto');

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

module.exports = helpers;
