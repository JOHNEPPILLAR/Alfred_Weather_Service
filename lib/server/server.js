// Import external libraries
const { Service } = require('alfred-base');

// Setup service options
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const namespace = require('../../package.json').name;

const options = {
  serviceName,
  namespace,
  serviceVersion: version,
};

// Import API Routes
const APIweather = require('../api/weather/weather.js');

// Create base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Apply api routes
  service.addRouteToRestify('get', '/sunset', APIweather.sunSet);
  service.addRouteToRestify('get', '/sunrise', APIweather.sunRise);
  service.addRouteToRestify('get', '/today', APIweather.today);
  service.addRouteToRestify('get', '/willitrain', APIweather.willItRain);
  service.addRouteToRestify('get', '/house', APIweather.house);

  // Listen for api requests
  service.listen();
}
setupServer();
