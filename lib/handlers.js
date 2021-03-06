const config = require('../config');
const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};
const _users = {};
const _tokens = {};
const tokenLength = config.tokenLength;
const _checks = {};

/*
 * JSON API Handlers
 *
 */

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
		typeof data.payload.phone === 'string' && data.payload.phone.trim().length === config.phoneNumberLength
			? data.payload.phone.trim()
			: false;
	const password =
		typeof data.payload.password === 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;
	const tosAgreement = typeof data.payload.tosAgreement === 'boolean' && data.payload.tosAgreement === true;

	if (firstName && lastName && phone && password && tosAgreement) {
		_data.read('users', phone, (err, data) => {
			if (err && !data) {
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

_users.get = (data, callback) => {
	const phone =
		typeof data.queryStringObject.phone === 'string' &&
		data.queryStringObject.phone.trim().length === config.phoneNumberLength
			? data.queryStringObject.phone.trim()
			: false;

	if (phone) {
		const token =
			typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
				? data.headers.token.trim()
				: false;

		verifyToken(token, phone, tokenIsValid => {
			if (tokenIsValid) {
				_data.read('users', phone, (err, data) => {
					if (!err && data) {
						delete data.hashedPassword;

						callback(200, data);
					} else {
						callback(400, { error: 'Could not find the specified user.' });
					}
				});
			} else {
				callback(403, { error: 'Missing required token in header or token is invalid.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

_users.put = (data, callback) => {
	const phone =
		typeof data.payload.phone === 'string' && data.payload.phone.trim().length === config.phoneNumberLength
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
			const token =
				typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
					? data.headers.token.trim()
					: false;

			verifyToken(token, phone, tokenIsValid => {
				if (tokenIsValid) {
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
					callback(403, { error: 'Missing required token in header or token is invalid.' });
				}
			});
		} else {
			callback(400, { error: 'Missing field(s) to update.' });
		}
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

_users.delete = (data, callback) => {
	const phone =
		typeof data.queryStringObject.phone === 'string' &&
		data.queryStringObject.phone.trim().length === config.phoneNumberLength
			? data.queryStringObject.phone.trim()
			: false;

	if (phone) {
		const token =
			typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
				? data.headers.token.trim()
				: false;

		verifyToken(token, phone, tokenIsValid => {
			if (tokenIsValid) {
				_data.read('users', phone, (err, data) => {
					if (!err && data) {
						_data.delete('users', phone, err => {
							if (!err) {
								const userChecks =
									typeof data.checks === 'object' && data.checks instanceof Array ? data.checks : [];
								const checksToDelete = userChecks.length;

								if (checksToDelete > 0) {
									let checksDeleted = 0;
									let deletionErrors = false;

									userChecks.forEach(checkId => {
										_data.delete('checks', checkId, err => {
											if (err) {
												deletionErrors = true;
											}

											checksDeleted++;

											if (checksDeleted === checksToDelete) {
												if (!deletionErrors) {
													callback(200);
												} else {
													callback(500, { error: "Error deleting the user's checks." });
												}
											}
										});
									});
								} else {
									callback(200);
								}
							} else {
								callback(500, { error: 'Could not delete the specified user.' });
							}
						});
					} else {
						callback(400, { error: 'Could not find the specified user.' });
					}
				});
			} else {
				callback(403, { error: 'Missing required token in header or token is invalid.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

_tokens.post = (data, callback) => {
	const phone =
		typeof data.payload.phone === 'string' && data.payload.phone.trim().length === config.phoneNumberLength
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

_checks.post = (data, callback) => {
	const protocol =
		typeof data.payload.protocol === 'string' &&
		['http', 'https'].indexOf(data.payload.protocol.trim().toLowerCase()) > -1
			? data.payload.protocol.trim()
			: false;
	const url =
		typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	const method =
		typeof data.payload.method === 'string' &&
		['POST', 'GET', 'PUT', 'DELETE'].indexOf(data.payload.method.trim().toUpperCase()) > -1
			? data.payload.method.trim().toUpperCase()
			: false;
	const successCodes =
		typeof data.payload.successCodes === 'object' &&
		data.payload.successCodes instanceof Array &&
		data.payload.successCodes.length > 0
			? data.payload.successCodes
			: false;
	const timeoutSeconds =
		typeof data.payload.timeoutSeconds === 'number' &&
		data.payload.timeoutSeconds % 1 === 0 &&
		data.payload.timeoutSeconds >= 1 &&
		data.payload.timeoutSeconds <= 5
			? data.payload.timeoutSeconds
			: false;

	if (protocol && url && method && successCodes && timeoutSeconds) {
		const token =
			typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
				? data.headers.token.trim()
				: false;

		_data.read('tokens', token, (err, tokenData) => {
			if (!err && tokenData) {
				const userPhone = tokenData.phone;

				_data.read('users', userPhone, (err, userData) => {
					if (!err && userData) {
						const userChecks =
							typeof userData.checks === 'object' && userData.checks instanceof Array
								? userData.checks
								: [];

						if (userChecks.length < config.maxChecks) {
							const checkId = helpers.createRandomString(config.checkIdLength);
							const checkObject = {
								id: checkId,
								userPhone,
								protocol,
								url,
								method,
								successCodes,
								timeoutSeconds
							};

							_data.create('checks', checkId, checkObject, err => {
								if (!err) {
									userData.checks = userChecks;
									userData.checks.push(checkId);

									_data.update('users', userPhone, userData, err => {
										if (!err) {
											callback(200, checkObject);
										} else {
											callback(500, { error: 'Could not update the user with the new check.' });
										}
									});
								} else {
									callback(500, { error: 'Could not create the new check.' });
								}
							});
						} else {
							callback(400, {
								error: `The user already has the maximum number of checks (${config.maxChecks}).`
							});
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403, { error: 'Missing required token in header or token is invalid.' });
			}
		});
	} else {
		callback(400, { error: 'Missing required field(s) or field(s) are invalid.' });
	}
};

_checks.get = (data, callback) => {
	const id =
		typeof data.queryStringObject.id === 'string' &&
		data.queryStringObject.id.trim().length === config.checkIdLength
			? data.queryStringObject.id.trim()
			: false;

	if (id) {
		_data.read('checks', id, (err, checkData) => {
			if (!err && checkData) {
				const token =
					typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
						? data.headers.token.trim()
						: false;

				verifyToken(token, checkData.userPhone, tokenIsValid => {
					if (tokenIsValid) {
						callback(200, checkData);
					} else {
						callback(403, { error: 'Missing required token in header or token is invalid.' });
					}
				});
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

_checks.put = (data, callback) => {
	const id =
		typeof data.payload.id === 'string' && data.payload.id.trim().length === config.checkIdLength
			? data.payload.id.trim()
			: false;
	const protocol =
		typeof data.payload.protocol === 'string' &&
		['http', 'https'].indexOf(data.payload.protocol.trim().toLowerCase()) > -1
			? data.payload.protocol.trim()
			: false;
	const url =
		typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	const method =
		typeof data.payload.method === 'string' &&
		['POST', 'GET', 'PUT', 'DELETE'].indexOf(data.payload.method.trim().toUpperCase()) > -1
			? data.payload.method.trim().toUpperCase()
			: false;
	const successCodes =
		typeof data.payload.successCodes === 'object' &&
		data.payload.successCodes instanceof Array &&
		data.payload.successCodes.length > 0
			? data.payload.successCodes
			: false;
	const timeoutSeconds =
		typeof data.payload.timeoutSeconds === 'number' &&
		data.payload.timeoutSeconds % 1 === 0 &&
		data.payload.timeoutSeconds >= 1 &&
		data.payload.timeoutSeconds <= 5
			? data.payload.timeoutSeconds
			: false;

	if (id) {
		if (protocol || url || method || successCodes || timeoutSeconds) {
			_data.read('checks', id, (err, checkData) => {
				if (!err && checkData) {
					const token =
						typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
							? data.headers.token.trim()
							: false;

					verifyToken(token, checkData.userPhone, tokenIsValid => {
						if (tokenIsValid) {
							if (protocol) {
								checkData.protocol = protocol;
							}

							if (url) {
								checkData.url = url;
							}

							if (method) {
								checkData.method = method;
							}

							if (successCodes) {
								checkData.successCodes = successCodes;
							}

							if (timeoutSeconds) {
								checkData.timeoutSeconds = timeoutSeconds;
							}

							_data.update('checks', id, checkData, err => {
								if (!err) {
									callback(200);
								} else {
									callback(500, { error: 'Could not update the check.' });
								}
							});
						} else {
							callback(403, { error: 'Missing required token in header or token is invalid.' });
						}
					});
				} else {
					callback(404);
				}
			});
		} else {
			callback(400, { error: 'Missing field(s) to update.' });
		}
	} else {
		callback(400, { error: 'Missing required field.' });
	}
};

_checks.delete = (data, callback) => {
	const id =
		typeof data.queryStringObject.id === 'string' &&
		data.queryStringObject.id.trim().length === config.checkIdLength
			? data.queryStringObject.id.trim()
			: false;

	if (id) {
		_data.read('checks', id, (err, checkData) => {
			if (!err && checkData) {
				const token =
					typeof data.headers.token === 'string' && data.headers.token.trim().length === tokenLength
						? data.headers.token.trim()
						: false;

				verifyToken(token, checkData.userPhone, tokenIsValid => {
					if (tokenIsValid) {
						_data.delete('checks', id, err => {
							if (!err) {
								_data.read('users', checkData.userPhone, (err, userData) => {
									if (!err && userData) {
										const userChecks =
											typeof userData.checks === 'object' && userData.checks instanceof Array
												? userData.checks
												: [];
										const checkPosition = userChecks.indexOf(id);

										if (checkPosition > -1) {
											userChecks.splice(checkPosition, 1);
											userData.checks = userChecks;

											_data.update('users', userData.phone, userData, err => {
												if (!err) {
													callback(200);
												} else {
													callback(500, {
														error: "Could not update the user's data to remove the check."
													});
												}
											});
										} else {
											callback(500, { error: "Could not locate the check on the user's data." });
										}
									} else {
										callback(500, { error: 'Could not find the user to remove the check.' });
									}
								});
							} else {
								callback(500, { error: 'Could not delete the check.' });
							}
						});
					} else {
						callback(403, { error: 'Missing required token in header or token is invalid.' });
					}
				});
			} else {
				callback(404);
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

handlers.checks = (data, callback) => {
	const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

	if (acceptableMethods.indexOf(data.method) > -1) {
		_checks[data.method.toLowerCase()](data, callback);
	} else {
		callback(405);
	}
};

/*
 * Miscellaneous Handlers
 *
 */

handlers.ping = (data, callback) => {
	callback(200);
};

handlers.notFound = (data, callback) => {
	callback(404);
};

/*
 * HTML Handlers
 *
 */

handlers.favicon = (data, callback) => {
	if (data.method === 'GET') {
		helpers.getStaticAsset('favicon.ico', (err, data) => {
			if (!err && data) {
				callback(200, data, 'favicon');
			} else {
				callback(500);
			}
		});
	} else {
		callback(405);
	}
};

handlers.public = (data, callback) => {
	if (data.method === 'GET') {
		const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();

		if (trimmedAssetName.length > 0) {
			helpers.getStaticAsset(trimmedAssetName, (err, data) => {
				if (!err && data) {
					let contentType = 'plain';

					if (trimmedAssetName.indexOf('.css') > -1) {
						contentType = 'css';
					}

					if (trimmedAssetName.indexOf('.png') > -1) {
						contentType = 'png';
					}

					if (trimmedAssetName.indexOf('.jpg') > -1) {
						contentType = 'jpg';
					}

					if (trimmedAssetName.indexOf('.ico') > -1) {
						contentType = 'favicon';
					}

					callback(200, data, contentType);
				} else {
					callback(404);
				}
			});
		} else {
			callback(404);
		}
	} else {
		callback(405);
	}
};

handlers.index = (data, callback) => {
	if (data.method === 'GET') {
		const templateData = {
			'head.title': 'Welcome!',
			'head.description':
				'This application allows users to register and create checks to track server uptime status.',
			'body.title': 'Welcome to Uptime Checker!',
			'body.class': 'index'
		};

		helpers.getTemplate('index', templateData, (err, str) => {
			if (!err && str) {
				helpers.addUniversalTemplates(str, templateData, (err, str) => {
					if (!err && str) {
						callback(200, str, 'html');
					} else {
						callback(500, undefined, 'html');
					}
				});
			} else {
				callback(500, undefined, 'html');
			}
		});
	} else {
		callback(405, undefined, 'html');
	}
};

handlers.accountCreate = () => {};

handlers.accountEdit = () => {};

handlers.accountDeleted = () => {};

handlers.sessionCreate = () => {};

handlers.sessionDeleted = () => {};

handlers.checksList = () => {};

handlers.checksCreate = () => {};

handlers.checksEdit = () => {};

module.exports = handlers;
