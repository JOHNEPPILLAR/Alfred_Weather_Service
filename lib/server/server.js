/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const virtualHost = require('../../package.json').name;
const APIroot = require('../api/root/root.js');
const APIweather = require('../api/weather/weather.js');

global.APITraceID = '';

async function setupAndRun() {
  // Create restify server
  const server = await serviceHelper.setupRestifyServer(virtualHost, version);

  // Setup API middleware
  await serviceHelper.setupRestifyMiddleware(server, virtualHost);

  // Configure API end points
  APIroot.applyRoutes(server);
  APIweather.applyRoutes(server);

  // Capture and process API errors
  await serviceHelper.captureRestifyServerErrors(server);

  // Start service and listen to requests
  server.listen(process.env.PORT, async () => {
    serviceHelper.log(
      'info',
      `${serviceName} has started`,
    );
  });
}

setupAndRun();
