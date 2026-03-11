const mqtt = require('mqtt');
require('dotenv').config();

const TEAM_ID = "team_rdf";
const MQTT_BROKER = "mqtt://157.173.101.159:1883";

// Determine topics globally so logic works properly
const Topics = {
  STATUS: `rfid/${TEAM_ID}/card/status`,
  BALANCE: `rfid/${TEAM_ID}/card/balance`,
  TOPUP: `rfid/${TEAM_ID}/card/topup`,
  PAYMENT: `rfid/${TEAM_ID}/card/payment`,
  REMOVED: `rfid/${TEAM_ID}/card/removed`
};

let mqttClient;
let ioInstance;

const initMqtt = (io) => {
  ioInstance = io;
  mqttClient = mqtt.connect(MQTT_BROKER);

  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    mqttClient.subscribe(Object.values(Topics));
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());

      if (topic === Topics.STATUS) {
        ioInstance.emit('card-status', payload);
      } else if (topic === Topics.BALANCE) {
        ioInstance.emit('card-balance', payload);
      } else if (topic === Topics.PAYMENT) {
        ioInstance.emit('payment-result', payload);
      } else if (topic === Topics.REMOVED) {
        ioInstance.emit('card-removed', payload);
      }
    } catch (err) {
      console.error('Failed to parse MQTT message:', err);
    }
  });

  return mqttClient;
};

const publishTopup = (uid, balance, holderName, deviceId) => {
  if (!mqttClient) return;
  const payload = JSON.stringify({ uid, amount: balance, deviceId });
  mqttClient.publish(Topics.TOPUP, payload, (err) => {
    if (err) {
      console.error('Failed to publish topup:', err);
    } else {
      console.log(`Published topup for ${uid} on device ${deviceId || 'global'}: ${balance}`);
    }
  });
};

const publishPayment = (uid, balance, deducted, description, status, holderName, deviceId) => {
  if (!mqttClient) return;
  const payload = JSON.stringify({
    uid,
    amount: balance,
    deducted,
    description,
    status,
    deviceId
  });
  mqttClient.publish(Topics.PAYMENT, payload, (err) => {
    if (err) console.error('Failed to publish payment:', err);
    console.log(`Published payment for ${uid} on device ${deviceId || 'global'}: -$${deducted.toFixed(2)}, balance: $${balance.toFixed(2)}`);
  });
};

module.exports = {
  initMqtt,
  publishTopup,
  publishPayment,
  Topics
};
