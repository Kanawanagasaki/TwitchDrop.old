///<reference path="Sprite.ts" />
///<reference path="SpriteCollection.ts" />
///<reference path="AudioDevice.ts" />
///<reference path="Vector.ts" />
///<reference path="Objects/IDrawable.ts" />
///<reference path="Objects/AObject.ts" />
///<reference path="Objects/ACollidable.ts" />
///<reference path="Objects/APhysicable.ts" />
///<reference path="Objects/AAttachable.ts" />
///<reference path="Objects/Environment/GameEnvironment.ts" />
///<reference path="Objects/Environment/WorldEnvironment.ts" />
///<reference path="Objects/Environment/RoundEnvironment.ts" />
///<reference path="Objects/Entity/StartEntity.ts" />
///<reference path="Objects/Entity/FinishEntity.ts" />
///<reference path="Objects/Entity/CharacterEntity.ts" />
///<reference path="Objects/Entity/ParachuteEntity.ts" />
///<reference path="Network/Commands/ACommand.ts" />
///<reference path="Network/Commands/DropCommand.ts" />
///<reference path="Network/Commands/DropShowCommand.ts" />
///<reference path="Network/Commands/DropHideCommand.ts" />
///<reference path="Network/Commands/DropResetCommand.ts" />
///<reference path="Network/WebClient.ts" />
///<reference path="Network/CommandsCollection.ts" />

// declaring variables from Index.cshtml
declare const renderQuality: number;
declare const twitchChannel: string;
declare const audioVolume: number;
declare const images:any;
declare const hideCooldown:number;

const spritesPath = "img/sprites";

//const websocketAddress = "ws://localhost:5501/ws";
const websocketAddress = "wss://twitchdrop.kanawanagasaki.ru/ws";

const canvas = <HTMLCanvasElement>document.getElementById("twitchdropcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let game = new GameEnvironment();