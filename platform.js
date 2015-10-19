'use strict';

var isJSON       = require('is-json'),
	inherits     = require('util').inherits,
	EventEmitter = require('events').EventEmitter;

/**
 * Utility function to validate String Objects
 * @param val The value to be evaluated.
 * @returns {boolean}
 */
var isString = function (val) {
	return typeof val === 'string' || ((!!val && typeof val === 'object') && Object.prototype.toString.call(val) === '[object String]');
};

/**
 * Utility function to validate Error Objects
 * @param val The value to be evaluated.
 * @returns {boolean}
 */
var isError = function (val) {
	return (!!val && typeof val === 'object') && typeof val.message === 'string' && Object.prototype.toString.call(val) === '[object Error]';
};

/**
 * Main object used to communicate with the platform.
 * @returns {Platform}
 * @constructor
 */
function Platform() {
	if (!(this instanceof Platform)) return new Platform();

	var self = this;

	process.on('uncaughtException', function (error) {
		self.handleException(error);
		process.exit(1);
	});

	EventEmitter.call(this);
	Platform.init.call(this);
}

inherits(Platform, EventEmitter);

/**
 * Init function for Platform.
 */
Platform.init = function () {
	var self = this;

	process.on('message', function (m) {
		if (m.type === 'ready')
			self.emit('ready', m.data.options);
		else if (m.type === 'data')
			self.emit('data', m.data);
	});
};

/**
 * Needs to be called once in order to notify the platform that the plugin has already finished the init process.
 * @param {function} [callback] Optional callback to be called once the ready signal has been sent.
 */
Platform.prototype.notifyReady = function (callback) {
	callback = callback || function () {
		};

	setImmediate(function () {
		process.send({
			type: 'ready'
		}, callback);
	});
};

/**
 * Send the result of the web service or API call back to the platform to transform the data.
 * @param {string} result The result of the web service or API call
 * @param callback
 */
Platform.prototype.sendResult = function (result, callback) {
	callback = callback || function () {
		};

	setImmediate(function () {
		if (result === null || result === undefined) result = '{}';
		if (!isString(result) || !isJSON(result)) return callback(new Error('A valid JSON String is required as result.'));

		process.send({
			type: 'result',
			data: result
		}, callback);
	});
};

/**
 * Logs any data to the attached loggers in the topology.
 * @param {string} data The data that needs to be logged.
 * @param {function} callback Optional callback to be called once the data has been sent.
 */
Platform.prototype.log = function (data, callback) {
	callback = callback || function () {
		};

	setImmediate(function () {
		if (!data || !isString(data)) return callback(new Error('A valid log data is required.'));

		process.send({
			type: 'log',
			data: data
		}, callback);
	});
};

/**
 * Logs errors to all the attached exception handlers in the topology.
 * @param {error} error The error to be handled/logged
 * @param {function} callback Optional callback to be called once the error has been sent.
 */
Platform.prototype.handleException = function (error, callback) {
	callback = callback || function () {
		};

	setImmediate(function () {
		if (!isError(error)) return callback(new Error('A valid error object is required.'));

		process.send({
			type: 'error',
			data: {
				name: error.name,
				message: error.message,
				stack: error.stack
			}
		}, callback);
	});
};

module.exports = new Platform();