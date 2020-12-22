/**
 * Import external libraries
 */
const { Service } = require('alfred-base');
const debug = require('debug')('Weather:Server');

// Setup service options
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const namespace = require('../../package.json').name;

const options = {
  serviceName,
  namespace,
  serviceVersion: version,
};

// Bind api functions to base class
Object.assign(Service.prototype, require('../api/weather/weather'));

// Create base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Apply api routes
  service.restifyServer.get('/sunset', (req, res, next) =>
    service.sunSet(req, res, next),
  );
  debug(`Added get '/sunset' api`);

  service.restifyServer.get('/sunrise', (req, res, next) =>
    service.sunRise(req, res, next),
  );
  debug(`Added get '/sunrise' api`);

  service.restifyServer.get('/today', (req, res, next) =>
    service.today(req, res, next),
  );
  debug(`Added get '/today' api`);

  service.restifyServer.get('/willitrain', (req, res, next) =>
    service.willItRain(req, res, next),
  );
  debug(`Added get '/willitrain' api`);

  service.restifyServer.get('/house', (req, res, next) =>
    service.house(req, res, next),
  );
  debug(`Added get '/house' api`);

  // Listen for api requests
  service.listen();
}
setupServer();
