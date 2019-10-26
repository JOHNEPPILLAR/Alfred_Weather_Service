/**
 * Import helper libraries
 */
const serviceHelper = require('alfred-helper');

// eslint-disable-next-line global-require
exports.collectData = async function FnCollectData() {
  try {
    // eslint-disable-next-line global-require
    const pureCool = require('../collectors/dyson/purecool.js');
    await pureCool.processPureCoolData(); // Collect Dyson Pure Cool device data
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
};
