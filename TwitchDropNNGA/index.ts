///<reference path="NN.ts" />
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

const fs = require('fs');
let game = new GameEnvironment(1920, 1080);