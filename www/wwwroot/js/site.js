class AudioDevice {
    constructor(volume) {
        this._tracks = {};
        this._channels = {};
        this._volume = volume;
        this.Load("/audio/parachute.ogg");
        this.Load("/audio/landing.ogg");
        this.Load("/audio/woo.ogg");
        this.Load("/audio/spring0.ogg");
        this.Load("/audio/spring1.ogg");
        this.Load("/audio/spring2.ogg");
        this.Load("/audio/spring3.ogg");
    }
    Load(uri) {
        let name = uri;
        let slashIndex = name.lastIndexOf("/");
        if (slashIndex >= 0)
            name = name.substr(slashIndex + 1);
        let dotIndex = name.lastIndexOf(".");
        if (dotIndex >= 0)
            name = name.substr(0, dotIndex);
        this._tracks[name] = [];
        for (let i = 0; i < AudioDevice._channelsCount; i++) {
            let audio = new Audio(uri);
            audio.volume = this._volume;
            this._tracks[name].push(audio);
        }
        this._channels[name] = 0;
    }
    Play(name) {
        if (name in this._tracks) {
            let audio = this._tracks[name][this._channels[name]];
            audio.play();
            this._channels[name] = (this._channels[name] + 1) % AudioDevice._channelsCount;
        }
    }
}
AudioDevice._channelsCount = 8;
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
                this.Weights.push(Math.random() < 0.5 ? parent1.Weights[i] : parent2.Weights[i]);
            this.Bias = [];
            for (let i = 0; i < parent1.Bias.length && i < parent2.Bias.length; i++)
                this.Bias.push(Math.random() < 0.5 ? parent1.Bias[i] : parent2.Bias[i]);
        }
    }
    TryMutate() {
        for (let i = 0; i < this.Weights.length; i++) {
            if (Math.random() <= NN.MUTATE_CHANCE)
                this.Weights[i] *= (Math.random() * 0.4 + 0.8) * Math.sign(Math.random() - 0.5);
        }
        for (let i = 0; i < this.Bias.length; i++) {
            if (Math.random() <= NN.MUTATE_CHANCE)
                this.Bias[i] *= (Math.random() * 0.4 + 0.8) * Math.sign(Math.random() - 0.5);
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
NN.OUTPUT_NEUROUNS = 2;
NN.MUTATE_CHANCE = 0.2;
class Sprite {
    constructor(uri) {
        let img = new Image();
        img.onload = () => {
            this._width = img.width;
            this._height = img.height;
            this._image = img;
            if (this.OnLoad)
                this.OnLoad();
        };
        img.onerror = () => {
            if (this.OnError)
                this.OnError();
        };
        img.src = uri;
        this.Uri = uri;
        this._isAnimation = false;
    }
    get Size() { return new Vector(this._width, this._height); }
    GetName() {
        let ret = this.Uri;
        let dotIndex = this.Uri.lastIndexOf(".");
        if (dotIndex >= 0)
            ret = ret.substr(0, dotIndex);
        let slashIndex = ret.lastIndexOf("/");
        if (slashIndex >= 0)
            ret = ret.substr(slashIndex + 1);
        return ret;
    }
    Animate(width, height, fps, framesCount = null) {
        this._isAnimation = true;
        this._columnsCount = Math.floor(this._width / width);
        this._rowsCount = Math.floor(this._height / height);
        if (framesCount === undefined || framesCount === null)
            this._framesCount = this._columnsCount * this._rowsCount;
        else
            this._framesCount = framesCount;
        this._animationTime = 1000 / fps * this._framesCount;
        this._width = width;
        this._height = height;
    }
    Draw(ctx, x, y, width, height, time = 0) {
        let b = this.GetFrameBoundary(time);
        ctx.drawImage(this._image, b.x, b.y, b.w, b.h, x, y, width, height);
    }
    DrawDistored(ctx, x, y, width, height, distortion, time = 0) {
        let quality = 2 + renderQuality;
        let map = [];
        for (let iy = 0; iy < quality; iy++) {
            map[iy] = [];
            for (let ix = 0; ix < quality; ix++) {
                let dx = ix / (quality - 1);
                let dy = iy / (quality - 1);
                map[iy][ix] = distortion(dx, dy);
            }
        }
        let b = this.GetFrameBoundary(time);
        let sourceTileWidth = b.w / (quality - 1);
        let sourceTileHeight = b.h / (quality - 1);
        let destinationTileWidth = width / (quality - 1);
        let destinationTileHeight = height / (quality - 1);
        for (let iy = 0; iy < map.length - 1; iy++) {
            for (let ix = 0; ix < map[iy].length - 1; ix++) {
                let tx1 = b.x + ix * sourceTileWidth;
                let ty1 = b.y + iy * sourceTileHeight;
                let tx2 = tx1 + sourceTileWidth;
                let ty2 = ty1 + sourceTileHeight;
                let px1 = x + ix * destinationTileWidth + map[iy][ix].x - 0.2;
                let py1 = y + iy * destinationTileHeight + map[iy][ix].y - 0.2;
                let px2 = x + ix * destinationTileWidth + destinationTileWidth + map[iy][ix + 1].x + 0.2;
                let py2 = y + iy * destinationTileHeight + map[iy][ix + 1].y - 0.2;
                let px3 = x + ix * destinationTileWidth + map[iy + 1][ix].x - 0.2;
                let py3 = y + iy * destinationTileHeight + destinationTileHeight + map[iy + 1][ix].y + 0.2;
                let px4 = x + ix * destinationTileWidth + destinationTileWidth + map[iy + 1][ix + 1].x + 0.2;
                let py4 = y + iy * destinationTileHeight + destinationTileHeight + map[iy + 1][ix + 1].y + 0.2;
                this.DrawTriangle(ctx, tx1, ty1, tx2, ty1, tx1, ty2, px1, py1, px2, py2, px3, py3);
                this.DrawTriangle(ctx, tx2, ty1, tx2, ty2, tx1, ty2, px2, py2, px4, py4, px3, py3);
            }
        }
    }
    // DrawTriangle uses `Affine Transformation`
    DrawTriangle(ctx, sx1, sy1, sx2, sy2, sx3, sy3, dx1, dy1, dx2, dy2, dx3, dy3) {
        // matrix A^-1
        let mA = [[], [], []];
        mA[0][0] = (sy2 - sy3) / (sx3 * sy1 - sx2 * sy1 + sx1 * sy2 + sx2 * sy3 - sx1 * sy3 - sx3 * sy2);
        mA[0][1] = (-sx2 + sx3) / (-sx2 * sy1 + sx3 * sy1 - sx3 * sy2 + sx1 * sy2 - sx1 * sy3 + sx2 * sy3);
        mA[0][2] = (-sx3 * sy2 + sx2 * sy3) / (sx3 * sy1 - sx2 * sy1 + sx1 * sy2 + sx2 * sy3 - sx1 * sy3 - sx3 * sy2);
        mA[1][0] = -(sy1 - sy3) / (sx3 * sy1 - sx2 * sy1 + sx1 * sy2 + sx2 * sy3 - sx1 * sy3 - sx3 * sy2);
        mA[1][1] = (sx1 - sx3) / (sx3 * sy1 - sx2 * sy1 + sx1 * sy2 + sx2 * sy3 - sx1 * sy3 - sx3 * sy2);
        mA[1][2] = (sx3 * sy1 - sx1 * sy3) / (-sx2 * sy1 + sx3 * sy1 - sx3 * sy2 + sx1 * sy2 - sx1 * sy3 + sx2 * sy3);
        mA[2][0] = (sy1 - sy2) / (-sx2 * sy1 + sx3 * sy1 - sx3 * sy2 + sx1 * sy2 - sx1 * sy3 + sx2 * sy3);
        mA[2][1] = (-sx1 + sx2) / (-sx2 * sy1 + sx3 * sy1 - sx3 * sy2 + sx1 * sy2 - sx1 * sy3 + sx2 * sy3);
        mA[2][2] = -(sx2 * sy1 - sx1 * sy2) / (-sx2 * sy1 + sx3 * sy1 - sx3 * sy2 + sx1 * sy2 - sx1 * sy3 + sx2 * sy3);
        // matrix X... was here, but it not nesesery to declare it ¯\_(ツ)_/¯
        // matrix T=X*A^-1 ... it should be 3x3, but we interested in only on 2x3
        let mT = [[], []];
        mT[0][0] = dx1 * mA[0][0] + dx2 * mA[1][0] + dx3 * mA[2][0];
        mT[0][1] = dx1 * mA[0][1] + dx2 * mA[1][1] + dx3 * mA[2][1];
        mT[0][2] = dx1 * mA[0][2] + dx2 * mA[1][2] + dx3 * mA[2][2];
        mT[1][0] = dy1 * mA[0][0] + dy2 * mA[1][0] + dy3 * mA[2][0];
        mT[1][1] = dy1 * mA[0][1] + dy2 * mA[1][1] + dy3 * mA[2][1];
        mT[1][2] = dy1 * mA[0][2] + dy2 * mA[1][2] + dy3 * mA[2][2];
        let xAvr = (sx1 + sx2 + sx3) / 3;
        let yAvr = (sy1 + sy2 + sy3) / 3;
        ctx.save();
        ctx.transform(mT[0][0], mT[1][0], mT[0][1], mT[1][1], mT[0][2], mT[1][2]);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1 + Math.sign(sy1 - yAvr));
        ctx.lineTo(sx1 + Math.sign(sx1 - xAvr), sy1);
        ctx.lineTo(sx2, sy2 + Math.sign(sy2 - yAvr));
        ctx.lineTo(sx2 + Math.sign(sx2 - xAvr), sy2);
        ctx.lineTo(sx3, sy3 + Math.sign(sy3 - yAvr));
        ctx.lineTo(sx3 + Math.sign(sx3 - xAvr), sy3);
        ctx.clip();
        ctx.drawImage(this._image, 0, 0);
        ctx.restore();
    }
    GetFrameBoundary(time) {
        if (this._isAnimation) {
            time %= this._animationTime;
            let frame = Math.floor(time / this._animationTime * this._framesCount);
            let column = frame % this._columnsCount;
            let row = Math.floor(frame / this._columnsCount);
            return { x: column * this._width + 0.5, y: row * this._height + 0.5, w: this._width - 1, h: this._height - 1 };
        }
        else
            return { x: 0, y: 0, w: this._width, h: this._height };
    }
}
class SpriteCollection {
    constructor(directory = "", parent = undefined) {
        this._collection = {};
        this._childs = {};
        this._directory = directory;
        this._parent = parent;
    }
    GetFullnameDir() {
        if (this._parent !== undefined)
            return this._parent.GetFullnameDir() + this._directory + "/";
        else
            return this._directory + "/";
    }
    Load(uris) {
        return new Promise((resolver) => {
            let found = 0;
            let loaded = 0;
            for (let key in uris) {
                let item = uris[key];
                if (typeof item === "string") {
                    if (!(key in this._collection)) {
                        found++;
                        let sprite = new Sprite(this.GetFullnameDir() + item);
                        sprite.OnLoad = () => {
                            loaded++;
                            if (loaded == found)
                                resolver(0);
                        };
                        this._collection[sprite.GetName()] = sprite;
                    }
                }
                else if (typeof item === "object") {
                    if (!(key in this._childs)) {
                        found++;
                        let collection = new SpriteCollection(key, this);
                        collection.Load(item).then(() => {
                            loaded++;
                            if (loaded == found)
                                resolver(0);
                        });
                        this._childs[key] = collection;
                    }
                }
            }
            if (found == 0)
                resolver(0);
        });
    }
    Get(path) {
        while (path[0] == "/")
            path = path.substring(1);
        let slashIndex = path.indexOf("/");
        if (slashIndex < 0) {
            if (path in this._collection)
                return this._collection[path];
            else if (path in this._childs)
                return this._childs[path].GetRandom();
            else
                return undefined;
        }
        else {
            let dir = path.substring(0, slashIndex);
            path = path.substring(slashIndex + 1);
            if (dir in this._childs)
                return this._childs[dir].Get(path);
            else
                return undefined;
        }
    }
    GetRandom() {
        let values = Object.keys(this._collection).map(key => this._collection[key]);
        return values[Math.floor(Math.random() * values.length)];
    }
}
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
    constructor(sprite) {
        this.Id = ++AObject.ID_AI;
        this.Pos = new Vector(0, 0);
        this.RotationAngle = 0;
        this.Scale = new Vector(1, 1);
        this.PrevPos = new Vector(0, 0);
        this.PrevRotationAngle = 0;
        this.PrevScale = new Vector(1, 1);
        this.Opacity = 1;
        this.Size = new Vector(64, 64);
        this.Sprite = sprite;
    }
    get LifeTime() { return performance.now() - this._spawnTime; }
    OnSpawn(world) {
        this.World = world;
        this._spawnTime = performance.now();
    }
    OnDespawn() {
        this.World = undefined;
    }
    SaveMeasures() {
        this.PrevPos = this.Pos;
        this.PrevRotationAngle = this.RotationAngle;
        this.PrevScale = this.Scale;
    }
    PreDraw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(this.Opacity, 0), 1);
        ctx.translate(this.Pos.X, this.Pos.Y);
        if (this.RotationAngle != 0)
            ctx.rotate(this.RotationAngle);
        if (this.Scale.X != 1 || this.Scale.Y != 1)
            ctx.scale(this.Scale.X, this.Scale.Y);
    }
    Draw(ctx) {
        if (this.Sprite)
            this.Sprite.Draw(ctx, -this.Size.X / 2, -this.Size.Y / 2, this.Size.X, this.Size.Y, this.LifeTime);
    }
    PostDraw(ctx) {
        ctx.restore();
    }
    PreTick(time) { }
    PostTick(time) { }
}
AObject.ID_AI = 0;
class ACollidable extends AObject {
    constructor(sprite) {
        super(sprite);
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
    constructor(sprite) {
        super(sprite);
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
    constructor(sprite) {
        super(sprite);
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
    constructor() {
        this._canvas = canvas;
        this.Width = this._canvas.width;
        this.Height = this._canvas.height;
        this._context = this._canvas.getContext("2d");
        this._context.imageSmoothingEnabled = true;
        this._context.imageSmoothingQuality = "high";
        this._context.textBaseline = "middle";
        this._context.textAlign = "center";
        this._context.font = '24px Sans-serif';
        this._context.strokeStyle = 'black';
        this._channel = twitchChannel;
        this._connectionType = connectionType.toLowerCase();
        this.Sprites = new SpriteCollection(spritesPath);
        this.Sprites.Load(images)
            .then(() => {
            this.Init();
            this.Start();
        });
        this.Audio = new AudioDevice(audioVolume);
    }
    Init() {
        this.Round = new RoundEnvironment(this, hideCooldown);
        this._prevFrameTime = performance.now();
        this.SetupAnimations(animations);
        if (this._channel) {
            if (this._connectionType === "ws" || this._connectionType === "websocket")
                this._client = new WebSocketClient(this, this._channel);
            else
                this._client = new ServerSideEventClient(this, this._channel);
        }
        else
            this.Simulate();
    }
    Simulate() {
        let index = 0;
        let nicknames = [
            "Liam",
            "Olivia",
            "Noah",
            "Emma",
            "Oliver",
            "Ava",
            "William",
            "Sophia",
            "Elijah",
            "Isabella",
            "James",
            "Charlotte",
            "Benjamin",
            "Amelia",
            "Lucas",
            "Mia",
            "Mason",
            "Harper",
            "Ethan",
            "Evelyn"
        ];
        setInterval(() => {
            this.Round.Reset();
        }, 35000);
        setInterval(() => {
            let char = game.Round.Drop(nicknames[index++], { canParachute: Math.random() < 0.55 });
            if (index >= nicknames.length)
                index = 0;
            setTimeout(() => {
                game.Round.Despawn(char);
            }, 30000);
        }, 3500);
    }
    SetupAnimations(info) {
        for (let i of info)
            this.Sprites.Get(i.path).Animate(i.width, i.height, i.fps, i.framesCount);
    }
    Start() {
        window.requestAnimationFrame(() => this.GameLoop());
    }
    GameLoop() {
        let currentTime = performance.now();
        let elapsedTime = (currentTime - this._prevFrameTime) / 1000;
        this._prevFrameTime = currentTime;
        this.Round.Tick(elapsedTime);
        this._context.clearRect(0, 0, this.Width, this.Height);
        this.Round.Draw(this._context);
        window.requestAnimationFrame(() => this.GameLoop());
    }
}
class WorldEnvironment {
    constructor(game) {
        this.Game = game;
        this.Objects = [];
        this._despawning = [];
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
    Despawn(obj, immediately = false) {
        if (obj === undefined || obj === null)
            return;
        let index = this.Objects.findIndex(o => o.Id == obj.Id);
        if (index < 0)
            return;
        if (immediately) {
            this.Objects.splice(index, 1);
            obj.OnDespawn();
        }
        else
            this._despawning.push(obj);
    }
    IsSpawned(obj) {
        return this.Objects.some(o => o.Id == obj.Id);
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
        for (let i = 0; i < this._despawning.length; i++) {
            this._despawning[i].Opacity -= 2 * time;
            if (this._despawning[i].Opacity < 0) {
                let obj = this._despawning.splice(i, 1)[0];
                i--;
                let index = this.Objects.findIndex(o => o.Id == obj.Id);
                if (index < 0)
                    continue;
                this.Objects.splice(index, 1);
                obj.OnDespawn();
            }
        }
    }
    Draw(ctx) {
        for (let obj of this.Objects) {
            obj.PreDraw(ctx);
            obj.Draw(ctx);
            obj.PostDraw(ctx);
        }
    }
}
class RoundEnvironment extends WorldEnvironment {
    constructor(game, hideCooldown) {
        super(game);
        this._hideCooldown = hideCooldown;
        this._showTime = performance.now();
        this.Start = new StartEntity();
        this.Finish = new FinishEntity();
        this._winner = null;
        this._winnerDistance = 0;
        this._isHidden = false;
        this._droppedCharacters = {};
        this._actionQueue = [];
        this.Spawn(this.Start);
        this.Spawn(this.Finish);
    }
    Tick(time) {
        super.Tick(time);
        if (this._actionQueue.length > 0)
            this._actionQueue.splice(0, 1)[0]();
        if (!this._isHidden && this._showTime + this._hideCooldown < performance.now()) {
            this._showTime = performance.now();
            this.Hide();
        }
    }
    Show() {
        if (!this.Start.IsReady || !this.Finish.IsReady) {
            this._actionQueue.push(() => this.Show());
            return;
        }
        this._showTime = performance.now();
        this._isHidden = false;
        if (this.Start.IsHidden)
            this.Start.Show();
        if (this.Finish.IsHidden)
            this.Finish.Show();
    }
    Hide() {
        if (!this.Start.IsReady || !this.Finish.IsReady) {
            this._actionQueue.push(() => this.Hide());
            return;
        }
        for (let obj of this.Objects) {
            if (obj.Id != this.Start.Id && obj.Id != this.Finish.Id)
                this.Despawn(obj);
        }
        this._isHidden = true;
        if (!this.Start.IsHidden)
            this.Start.Hide();
        if (!this.Finish.IsHidden)
            this.Finish.Hide();
    }
    Reset() {
        if (!this.Start.IsReady || !this.Finish.IsReady) {
            this._actionQueue.push(() => this.Reset());
            return;
        }
        for (let obj of this.Objects) {
            if (obj.Id != this.Start.Id && obj.Id != this.Finish.Id)
                this.Despawn(obj);
        }
        this._showTime = performance.now();
        this._isHidden = false;
        if (this.Start.IsHidden)
            this.Start.Show();
        else
            this.Start.Reset();
        if (this.Finish.IsHidden)
            this.Finish.Show();
        else
            this.Finish.Reset();
    }
    Drop(nickname, options) {
        if (!this.Start.IsReady || !this.Finish.IsReady) {
            this._actionQueue.push(() => this.Drop(nickname, options));
            return;
        }
        if (this._isHidden) {
            this.Show();
            this._actionQueue.push(() => this.Drop(nickname, options));
            return;
        }
        this._showTime = performance.now();
        if (nickname in this._droppedCharacters && !options.ignoreDropped)
            return this._droppedCharacters[nickname];
        if (options.sprite === undefined)
            options.sprite = this.Game.Sprites.Get("characters/neko");
        let character = new CharacterEntity(nickname, options.sprite);
        character.Pos = new Vector(this.Start.Pos.X, 0);
        if ("angle" in options)
            character.SetAngle(options.angle);
        if ("initSpeed" in options)
            character.SetInitialSpeed(options.initSpeed);
        if ("bits" in options)
            character.Charge(options.bits);
        if ("canParachute" in options)
            character.CanParachute = options.canParachute;
        if ("isCake" in options && options.isCake)
            character.MakeACake();
        character.OnLand = () => this.CheckVictory(character);
        this.Spawn(character);
        this._droppedCharacters[nickname + (options.ignoreDropped ? "/" + character.Id : "")] = character;
        return character;
    }
    CheckVictory(character) {
        if (!character.IsOnGround)
            return;
        let landWidth = Math.max(this.Finish.Pos.X, this.Game.Width - this.Finish.Pos.X);
        let distanceToFlag = Math.abs(this.Finish.Pos.X - character.Pos.X);
        let percent = 100 - distanceToFlag / landWidth * 100;
        character.DistanceFromFlag = percent;
        if (percent > this._winnerDistance || this._winner === null || !this.IsSpawned(this._winner)) {
            if (this._winner !== null)
                this._winner.OnLose();
            this._winnerDistance = percent;
            this._winner = character;
            character.OnWin();
        }
        else
            character.OnLose();
    }
    Spawn(obj) {
        if (obj.Id == this.Start.Id || obj.Id == this.Finish.Id)
            super.Spawn(obj);
        else if (!this._isHidden && this.Start.IsReady && this.Finish.IsReady)
            super.Spawn(obj);
    }
    Despawn(obj) {
        super.Despawn(obj);
        if (obj instanceof CharacterEntity && obj.Nickname in this._droppedCharacters) {
            delete this._droppedCharacters[obj.Nickname];
            if (this._winner == obj) {
                this._winner = null;
                this._winnerDistance = 0;
                for (let nickname in this._droppedCharacters) {
                    this.CheckVictory(this._droppedCharacters[nickname]);
                }
            }
        }
    }
}
class Particle extends APhysicable {
    constructor(sprite) {
        super(sprite);
        this.LifeTimeLength = 1000;
    }
    Tick(time) {
        super.Tick(time);
        if (this.LifeTime > this.LifeTimeLength)
            this.World.Despawn(this);
    }
    OnCollisionWith(obj) { }
    CanCollideWith(obj) {
        return false;
    }
    GetZIndex() {
        return 0;
    }
}
class StarParticle extends Particle {
    constructor(pos, velocity) {
        super(null);
        this.Pos = pos;
        this.Velocity = velocity.Add(Vector.Random().Scale((Math.random() + 4) * 8));
        this.Size = new Vector(32, 32);
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this.Sprite = world.Game.Sprites.Get("particles/star");
    }
    Tick(time) {
        super.Tick(time);
        this.RotationAngle = Math.PI / 8 * Math.sin(this.LifeTime / 200);
        if ((this.Pos.X - this.Size.X / 2 < 0 && this.Velocity.X < 0) ||
            (this.Pos.X + this.Size.X / 2 > this.World.Game.Width && this.Velocity.X > 0))
            this.Velocity = this.Velocity.ScaleX(-1);
        if ((this.Pos.Y - this.Size.Y / 2 < 0 && this.Velocity.Y < 0) ||
            (this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height && this.Velocity.Y > 0))
            this.Velocity = this.Velocity.ScaleY(-1);
    }
}
class StartEntity extends AObject {
    constructor() {
        super(null);
        this.GetZIndex = () => 0;
        this.Size = new Vector(32, 32);
        this.Init();
    }
    Init() {
        this._isShowing = false;
        this._isHiding = false;
        this._isResetting = false;
        this.IsHidden = false;
        this.IsReady = false;
        this._animationTime = this.LifeTime;
        this.RotationAngle = 0;
        this._angularVelocity = 0;
        this._resetStage = 0;
        this._isClockwise = false;
        this._circlePos1 = new Vector();
        this._circlePos2 = new Vector();
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this.Sprite = world.Game.Sprites.Get("arrow");
        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), 0);
        this.IsHidden = false;
        this.IsReady = true;
    }
    Tick(time) {
        if (this._isHiding) {
            if (this.Pos.Y < -this.Size.Y || this.Pos.Y > this.World.Game.Height + this.Size.Y ||
                this.Pos.X < -this.Size.X || this.Pos.X > this.World.Game.Width + this.Size.X) {
                this._isHiding = false;
                this.IsHidden = true;
                this.IsReady = true;
                this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), -this.Size.Y * 2);
            }
            else {
                this._angularVelocity = Math.sin(this.LifeTime / 1000) * Math.PI * 2;
                this._angularVelocity += (Math.random() - 0.5) * 2 * Math.PI * time;
                this.RotationAngle += this._angularVelocity * time;
                this.Pos = this.Pos.Add(Vector.FromAngle(this.RotationAngle + Math.PI / 2).Scale(time * this.Size.Y * 16));
            }
        }
        if (this._isShowing) {
            if (this.Pos.Y > 0) {
                this._isShowing = false;
                this.IsReady = true;
                this.Pos = new Vector(this.Pos.X, 0);
            }
            else {
                this.Pos = this.Pos.Add(new Vector(0, time * this.Size.Y * 8));
            }
        }
        if (this._isResetting) {
            if (this._resetStage < 4)
                this.Pos = this.Pos.Add(Vector.FromAngle(this.RotationAngle + Math.PI / 2).Scale(time * this.Size.Y * 16));
            if (this._resetStage == 0) {
                if (this.Pos.Y > this._circlePos1.Y)
                    this._resetStage = 1;
            }
            if (this._resetStage == 1) {
                let direction = this.Pos.Sub(this._circlePos1);
                let distance = direction.Length();
                if (distance > this.Size.Y * 2)
                    this.Pos = this._circlePos1.Add(direction.Normalize().Scale(this.Size.Y * 2));
                let angle = direction.Angle();
                if ((this._isClockwise && angle >= Math.PI / 2) ||
                    (!this._isClockwise && angle <= Math.PI / 2)) {
                    this.Pos = new Vector(this.Pos.X, this._circlePos1.Y + this.Size.Y * 2);
                    this.RotationAngle = Math.PI / 2 * (this._isClockwise ? 1 : -1);
                    this._resetStage = 2;
                }
                else
                    this.RotationAngle = angle - (this._isClockwise ? 0 : Math.PI);
            }
            if (this._resetStage == 2) {
                if (this._isClockwise && this.Pos.X < this._circlePos2.X)
                    this._resetStage = 3;
                if (!this._isClockwise && this.Pos.X > this._circlePos2.X)
                    this._resetStage = 3;
            }
            if (this._resetStage == 3) {
                let direction = this.Pos.Sub(this._circlePos2);
                let distance = direction.Length();
                if (distance > this.Size.Y * 2)
                    this.Pos = this._circlePos2.Add(direction.Normalize().Scale(this.Size.Y * 2));
                let angle = direction.Angle();
                if ((this._isClockwise && 0 < angle && angle < Math.PI * 0.25) ||
                    (!this._isClockwise && Math.PI * 0.75 < angle && angle < Math.PI)) {
                    this.Pos = new Vector(this._circlePos2.X + this.Size.X * 2 * (this._isClockwise ? 1 : -1), this.Pos.Y);
                    this.RotationAngle = 0;
                    this._animationTime = this.LifeTime;
                    this._resetStage = 4;
                }
                else
                    this.RotationAngle = angle - (this._isClockwise ? 0 : Math.PI);
            }
            if (this._resetStage == 4) {
                let elapsed = this.LifeTime - this._animationTime;
                this.Pos = new Vector(this.Pos.X, this.Size.Y * 3 + Math.sin(Math.PI / 2 * (elapsed / 200)) * this.Size.Y * 3);
                if (elapsed > 600) {
                    this.Pos = new Vector(this.Pos.X, 0);
                    this.IsReady = true;
                    this._isResetting = false;
                    this._resetStage = 0;
                }
            }
        }
    }
    Show() {
        if (this._isShowing)
            return;
        if (this.IsHidden)
            this.Sprite = this.World.Game.Sprites.Get("arrow");
        this.Init();
        this._isShowing = true;
        this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), -this.Size.Y * 2);
    }
    Hide() {
        if (this._isHiding)
            return;
        this.Init();
        this._isHiding = true;
    }
    Reset() {
        if (this._isResetting)
            return;
        this.Init();
        this._isResetting = true;
        let newPos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), 0);
        this._isClockwise = newPos.X < this.Pos.X;
        this._circlePos1 = new Vector(this.Pos.X + this.Size.X * 2 * (this._isClockwise ? -1 : 1), this.Size.Y * 3);
        this._circlePos2 = new Vector(newPos.X + this.Size.X * 2 * (this._isClockwise ? -1 : 1), this.Size.Y * 3);
    }
    Draw(ctx) {
        if (this.IsHidden)
            return;
        this.Sprite.Draw(ctx, -this.Size.X / 2, this.Size.Y / 8 + Math.sin(this.LifeTime / 1000 * Math.PI) * this.Size.Y / 4, this.Size.X, this.Size.Y, this.LifeTime);
    }
}
class FinishEntity extends AObject {
    constructor() {
        super(null);
        this.GetZIndex = () => 0;
        this.Size = new Vector(128, 128);
        this.Init();
        this.IsReady = true;
    }
    Init() {
        this._isShowing = false;
        this._isHiding = false;
        this._isResetting = false;
        this.IsHidden = false;
        this.IsReady = false;
        this._prevPos = new Vector();
        this._newPos = new Vector();
        this._animationTime = this.LifeTime;
        this._hasChangedSprites = false;
    }
    OnSpawn(world) {
        super.OnSpawn(world);
        this._pole = world.Game.Sprites.Get("flags/pole");
        this._poleRatio = this._pole.Size.Y / this._pole.Size.X;
        this._flag = world.Game.Sprites.Get("flags/flag");
        this._grassHill1 = world.Game.Sprites.Get("flags/grasshill1");
        this._grassHill1Ratio = this._grassHill1.Size.Y / this._grassHill1.Size.X;
        this._grassHill2 = world.Game.Sprites.Get("flags/grasshill2");
        this._grassHill2Ratio = this._grassHill2.Size.Y / this._grassHill2.Size.X;
        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), world.Game.Height);
    }
    Show() {
        if (this._isShowing)
            return;
        if (this.IsHidden) {
            this._pole = this.World.Game.Sprites.Get("flags/pole");
            this._poleRatio = this._pole.Size.Y / this._pole.Size.X;
            this._flag = this.World.Game.Sprites.Get("flags/flag");
            this._grassHill1 = this.World.Game.Sprites.Get("flags/grasshill1");
            this._grassHill1Ratio = this._grassHill1.Size.Y / this._grassHill1.Size.X;
            this._grassHill2 = this.World.Game.Sprites.Get("flags/grasshill2");
            this._grassHill2Ratio = this._grassHill2.Size.Y / this._grassHill2.Size.X;
        }
        this.Init();
        this._isShowing = true;
        this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), this.World.Game.Height + this.Size.Y * 2);
    }
    Hide() {
        if (this._isHiding)
            return;
        this.Init();
        this._isHiding = true;
    }
    Reset() {
        if (this._isResetting)
            return;
        this.Init();
        this._isResetting = true;
        this._prevPos = this.Pos;
        let westDistance = this.Pos.X - 100;
        let eastDistance = (this.World.Game.Width - 200) - (this.Pos.X - 100);
        let min = Math.min(westDistance, eastDistance);
        let max = Math.max(westDistance, eastDistance);
        let distance = Math.floor(Math.max(100, min) + Math.random() * (max - min));
        this._newPos = new Vector(this.Pos.X + distance * Math.sign(eastDistance - westDistance), this.World.Game.Height);
    }
    Tick(time) {
        if (this._isShowing || this._isHiding) {
            let elapsed = this.LifeTime - this._animationTime;
            if (elapsed > 500) {
                if (this._isShowing) {
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height);
                    this._isShowing = false;
                    this.IsReady = true;
                }
                if (this._isHiding) {
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height + this.Size.Y * 2);
                    this._isHiding = false;
                    this.IsHidden = true;
                    this.IsReady = true;
                    this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), this.World.Game.Height + this.Size.Y * 2);
                }
            }
            else {
                if (this._isShowing)
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height + this.Size.Y * 2 * (1 - elapsed / 500));
                if (this._isHiding)
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height + this.Size.Y * 2 * (elapsed / 500));
            }
        }
        else if (this._isResetting) {
            let elapsed = this.LifeTime - this._animationTime;
            let distance = this._prevPos.X - this._newPos.X;
            let x = this._newPos.X + (Math.cos(Math.PI * elapsed / Math.abs(distance)) + 1) / 2 * distance;
            let y = this.World.Game.Height + Math.sin(Math.PI * elapsed / Math.abs(distance)) * this.Size.Y / 2;
            this.Pos = new Vector(x, y);
            if (!this._hasChangedSprites && elapsed > Math.abs(distance) / 2) {
                this._grassHill1 = this.World.Game.Sprites.Get("flags/grasshill1");
                this._grassHill1Ratio = this._grassHill1.Size.Y / this._grassHill1.Size.X;
                this._grassHill2 = this.World.Game.Sprites.Get("flags/grasshill2");
                this._grassHill2Ratio = this._grassHill2.Size.Y / this._grassHill2.Size.X;
                this._hasChangedSprites = true;
            }
            if (elapsed > Math.abs(distance)) {
                this.Pos = this._newPos;
                this._isResetting = false;
                this.IsReady = true;
            }
        }
    }
    Draw(ctx) {
        if (this.IsHidden)
            return;
        let ratio = 0;
        if (this._isHiding)
            ratio = (this.LifeTime - this._animationTime) / 500;
        else if (this._isShowing)
            ratio = 1 - (this.LifeTime - this._animationTime) / 500;
        else if (this._isResetting)
            ratio = Math.sin(Math.PI * (this.LifeTime - this._animationTime) / Math.abs(this._prevPos.X - this._newPos.X)) / 8;
        this._grassHill2.Draw(ctx, -this.Size.X * 0.35, -this.Size.Y * this._grassHill2Ratio - this.Size.Y * 2 * ratio + this.Size.Y * this._grassHill2Ratio * ratio, this.Size.X, this.Size.Y * this._grassHill2Ratio, this.LifeTime);
        this._flag.DrawDistored(ctx, 0, -this.Size.Y + 2, this.Size.X * 0.85, this.Size.Y / 2, (dx, dy) => ({
            x: (dy + 0.5) * dx * Math.cos((dy * 2 - 1) * Math.PI - this.LifeTime / 500 * Math.PI) * 2,
            y: dx * Math.cos((dx * 2 - 1) * Math.PI - this.LifeTime / 1000 * Math.PI) * (dx < 0.5 ? 8 : dx * 16)
        }));
        this._pole.Draw(ctx, 0, -this.Size.Y, this.Size.X / this._poleRatio, this.Size.Y, this.LifeTime);
        this._grassHill1.Draw(ctx, -this.Size.X * 0.35, -this.Size.Y * this._grassHill1Ratio - this.Size.Y * 2 * ratio + this.Size.Y * this._grassHill1Ratio * ratio, this.Size.X, this.Size.Y * this._grassHill1Ratio, this.LifeTime);
    }
}
class CharacterEntity extends APhysicable {
    constructor(nickname, sprite) {
        super(sprite);
        this.GetZIndex = () => 2;
        this.Nickname = nickname;
        this.Size = new Vector(64 * (sprite.Size.X / sprite.Size.Y), 64);
        this.CollisionRadius = 24;
        this.IsOnGround = false;
        this.IsWinner = false;
        this.DistanceFromFlag = 0;
        this.CanParachute = false;
        this._isFalling = true;
        this._isParachuting = false;
        this._isRolling = false;
        this._isCharged = false;
        this._charge = 0;
        this._particleSpawnTime = 0;
        this._isCake = false;
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
        if (this._isCake)
            this.Sprite = world.Game.Sprites.Get("characters/cake");
        else
            world.Game.Audio.Play("woo");
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
    Charge(amount) {
        if (amount < 1)
            amount = 1;
        if (amount > 1000)
            amount = 1000;
        this._isCharged = true;
        this._charge = amount;
    }
    MakeACake() {
        this._isCake = true;
    }
    OnCollisionWith(obj) {
        if (this.IsOnGround)
            return;
        if (this.LifeTime < 500)
            return;
        if (this._isRolling)
            return;
        if (obj instanceof CharacterEntity) {
            if (obj.IsOnGround)
                return;
            let direction = obj.PrevPos.Sub(this.Pos);
            let speed = Math.max(obj.PrevVelocity.Length(), obj.Size.Scale(2).Length());
            this.Velocity = direction.Normalize().Scale(-speed);
            this.World.Game.Audio.Play("spring" + Math.floor(Math.random() * 4));
        }
    }
    CanCollideWith(obj) {
        if (obj instanceof CharacterEntity)
            return true;
        return false;
    }
    Tick(time) {
        if (this._isCharged) {
            let elapsed = (1 - this._charge / 1000) * 500 + 100;
            if (this._particleSpawnTime + elapsed < this.LifeTime) {
                this.World.Spawn(new StarParticle(this.Pos, this.Velocity));
                this._particleSpawnTime = this.LifeTime;
            }
        }
        if (this.IsOnGround)
            return;
        if ((this.Pos.X - this.Size.X / 2 < 0 && this.Velocity.X < 0) ||
            (this.Pos.X + this.Size.X / 2 > this.World.Game.Width && this.Velocity.X > 0)) {
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
        this.Opacity = 1;
    }
    OnLose() {
        this.IsWinner = false;
        this.Opacity = 0.25;
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
        if (this._isCake) {
            let percent = this.Pos.Y / this.World.Game.Height;
            if (percent < 0)
                percent = 0;
            if (percent > 1)
                percent = 1;
            if (this.CanParachute)
                this.RotationAngle = Math.sin(percent * 2 * Math.PI) * Math.PI / 8;
            else if (this.Velocity.X < 0)
                this.RotationAngle = 2 * Math.PI - percent * 0.5 * Math.PI;
            else
                this.RotationAngle = percent * 0.5 * Math.PI;
        }
        else
            this.Rotate(time);
        if (this.CanParachute && this.Pos.Y > this.World.Game.Height * 0.2) {
            this._isFalling = false;
            this._isParachuting = true;
            this._parachute = new ParachuteEntity(this, this.World.Game.Sprites.Get("parachutes/parachute"));
            this._parachute.Pos = this.Pos;
            this._parachute.Velocity = this.Velocity.Scale(-0.8);
            this.World.Spawn(this._parachute);
            this.World.Game.Audio.Play("parachute");
        }
        else if (this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height) {
            if (this._isCake) {
                if (this.Velocity.X > 0)
                    this.Sprite = this.World.Game.Sprites.Get("characters/caked90");
                else
                    this.Sprite = this.World.Game.Sprites.Get("characters/caked270");
                this.Landed();
            }
            else if (this.Velocity.Y > 0) {
                if (this.Velocity.Y < this.Size.Y)
                    this.Roll();
                else {
                    this.Velocity = this.Velocity.ScaleY(-0.75).ScaleX(0.75);
                    this.World.Game.Audio.Play("spring" + Math.floor(Math.random() * 4));
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
        if (this._isCake) {
            let percent = this.Pos.Y / this.World.Game.Height;
            if (percent < 0)
                percent = 0;
            if (percent > 1)
                percent = 1;
            this.RotationAngle = Math.sin(percent * 2 * Math.PI) * Math.PI / 8;
        }
        else if (Math.abs(this.RotationAngle) > Math.PI / 8) {
            this._parachutingStabilizedAngleTime = this.LifeTime;
            this.RotationAngle -= Math.sign(this.RotationAngle) * Math.PI * 4 * time;
        }
        else
            this.RotationAngle = Math.sin((this.LifeTime - this._parachutingStabilizedAngleTime) / 1000) * Math.PI / 8;
        if (this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height) {
            this._parachute.Velocity = this.PrevVelocity;
            this.World.Despawn(this._parachute);
            this.Roll();
            this.World.Game.Audio.Play("landing");
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
        if (this._isCake) {
            if (this.RotationAngle > Math.PI / 2) {
                this.Sprite = this.World.Game.Sprites.Get("characters/caked90");
                this.Landed();
            }
            else if (this.RotationAngle < -Math.PI / 2) {
                this.Sprite = this.World.Game.Sprites.Get("characters/caked270");
                this.Landed();
            }
        }
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
    PostDraw(ctx) {
        super.PostDraw(ctx);
        ctx.save();
        ctx.translate(this.Pos.X, this.Pos.Y);
        ctx.globalAlpha = this.Opacity;
        ctx.lineWidth = 4;
        ctx.strokeText(this.Nickname, 0, -this.Size.Y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.Nickname, 0, -this.Size.Y);
        if (this.IsWinner) {
            let scoreText = "⭐ " + (Math.floor(this.DistanceFromFlag * 100) / 100).toLocaleString("en-US");
            ctx.strokeText(scoreText, 0, -this.Size.Y - 24);
            ctx.fillStyle = 'yellow';
            ctx.fillText(scoreText, 0, -this.Size.Y - 24);
        }
        ctx.restore();
    }
}
class ParachuteEntity extends AAttachable {
    constructor(character, sprite) {
        super(sprite);
        this.GetZIndex = () => 1;
        this.Size = new Vector(204, 120);
        this.AttachmentDistance = 128;
        this._character = character;
        this._distanceToChar = 0;
        this._magicNumbers =
            [
                { x: 100, y: 48 },
                { x: 53, y: 66 },
                { x: 34, y: 92 },
                { x: 38, y: 123 },
                { x: 81, y: 138 },
                { x: 128, y: 135 },
                { x: 174, y: 138 },
                { x: 217, y: 122 },
                { x: 221, y: 92 },
                { x: 202, y: 65 },
                { x: 154, y: 48 },
            ];
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
            this._distanceToChar = direction.Length();
        }
    }
    Draw(ctx) {
        super.Draw(ctx);
        if (this.IsAttached) {
            for (let coord of this._magicNumbers) {
                let x = coord.x;
                let y = coord.y;
                x = (x - this.Sprite.Size.X / 2) / (this.Sprite.Size.X / 2);
                y = (y - this.Sprite.Size.Y / 2) / (this.Sprite.Size.Y / 2);
                x *= this.Size.X / 2;
                y *= this.Size.Y / 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(0, this._distanceToChar);
                ctx.stroke();
            }
        }
    }
}
class ACommand {
    constructor(client) {
        this.Client = client;
    }
}
class DropCommand extends ACommand {
    constructor() {
        super(...arguments);
        this.GetName = () => "drop";
    }
    Info(args) {
        if (args.length < 3)
            return;
        let nickname = args[0];
        let options = JSON.parse(atob(args[1]));
        let image = JSON.parse(atob(args[2]));
        if (image) {
            options.sprite = new Sprite(image.url);
            options.sprite.OnLoad = () => {
                if (image.isAnimation)
                    options.sprite.Animate(image.width, image.height, image.fps, image.framesCount);
                this.Client.Game.Round.Drop(nickname, options);
            };
            options.sprite.OnError = () => {
                options.sprite = undefined;
                this.Client.Game.Round.Drop(nickname, options);
            };
        }
        else
            this.Client.Game.Round.Drop(nickname, options);
    }
    Error(code, message) { }
}
class DropShowCommand extends ACommand {
    constructor() {
        super(...arguments);
        this.GetName = () => "dropshow";
    }
    Info(args) {
        this.Client.Game.Round.Show();
    }
    Error(code, message) { }
}
class DropHideCommand extends ACommand {
    constructor() {
        super(...arguments);
        this.GetName = () => "drophide";
    }
    Info(args) {
        this.Client.Game.Round.Hide();
    }
    Error(code, message) { }
}
class DropResetCommand extends ACommand {
    constructor() {
        super(...arguments);
        this.GetName = () => "dropreset";
    }
    Info(args) {
        this.Client.Game.Round.Reset();
    }
    Error(code, message) { }
}
class WebClient {
    constructor(game, channel) {
        this.Game = game;
        this.channel = channel;
        this.commands = new CommandsCollection(this);
        setTimeout(() => this.Init(), 0);
    }
    SendInfo(command, args) {
        if (Array.isArray(args))
            args = args.join(" ");
        this.SendMessage(`info ${args}`);
    }
    SendError(command, code, message) {
        this.SendMessage(`error ${command} ${code} ${message}`);
    }
}
class CommandsCollection {
    constructor(client) {
        this._commands = {};
        this.Register(new DropCommand(client));
        this.Register(new DropShowCommand(client));
        this.Register(new DropHideCommand(client));
        this.Register(new DropResetCommand(client));
        this.Register(new IdCommand(client));
    }
    Register(command) {
        if (command.GetName() in this._commands)
            return;
        this._commands[command.GetName()] = command;
    }
    Parse(packet) {
        let split = packet.split(' ');
        if (split.length < 2)
            return;
        let type = split[0];
        let commandName = split[1];
        if (!(commandName in this._commands))
            return;
        if (type == "info")
            this._commands[commandName].Info(split.slice(2));
        else if (type == "error") {
            if (split.length < 4)
                return;
            let code = parseInt(split[2]);
            let message = split.splice(3).join(" ");
            this._commands[commandName].Error(code, message);
        }
    }
}
///<reference path="NN.ts" />
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
///<reference path="Objects/Particles/Particle.ts" />
///<reference path="Objects/Particles/StarParticle.ts" />
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
const spritesPath = "img/sprites";
const canvas = document.getElementById("twitchdropcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let game = new GameEnvironment();
class ServerSideEventClient extends WebClient {
    constructor(game, channel) {
        super(game, channel);
        this._lastId = 0;
        this.GetUri = () => `${location.protocol}//${location.host}/sse/${this.channel}${this._lastId > 0 ? `/${this._lastId}` : ``}`;
    }
    Init() {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
        this._eventSource = new EventSource(this.GetUri());
        this._eventSource.onopen = () => this.OnOpen;
        this._eventSource.onmessage = (ev) => this.OnMessage(ev.data);
        this._eventSource.onerror = () => {
            setInterval(() => {
                if (this._eventSource.readyState && this._eventSource.readyState == EventSource.CLOSED) {
                    this.OnClose();
                }
            }, 10000);
        };
    }
    SendMessage(message) {
        var split = message.split(' ');
        if (split.length > 2 && split[0] == "info" && split[1] == "id")
            this._lastId = parseInt(split[2]);
    }
    OnOpen() { }
    OnMessage(message) {
        this.commands.Parse(message);
    }
    OnClose() {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
        setTimeout(() => this.Init(), 2500);
    }
}
class WebSocketClient extends WebClient {
    constructor(game, channel) {
        super(game, channel);
        this.Game = game;
        this._uri = `${location.protocol === "https:" ? "wss://" : "ws://"}${location.host}/ws`;
        setInterval(() => this.Pinger(), 60000);
    }
    Init() {
        if (this._socket) {
            this._socket.close(1000);
            this._socket = null;
        }
        this._socket = new WebSocket(this._uri);
        this._socket.onopen = () => this.OnOpen();
        this._socket.onmessage = (ev) => this.OnMessage(ev.data);
        this._socket.onclose = () => this.OnClose();
    }
    SendMessage(message) {
        if (this._socket)
            this._socket.send(message);
    }
    OnOpen() {
        this._socket.send(this.channel);
    }
    OnMessage(message) {
        this.commands.Parse(message);
    }
    OnClose() {
        this._socket = null;
        setTimeout(() => this.Init(), 2500);
    }
    Pinger() {
        if (this._socket)
            this._socket.send("info ping");
    }
}
class IdCommand extends ACommand {
    constructor() {
        super(...arguments);
        this.GetName = () => "id";
    }
    Info(args) {
        if (args.length > 1 && parseInt(args[0]) > 0)
            this.Client.SendInfo(this.GetName(), args[0]);
    }
    Error(code, message) { }
}
