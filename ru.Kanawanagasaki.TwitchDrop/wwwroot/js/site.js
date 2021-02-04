class Character {
    constructor(nickname, charImg = undefined) {
        this.CharacterAngle = 0;
        this.ParachuteAngle = 0;
        this._size = new Vector(64, 64);
        this._collisionRadius = 48;
        this._parachuteSize = new Vector(204, 204);
        this._isParachuting = false;
        this.IsOnGround = false;
        this.IsWinner = false;
        this.DistanceToFlag = 100;
        this.OnLanded = undefined;
        this.Nickname = nickname;
        if (charImg !== undefined)
            this._characterImage = charImg;
        else
            this._characterImage = Character.GetRandomCharacter();
        this._parachuteImage = Character.GetRandomParachute();
        this.Pos = new Vector(0, 0);
        this.Velocity = new Vector(0, 1);
        this.Acceleration = new Vector(0, dropcanvas.height * 2);
        this._startFallingTime = performance.now();
        this.SetAngle(Math.floor(Math.random() * 180));
        this.SetForce(Math.floor(Math.random() * 10));
    }
    SetPosition(pos) {
        this.Pos = pos.Sub(this._size.Scale(0.5));
        return this;
    }
    SetAngle(angle) {
        angle = angle % 181;
        let rad = angle * (Math.PI / 180);
        let length = this.Velocity.Length();
        this.Velocity = new Vector(Math.cos(rad), Math.sin(rad)).Scale(length);
        return this;
    }
    SetForce(force) {
        if (force < 0)
            force = 0;
        if (force > 10)
            force = 10;
        force = force * 50 + 200;
        this.Velocity = this.Velocity.Normalize().Scale(force).ScaleX(2.5);
        return this;
    }
    SaveMeasures() {
        this.PrevPos = this.Pos;
        this.PrevVelocity = this.Velocity;
        this.PrevAcceleration = this.Acceleration;
    }
    CheckCollision(char) {
        if (this.IsOnGround || char.IsOnGround)
            return;
        if (!this._isParachuting)
            return;
        let direction = char.PrevPos.Sub(this.Pos);
        let distance = direction.Length();
        if (distance < this._collisionRadius) {
            let charSpeed = char.PrevVelocity.Length();
            this.Velocity = direction.Normalize().Scale(-charSpeed);
        }
    }
    GetMiddlePosition() {
        return this.Pos.Add(this._size.Scale(0.5));
    }
    Tick(time) {
        this._fallingTime = performance.now() - this._startFallingTime;
        if (!this.IsOnGround) {
            if ((this.Pos.X + this._size.X > dropcanvas.width && this.Velocity.X > 0) ||
                (this.Pos.X < 0 && this.Velocity.X < 0))
                this.Velocity = this.Velocity.ScaleX(-1);
            if (!this._isParachuting) {
                if (this._fallingTime > 500 || this.Pos.Y >= dropcanvas.height / 2) {
                    this._isParachuting = true;
                    parachuteOgg.play();
                    if (this.Velocity.Y > 100)
                        this.Velocity = this.Velocity.ScaleY(100 / this.Velocity.Y);
                    if (Math.abs(this.Velocity.X) > 350)
                        this.Velocity = this.Velocity.ScaleX(350 / Math.abs(this.Velocity.X));
                    this.Acceleration = new Vector(0, 0);
                }
            }
            if (this.Velocity.Y < 100 && this.Acceleration.Y == 0)
                this.Acceleration = new Vector(0, dropcanvas.height * 2);
            else if (this.Acceleration.Y != 0)
                this.Acceleration = new Vector(0, 0);
            this.Velocity = this.Velocity.Add(this.Acceleration.Scale(time));
            this.Pos = this.Pos.Add(this.Velocity.Scale(time));
            this.CharacterAngle = Math.sin(this._fallingTime / 1000) * Math.PI / 8;
            if (this.Pos.Y + this._size.Y > dropcanvas.height) {
                this.Pos = new Vector(this.Pos.X, dropcanvas.height - this._size.Y);
                this.CharacterAngle = 0;
                this.IsOnGround = true;
                this._isParachuting = false;
                landingOgg.play();
                if (this.OnLanded)
                    this.OnLanded();
            }
            let velocityDirection = Math.atan2(this.Velocity.Y, this.Velocity.X);
            velocityDirection -= Math.PI / 2;
            velocityDirection /= 4;
            if (this.ParachuteAngle < velocityDirection)
                this.ParachuteAngle += Math.PI / 32;
            else if (this.ParachuteAngle > velocityDirection)
                this.ParachuteAngle -= Math.PI / 32;
            if (Math.abs(this.ParachuteAngle - velocityDirection) < Math.PI / 32)
                this.ParachuteAngle = velocityDirection;
        }
    }
    Draw() {
        ctx.save();
        ctx.translate(this.Pos.X + this._size.X / 2, this.Pos.Y + this._size.Y / 2);
        if (this.IsOnGround && !this.IsWinner)
            ctx.globalAlpha = 0.25;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = '24px Sans-serif';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.Nickname, 0, -this._size.Y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.Nickname, 0, -this._size.Y);
        if (this.IsWinner) {
            let scoreText = "⭐" + (Math.floor(this.DistanceToFlag * 10) / 10).toLocaleString("en-US");
            ctx.strokeText(scoreText, 0, -this._size.Y - 24);
            ctx.fillStyle = 'yellow';
            ctx.fillText(scoreText, 0, -this._size.Y - 24);
        }
        if (this._isParachuting) {
            ctx.save();
            ctx.rotate(this.ParachuteAngle);
            ctx.drawImage(this._parachuteImage, -this._parachuteSize.X / 2, -this._parachuteSize.Y, this._parachuteSize.X, this._parachuteSize.Y);
            ctx.restore();
        }
        ctx.rotate(this.CharacterAngle);
        ctx.drawImage(this._characterImage, -this._size.X / 2, -this._size.Y / 2, this._size.X, this._size.Y);
        ctx.restore();
    }
    static LoadParachutes(urls) {
        return Character.LoadImages(urls, this._parachuteImages);
    }
    static LoadCharacters(urls) {
        return Character.LoadImages(urls, this._characterImages);
    }
    static LoadImages(urls, array) {
        return new Promise((resolve, reject) => {
            let loaded = 0;
            urls.forEach((url) => {
                let img = new Image();
                img.onload = () => {
                    array.push(img);
                    loaded++;
                    if (loaded == urls.length)
                        resolve(array);
                };
                img.src = url;
            });
        });
    }
    static GetRandomParachute() {
        return Character._parachuteImages[Math.floor(Math.random() * Character._parachuteImages.length)];
    }
    static GetRandomCharacter() {
        return Character._characterImages[Math.floor(Math.random() * Character._characterImages.length)];
    }
}
Character._parachuteImages = [];
Character._characterImages = [];
class Round {
    constructor() {
        this._characters = {};
        this._winnerDistance = 0;
        this._winnerNickname = "";
        this.Start = new Vector(100 + Math.floor(Math.random() * (dropcanvas.width - 200)), 0);
        this.Finish = new Vector(100 + Math.floor(Math.random() * (dropcanvas.width - 200)), dropcanvas.height);
        this._flagImage = Round.GetRandomFlag();
    }
    SpawnCharacter(nickname, img = undefined) {
        if (this.HasCharacter(nickname))
            return this._characters[nickname];
        let character = new Character(nickname, img);
        character.SetPosition(this.Start);
        this._characters[nickname] = character;
        wooOgg.play();
        character.OnLanded = () => {
            let landWidth = Math.max(this.Finish.X, dropcanvas.width - this.Finish.X);
            let distanceToFlag = Math.abs(this.Finish.X - character.GetMiddlePosition().X);
            let percent = distanceToFlag / landWidth * 100;
            character.DistanceToFlag = percent;
            let hasCharacter = this.HasCharacter(this._winnerNickname);
            if (percent < this._winnerDistance || !hasCharacter) {
                if (hasCharacter)
                    this._characters[this._winnerNickname].IsWinner = false;
                this._winnerDistance = percent;
                this._winnerNickname = character.Nickname;
                character.IsWinner = true;
            }
        };
        return character;
    }
    HasCharacter(nickname) {
        return nickname in this._characters;
    }
    Tick(time) {
        for (let nickname in this._characters)
            this._characters[nickname].SaveMeasures();
        for (let nickname in this._characters) {
            for (let nickname2 in this._characters) {
                if (nickname == nickname2)
                    continue;
                this._characters[nickname].CheckCollision(this._characters[nickname2]);
            }
            this._characters[nickname].Tick(time);
        }
    }
    Draw() {
        ctx.drawImage(this._flagImage, this.Finish.X, this.Finish.Y - 128, 128, 128);
        ctx.drawImage(Round._anglesImage, this.Start.X - 32, this.Start.Y, 64, 32);
        for (let nickname in this._characters) {
            this._characters[nickname].Draw();
        }
    }
    static LoadFlags(urls) {
        return Round.LoadImages(urls, this._flagImages);
    }
    static LoadAngles(url) {
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => {
                this._anglesImage = img;
                resolve(this._anglesImage);
            };
            img.src = url;
        });
    }
    static LoadImages(urls, array) {
        return new Promise((resolve, reject) => {
            let loaded = 0;
            urls.forEach((url) => {
                let img = new Image();
                img.onload = () => {
                    array.push(img);
                    loaded++;
                    if (loaded == urls.length)
                        resolve(array);
                };
                img.src = url;
            });
        });
    }
    static GetRandomFlag() {
        return Round._flagImages[Math.floor(Math.random() * Round._flagImages.length)];
    }
}
Round._flagImages = [];
class Vector {
    constructor(x, y) {
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
    static Random() {
        let angle = Math.random() * Math.PI * 2;
        let x = Math.cos(angle);
        let y = Math.sin(angle);
        return new Vector(x, y);
    }
}
///<reference path="vector.ts" />
///<reference path="character.ts" />
///<reference path="round.ts" />
const dropcanvas = document.getElementById("twitchdropcanvas");
const ctx = dropcanvas.getContext("2d");
ctx.globalAlpha = 0;
const hideSceneTimeout = 5 * 60 * 1000;
let prevTime = performance.now();
let sceneShowTime = performance.now();
let sceneOpacity = 0;
let isSceneShown = false;
let currentRound;
function GameLoop() {
    ctx.clearRect(0, 0, dropcanvas.width, dropcanvas.height);
    let curTime = performance.now();
    let elapsedTime = (curTime - prevTime) / 1000;
    prevTime = curTime;
    if (isSceneShown && sceneOpacity < 1)
        sceneOpacity += 5 * elapsedTime;
    else if (!isSceneShown && sceneOpacity > 0)
        sceneOpacity -= 5 * elapsedTime;
    if (sceneOpacity > 1)
        sceneOpacity = 1;
    else if (sceneOpacity < 0)
        sceneOpacity = 0;
    ctx.globalAlpha = sceneOpacity;
    if (currentRound) {
        if (!isSceneShown && sceneOpacity == 0) {
            currentRound = undefined;
        }
        else {
            currentRound.Tick(elapsedTime);
            currentRound.Draw();
        }
        if (curTime - sceneShowTime > hideSceneTimeout) {
            isSceneShown = false;
        }
    }
    else if (isSceneShown) {
        currentRound = new Round();
        sceneShowTime = performance.now();
    }
    window.requestAnimationFrame(GameLoop);
}
function DropShow() {
    isSceneShown = true;
    sceneShowTime = performance.now();
}
function DropHide() {
    isSceneShown = false;
}
function DropReset() {
    DropShow();
    currentRound = new Round();
}
function Drop(nickname, options) {
    DropShow();
    if (currentRound === undefined)
        currentRound = new Round();
    if (options !== undefined) {
        if (options.imageUrl !== undefined) {
            let img = new Image();
            img.onload = () => {
                let character = currentRound.SpawnCharacter(nickname, img);
                if (options.angle !== undefined)
                    character.SetAngle(options.angle);
                if (options.force !== undefined)
                    character.SetForce(options.force);
            };
            img.src = options.imageUrl;
        }
        else {
            let character = currentRound.SpawnCharacter(nickname);
            if (options.angle !== undefined)
                character.SetAngle(options.angle);
            if (options.force !== undefined)
                character.SetForce(options.force);
        }
    }
}
if (twitchChannel != "") {
    const webSocket = new WebSocket("wss://localhost:5001/ws");
    webSocket.onopen = (ev) => {
        webSocket.send(twitchChannel);
    };
    webSocket.onmessage = (ev) => {
        let packet = ev.data.trim();
        let split = packet.split(" ");
        if (split.length > 1 && split[0] == "info") {
            switch (split[1]) {
                case "dropshow":
                    DropShow();
                    break;
                case "drophide":
                    DropHide();
                    break;
                case "dropreset":
                    DropReset();
                    break;
                case "drop":
                    if (split.length < 3)
                        break;
                    let nickname = split[2];
                    let options = { angle: undefined, force: undefined, imageUrl: undefined };
                    let digits = [];
                    let strings = [];
                    split.slice(3).forEach(el => /^\d+$/.test(el) ? digits.push(parseInt(el)) : strings.push(el));
                    if (digits.length > 0)
                        options.angle = digits[0];
                    if (digits.length > 1)
                        options.force = digits[1];
                    if (strings.length > 0)
                        options.imageUrl = strings[0];
                    Drop(nickname, options);
                    break;
            }
        }
    };
    webSocket.onclose = (ev) => {
        DropHide();
    };
}
let parachuteOgg = new Audio("/ogg/parachute.ogg");
parachuteOgg.play();
parachuteOgg.pause();
let wooOgg = new Audio("/ogg/woo.ogg");
wooOgg.play();
wooOgg.pause();
let landingOgg = new Audio("/ogg/landing.ogg");
landingOgg.play();
landingOgg.pause();
Round.LoadAngles(anglesImage)
    .then(() => Round.LoadFlags(flagImages))
    .then(() => Character.LoadParachutes(parachuteImages))
    .then(() => Character.LoadCharacters(characterImages))
    .then(() => {
    DropShow();
    window.requestAnimationFrame(GameLoop);
});
//# sourceMappingURL=site.js.map