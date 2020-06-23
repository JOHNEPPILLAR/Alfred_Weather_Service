/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const helper = require('alfred-helper');

/**
 * Import mocks
 */
const weatherMock = require('../../mock/wearther.json');

// Helper functions
async function configureOWMurl(exclude) {
  try {
    // Configure open weather map url
    this.logger.debug(`${this._traceStack()} - Configure Open Weather Map url`);

    const url = await Promise.allSettled([
      this._getVaultSecret(process.env.ENVIRONMENT, 'OpenWeatherMapKey'),
      this._getVaultSecret(process.env.ENVIRONMENT, 'HomeLat'),
      this._getVaultSecret(process.env.ENVIRONMENT, 'HomeLong'),
    ]).then((results) => {
      this.logger.debug(
        `${this._traceStack()} - Get sunset from OpenWeatherMap`,
      );

      const miniOWMKey = results[0].value;
      const HomeLat = results[1].value;
      const HomeLong = results[2].value;

      return `https://api.openweathermap.org/data/2.5/onecall?units=metric&lat=${HomeLat}&lon=${HomeLong}&exclude=${exclude}&appid=${miniOWMKey}`;
    });

    return url;
  } catch (err) {
    this.logger.debug(`${this._traceStack()} - ${err.message}`);
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
    default:
      darkSkyIcon = 'clearDay';
    // 'wind' ??
  }
  return darkSkyIcon;
}

/**
 * @type get
 * @path /sunset
 */
async function sunSet(req, res, next) {
  this.logger.trace(`${this._traceStack()} - Sun set api called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      this.logger.debug(
        `${this._traceStack()} - Mock mode enabled, returning mock`,
      );
      apiData = weatherMock;
    } else {
      const url = await configureOWMurl.call(this, 'minutely,hourly,daily');
      if (url instanceof Error) {
        this.logger.error(`${this._traceStack()} - ${url.message}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, url);
        }
        return url;
      }
      this.logger.debug(`${this._traceStack()} - Calling api`);
      apiData = await this._callAPIServiceGet(url);
    }
    if (apiData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${apiData.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, apiData);
      }
      return apiData;
    }

    this.logger.debug(`${this._traceStack()} - Setup the correct sunset time`);
    const sunSetTime = dateFormat(
      new Date(apiData.current.sunset * 1000),
      'HH:MM',
    );

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, { sunset: sunSetTime });
    }
    return sunSetTime;
  } catch (err) {
    this.logger.error(`${this.traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  }
}

/**
 * @type get
 * @path /sunrise
 */
async function sunRise(req, res, next) {
  this.logger.trace(`${this._traceStack()} - Sun rise api called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      this.logger.debug(
        `${this._traceStack()} - Mock mode enabled, returning mock`,
      );
      apiData = weatherMock;
    } else {
      const url = await configureOWMurl.call(this, 'minutely,hourly,daily');
      if (url instanceof Error) {
        this.logger.error(`${this._traceStack()} - ${url.message}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, url);
        }
        return url;
      }
      apiData = await this._callAPIServiceGet(url);
    }
    if (apiData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${apiData.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, apiData);
      }
      return apiData;
    }

    this.logger.debug(`${this._traceStack()} - Setup the correct sunrise time`);
    const sunriseTime = dateFormat(
      new Date(apiData.current.sunrise * 1000),
      'HH:MM',
    );

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, { sunrise: sunriseTime });
    }
    return sunriseTime;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  }
}

/**
 * @type get
 * @path /today
 */
async function today(req, res, next) {
  this.logger.trace(`${this._traceStack()} - Current weather API called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      this.logger.debug(
        `${this._traceStack()} - Mock mode enabled, returning mock`,
      );
      apiData = weatherMock;
    } else {
      const url = await configureOWMurl.call(this, 'minutely,hourly');
      if (url instanceof Error) {
        this.logger.error(`${this._traceStack()} - ${url.message}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, url);
        }
        return url;
      }
      apiData = await this._callAPIServiceGet(url);
    }

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
      this._sendResponse(res, next, 200, jsonDataObj);
    }
    return jsonDataObj;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this.sendResponse(res, next, 500, err);
    }
    return err;
  }
}

/**
 * @type get
 * @path /willitrain
 */
async function willItRain(req, res, next) {
  this.logger.trace(`${this._traceStack()} - Will it rain in 4h API called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      this.logger.debug(
        `${this._traceStack()} - Mock mode enabled, returning mock`,
      );
      apiData = weatherMock;
    } else {
      const url = await configureOWMurl.call(this, 'current,minutely,daily');
      if (url instanceof Error) {
        this.logger.error(`${this._traceStack()} - ${url.message}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, url);
        }
        return url;
      }
      apiData = await this._callAPIServiceGet(url);
    }

    this.logger.debug(
      `${this._traceStack()} - Filter data for only next 4 hours`,
    );
    const next4hrsWeatherData = apiData.hourly.slice(0, 4);
    let precipIntensity = 0;
    try {
      precipIntensity = next4hrsWeatherData[0].rain['1h'];
    } catch (err) {
      this.logger.debug(`${this._traceStack()} - No rain data in JSON data`);
    }
    for (let i = 1, len = next4hrsWeatherData.length; i < len; i += 1) {
      let intensity = 0;
      try {
        intensity = next4hrsWeatherData[i].rain['1h'];
      } catch (err) {
        this.logger.debug(`${this._traceStack()} - No rain data in JSON data`);
      }
      precipIntensity =
        intensity > precipIntensity ? intensity : precipIntensity;
    }

    const jsonDataObj = {
      locationCity: apiData.timezone,
      precipIntensity,
    };

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, jsonDataObj);
    }
    return jsonDataObj;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  }
}

/**
 * @type get
 * @path /house
 */
async function house(req, res, next) {
  this.logger.trace(
    `${this._traceStack()} - Internal house weather API called`,
  );

  let mainBedRoomData;
  let restOfTheHouseData;
  let apiURL;

  try {
    // Dyson purecool fan
    this.logger.debug(`${this._traceStack()} - Getting latest Dyson data`);
    apiURL = `${process.env.ALFRED_DYSON_SERVICE}/sensors/current`;
    mainBedRoomData = await this._callAlfredServiceGet(apiURL);
    if (mainBedRoomData instanceof Error)
      throw new Error(mainBedRoomData.message);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  try {
    // Netatmo sensors
    this.logger.debug(`${this._traceStack()} - Getting latest Netatmo data`);
    apiURL = `${process.env.ALFRED_NETATMO_SERVICE}/sensors/current`;
    restOfTheHouseData = await this._callAlfredServiceGet(apiURL);
    if (restOfTheHouseData instanceof Error)
      throw new Error(restOfTheHouseData.message);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  try {
    // Construct returning data
    this.logger.debug(`${this._traceStack()} - Construct returning data`);
    let jsonDataObj = [];

    if (
      typeof mainBedRoomData !== 'undefined' &&
      !helper.isEmptyObject(mainBedRoomData) &&
      !(mainBedRoomData instanceof Error)
    )
      jsonDataObj = mainBedRoomData;

    if (
      typeof restOfTheHouseData !== 'undefined' &&
      !helper.isEmptyObject(restOfTheHouseData) &&
      !(restOfTheHouseData instanceof Error)
    )
      jsonDataObj = restOfTheHouseData.data.concat(jsonDataObj);

    if (jsonDataObj.length === 0) {
      this.logger.trace(
        `${this._traceStack()} - No house weather results found`,
      );
    }
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, jsonDataObj);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  }
}

module.exports = {
  sunSet,
  sunRise,
  today,
  willItRain,
  house,
};
