/**
 * Import external libraries
 */
const mqtt = require('mqtt');

/**
 * Import helper libraries
 */
const serviceHelper = require('../../lib/helper.js');

const poolingInterval = 5 * 60 * 1000; // 5 minutes
const mqttClientOptions = {
  username: process.env.DysonUserName,
  password: process.env.DysonPassword,
  clientId: `alfred_${Math.random().toString(16).substr(2, 8)}`,
};
const deviceIP = process.env.DysonIP;
const mqttClient = mqtt.connect(`mqtt://${deviceIP}`, mqttClientOptions);

/**
 * Save data to data store
 */
async function saveDeviceData(SQLValues) {
  try {
    const SQL = 'INSERT INTO dyson_purecool("time", sender, location, air, temperature, humidity, nitrogen) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    serviceHelper.log('trace', 'PureCool - saveData', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'PureCool - saveData', 'Save sensor values');
    const results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log('trace', 'PureCool - saveData', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount !== 1) {
      serviceHelper.log('error', 'PureCool - saveDeviceData', `Failed to insert data for device ${SQLValues[2]}`);
      return;
    }
    serviceHelper.log('info', 'PureCool - saveDeviceData', `Saved data for device ${SQLValues[2]}`);
  } catch (err) {
    serviceHelper.log('error', 'PureCool - saveDeviceData', err.message);
  }
}

function getCharacteristicValue(rawValue) {
  if (!rawValue) return 0;
  let integerValue = Number.parseInt(rawValue, 10);

  // Reduces the scale from 0-100 to 0-10 as used in the Dyson app
  integerValue = Math.floor(integerValue / 10);

  if (integerValue <= 3) return 2; // Characteristic.AirQuality.GOOD
  if (integerValue <= 6) return 3; // Characteristic.AirQuality.FAIR
  if (integerValue <= 8) return 4; // Characteristic.AirQuality.INFERIOR
  return 5; // Characteristic.AirQuality.POOR
}

// Converts the raw value into an integer
function getNumericValue(rawValue) {
  if (!rawValue) return 0;
  return Number.parseInt(rawValue, 10);
}

mqttClient.on('error', (err) => {
  serviceHelper.log('error', 'PureCool - getPureCoolData', err.message);
});

mqttClient.on('connect', () => {
  serviceHelper.log('trace', 'PureCool - getPureCoolData', `Connected to device: ${process.env.DysonUserName}`);
  const statusSubscribeTopic = `455/${process.env.DysonUserName}/status/current`;
  mqttClient.subscribe(statusSubscribeTopic);
});

mqttClient.on('message', async (topic, message) => {
  const deviceData = JSON.parse(message);
  if (deviceData.msg === 'ENVIRONMENTAL-CURRENT-SENSOR-DATA') {
    serviceHelper.log('trace', 'PureCool - getPureCoolData', `Got sensor data from device: ${process.env.DysonUserName}`);

    const dataValues = [
      new Date(),
      process.env.Environment,
      'Bebroom',
      Math.max(
        getCharacteristicValue(deviceData.data.pm25),
        getCharacteristicValue(deviceData.data.pm10),
        getCharacteristicValue(deviceData.data.va10),
        getCharacteristicValue(deviceData.data.noxl),
        getCharacteristicValue(deviceData.data.pact),
        getCharacteristicValue(deviceData.data.vact),
      ), // Air Quality
      Number.parseFloat(deviceData.data.tact) / 10 - 273, // Temperature
      Number.parseInt(deviceData.data.hact, 10), // Humidity
      getNumericValue(deviceData.data.noxl), // Nitrogen Dioxide Density
    ];

    await saveDeviceData(dataValues); // Save data to data store

    return new Promise((resolve) => {
      resolve(dataValues);
    });
  }
  return true;
});

exports.processPureCoolData = function processPureCoolData() {
  if (!mqttClient.connected) {
    serviceHelper.log('trace', 'PureCool - getPureCoolData', `Reconnecting to device: ${process.env.DysonUserName}`);
    mqttClient.reconnect();
  }
  serviceHelper.log('trace', 'PureCool - getPureCoolData', `Force state update from device: ${process.env.DysonUserName}`);
  const commandTopic = `455/${process.env.DysonUserName}/command`;
  const currentTime = new Date();
  mqttClient.publish(commandTopic, JSON.stringify({
    msg: 'REQUEST-CURRENT-STATE',
    time: currentTime.toISOString(),
  }));
  setTimeout(() => { processPureCoolData(); }, poolingInterval); // Wait then run function again
};
