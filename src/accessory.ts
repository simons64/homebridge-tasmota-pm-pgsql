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

let hap: HAP;

import server from './server';
import tmpmd from './tasmotamqtt';

//  Initializer function called when the plugin is loaded.

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("powermeter", TasmotaPowerMeterDevice);
};



class TasmotaPowerMeterDevice implements AccessoryPlugin {
  private readonly switchService: Service;
  private readonly informationService: Service;

  private readonly log: Logging;
  private readonly name: string;

  private onValue: string;
  private offValue: string;

  private switchOn = false;

  private mqttBackend: tmpmd;
  private pgs = new server();

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
  
    this.onValue = config.onValue;
	this.offValue = config.offValue; 

    this.switchService = new hap.Service.Outlet(this.name);
    this.mqttBackend = new tmpmd(log, config, this.switchService);
	
	this.mqttBackend.onBlub = () => {
		log.info("das ist aus accessory.ts");
	}

	this.switchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("Current state of the switch was returned: " + (this.switchOn? this.onValue: this.offValue));
		callback(undefined, this.switchOn);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.switchOn = value as boolean;
        log.info("Switch state was set to: " + (this.switchOn? this.onValue: this.offValue));
		this.mqttBackend.setSwitchState(this.switchOn);
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Name, this.name)
      .setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer ? config.manufacturer : "Blitzwolf")
      .setCharacteristic(hap.Characteristic.Model, config.model ? config.model : "Blitzwolf SHP2")
      .setCharacteristic(hap.Characteristic.SerialNumber, config.serial ? config.serial : "12345");


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
