/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const dateFormat = require('dateformat');
const serviceHelper = require('alfred-helper');

const skill = new Skills();

// Helper functions
async function configureOWMurl(exclude) {
  try {
    // Configure open weather map url
    serviceHelper.log(
      'trace',
      'Configure Open Weather Map url',
    );

    const miniOWMKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'OpenWeatherMapKey',
    );
    const HomeLong = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLong',
    );
    const HomeLat = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'HomeLat',
    );

    serviceHelper.log(
      'trace',
      'Get sunset from OpenWeatherMap',
    );

    const url = `https://api.openweathermap.org/data/2.5/onecall?units=metric&lat=${HomeLat}&lon=${HomeLong}&exclude=${exclude}&appid=${miniOWMKey}`;
    return url;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    return err;
  }
}

function convertIcon(owmIcon) {
  let darkSkyIcon;

  switch (owmIcon) {
    case '01d':
      darkSkyIcon = 'clearDay';
      break;
    case '01n':
      darkSkyIcon = 'clearNight';
      break;
    case '02d':
    case '03d':
    case '04d':
      darkSkyIcon = 'partlyCloudyDay';
      break;
    case '02n':
    case '03n':
    case '04n':
      darkSkyIcon = 'partlyCloudyNight';
      break;
    case '09d':
    case '09n':
    case '10d':
    case '10n':
      darkSkyIcon = 'rain';
      break;
    case '13d':
    case '13n':
      darkSkyIcon = 'snow';
      break;
    case '50d':
    case '50n':
      darkSkyIcon = 'fog';
      break;
    default: darkSkyIcon = 'clearDay';
    // 'wind' ??
  }
  return darkSkyIcon;
}

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
    const url = await configureOWMurl('minutely,hourly,daily');
    if (url instanceof Error) {
      serviceHelper.log(
        'error',
        url.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          url,
        );
        next();
      }
      return url;
    }

    const apiData = await serviceHelper.callAPIServiceGet(url);
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
      'Setup the correct sunset time',
    );
    const sunSetTime = dateFormat(new Date(apiData.current.sunset * 1000), 'HH:MM');

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        { sunset: sunSetTime },
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
    const url = await configureOWMurl('minutely,hourly,daily');
    if (url instanceof Error) {
      serviceHelper.log(
        'error',
        url.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          url,
        );
        next();
      }
      return url;
    }

    const apiData = await serviceHelper.callAPIServiceGet(url);
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
      'Setup the correct sunrise time',
    );

    const sunriseTime = dateFormat(new Date(apiData.current.sunrise * 1000), 'HH:MM');

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        { sunrise: sunriseTime },
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
    const url = await configureOWMurl('minutely,hourly');
    if (url instanceof Error) {
      serviceHelper.log(
        'error',
        url.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          url,
        );
        next();
      }
      return url;
    }

    const apiData = await serviceHelper.callAPIServiceGet(url);

    // Setup weather data
    let { icon } = apiData.current.weather[0];
    const summary = apiData.current.weather[0].description;
    let feelsLike = apiData.current.feels_like;
    let temperature = apiData.current.temp;
    let temperatureHigh = apiData.daily[0].temp.max;
    let temperatureLow = apiData.daily[0].temp.min;

    // Construct the returning message
    icon = convertIcon(icon);
    temperature = Math.floor(temperature);
    feelsLike = Math.floor(feelsLike);
    temperatureHigh = Math.floor(temperatureHigh);
    temperatureLow = Math.floor(temperatureLow);

    const jsonDataObj = {
      locationCity: apiData.timezone,
      icon,
      summary,
      temperature,
      feelsLike,
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

  try {
    const url = await configureOWMurl('current,minutely,daily');
    if (url instanceof Error) {
      serviceHelper.log(
        'error',
        url.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          url,
        );
        next();
      }
      return url;
    }

    const apiData = await serviceHelper.callAPIServiceGet(url);

    serviceHelper.log(
      'trace',
      'Filter data for only next 4 hours',
    );
    const next4hrsWeatherData = apiData.hourly.slice(0, 4);
    let precipIntensity = next4hrsWeatherData[0].rain['1h'];
    for (let i = 1, len = next4hrsWeatherData.length; i < len; i += 1) {
      const intensity = next4hrsWeatherData[i].rain['1h'];
      precipIntensity = intensity > precipIntensity ? intensity : precipIntensity;
    }

    const jsonDataObj = {
      locationCity: apiData.timezone,
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
