/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const dateFormat = require('dateformat');
const darkSky = require('dark-sky-api');
const serviceHelper = require('alfred-helper');

const skill = new Skills();

/**
 * @type get
 * @path /sunset
 */
async function sunSet(req, res, next) {
  serviceHelper.log(
    'trace',
    'sunSet API called',
  );

  try {
    // Configure darksky
    const DarkSkyKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'DarkSkyKey',
    );
    darkSky.apiKey = DarkSkyKey;
    darkSky.proxy = true;
    darkSky.units = 'uk2';

    const HomeLong = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLong',
    );
    const HomeLat = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLat',
    );
    const position = {
      latitude: HomeLat,
      longitude: HomeLong,
    };

    serviceHelper.log(
      'trace',
      'Get sunset from DarkSky',
    );
    const apiData = await darkSky.loadForecast(position);
    if (apiData instanceof Error) {
      serviceHelper.log(
        'error',
        apiData.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          apiData,
        );
        next();
      }
      return apiData;
    }

    serviceHelper.log(
      'trace',
      'Setup the correct sunset time from the DarkSky API data',
    );
    const sunSetTime = dateFormat(new Date(apiData.daily.data[0].sunsetTime * 1000), 'HH:MM');

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        JSON.parse(`{ "sunset": "${sunSetTime}" }`),
      );
      next();
    }
    return sunSetTime;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    }
    return err;
  }
}
skill.get(
  '/sunset',
  sunSet,
);

/**
 * @type get
 * @path /sunrise
 */
async function sunRise(req, res, next) {
  serviceHelper.log(
    'trace',
    'sunRise API called',
  );

  try {
    // Configure darksky
    const DarkSkyKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'DarkSkyKey',
    );
    darkSky.apiKey = DarkSkyKey;
    darkSky.proxy = true;
    darkSky.units = 'uk2';

    const HomeLong = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLong',
    );
    const HomeLat = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLat',
    );
    const position = {
      latitude: HomeLat,
      longitude: HomeLong,
    };

    serviceHelper.log(
      'trace',
      'Get sunrise from DarkSky',
    );
    const apiData = await darkSky.loadForecast(position);
    if (apiData instanceof Error) {
      serviceHelper.log(
        'error',
        apiData.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          apiData,
        );
        next();
      }
      return apiData;
    }

    serviceHelper.log(
      'trace',
      'Setup the correct sunrise time from the DarkSky API data',
    );

    const sunriseTime = dateFormat(new Date(apiData.daily.data[0].sunriseTime * 1000), 'HH:MM');

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        JSON.parse(`{ "sunrise": "${sunriseTime}" }`),
      );
      next();
    }
    return sunriseTime;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    }
    return err;
  }
}
skill.get(
  '/sunrise',
  sunRise,
);

/**
 * @type get
 * @path /today
 */
async function current(req, res, next) {
  serviceHelper.log(
    'trace',
    'CurrentWeather API called',
  );

  try {
    // Configure darksky
    const DarkSkyKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'DarkSkyKey',
    );
    darkSky.apiKey = DarkSkyKey;
    darkSky.proxy = true;
    darkSky.units = 'uk2';

    const HomeLong = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLong',
    );
    const HomeLat = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLat',
    );
    const position = {
      latitude: HomeLat,
      longitude: HomeLong,
    };

    serviceHelper.log(
      'trace',
      'Get forcast from DarkSky',
    );
    const currentWeatherData = await darkSky.loadCurrent(position);
    const forcastWeatherData = await darkSky.loadForecast(position);

    // Setup weather data
    const { icon } = currentWeatherData;
    const { summary } = currentWeatherData;
    let { temperature } = currentWeatherData;
    let { apparentTemperature } = currentWeatherData;
    let { temperatureHigh, temperatureLow } = forcastWeatherData.daily.data[0];

    // Construct the returning message
    temperature = Math.floor(temperature);
    apparentTemperature = Math.floor(apparentTemperature);
    temperatureHigh = Math.floor(temperatureHigh);
    temperatureLow = Math.floor(temperatureLow);

    const jsonDataObj = {
      locationCity: 'London',
      icon,
      summary,
      temperature,
      apparentTemperature,
      temperatureHigh,
      temperatureLow,
    };

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        jsonDataObj,
      );
      next();
    }
    return jsonDataObj;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    }
    return err;
  }
}
skill.get(
  '/today',
  current,
);

/**
 * @type get
 * @path /willitrain
 */
async function willItRain(req, res, next) {
  serviceHelper.log(
    'trace',
    'Will It Rain 4h API called',
  );

  let { forcastDuration } = req.query;
  if (
    typeof forcastDuration === 'undefined'
    || forcastDuration === null
    || forcastDuration === ''
  ) forcastDuration = 5;

  try {
    // Configure darksky
    const DarkSkyKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'DarkSkyKey',
    );
    darkSky.apiKey = DarkSkyKey;
    darkSky.proxy = true;
    darkSky.units = 'uk2';

    serviceHelper.log(
      'trace',
      'Calling geocoder to get location name',
    );
    const HomeLong = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLong',
    );
    const HomeLat = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLat',
    );
    const position = {
      latitude: HomeLat,
      longitude: HomeLong,
    };

    serviceHelper.log(
      'trace',
      'Get forcast from DarkSky',
    );
    const weatherData = await darkSky.loadItAll(
      'currently,minutely,daily,alerts',
      position,
    );

    serviceHelper.log(
      'trace',
      'Filter data for only next x hours and only if chance of rain is greater than x%',
    );
    const cleanWeatherData = weatherData.hourly.data.slice(0, forcastDuration);

    let { precipProbability, precipIntensity } = cleanWeatherData[0];

    for (let i = 1, len = cleanWeatherData.length; i < len; i += 1) {
      const probability = cleanWeatherData[i].precipProbability;
      const intensity = cleanWeatherData[i].precipIntensity;
      precipProbability = probability > precipProbability ? probability : precipProbability;
      precipIntensity = intensity > precipIntensity ? intensity : precipIntensity;
    }

    const jsonDataObj = {
      locationCity: 'London',
      precipProbability,
      precipIntensity,
    };

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        jsonDataObj,
      );
      next();
    }
    return jsonDataObj;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    }
    return err;
  }
}
skill.get(
  '/willitrain',
  willItRain,
);

/**
 * @type get
 * @path /house
 */
async function house(req, res, next) {
  serviceHelper.log(
    'trace',
    'house weather API called',
  );
  let mainBedRoomData;
  let restOfTheHouseData;
  let apiURL;

  try {
    // Dyson purecool fan
    serviceHelper.log(
      'trace',
      'Getting latest Dyson data',
    );
    apiURL = `${process.env.ALFRED_DYSON_SERVICE}/sensors/current`;
    mainBedRoomData = await serviceHelper.callAlfredServiceGet(apiURL);
    if (mainBedRoomData instanceof Error) throw new Error(mainBedRoomData.message);
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }

  try {
    // Netatmo sensors
    serviceHelper.log(
      'trace',
      'Getting latest Netatmo data',
    );
    apiURL = `${process.env.ALFRED_NETATMO_SERVICE}/sensors/current`;
    restOfTheHouseData = await serviceHelper.callAlfredServiceGet(apiURL);
    if (restOfTheHouseData instanceof Error) throw new Error(mainBedRoomData.message);
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }

  try {
    // Construct returning data
    serviceHelper.log(
      'trace',
      'Construct returning data',
    );
    let jsonDataObj = [];

    if (
      typeof mainBedRoomData !== 'undefined'
      && !serviceHelper.isEmptyObject(mainBedRoomData)
    ) jsonDataObj = mainBedRoomData;

    if (
      typeof restOfTheHouseData !== 'undefined'
      && !serviceHelper.isEmptyObject(restOfTheHouseData)
    ) jsonDataObj = restOfTheHouseData.data.concat(jsonDataObj);

    if (jsonDataObj.length === 0) {
      serviceHelper.log(
        'warn',
        'No house weather results found',
      );
    }
    serviceHelper.log(
      'trace',
      'Send data back to user',
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        jsonDataObj,
      );
      next();
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    }
  }
}
skill.get(
  '/house',
  house,
);

module.exports = skill;
