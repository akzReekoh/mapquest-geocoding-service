'use strict';

const API_KEY = 'R29vpSI7eqPNB5lnclL6Wk51Q7oq7xYl';

var cp       = require('child_process'),
	should   = require('should'),
	isNumber = require('lodash.isnumber'),
	service;

describe('MapQuest Forward Geocoding Service', function () {
	this.slow(8000);

	after('terminate child process', function () {
		service.send({
			type: 'close'
		});

		setTimeout(function () {
			service.kill('SIGKILL');
		}, 3000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			should.ok(service = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 8 seconds', function (done) {
			this.timeout(8000);

			service.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			service.send({
				type: 'ready',
				data: {
					options: {
						apikey: API_KEY,
						geocoding_type: 'Forward'
					}
				}
			}, function (error) {
				should.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the address and send back the valid latitude and longitude coordinates', function (done) {
			this.timeout(4000);
			var requestId = (new Date()).getTime().toString();

			service.on('message', function (message) {
				if (message.type === 'result') {
					var data = JSON.parse(message.data);

					should.ok(isNumber(data.lat), 'Latitude data invalid.');
					should.ok(isNumber(data.lng), 'Longitude data invalid.');
					should.equal(message.requestId, requestId);
					done();
				}
			});

			service.send({
				type: 'data',
				requestId: requestId,
				data: {
					address: '10 Jupiter St, Bel-Air, Makati, PH 1209'
				}
			}, function (error) {
				should.ifError(error);
			});
		});
	});
});