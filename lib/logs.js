const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const baseDir = path.join(__dirname, '/../.logs/');
const lib = {};

lib.append = (file, str, callback) => {
	fs.open(`${baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
		if (!err && fileDescriptor) {
			fs.appendFile(fileDescriptor, `${str}\n`, err => {
				if (!err) {
					fs.close(fileDescriptor, err => {
						if (!err) {
							callback(false);
						} else {
							callback(`Error closing file that was being appended to: ${err}`);
						}
					});
				} else {
					callback(`Error appending to file: ${err}`);
				}
			});
		} else {
			callback(`Could not open file for appending: ${err}`);
		}
	});
};

lib.list = (includeCompressedLogs, callback) => {
	fs.readdir(baseDir, (err, data) => {
		if (!err && data && data.length > 0) {
			let trimmedFileNames = [];

			data.forEach(fileName => {
				if (fileName.indexOf('.log') > -1) {
					trimmedFileNames.push(fileName.replace('.log', ''));
				}

				if (includeCompressedLogs && fileName.indexOf('.gz.b64') > -1) {
					trimmedFileNames.push(fileName.replace('.gz.b64', ''));
				}
			});

			callback(false, trimmedFileNames);
		} else {
			callback(err, data);
		}
	});
};

lib.compress = (logId, newFileId, callback) => {
	const sourceFile = `${logId}.log`;
	const destinationFile = `${newFileId}.gz.b64`;

	fs.readFile(`${baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
		if (!err && inputString) {
			zlib.gzip(inputString, (err, buffer) => {
				if (!err && buffer) {
					fs.open(`${baseDir}${destinationFile}`, 'wx', (err, fileDescriptor) => {
						if (!err && fileDescriptor) {
							fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
								if (!err) {
									fs.close(fileDescriptor, err => {
										if (!err) {
											callback(false);
										} else {
											callback(err);
										}
									});
								} else {
									callback(err);
								}
							});
						} else {
							callback(err);
						}
					});
				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
};

lib.decompress = (fileId, callback) => {
	const fileName = `${fileId}.gz.b64`;

	fs.readFile(`${baseDir}${fileName}`, 'utf8', (err, str) => {
		if (!err && str) {
			const inputBuffer = Buffer.from(str, 'base64');

			zlib.unzip(inputBuffer, (err, outputBuffer) => {
				if (!err && outputBuffer) {
					const str = outputBuffer.toString();

					callback(false, str);
				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
};

lib.truncate = (logId, callback) => {
	fs.truncate(`${baseDir}${logId}.log`, 0, err => {
		if (!err) {
			callback(false);
		} else {
			callback(err);
		}
	});
};

module.exports = lib;
