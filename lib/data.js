const fs = require('fs');
const path = require('path');

const helpers = require('./helpers');

const baseDir = path.join(__dirname, '/../.data/');
const lib = {};

lib.create = (dir, file, data, callback) => {
	fs.open(baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
		if (!err && fileDescriptor) {
			const stringData = JSON.stringify(data);

			fs.writeFile(fileDescriptor, stringData, err => {
				if (!err) {
					fs.close(fileDescriptor, err => {
						if (!err) {
							callback(false);
						} else {
							callback('Error closing new file.');
						}
					});
				} else {
					callback('Error writing to new file.');
				}
			});
		} else {
			callback('Could not create new file. It may already exist.');
		}
	});
};

lib.read = (dir, file, callback) => {
	fs.readFile(baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
		if (!err && data) {
			const parsedData = helpers.parseJsonToObject(data);

			callback(false, parsedData);
		} else {
			callback(err, data);
		}
	});
};

lib.update = (dir, file, data, callback) => {
	fs.open(baseDir + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
		if (!err && fileDescriptor) {
			const stringData = JSON.stringify(data);

			fs.truncate(fileDescriptor, err => {
				if (!err) {
					fs.writeFile(fileDescriptor, stringData, err => {
						if (!err) {
							fs.close(fileDescriptor, err => {
								if (!err) {
									callback(false);
								} else {
									callback('Error closing the file.');
								}
							});
						} else {
							callback('Error writing to existing file.');
						}
					});
				} else {
					callback('Error truncating file.');
				}
			});
		} else {
			callback('Could not open the file for updating. It may not exist yet.');
		}
	});
};

lib.delete = (dir, file, callback) => {
	fs.unlink(baseDir + dir + '/' + file + '.json', err => {
		if (!err) {
			callback(false);
		} else {
			callback('Error deleting the file.');
		}
	});
};

lib.list = (dir, callback) => {
	fs.readdir(`${baseDir}${dir}/`, (err, data) => {
		if (!err && data && data.length > 0) {
			const trimmedFileNames = [];

			data.forEach(fileName => {
				trimmedFileNames.push(fileName.replace('.json', ''));
			});

			callback(false, trimmedFileNames);
		} else {
			callback(err, data);
		}
	});
};

module.exports = lib;
