const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};
const _users = {};

_users.post = (data, callback) => {
	const firstName =
		typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0
			? data.payload.firstName.trim()
			: false;
	const lastName =
		typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0
			? data.payload.lastName.trim()
			: false;
	const phone =
		typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10
			? data.payload.phone.trim()
			: false;
	const password =
		typeof data.payload.password === 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;
	const tosAgreement = typeof data.payload.tosAgreement === 'boolean' && data.payload.tosAgreement === true;

	if (firstName && lastName && phone && password && tosAgreement) {
		_data.read('users', phone, (err, data) => {
			if (err) {
				const hashedPassword = helpers.hash(password);
				const userObject = {
					firstName,
					lastName,
					phone,
					hashedPassword,
					tosAgreement
				};

				if (hashedPassword) {
					_data.create('users', phone, userObject, err => {
						if (!err) {
							callback(200);
						} else {
							callback(500, { error: 'Could not create the new user.' });
						}
					});
				} else {
					callback(500, { error: "Could not hash the user's password." });
				}
			} else {
				callback(400, { error: 'A user with that phone number already exists.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required fields.' });
	}
};

_users.get = (data, callback) => {
	//
};

_users.put = (data, callback) => {
	//
};

_users.delete = (data, callback) => {
	//
};

handlers.users = (data, callback) => {
	const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

	if (acceptableMethods.indexOf(data.method) > -1) {
		_users[data.method.toLowerCase()](data, callback);
	} else {
		callback(405);
	}
};

handlers.ping = (data, callback) => {
	callback(200);
};

handlers.notFound = (data, callback) => {
	callback(404);
};

module.exports = handlers;
