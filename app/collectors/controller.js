/**
 * Import helper libraries
 */
const serviceHelper = require('alfred-helper');
const pureCool = require('../collectors/dyson/purecool.js');

// eslint-disable-next-line global-require
exports.collectData = async function FnCollectData() {
  try {
    await pureCool.processPureCoolData(); // Collect Dyson Pure Cool device data
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
};
