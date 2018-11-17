const config = require('../config');
const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};
const _users = {};
const _tokens = {};
const tokenLength = config.tokenLength;

const verifyToken = (id, phone, callback) => {
	_data.read('tokens', id, (err, tokenData) => {
		if (!err && tokenData) {
			if (tokenData.phone === phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};

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
		callback(400, { error: 'Missing required field(s).' });
	}
};

// TODO: Only let an authenticated user access his or her own user data (and no one else's).
_users.get = (data, callback) => {
	const phone =
		typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length === 10
			? data.queryStringObject.phone.trim()
			: false;

	if (phone) {
		_data.read('users', phone, (err, data) => {
			if (!err && data) {
				delete data.hashedPassword;

				callback(200, data);
			} else {
				callback(400, { error: 'Could not find the specified user.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

// TODO: Only let an authenticated user update his or her own user data (and no one else's).
_users.put = (data, callback) => {
	const phone =
		typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10
			? data.payload.phone.trim()
			: false;
	const firstName =
		typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0
			? data.payload.firstName.trim()
			: false;
	const lastName =
		typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0
			? data.payload.lastName.trim()
			: false;
	const password =
		typeof data.payload.password === 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;

	if (phone) {
		if (firstName || lastName || password) {
			_data.read('users', phone, (err, userData) => {
				if (!err && userData) {
					if (firstName) {
						userData.firstName = firstName;
					}

					if (lastName) {
						userData.lastName = lastName;
					}

					if (password) {
						const hashedPassword = helpers.hash(password);

						if (hashedPassword) {
							userData.hashedPassword = hashedPassword;
						} else {
							callback(500, { error: 'Could not hash the updated password.' });
						}
					}

					_data.update('users', phone, userData, err => {
						if (!err) {
							callback(200);
						} else {
							callback(500, { error: 'Could not update the user.' });
						}
					});
				} else {
					callback(400, { error: 'The specified user does not exist.' });
				}
			});
		} else {
			callback(400, { error: 'Missing field(s) to update.' });
		}
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

// TODO: Only let an authenticated user delete his or her own user data (and no one else's).
// TODO: Delete any other data files associated with the user to be deleted.
_users.delete = (data, callback) => {
	const phone =
		typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length === 10
			? data.queryStringObject.phone.trim()
			: false;

	if (phone) {
		_data.read('users', phone, (err, data) => {
			if (!err && data) {
				_data.delete('users', phone, err => {
					if (!err) {
						callback(200);
					} else {
						callback(500, { error: 'Could not delete the specified user.' });
					}
				});
			} else {
				callback(400, { error: 'Could not find the specified user.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

_tokens.post = (data, callback) => {
	const phone =
		typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10
			? data.payload.phone.trim()
			: false;
	const password =
		typeof data.payload.password === 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;

	if (phone && password) {
		_data.read('users', phone, (err, userData) => {
			if (!err && userData) {
				const hashedPassword = helpers.hash(password);

				if (hashedPassword) {
					if (hashedPassword === userData.hashedPassword) {
						const tokenId = helpers.createRandomString(tokenLength);
						const expires = Date.now() + 1000 * 60 * 60;
						const tokenObject = {
							phone,
							id: tokenId,
							expires
						};

						_data.create('tokens', tokenId, tokenObject, err => {
							if (!err) {
								callback(200, tokenObject);
							} else {
								callback(500, { error: 'Could not create the new token.' });
							}
						});
					} else {
						callback(400, { error: "Password did not match the specified user's stored password." });
					}
				} else {
					callback(500, { error: "Could not verify the user's password." });
				}
			} else {
				callback(400, { error: 'Could not find the specified user.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field(s).' });
	}
};

_tokens.get = (data, callback) => {
	const id =
		typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === tokenLength
			? data.queryStringObject.id.trim()
			: false;

	if (id) {
		_data.read('tokens', id, (err, tokenData) => {
			if (!err && tokenData) {
				callback(200, tokenData);
			} else {
				callback(400, { error: 'Could not find the specified token.' });
			}
		});
	} else {
		callback(400, { error: 'Missing or improperly formatted required field.' });
	}
};

_tokens.put = (data, callback) => {
	const id =
		typeof data.payload.id === 'string' && data.payload.id.trim().length === tokenLength
			? data.payload.id.trim()
			: false;
	const extend = typeof data.payload.extend === 'boolean' && data.payload.extend === true;

	if (id && extend) {
		_data.read('tokens', id, (err, tokenData) => {
			if (!err && tokenData) {
				if (tokenData.expires > Date.now()) {
					tokenData.expires = Date.now() + 1000 * 60 * 60;

					_data.update('tokens', id, tokenData, err => {
						if (!err) {
							callback(200);
						} else {
							callback(500, { error: "Could not update the token's expiration." });
						}
					});
				} else {
					callback(400, { error: 'The token has already expired and cannot be extended.' });
				}
			} else {
				callback(400, { error: 'Specified token does not exist.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field(s) or field(s) are invalid.' });
	}
};

_tokens.delete = (data, callback) => {
	const id =
		typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === tokenLength
			? data.queryStringObject.id.trim()
			: false;

	if (id) {
		_data.read('tokens', id, (err, tokenData) => {
			if (!err && tokenData) {
				_data.delete('tokens', id, err => {
					if (!err) {
						callback(200);
					} else {
						callback(500, { error: 'Could not delete the specified token.' });
					}
				});
			} else {
				callback(400, { error: 'Could not find the specified token.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

handlers.users = (data, callback) => {
	const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

	if (acceptableMethods.indexOf(data.method) > -1) {
		_users[data.method.toLowerCase()](data, callback);
	} else {
		callback(405);
	}
};

handlers.tokens = (data, callback) => {
	const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

	if (acceptableMethods.indexOf(data.method) > -1) {
		_tokens[data.method.toLowerCase()](data, callback);
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
