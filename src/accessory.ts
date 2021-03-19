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
	PGClient
} from './pgclient';
import {
	TMPMD,
	EnergyLog
} from './tasmotamqtt';


export class TasmotaPowerMeterDevice implements AccessoryPlugin {
  name: string;
  private readonly log: Logging;
  
  private readonly switchService: Service;
  private readonly informationService: Service;
  private mqttBackend: TMPMD;

  private onValue: string;
  private offValue: string;

  private switchOn = false;
  private statusActive = false;
  private readonly outletInUse = true;

  constructor(hap: HAP, log: Logging, name: string, config: any, pgclient: PGClient) {
    this.log = log;
    this.name = config.name;
  
    this.onValue = config.onValue;
	this.offValue = config.offValue; 

	// check for device in DB 
	pgclient.checkForDevice(this.name);

    this.switchService = new hap.Service.Outlet(this.name);
    this.mqttBackend = new TMPMD(log, config, this.switchService);
		

	this.mqttBackend.onPowerChange = (state: boolean) => {		
        this.switchOn = state;
	}
	this.mqttBackend.onStatusActiveChange = (statusActive: boolean) => {
        this.statusActive = statusActive;
    }
	this.mqttBackend.onEnergyUpdate = (eLog: EnergyLog) => {
		pgclient.addLog(eLog.dev, eLog.volts, eLog.amps, eLog.watts);
	}

	this.switchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        //log.info("Current state of the switch was returned: " + (this.switchOn? this.onValue: this.offValue));
		callback(null, this.switchOn);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.switchOn = value as boolean;
        //log.info("Switch state was set to: " + (this.switchOn? this.onValue: this.offValue));
		this.mqttBackend.setPowerState(this.switchOn);
        callback();
      });
	
	this.switchService.getCharacteristic(hap.Characteristic.OutletInUse)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
		callback(null, this.outletInUse);
      });

	this.switchService.getCharacteristic(hap.Characteristic.StatusActive)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        callback(null, this.statusActive);
      });	

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Name, this.name)
      .setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer ? config.manufacturer : "Blitzwolf")
      .setCharacteristic(hap.Characteristic.Model, config.model ? config.model : "Blitzwolf SHP2")
      .setCharacteristic(hap.Characteristic.SerialNumber, config.serial ? config.serial : "12345");


    log.info("Outlet Service configured!");
  }

  /* This method is optional to implement. It is called when HomeKit ask to identify the accessory.
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
