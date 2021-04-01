class NN {
    constructor(parent1 = null, parent2 = null) {
        this.Id = ++NN.ID_AI;
        if (parent1 === null && parent2 === null) {
            this.Weights = [];
            let weightsCount = 0;
            weightsCount += NN.INPUT_NEURONS * NN.HIDDEN_NEURONS;
            for (let i = 0; i < NN.HIDDEN_LAYOUTS - 1; i++)
                weightsCount += Math.pow(NN.HIDDEN_NEURONS, 2);
            weightsCount += NN.HIDDEN_NEURONS * NN.OUTPUT_NEUROUNS;
            for (let i = 0; i < weightsCount; i++)
                this.Weights.push(Math.random() * 2 - 1);
            this.Bias = [];
            for (let i = 0; i < NN.HIDDEN_LAYOUTS + 1; i++)
                this.Bias.push(Math.random() * 2 - 1);
        }
        else if (parent2 === null) {
            this.Weights = JSON.parse(JSON.stringify(parent1.Weights));
            this.Bias = JSON.parse(JSON.stringify(parent1.Bias));
        }
        else if (parent1 === null) {
            this.Weights = JSON.parse(JSON.stringify(parent2.Weights));
            this.Bias = JSON.parse(JSON.stringify(parent2.Bias));
        }
        else {
            this.Weights = [];
            for (let i = 0; i < parent1.Weights.length && i < parent2.Weights.length; i++)
                this.Weights.push(i % 2 == 0 ? parent1.Weights[i] : parent2.Weights[i]);
            this.Bias = [];
            for (let i = 0; i < parent1.Bias.length && i < parent2.Bias.length; i++)
                this.Bias.push(i % 2 == 0 ? parent1.Bias[i] : parent2.Bias[i]);
        }
    }
    TryMutate() {
        for (let i = 0; i < this.Weights.length; i++) {
            if (Math.random() < 0.1)
                this.Weights[i] *= 1 + (Math.random() * 4 - 2);
        }
        for (let i = 0; i < this.Bias.length; i++) {
            if (Math.random() < 0.1)
                this.Bias[i] *= 1 + (Math.random() * 4 - 2);
        }
    }
    Execute(input) {
        let output = [];
        for (let i = 0; i < NN.OUTPUT_NEUROUNS; i++)
            output.push(this.CalculateNeuron(input, NN.HIDDEN_LAYOUTS + 1, i));
        return output;
    }
    CalculateNeuron(input, layout, neuron) {
        if (layout == 0)
            return input[neuron];
        let summ = 0;
        for (let i = 0; i < (layout == 1 ? NN.INPUT_NEURONS : NN.HIDDEN_NEURONS); i++) {
            let value = this.CalculateNeuron(input, layout - 1, i);
            value *= this.GetWeight(layout - 1, i, neuron);
            summ += value;
        }
        summ += this.Bias[layout - 1];
        return Math.tanh(summ);
    }
    GetWeight(layout, neuron1, neuron2) {
        let index = 0;
        if (layout == 0) {
            index = neuron1 * NN.HIDDEN_NEURONS + neuron2;
        }
        else if (layout == NN.HIDDEN_LAYOUTS) {
            index = NN.INPUT_NEURONS * NN.HIDDEN_NEURONS;
            for (let i = 0; i < NN.HIDDEN_LAYOUTS - 1; i++)
                index += Math.pow(NN.HIDDEN_NEURONS, 2);
            index += neuron1 * NN.OUTPUT_NEUROUNS + neuron2;
        }
        else {
            index = NN.INPUT_NEURONS * NN.HIDDEN_NEURONS;
            for (let i = 0; i < layout - 1; i++)
                index += Math.pow(NN.HIDDEN_NEURONS, 2);
            index += neuron1 * NN.HIDDEN_NEURONS + neuron2;
        }
        return this.Weights[index];
    }
}
NN.ID_AI = 1000;
NN.HIDDEN_LAYOUTS = 2;
NN.HIDDEN_NEURONS = 5;
NN.INPUT_NEURONS = 2;
NN.OUTPUT_NEUROUNS = 4;
class Vector {
    constructor(x = 0, y = 0) {
        this.X = x;
        this.Y = y;
    }
    Add(vec) {
        return new Vector(this.X + vec.X, this.Y + vec.Y);
    }
    Sub(vec) {
        return new Vector(this.X - vec.X, this.Y - vec.Y);
    }
    Scale(scale) {
        return new Vector(this.X * scale, this.Y * scale);
    }
    ScaleX(scale) {
        return new Vector(this.X * scale, this.Y);
    }
    ScaleY(scale) {
        return new Vector(this.X, this.Y * scale);
    }
    Normalize() {
        let len = this.Length();
        return new Vector(this.X / len, this.Y / len);
    }
    Length() {
        return Math.sqrt(this.X * this.X + this.Y * this.Y);
    }
    Angle() {
        return Math.atan2(this.Y, this.X);
    }
    static Random() {
        return Vector.FromAngle(Math.random() * Math.PI * 2);
    }
    static FromAngle(angle) {
        let x = Math.cos(angle);
        let y = Math.sin(angle);
        return new Vector(x, y);
    }
}
class AObject {
    constructor() {
        this.Id = ++AObject.ID_AI;
        this.Pos = new Vector(0, 0);
        this.RotationAngle = 0;
        this.Scale = new Vector(1, 1);
        this.PrevPos = new Vector(0, 0);
        this.PrevRotationAngle = 0;
        this.PrevScale = new Vector(1, 1);
        this.Size = new Vector(64, 64);
    }
    get LifeTime() { return this.World.Game.GetTime() - this._spawnTime; }
    OnSpawn(world) {
        this.World = world;
        this._spawnTime = world.Game.GetTime();
    }
    OnDespawn() {
        this.World = undefined;
    }
    SaveMeasures() {
        this.PrevPos = this.Pos;
        this.PrevRotationAngle = this.RotationAngle;
        this.PrevScale = this.Scale;
    }
    PreTick(time) { }
    PostTick(time) { }
}
AObject.ID_AI = 0;
class ACollidable extends AObject {
    constructor() {
        super();
        this.CollisionRadius = 0;
    }
    Tick(time) {
        for (let obj of this.World.Objects) {
            if (obj != this && obj instanceof ACollidable && this.CanCollideWith(obj)) {
                let direction = obj.PrevPos.Sub(this.Pos);
                if (direction.Length() < this.CollisionRadius + obj.CollisionRadius)
                    this.OnCollisionWith(obj);
            }
        }
    }
}
class APhysicable extends ACollidable {
    constructor() {
        super();
        this._forces = {};
        this.Velocity = new Vector();
    }
    get Acceleration() {
        let ret = new Vector();
        for (let forceName in this._forces)
            ret = ret.Add(this._forces[forceName]);
        return ret;
    }
    SaveMeasures() {
        super.SaveMeasures();
        this.PrevVelocity = this.Velocity;
    }
    ApplyForce(name, vector) {
        this._forces[name] = vector;
    }
    RemoveForce(name) {
        if (name in this._forces)
            delete this._forces[name];
    }
    Tick(time) {
        super.Tick(time);
        this.Velocity = this.Velocity.Add(this.Acceleration.Scale(time));
        this.Pos = this.Pos.Add(this.Velocity.Scale(time));
    }
}
class AAttachable extends APhysicable {
    constructor() {
        super();
        this.IsAttached = false;
        this.AttachedTo = null;
        this.AttachmentDistance = 0;
    }
    AttachTo(obj) {
        this.IsAttached = true;
        this.AttachedTo = obj;
    }
    Detach() {
        this.IsAttached = false;
        this.AttachedTo = null;
    }
    PostTick(time) {
        super.PostTick(time);
        if (!this.IsAttached)
            return;
        if (this.AttachmentDistance == 0) {
            this.Pos = this.AttachedTo.Pos;
        }
        else {
            let direction = this.Pos.Sub(this.AttachedTo.Pos);
            let distance = direction.Length();
            if (distance > this.AttachmentDistance) {
                let prevPos = this.Pos;
                this.Pos = this.AttachedTo.Pos.Add(direction.Scale(this.AttachmentDistance / distance));
                this.OnTension(prevPos, time);
            }
        }
    }
}
class GameEnvironment {
    constructor(width, height) {
        this.Width = width;
        this.Height = height;
        this._time = 0;
        this.Run();
    }
    Run() {
        let nns = [];
        for (let i = 0; i < GameEnvironment.POPULATION; i++) {
            let nn = new NN();
            nns.push(nn);
        }
        let level = 80;
        for (let i = 0; i <= 1000000; i++) {
            let results = this.Simulate(nns, level);
            if (i % 10 == 0 && results.length > 0) {
                let avr = 0;
                for (let j = 0; j < results.length; j++)
                    avr += results[j].score;
                console.log("Generation", (i + 1), "LeveL", level);
                console.log("Average", avr / results.length);
                console.log("Best scores", results.slice(0, GameEnvironment.POPULATION / 16).map(r => r.score));
                console.log("Completed", results.slice(0, GameEnvironment.POPULATION / 16).map(r => r.completed));
                console.log("Best NN", results[0].nn.Id, results[0].nn.Weights, results[0].nn.Bias);
                console.log("--------------------");
                fs.appendFileSync("./NNs.log", `Generation: ${i + 1} Level: ${level} Id: ${results[0].nn.Id} Completed: ${results[0].completed} Score: ${results[0].score}\nWeights: ${JSON.stringify(results[0].nn.Weights)}\nBiases: ${JSON.stringify(results[0].nn.Bias)}\n\n`);
            }
            else {
                let avr = 0;
                for (let j = 0; j < results.length; j++)
                    avr += results[j].score;
                console.log((i + 1), level, results[0].completed, avr / results.length, results[0].score);
            }
            nns = results.slice(0, GameEnvironment.POPULATION / 16).map(r => r.nn);
            for (let j = nns.length; j < GameEnvironment.POPULATION / 16; j++)
                nns.push(new NN());
            let len = nns.length;
            for (let j = 0; j < len; j++) {
                for (let k = 0; k < len; k++) {
                    if (j != k) {
                        let nn = new NN(nns[j], nns[k]);
                        nn.TryMutate();
                        nns.push(nn);
                    }
                }
            }
            for (let i = nns.length; i < GameEnvironment.POPULATION; i++) {
                let nn = new NN(nns[i % GameEnvironment.POPULATION]);
                nn.TryMutate();
                nns.push(nn);
            }
            if (results[0].completed > 80)
                level++;
        }
    }
    Simulate(nns, level) {
        let scores = [];
        for (let i = 0; i < nns.length; i++)
            scores[i] = { nn: nns[i], score: 0, completed: 0 };
        for (let a = 0; a < 100; a++) {
            this._time = 0;
            let round = new RoundEnvironment(this);
            if (a % 20 == 0) {
                round.Start.Pos = new Vector(this.Width / 2 + Math.random() * 50, 0);
                round.Finish.Pos = new Vector(this.Width / 2 + Math.random() * 50, this.Height);
            }
            else if (a % 20 == 10) {
                round.Finish.Pos = new Vector(round.Start.Pos.X, this.Height);
            }
            let agents = [];
            for (let i = 0; i < nns.length; i++) {
                let inputs = [];
                inputs[0] = round.Start.Pos.X / this.Width;
                inputs[1] = round.Finish.Pos.X / this.Width;
                let outputs = nns[i].Execute(inputs);
                if (outputs[0] > 1 || outputs[1] > 1)
                    continue;
                let options = {};
                options.angle = outputs[0] * 90 + 90;
                options.initSpeed = outputs[1] * 5 + 5;
                options.canParachute = outputs[2] > outputs[3];
                let char = round.Drop("agent " + i, options);
                agents.push({ char: char, index: i });
            }
            if (Object.keys(agents).length == 0)
                return [];
            while (agents.some(a => !a.char.IsOnGround)) {
                this._time += 16;
                round.Tick(0.016);
            }
            for (let i = 0; i < agents.length; i++) {
                scores[agents[i].index].score += agents[i].char.DistanceFromFlag > level ? agents[i].char.DistanceFromFlag : 0;
                scores[agents[i].index].completed += agents[i].char.DistanceFromFlag > level ? 1 : 0;
            }
        }
        return scores.sort((a, b) => b.score - a.score);
    }
    GetTime() {
        return this._time;
    }
}
GameEnvironment.POPULATION = 128;
class WorldEnvironment {
    constructor(game) {
        this.Game = game;
        this.Objects = [];
    }
    Spawn(obj) {
        if (obj === undefined || obj === null)
            return;
        let index = this.Objects.findIndex(o => o.Id == obj.Id);
        if (index >= 0)
            this.Objects[index];
        let spawned = false;
        let zIndex = obj.GetZIndex();
        for (let i = 0; i < this.Objects.length; i++) {
            if (zIndex < this.Objects[i].GetZIndex()) {
                this.Objects.splice(i, 0, obj);
                spawned = true;
                break;
            }
        }
        if (!spawned)
            this.Objects.push(obj);
        obj.OnSpawn(this);
    }
    Despawn(obj) {
        if (obj === undefined || obj === null)
            return;
        let index = this.Objects.findIndex(o => o.Id == obj.Id);
        if (index < 0)
            return;
        this.Objects.splice(index, 1);
        obj.OnDespawn();
    }
    Tick(time) {
        for (let obj of this.Objects) {
            obj.SaveMeasures();
        }
        for (let obj of this.Objects) {
            obj.PreTick(time);
        }
        for (let obj of this.Objects) {
            obj.Tick(time);
        }
        for (let obj of this.Objects) {
            obj.PostTick(time);
        }
    }
}
class RoundEnvironment extends WorldEnvironment {
    constructor(game) {
        super(game);
        this.Start = new StartEntity();
        this.Finish = new FinishEntity();
        this.Winner = null;
        this.WinnerDistance = 0;
        this._droppedCharacters = {};
        this.Spawn(this.Start);
        this.Spawn(this.Finish);
    }
    Drop(nickname, options) {
        if (nickname in this._droppedCharacters)
            return this._droppedCharacters[nickname];
        let character = new CharacterEntity(nickname);
        character.Pos = new Vector(this.Start.Pos.X, 0);
        if (options.canParachute !== undefined)
            character.CanParachute = options.canParachute;
        if (options.angle !== undefined)
            character.SetAngle(options.angle);
        if (options.initSpeed !== undefined)
            character.SetInitialSpeed(options.initSpeed);
        character.OnLand = () => this.CheckVictory(character);
        this.Spawn(character);
        this._droppedCharacters[nickname] = character;
        return character;
    }
    CheckVictory(character) {
        if (!character.IsOnGround)
            return;
        let landWidth = Math.max(this.Finish.Pos.X, this.Game.Width - this.Finish.Pos.X);
        let distanceToFlag = Math.abs(this.Finish.Pos.X - character.Pos.X);
        let percent = 100 - distanceToFlag / landWidth * 100;
        character.DistanceFromFlag = percent;
        if (percent > this.WinnerDistance || this.Winner === null) {
            if (this.Winner !== null)
                this.Winner.OnLose();
            this.WinnerDistance = percent;
            this.Winner = character;
            character.OnWin();
        }
        else
            character.OnLose();
    }
    Despawn(obj) {
        super.Despawn(obj);
        if (obj instanceof CharacterEntity && obj.Nickname in this._droppedCharacters) {
            delete this._droppedCharacters[obj.Nickname];
            if (this.Winner == obj) {
                this.Winner = null;
                this.WinnerDistance = 0;
                for (let nickname in this._droppedCharacters) {
                    this.CheckVictory(this._droppedCharacters[nickname]);
                }
            }
        }
    }
}
class StartEntity extends AObject {
    constructor() {
        super();
        this.GetZIndex = () => 0;
        this.Size = new Vector(32, 32);
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), 0);
    }
    Tick(time) { }
}
class FinishEntity extends AObject {
    constructor() {
        super();
        this.GetZIndex = () => 0;
        this.Size = new Vector(128, 128);
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), world.Game.Height);
    }
    Tick(time) { }
}
class CharacterEntity extends APhysicable {
    constructor(nickname) {
        super();
        this.GetZIndex = () => 2;
        this.Nickname = nickname;
        this.EdgeBounces = 0;
        this.Size = new Vector(64, 64);
        this.CollisionRadius = 24;
        this.IsOnGround = false;
        this.IsWinner = false;
        this.DistanceFromFlag = 0;
        this.CanParachute = false;
        this._isFalling = true;
        this._isParachuting = false;
        this._isRolling = false;
        this._parachute = null;
        this._parachutingStabilizedAngleTime = 0;
        this.SetAngle(Math.random() * 360);
        this.SetInitialSpeed(Math.random() * 10);
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this._gravityForce = new Vector(0, world.Game.Height);
        this._dragForce = new Vector();
        this._rollingForce = new Vector();
        this.ApplyForce("gravity", this._gravityForce);
        this.ApplyForce("drag", this._dragForce);
    }
    SetAngle(angle) {
        angle %= 360;
        angle = 180 - Math.abs(angle - 180);
        let rad = angle * (Math.PI / 180);
        this.RotationAngle = rad;
        let length = Math.max(1, this.Velocity.Length());
        this.Velocity = new Vector(Math.cos(rad), Math.sin(rad)).Scale(length);
    }
    SetInitialSpeed(factor) {
        if (factor < 0)
            factor = 0;
        if (factor > 10)
            factor = 10;
        factor *= 35;
        factor *= Math.abs(this.Velocity.Normalize().X) + 1;
        factor += 200;
        this.Velocity = this.Velocity.Normalize().Scale(factor);
    }
    OnCollisionWith(obj) { }
    CanCollideWith(obj) {
        return false;
    }
    Tick(time) {
        if (this.IsOnGround)
            return;
        if ((this.Pos.X - this.Size.X / 2 < 0 && this.Velocity.X < 0) ||
            (this.Pos.X + this.Size.X / 2 > this.World.Game.Width && this.Velocity.X > 0)) {
            this.EdgeBounces++;
            this.Velocity = this.Velocity.ScaleX(-1);
            if (this._isRolling) {
                this._rollingForce = this._rollingForce.ScaleX(-1);
                this.ApplyForce("rolling", this._rollingForce);
            }
        }
        if (this._isFalling)
            this.Falling(time);
        if (this._isParachuting)
            this.Parachuting(time);
        else if (this._isRolling)
            this.Rolling(time);
        super.Tick(time);
    }
    OnWin() {
        this.IsWinner = true;
    }
    OnLose() {
        this.IsWinner = false;
    }
    Rotate(time) {
        let angle = time * Math.PI * (this.Velocity.X / (this.Size.X * 2));
        this.RotationAngle %= Math.PI * 2;
        if (this.RotationAngle < -Math.PI)
            this.RotationAngle += Math.PI * 2;
        if (this.RotationAngle > Math.PI)
            this.RotationAngle -= Math.PI * 2;
        this.RotationAngle += angle;
        return angle;
    }
    Falling(time) {
        this.Rotate(time);
        if (this.CanParachute && this.Pos.Y > this.World.Game.Height * 0.2) {
            this._isFalling = false;
            this._isParachuting = true;
            this._parachute = new ParachuteEntity(this);
            this._parachute.Pos = this.Pos;
            this._parachute.Velocity = this.Velocity.Scale(-0.8);
            this.World.Spawn(this._parachute);
        }
        else if (this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height) {
            if (this.Velocity.Y > 0) {
                if (this.Velocity.Y < this.Size.Y)
                    this.Roll();
                else {
                    this.Velocity = this.Velocity.ScaleY(-0.75).ScaleX(0.75);
                }
            }
        }
    }
    Parachuting(time) {
        if (this.Velocity.Y > 100 && this._gravityForce.Y >= 0) {
            this._dragForce = new Vector(0, -this.World.Game.Height * 2);
            this.ApplyForce("drag", this._dragForce);
        }
        else if (this.Velocity.Y < 100 && this._gravityForce.Y != 0) {
            this._dragForce = new Vector();
            this.ApplyForce("drag", this._dragForce);
        }
        if (Math.abs(this.RotationAngle) > Math.PI / 8) {
            this._parachutingStabilizedAngleTime = this.LifeTime;
            this.RotationAngle -= Math.sign(this.RotationAngle) * Math.PI * 4 * time;
        }
        else
            this.RotationAngle = Math.sin((this.LifeTime - this._parachutingStabilizedAngleTime) / 1000) * Math.PI / 8;
        if (this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height) {
            this._parachute.Velocity = this.PrevVelocity;
            this.World.Despawn(this._parachute);
            this.Roll();
        }
    }
    Roll() {
        this._isFalling = false;
        this._isParachuting = false;
        this._isRolling = true;
        this.Pos = new Vector(this.Pos.X, this.World.Game.Height - this.Size.Y / 2);
        this.Velocity = new Vector(this.Velocity.X, 0);
        this.RemoveForce("gravity");
        this.RemoveForce("drag");
        if (-Math.PI * 0.65 < this.RotationAngle && this.RotationAngle < Math.PI * 0.65)
            this._rollingForce = new Vector(Math.sign(this.RotationAngle) * -this.Size.X, 0);
        else
            this._rollingForce = new Vector(Math.sign(this.Velocity.X) * this.Size.X, 0);
        this.ApplyForce("rolling", this._rollingForce);
    }
    Rolling(time) {
        let angle = this.Rotate(time);
        if (Math.sign(this.RotationAngle) != Math.sign(this.RotationAngle - angle))
            this.Landed();
    }
    Landed() {
        this._isFalling = false;
        this._isParachuting = false;
        this._isRolling = false;
        this.IsOnGround = true;
        this.Pos = new Vector(this.Pos.X, this.World.Game.Height - this.Size.Y / 2);
        this.Velocity = new Vector();
        this.RemoveForce("rolling");
        this.RemoveForce("gravity");
        this.RotationAngle = 0;
        if (this.OnLand())
            this.OnLand();
    }
}
class ParachuteEntity extends AAttachable {
    constructor(character) {
        super();
        this.GetZIndex = () => 1;
        this.Size = new Vector(204, 120);
        this.AttachmentDistance = 128;
        this._character = character;
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this.Velocity = new Vector(0, -world.Game.Height);
        this.AttachTo(this._character);
    }
    OnTension(prevPos, time) {
    }
    OnCollisionWith(obj) {
    }
    CanCollideWith(obj) {
        return false;
    }
    PostTick(time) {
        super.PostTick(time);
        if (this.IsAttached) {
            let direction = this._character.Pos.Sub(this.Pos);
            this.RotationAngle = direction.Angle() - Math.PI / 2;
        }
    }
}
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
//# sourceMappingURL=index.js.map