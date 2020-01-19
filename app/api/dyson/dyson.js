/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

const skill = new Skills();

/**
 * @api {get} /sensors
 * @apiName sensors
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": [
 *           {
 *              "time": "2018-10-21T08:50:06.369Z",
 *              "air_quality": 2,
 *              "temperature": 19,
 *              "humidity": 75
 *           },
 *           ...
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
async function sensors(req, res, next) {
  serviceHelper.log('trace', 'Display Dyson PureCool data API called');
  serviceHelper.log('trace', `Query: ${JSON.stringify(req.query)}`);

  let durationTitle;
  let SQL;

  const { durationSpan } = req.query;

  try {
    switch (durationSpan) {
      case 'month':
        SQL = "SELECT time_bucket('6 hours', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval '1 month' GROUP BY timeofday ORDER BY timeofday DESC";
        durationTitle = 'Last month';
        break;
      case 'week':
        SQL = "SELECT time_bucket('3 hours', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval '1 week' GROUP BY timeofday ORDER BY timeofday DESC";
        durationTitle = 'Last weeks';
        break;
      case 'day':
        SQL = "SELECT time_bucket('30 minutes', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval '1 day' GROUP BY timeofday ORDER BY timeofday DESC";
        durationTitle = 'Today';
        break;
      case 'hour':
        SQL = "SELECT time_bucket('1 minute', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval '1 hour' GROUP BY timeofday ORDER BY timeofday DESC";
        durationTitle = 'Last hour';
        break;
      default:
        SQL = "SELECT time_bucket('1 minute', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval '1 hour' GROUP BY timeofday ORDER BY timeofday DESC";
        durationTitle = 'Last hour';
        break;
    }

    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('dyson');
    const dbClient = await dbConnection.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.end(); // Close data store connection

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'No data to return');
      serviceHelper.sendResponse(res, 200, {});
      return;
    }
    serviceHelper.log('trace', 'Return data back to caller');
    results.DurationTitle = durationTitle;
    results.rows.reverse();
    const returnData = results.rows;
    serviceHelper.sendResponse(res, 200, returnData);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, 500, err);
    next();
  }
}
skill.get('/sensors', sensors);

/**
 * @api {get} /current
 * @apiName current
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
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function current(req, res, next) {
  serviceHelper.log(
    'trace',
    'Display Dyson PureCool latest readings API called',
  );
  try {
    const SQL = "SELECT location, air, temperature, humidity, nitrogen FROM dyson_purecool WHERE time > NOW() - interval '1 hour' ORDER BY time LIMIT 1";
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('dyson');
    const dbClient = await dbConnection.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.end(); // Close data store connection

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'No data exists in the last hour');
      serviceHelper.sendResponse(res, 200, {});
      next();
      return;
    }
    serviceHelper.log('trace', 'Return data back to caller');

    const returnData = results.rows;
    serviceHelper.sendResponse(res, 200, returnData);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, 500, err);
    next();
  }
}
skill.get('/sensors/current', current);

module.exports = skill;
