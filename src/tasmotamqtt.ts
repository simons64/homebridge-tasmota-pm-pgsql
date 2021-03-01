import {
	AccessoryConfig,
	Logging,
	Service
} from "homebridge";


import {
	IClientOptions,
    Client, 
    connect, 
    IConnackPacket
} from "mqtt";


export interface EnergyLog {
	dev: string;
	volts: number;
	amps: number;
	watts: number;
}

// TasmotaMqttPowerMeterDevice = TMPMD
export class TMPMD {
  private readonly log: Logging;
 
  private mqttHandle: Client;
  private readonly mqttOptions: IClientOptions; 

  private readonly devName: string;

  private readonly topicGetPower: string;
  private readonly topicSetPower: string;
  private readonly topicGetEnergy: string;
  private readonly topicGetState: string;
  private readonly topicActivity: string;


  private readonly onValue: string;
  private readonly offValue: string;

  private readonly mqttURL: string;
  private readonly mqttClientID: string; 

  private readonly switchService: Service; 
  private switchOn = false;


  constructor(log: Logging, config: AccessoryConfig, switchService: Service) {
 	// use homebridge log 
    this.log = log;
	this.switchService = switchService;
	this.devName = config.name;  
  
	// set topics
	this.topicGetPower = config.topics.getPower;
	this.topicSetPower = config.topics.setPower;
	this.topicGetEnergy = config.topics.getEnergy;
	this.topicGetState = config.topics.getState;
	this.topicActivity = config.topics.activity;

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
			topic: config.name,
			payload: ' >> Connection closed abnormally..!',
			qos: 0,
			retain: false
		},
		username: config.username,
		password: config.password,
		rejectUnauthorized: false
	};
 
    	


	this.mqttHandle = connect(this.mqttURL, this.mqttOptions);
	this.mqttHandle
		.subscribe( 
			{
				[this.topicGetPower]: {qos:0},
				[this.topicSetPower]: {qos:0},
				[this.topicGetEnergy]: {qos:0},
				[this.topicGetState]: {qos:0},
				[this.topicActivity]: {qos:0}
			}, (err, granted) =>
		{
			granted.forEach(({topic, qos}) => {
				log.info(`subscribed to ${topic} with qos=${qos}`)
			})
		})
		.on("connect", (packet: IConnackPacket) => {
			log.info("Succesfully connect to MQTT Broker [", this.mqttURL, "]");
		    this.mqttHandle.publish(config.startCmd, config.startParameter);
		})
		.on("message", (topic: string, payload: Buffer) => {
			log.info(`MQTT: ${topic}: ${payload}`);
			if (topic == this.topicGetPower) {
				let state = payload.toString();
				this.switchOn = (state == this.onValue);
			}
			else if (topic == this.topicGetState) {
				let strPayload = payload.toString();
				try {
					let data = JSON.parse(strPayload);
				} catch (e) {
					log.info("Exception: topicGetState, JSON.parse()");
				}
			}
			else if (topic == this.topicGetEnergy) {
				let strPayload = payload.toString();
				try {
					let data = JSON.parse(strPayload);
					if (this.onEnergyUpdate) 
						this.onEnergyUpdate( {
							dev: this.devName, 
						    volts: data.ENERGY.Voltage, 
							amps: data.ENERGY.Current, 
							watts: data.ENERGY.Power	
						});
				} catch (e) {
					log.info("Exception on JSON.parse()");
				}
			}
			// callback for accessory	
			if (this.onPowerChange)
				this.onPowerChange(this.switchOn);
		});
  }


  public onPowerChange?: (state: boolean) => void;
  public onEnergyUpdate?: (eLog: EnergyLog) => void;

  public setSwitchState(state: boolean) {
	this.log.info("publish to mqtt client state: ", state);
    this.mqttHandle.publish(this.topicSetPower, (state ? this.onValue : this.offValue));	
  }

}

