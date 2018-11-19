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
	ping: handlers.ping,
	users: handlers.users,
	tokens: handlers.tokens,
	checks: handlers.checks
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

		chosenHandler(data, (statusCode, payload) => {
			statusCode = typeof statusCode === 'number' ? statusCode : 200;
			payload = typeof payload === 'object' ? payload : {};

			const payloadString = JSON.stringify(payload);

			res.setHeader('Content-Type', 'application/json');
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
