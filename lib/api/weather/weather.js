/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const helper = require('alfred-helper');
const debug = require('debug')('Weather:API');

/**
 * Import mocks
 */
const weatherMock = require('../../mock/wearther.json');

/**
 * Configure openWeatherMap url
 */
async function configureOWMurl(exclude) {
  debug(`Configure Open Weather Map url`);

  const miniOWMKey = await this._getVaultSecret('OpenWeatherMapKey');
  const HomeLat = await this._getVaultSecret('HomeLat');
  const HomeLong = await this._getVaultSecret('HomeLong');

  return `https://api.openweathermap.org/data/2.5/onecall?units=metric&lat=${HomeLat}&lon=${HomeLong}&exclude=${exclude}&appid=${miniOWMKey}`;
}

/**
 * Convert openWeatherMap icon to darksky icon
 */
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
  debug(`Sun set api called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      debug(`Mock mode enabled, returning mock`);
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
      debug(`Calling api`);
      apiData = await this._callAPIServiceGet(url);
    }
    if (apiData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${apiData.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, apiData);
      }
      return apiData;
    }

    debug(`Setup the correct sunset time`);
    const sunSetTime = dateFormat(
      new Date(apiData.current.sunset * 1000),
      'HH:MM',
    );

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, { time: sunSetTime });
    }
    return sunSetTime;
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
 * @path /sunrise
 */
async function sunRise(req, res, next) {
  debug(`Sun rise api called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      debug(`Mock mode enabled, returning mock`);
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

    debug(`Setup the correct sunrise time`);
    const sunriseTime = dateFormat(
      new Date(apiData.current.sunrise * 1000),
      'HH:MM',
    );

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, { time: sunriseTime });
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
  debug(`Current weather API called`);

  try {
    let apiData;
    let temperature;

    // Mock
    if (process.env.MOCK === 'true') {
      debug(`Mock mode enabled, returning mock`);
      apiData = weatherMock;
      temperature = apiData.current.temp || 0;
    } else {
      // Get data from Open Weather Map
      let url = await configureOWMurl.call(this, 'minutely,hourly');
      if (url instanceof Error) {
        this.logger.error(`${this._traceStack()} - ${url.message}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, url);
        }
        return url;
      }
      apiData = await this._callAPIServiceGet(url);
      if (apiData instanceof Error) {
        this.logger.error(`${this._traceStack()} - ${apiData.message}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, apiData);
        }
        return apiData;
      }

      // Get data from garden sensor
      url = `${process.env.ALFRED_NETATMO_SERVICE}/sensors/current`;
      let gardenSensorData = await this._callAlfredServiceGet(url);
      if (gardenSensorData instanceof Error) {
        this.logger.error(
          `${this._traceStack()} - ${gardenSensorData.message}`,
        );
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, gardenSensorData);
        }
        return gardenSensorData;
      }

      gardenSensorData = gardenSensorData.filter(
        (sensor) => sensor.location === 'Garden',
      );

      if (gardenSensorData.length === 0) {
        const err = new Error('No data returned from Netatmo sensor');
        this.logger.error(`${this._traceStack()} - ${err}`);
        if (typeof res !== 'undefined' && res !== null) {
          this._sendResponse(res, next, 500, err);
        }
        return err;
      }

      temperature = gardenSensorData[0].temperature || apiData.current.temp;
    }

    // Setup weather data
    let { icon } = apiData.current.weather[0];
    const summary = apiData.current.weather[0].description;
    let feelsLike = apiData.current.feels_like;
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
  debug(`Will it rain in 4h API called`);

  try {
    let apiData;

    // Mock
    if (process.env.MOCK === 'true') {
      debug(`Mock mode enabled, returning mock`);
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

    debug(`Filter data for only next 4 hours`);
    const next4hrsWeatherData = apiData.hourly.slice(0, 4);
    let precipIntensity = 0;
    try {
      precipIntensity = next4hrsWeatherData[0].rain['1h'];
    } catch (err) {
      debug(`No rain data in JSON data`);
    }
    for (let i = 1, len = next4hrsWeatherData.length; i < len; i += 1) {
      let intensity = 0;
      try {
        intensity = next4hrsWeatherData[i].rain['1h'];
      } catch (err) {
        debug(`No rain data in JSON data`);
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
  debug(`Internal house weather API called`);

  let mainBedRoomData;
  let restOfTheHouseData;
  let apiURL;

  try {
    // Dyson purecool fan
    debug(`Getting latest Dyson data`);
    apiURL = `${process.env.ALFRED_DYSON_SERVICE}/sensors/current`;
    mainBedRoomData = await this._callAlfredServiceGet(apiURL);
    if (mainBedRoomData instanceof Error)
      throw new Error(mainBedRoomData.message);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  try {
    // Netatmo sensors
    debug(`Getting latest Netatmo data`);
    apiURL = `${process.env.ALFRED_NETATMO_SERVICE}/sensors/current`;
    restOfTheHouseData = await this._callAlfredServiceGet(apiURL);
    if (restOfTheHouseData instanceof Error)
      throw new Error(restOfTheHouseData.message);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  try {
    // Construct returning data
    debug(`Construct returning data`);
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
      jsonDataObj = restOfTheHouseData.concat(jsonDataObj);

    if (jsonDataObj.length === 0) debug(`No house weather results found`);
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
