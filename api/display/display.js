/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;

/**
 * Import helper libraries
 */
const serviceHelper = require('../../lib/helper.js');

const skill = new Skills();

/**
 * @api {get} /displaydysonpurecooldata
 * @apiName displaydysonpurecooldata
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": {
 *       "command": "SELECT",
 *       "rowCount": 2,
 *       "oid": null,
 *       "DurationTitle": "Daily"
 *       "rows": [
 *           {
 *              "time": "2018-10-21T08:50:06.369Z",
 *              "air_quality": 2,
 *              "temperature": 19,
 *              "humidity": 75
 *           },
 *           ...
 *         }
 *     ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 400 Bad Request
 *   {
 *     data: Error message
 *   }
 *
 */
async function displayDysonPureCoolData(req, res, next) {
  serviceHelper.log('trace', 'Display Dyson PureCool data API called');

  let durationSpan = null;
  if (typeof req.query !== 'undefined') ({ durationSpan } = req.query);

  let durationTitle;
  let SQL;

  try {
    switch (durationSpan) {
      case 'month':
        SQL = 'SELECT time_bucket(\'6 hours\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 month\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last month';
        break;
      case 'week':
        SQL = 'SELECT time_bucket(\'3 hours\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 week\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last weeks';
        break;
      case 'day':
        SQL = 'SELECT time_bucket(\'30 minutes\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 day\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Today';
        break;
      case 'hour':
        SQL = 'SELECT time_bucket(\'1 minute\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 hour\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last hour';
        break;
      default:
        SQL = 'SELECT time_bucket(\'1 minute\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 hour\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last hour';
        break;
    }

    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'No data to return');
      serviceHelper.sendResponse(res, true, 'No data to return');
      return;
    }
    serviceHelper.log('trace', 'Return data back to caller');
    results.DurationTitle = durationTitle;
    results.rows.reverse();
    serviceHelper.sendResponse(res, true, results);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/displaydysonpurecooldata', displayDysonPureCoolData);

/**
 * @api {get} /displaydysonpurecool
 * @apiName displaydysonpurecool
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": {
 *       "AirQuality": 2,
 *       "Temperature": 18.4,
 *       "Humidity": 63,
 *       "NitrogenDioxide": 0
 *     }
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 400 Bad Request
 *   {
 *     data: Error message
 *   }
 *
 */
async function dysonPureCoolLatest(req, res, next) {
  serviceHelper.log('trace', 'Display Dyson PureCool latest readings API called');
  try {
    const SQL = 'SELECT location, air, temperature, humidity, nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 hour\' ORDER BY time LIMIT 1';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'No data exists in the last hour');
      serviceHelper.sendResponse(res, false, 'No results');
      next();
      return;
    }
    serviceHelper.log('trace', 'Return data back to caller');

    const returnData = results.rows;
    serviceHelper.sendResponse(res, true, returnData);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/dysonpurecoollatest', dysonPureCoolLatest);

module.exports = skill;
