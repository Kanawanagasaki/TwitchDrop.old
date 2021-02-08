class Character {
    constructor(nickname, charImg = undefined) {
        // Angle of the character. Only visual
        this.CharacterAngle = 0;
        // Parachute angle only visual as well
        this.ParachuteAngle = 0;
        // size of character, 64x64 pixels
        this._size = new Vector(64, 64);
        this._collisionRadius = 48;
        // size of parachute, 204x204 pixels
        this._parachuteSize = new Vector(204, 204);
        this._isParachuting = false;
        this.IsOnGround = false;
        this.IsWinner = false;
        // distance to flag from 0 to 100. less is better. calculated when character hit the ground
        this.DistanceToFlag = 100;
        // OnLanded is callback for when character is hit the ground
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
    // Sets the center to be at pos
    SetPosition(pos) {
        // Position of character is given position minus half of size of character
        this.Pos = pos.Sub(this._size.Scale(0.5));
        return this;
    }
    // Sets the drop angle in degrees
    SetAngle(angle) {
        angle = angle % 181;
        let rad = angle * (Math.PI / 180);
        let length = this.Velocity.Length();
        this.Velocity = new Vector(Math.cos(rad), Math.sin(rad)).Scale(length);
        return this;
    }
    // Sets the drop initial speed
    SetForce(force) {
        if (force < 0)
            force = 0;
        if (force > 10)
            force = 10;
        // min: 200 pixels per second, max: 700 pixels per second
        force = force * 50 + 200;
        this.Velocity = this.Velocity.Normalize().Scale(force).ScaleX(2.5);
        return this;
    }
    // Saving measures from previous frame
    SaveMeasures() {
        this.PrevPos = this.Pos;
        this.PrevVelocity = this.Velocity;
        this.PrevAcceleration = this.Acceleration;
    }
    // Checking collision with another character
    CheckCollision(char) {
        // if we are on the ground or char is on ground we skipping the check
        if (this.IsOnGround || char.IsOnGround)
            return;
        // or if we not parachuting we skipping check as well, it done for if two players decided to drop at the same time
        if (!this._isParachuting)
            return;
        // direction to the char
        let direction = char.PrevPos.Sub(this.Pos);
        let distance = direction.Length();
        if (distance < this._collisionRadius) {
            let charSpeed = char.PrevVelocity.Length();
            this.Velocity = direction.Normalize().Scale(-charSpeed);
            /*
                So, what we've done?
                If distance from this to char is less than collision radius then
                store char's speed and scale normalized direction vector by it's negative value.

                Think about it, this check is done for 2 character
                so later we will check it for char with this as argument.
                
                And actually what we've done is we swap speeds between this and char
                and set moving direction to be away from char that we collide with
            */
        }
    }
    // Get center actually. Center of the character
    GetMiddlePosition() {
        return this.Pos.Add(this._size.Scale(0.5));
    }
    // Logic tick, in time stored elapsed time from previous frame
    Tick(time) {
        // if we on ground we skipping tick
        if (this.IsOnGround)
            return;
        this._fallingTime = performance.now() - this._startFallingTime;
        // bounce of the edge
        if ((this.Pos.X + this._size.X > dropcanvas.width && this.Velocity.X > 0) ||
            (this.Pos.X < 0 && this.Velocity.X < 0))
            this.Velocity = this.Velocity.ScaleX(-1);
        // If we not parachuting yet
        if (!this._isParachuting) {
            // and if we falling more than half a second OR if we pass half a screen
            if (this._fallingTime > 500 || this.Pos.Y >= dropcanvas.height / 2) {
                // we now parashuting
                this._isParachuting = true;
                // play parachute sound
                parachuteOgg.play();
                // Scaling Y and X velocity so we falling max 100 pixel per second and horizontal speed is 350 pixel per second max
                if (this.Velocity.Y > 100)
                    this.Velocity = this.Velocity.ScaleY(100 / this.Velocity.Y);
                if (Math.abs(this.Velocity.X) > 350)
                    this.Velocity = this.Velocity.ScaleX(350 / Math.abs(this.Velocity.X));
                // do not accelerate while we parachuting
                this.Acceleration = new Vector(0, 0);
            }
        }
        else {
            // if we are parachuting slower than 100 pixel per second we adding acceleration, otherwise no acceleration
            if (this.Velocity.Y < 100 && this.Acceleration.Y == 0)
                this.Acceleration = new Vector(0, dropcanvas.height * 2);
            else if (this.Acceleration.Y != 0)
                this.Acceleration = new Vector(0, 0);
        }
        // Applying Acceleration and velocity
        this.Velocity = this.Velocity.Add(this.Acceleration.Scale(time));
        this.Pos = this.Pos.Add(this.Velocity.Scale(time));
        // Calculating character angle, it just visual
        this.CharacterAngle = Math.sin(this._fallingTime / 1000) * Math.PI / 8;
        // landing logic
        if (this.Pos.Y + this._size.Y > dropcanvas.height) {
            // setting Y coord to be on vertical edge
            this.Pos = new Vector(this.Pos.X, dropcanvas.height - this._size.Y);
            this.CharacterAngle = 0;
            this.IsOnGround = true;
            this._isParachuting = false;
            // play landing sound
            landingOgg.play();
            // calling callback
            if (this.OnLanded)
                this.OnLanded();
        }
        // Calculating parachute angle, it just visual
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
    Draw() {
        ctx.save();
        ctx.translate(this.Pos.X + this._size.X / 2, this.Pos.Y + this._size.Y / 2);
        if (this.IsOnGround && !this.IsWinner)
            ctx.globalAlpha = 0.25;
        if (this._isParachuting) {
            ctx.save();
            ctx.rotate(this.ParachuteAngle);
            ctx.drawImage(this._parachuteImage, -this._parachuteSize.X / 2, -this._parachuteSize.Y, this._parachuteSize.X, this._parachuteSize.Y);
            ctx.restore();
        }
        ctx.save();
        ctx.rotate(this.CharacterAngle);
        ctx.drawImage(this._characterImage, -this._size.X / 2, -this._size.Y / 2, this._size.X, this._size.Y);
        ctx.restore();
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = '24px Sans-serif';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.Nickname, 0, -this._size.Y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.Nickname, 0, -this._size.Y);
        if (this.IsWinner) {
            // now larger is better Kappa
            let scoreText = "⭐ " + (100 - Math.floor(this.DistanceToFlag * 10) / 10).toLocaleString("en-US");
            ctx.strokeText(scoreText, 0, -this._size.Y - 24);
            ctx.fillStyle = 'yellow';
            ctx.fillText(scoreText, 0, -this._size.Y - 24);
        }
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
// static arrays where images stored once page is loaded
Character._parachuteImages = [];
Character._characterImages = [];
class Round {
    constructor() {
        // dropping characters
        this._characters = {};
        this._winnerDistance = 0;
        this._winnerNickname = "";
        this.Start = new Vector(100 + Math.floor(Math.random() * (dropcanvas.width - 200)), 0);
        this.Finish = new Vector(100 + Math.floor(Math.random() * (dropcanvas.width - 200)), dropcanvas.height);
        this._flagImage = Round.GetRandomFlag();
    }
    // Spawning a character
    SpawnCharacter(nickname, img = undefined) {
        if (this.HasCharacter(nickname))
            return this._characters[nickname];
        let character = new Character(nickname, img);
        character.SetPosition(this.Start);
        this._characters[nickname] = character;
        // play woo sound
        wooOgg.play();
        // When character landed we checking if this character is won the round
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
        // every tick we saving previous measures
        for (let nickname in this._characters)
            this._characters[nickname].SaveMeasures();
        // and then checking for collisions and ticking characters
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
// static variables to store images
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
const websocketAddress = "wss://twitchdrop.kananawanagasaki.ru/ws";
const dropcanvas = document.getElementById("twitchdropcanvas");
const ctx = dropcanvas.getContext("2d");
ctx.globalAlpha = 0;
// hide scene after ... ms
const hideSceneTimeout = 5 * 60 * 1000;
// variable where last frame time is stored
let prevTime = performance.now();
// variables for hiding and showing scene
let sceneShowTime = performance.now();
let sceneOpacity = 0;
let isSceneShown = false;
let currentRound;
// The main game loop
function GameLoop() {
    // Clearing the display
    ctx.clearRect(0, 0, dropcanvas.width, dropcanvas.height);
    // calculating elapsed time
    let curTime = performance.now();
    let elapsedTime = (curTime - prevTime) / 1000;
    prevTime = curTime;
    // hidding or showing the scene
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
        // hide the scene if it is shown for too long 
        if (curTime - sceneShowTime > hideSceneTimeout) {
            isSceneShown = false;
        }
    }
    else if (isSceneShown) // if current round didn't exists but scene is shown
     {
        // creating new round
        currentRound = new Round();
        sceneShowTime = performance.now();
    }
    // with this funciton we saying browser that we want draw animation. "Browser, please make note that next frame is animation and call GameLoop to handle the animation"
    window.requestAnimationFrame(GameLoop);
}
// !dropshow
function DropShow() {
    isSceneShown = true;
    sceneShowTime = performance.now();
}
// !drophide
function DropHide() {
    isSceneShown = false;
}
// !dropreset
function DropReset() {
    DropShow();
    currentRound = new Round();
}
// !drop
function Drop(nickname, options) {
    // show drop and reset timer
    DropShow();
    if (currentRound === undefined)
        currentRound = new Round();
    // i didn't remember why i've decided to check if option not undefined 🤔
    if (options !== undefined) {
        // arrow function to not write code twice
        let spawn = (img = undefined) => {
            let character = currentRound.SpawnCharacter(nickname, img);
            if (options.angle !== undefined)
                character.SetAngle(options.angle);
            if (options.force !== undefined)
                character.SetForce(options.force);
        };
        if (options.imageUrl !== undefined) {
            // waiting until image downloaded and then spawn a character
            let img = new Image();
            img.onload = () => spawn(img);
            img.src = options.imageUrl;
        }
        else
            spawn();
    }
}
// if channel is specified then we can do websocket things
if (twitchChannel !== undefined && twitchChannel != "") {
    // creating websocket connection
    var webSocket = new WebSocket(websocketAddress);
    // interval identifier for pinging
    var intervalHandler;
    // when connection is open
    const onopen = (ev) => {
        // we sending twitch channel which chat we wanna listen
        webSocket.send(twitchChannel);
        // every minnute we sending `ping`
        // we actually do not need to send ping because in websocket protocol there is already build in ping feature
        // but my server code should do something at least :< let him ping pong :<
        intervalHandler = setInterval(() => {
            webSocket.send("info ping");
        }, 60000);
    };
    // when we receive a message we parsing it
    const onmessage = (ev) => {
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
    // when connection is closed after a second trying to reconnect
    const onclose = (ev) => {
        clearInterval(intervalHandler);
        setTimeout(() => {
            webSocket = new WebSocket(websocketAddress);
            webSocket.onopen = onopen;
            webSocket.onmessage = onmessage;
            webSocket.onclose = onclose;
        }, 1000);
    };
    webSocket.onopen = onopen;
    webSocket.onmessage = onmessage;
    webSocket.onclose = onclose;
}
function LoadAudio(uri) {
    let audio = new Audio(uri);
    audio.volume = audioVolume;
    // small hacks ;)
    audio.play();
    audio.pause();
    audio.currentTime = 0;
    return audio;
}
// loading audios
const parachuteOgg = LoadAudio("/ogg/parachute.ogg");
const landingOgg = LoadAudio("/ogg/landing.ogg");
const wooOgg = LoadAudio("/ogg/woo.ogg");
// loading images and then show drop and start game loop
Round.LoadAngles(anglesImage)
    .then(() => Round.LoadFlags(flagImages))
    .then(() => Character.LoadParachutes(parachuteImages))
    .then(() => Character.LoadCharacters(characterImages))
    .then(() => {
    DropShow();
    window.requestAnimationFrame(GameLoop);
});
//# sourceMappingURL=site.js.map