'use strict';

const MAPQUEST_GEOCODE_URL         = 'https://www.mapquestapi.com/geocoding/v1/address',
	  MAPQUEST_REVERSE_GEOCODE_URL = 'https://www.mapquestapi.com/geocoding/v1/reverse';

var _        = require('lodash'),
	config   = require('./config.json'),
	request  = require('request'),
	platform = require('./platform'),
	apikey, geocodingType;

var _handleException = function (error) {
	console.error(error);
	platform.handleException(error);
	platform.sendResult(null);
};

/*
 * Listen for the data event.
 */
platform.on('data', function (data) {
	if (geocodingType === 'Forward') {
		if (!_.isString(data.address)) return _handleException(new Error('Invalid address.'));

		request.get({
			url: MAPQUEST_GEOCODE_URL,
			qs: {
				key: apikey,
				location: data.address
			}
		}, function (reqError, response, body) {
			if (reqError)
				_handleException(reqError);
			else if (response.statusCode !== 200)
				_handleException(new Error(response.statusMessage));
			else {
				try {
					data = JSON.parse(body);

					platform.sendResult(JSON.stringify(_.get(data, 'results[0].locations[0].latLng')));

					platform.log(JSON.stringify({
						title: 'Mapquest Geocoding Service Result',
						input: {
							address: data.address
						},
						result: data
					}));
				}
				catch (parseError) {
					_handleException(parseError);
				}
			}
		});
	}
	else {
		if (_.isNaN(data.lat) || !_.isNumber(data.lat) || !_.inRange(data.lat, -90, 90) ||
			_.isNaN(data.lng) || !_.isNumber(data.lng) || !_.inRange(data.lng, -180, 180)) {

			_handleException(new Error('Latitude (lat) and Longitude (lng) are not valid. lat: ' + data.lat + ' lng:' + data.lng));
		}
		else {
			request.get({
				url: MAPQUEST_REVERSE_GEOCODE_URL,
				qs: {
					key: apikey,
					location: data.lat + ',' + data.lng
				}
			}, function (reqError, response, body) {
				if (reqError)
					_handleException(reqError);
				else if (response.statusCode !== 200)
					_handleException(new Error(response.statusMessage));
				else {
					try {
						var address = _.get(JSON.parse(body), 'results[0].locations[0]');

						delete address.latLng;
						delete address.displayLatLng;

						platform.sendResult(JSON.stringify({
							address: address
						}));

						platform.log(JSON.stringify({
							title: 'Mapquest Geocoding Service Result',
							input: {
								lat: data.lat,
								lng: data.lng
							},
							result: address
						}));
					}
					catch (parseError) {
						_handleException(parseError);
					}
				}
			});
		}
	}
});

/*
 * Event to listen to in order to gracefully release all resources bound to this service.
 */
platform.on('close', function () {
	platform.notifyClose();
});

/*
 * Listen for the ready event.
 */
platform.once('ready', function (options) {
	apikey = options.apikey;
	geocodingType = options.geocoding_type || config.geocoding_type.default;

	platform.log('MapQuest Geocoding Service Initialized.');
	platform.notifyReady();
});