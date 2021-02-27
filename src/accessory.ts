import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";

import {
	IClientOptions,
    Client, 
    connect, 
    IConnackPacket
} from "mqtt";


/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, this.you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check this.by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice this.the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;
let mqtt = require("mqtt"); 

//  Initializer function called when the plugin is loaded.

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("testaccessory", MqttSwitchEspurna);
};


class MqttSwitchEspurna implements AccessoryPlugin {
  private readonly switchService: Service;
  private readonly informationService: Service;

  private readonly log: Logging;
  private readonly name: string;
  private readonly topicStatus: string;
  private readonly topicData: string;
  private readonly topicSet: string;
  private readonly onValue: string;
  private readonly offValue: string;

  private switchOn = false;
  private uptime = -1;

  // MQTT variables
  private readonly mqttURL: string;
  private readonly mqttClientID: string; 
  private readonly mqttOptions: IClientOptions; 
  private mqttHandle: Client;


  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
   
	// set topics
	this.topicStatus = config.topics.state;
	this.topicData = config.topics.data;
	this.topicSet = config.topics.toggle;

    this.onValue = config.onValue;
	this.offValue = config.offValue;

	// MQTT stuff
	this.mqttURL = config.url;
	this.mqttClientID = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
	this.mqttOptions = {
		keepalive: 10,
		clientId: this.mqttClientID,
		protocolId: 'MQTT',
		protocolVersion: 4,
		clean: true,
		reconnectPeriod: 1000,
		connectTimeout: 30 * 1000,
		will: {
			topic: config["name"],
			payload: ' >> Connection closed abnormally..!',
			qos: 0,
			retain: false
		},
		username: config.username,
		password: config.password,
		rejectUnauthorized: false
	};

    this.switchService = new hap.Service.Outlet(this.name);

    this.switchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("Current state of the switch was returned: " + (this.switchOn? this.onValue: this.offValue));
		callback(undefined, this.switchOn);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.switchOn = value as boolean;
        log.info("Switch state was set to: " + (this.switchOn? this.onValue: this.offValue));
		this.mqttHandle.publish(this.topicSet, (this.switchOn? this.onValue: this.offValue));
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Name, this.name)
      .setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer ? config.manufacturer : "Espurna Plug")
      .setCharacteristic(hap.Characteristic.Model, config.model ? config.model : "Teckin SP21")
      .setCharacteristic(hap.Characteristic.SerialNumber, config.serial ? config.serial : "12345");


    this.mqttHandle = connect(this.mqttURL, this.mqttOptions);
	this.mqttHandle
		.subscribe({[this.topicStatus]: {qos: 0}, [this.topicData]: {qos: 0}}, (err, granted) => {
			granted.forEach(({topic, qos}) => {
				log.info(`subscribed to ${topic} with qos=${qos}`)
			})
			this.mqttHandle.publish("hellp", "hellp");

		})
		.on("connect", (packet: IConnackPacket) => {
			log.info("Succesfully connect to MQTT Broker [", this.mqttURL, "]", "###", packet);
		})
		.on("message", (topic: string, payload: Buffer) => {
			log.info(`MQTT: ${topic}: ${payload}`);
			let _data = payload.toString();
			if (topic == this.topicData) {
				try {
					let data = JSON.parse(_data);
					this.switchOn = (data['relay/0'].toString() == this.onValue);
					log.info(`Switch:${this.switchOn}, UpTime:${this.uptime}`);		   

					if (data.hasOwnProperty('uptime')) {
						this.uptime = data['uptime']
					}
				} catch (e) {
					log.info("Exception:", e);
				}
				this.switchService.updateCharacteristic(hap.Characteristic.On, this.switchOn);
			}
			else if (topic == this.topicStatus) {
				//this.activeStat = data.includes(this.onValue);
				//this.service.setCharacteristic(Characteristic.StatusActive, that.activeStat);
			}
		});

    log.info("Outlet Service configured!");

  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

}
