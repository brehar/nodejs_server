const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');
const util = require('util');

const config = require('../config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const debug = util.debuglog('server');

const router = {
	'': handlers.index,
	'account/create': handlers.accountCreate,
	'account/edit': handlers.accountEdit,
	'account/deleted': handlers.accountDeleted,
	'session/create': handlers.sessionCreate,
	'session/deleted': handlers.sessionDeleted,
	'checks/all': handlers.checksList,
	'checks/create': handlers.checksCreate,
	'checks/edit': handlers.checksEdit,
	ping: handlers.ping,
	'api/users': handlers.users,
	'api/tokens': handlers.tokens,
	'api/checks': handlers.checks
};

const unifiedServer = (req, res) => {
	const parsedUrl = url.parse(req.url, true);
	const path = parsedUrl.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g, '');
	const queryStringObject = parsedUrl.query;
	const method = req.method.toUpperCase();
	const headers = req.headers;
	const decoder = new StringDecoder('utf-8');

	let buffer = '';

	req.on('data', data => {
		buffer += decoder.write(data);
	});

	req.on('end', () => {
		buffer += decoder.end();

		const chosenHandler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;
		const data = {
			trimmedPath,
			queryStringObject,
			method,
			headers,
			payload: helpers.parseJsonToObject(buffer)
		};

		chosenHandler(data, (statusCode, payload, contentType) => {
			statusCode = typeof statusCode === 'number' ? statusCode : 200;
			contentType = typeof contentType === 'string' ? contentType : 'json';

			let payloadString = '';

			if (contentType === 'json') {
				res.setHeader('Content-Type', 'application/json');

				payload = typeof payload === 'object' ? payload : {};
				payloadString = JSON.stringify(payload);
			}

			if (contentType === 'html') {
				res.setHeader('Content-Type', 'text/html');

				payloadString = typeof payload === 'string' ? payload : '';
			}

			res.writeHead(statusCode);
			res.end(payloadString);

			if (statusCode === 200) {
				debug('\x1b[32m%s\x1b[0m', `${method} /${trimmedPath} ${statusCode}`);
			} else {
				debug('\x1b[31m%s\x1b[0m', `${method} /${trimmedPath} ${statusCode}`);
			}
		});
	});
};

const httpServer = http.createServer((req, res) => {
	unifiedServer(req, res);
});

const httpsServerOptions = {
	key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
	unifiedServer(req, res);
});

const server = {};

server.init = () => {
	httpServer.listen(config.httpPort, () => {
		console.log(
			'\x1b[36m%s\x1b[0m',
			`HTTP server listening on port ${config.httpPort} in ${config.envName} mode...`
		);
	});

	httpsServer.listen(config.httpsPort, () => {
		console.log(
			'\x1b[35m%s\x1b[0m',
			`HTTPS server listening on port ${config.httpsPort} in ${config.envName} mode...`
		);
	});
};

module.exports = server;
