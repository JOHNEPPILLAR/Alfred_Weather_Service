/**
 * Import helper libraries
 */
const serviceHelper = require('../lib/helper.js');
const pureCool = require('./dyson/purecool.js');

exports.collectData = async function FnCollectData() {
  try {
    await pureCool.processPureCoolData(); // Collect Dyson Pure Cool device data
  } catch (err) {
    serviceHelper.log('error', 'Controller - CollectData', err.message);
  }
};
