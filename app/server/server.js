/**
 * Import external libraries
 */
require('dotenv').config();

const restify = require('restify');
const UUID = require('pure-uuid');
const serviceHelper = require('alfred-helper');
const { version } = require('../../package.json');

/**
 * Import helper libraries
 */
const devices = require('../collectors/controller.js');
const APIroot = require('../api/root/root.js');
const APIdyson = require('../api/dyson/dyson.js');

global.APITraceID = '';
let ClientAccessKey;

async function setupAndRun() {
  // Restify server Init
  serviceHelper.log('trace', 'Getting certs');
  const key = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, `${process.env.VIRTUAL_HOST}_key`);
  const certificate = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, `${process.env.VIRTUAL_HOST}_cert`);

  if (key instanceof Error || certificate instanceof Error) {
    serviceHelper.log('error', 'Not able to get secret (CERTS) from vault');
    serviceHelper.log('warn', 'Exit the app');
    process.exit(1); // Exit app
  }
  const server = restify.createServer({
    name: process.env.VIRTUAL_HOST,
    version,
    key,
    certificate,
  });

  // Setup API middleware
  server.on('NotFound', (req, res, err) => {
    serviceHelper.log('error', `${err.message}`);
    serviceHelper.sendResponse(res, 404, err.message);
  });
  server.use(restify.plugins.jsonBodyParser({ mapParams: true }));
  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.queryParser({ mapParams: true }));
  server.use(restify.plugins.fullResponse());
  server.use((req, res, next) => {
    serviceHelper.log('trace', req.url);
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self' ${process.env.VIRTUAL_HOST}`,
    );
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  server.use(async (req, res, next) => {
    // Check for a trace id
    if (typeof req.headers['api-trace-id'] === 'undefined') {
      global.APITraceID = new UUID(4);
    } else {
      global.APITraceID = req.headers['api-trace-id'];
    }

    // Check for valid auth key
    ClientAccessKey = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, 'ClientAccessKey');
    if (ClientAccessKey instanceof Error) {
      serviceHelper.log('error', 'Not able to get secret (ClientAccessKey) from vault');
      serviceHelper.sendResponse(
        res,
        500,
        new Error('There was a problem with the auth service'),
      );
      return;
    }
    if (req.headers['client-access-key'] !== ClientAccessKey) {
      serviceHelper.log(
        'warn',
        `Invaid client access key: ${req.headers.ClientAccessKey}`,
      );
      serviceHelper.sendResponse(
        res,
        401,
        'There was a problem authenticating you',
      );
      return;
    }
    next();
  });

  // Configure API end points
  APIroot.applyRoutes(server);
  APIdyson.applyRoutes(server);

  // Stop server if process close event is issued
  function cleanExit() {
    serviceHelper.log('warn', 'Service stopping');
    serviceHelper.log('trace', 'Close rest server');
    server.close(() => {
      serviceHelper.log('info', 'Exit the app');
      process.exit(1); // Exit app
    });
  }
  process.on('SIGINT', () => {
    cleanExit();
  });
  process.on('SIGTERM', () => {
    cleanExit();
  });
  process.on('SIGUSR2', () => {
    cleanExit();
  });
  process.on('uncaughtException', (err) => {
    serviceHelper.log('error', err.message); // log the error
  });
  process.on('unhandledRejection', (reason, p) => {
    serviceHelper.log('error', `Unhandled Rejection at Promise: ${p} - ${reason}`); // log the error
  });

  // Start service and listen to requests
  server.listen(process.env.PORT, async () => {
    serviceHelper.log('info', `${process.env.VIRTUAL_HOST} has started`);
    if (process.env.MOCK === 'true') {
      serviceHelper.log('info', 'Mocking enabled, will not setup monitors or schedules');
    } else {
      devices.collectData();
    }
  });
}

setupAndRun();
