///<reference path="vector.ts" />
///<reference path="character.ts" />
///<reference path="round.ts" />

const websocketAddress = "wss://twitchdrop.kananawanagasaki.ru/ws";

const dropcanvas = <HTMLCanvasElement>document.getElementById("twitchdropcanvas");
const ctx = dropcanvas.getContext("2d");
ctx.globalAlpha = 0;

// declaring variables from Index.cshtml
declare const twitchChannel: string;
declare const anglesImage: string;
declare const flagImages: string[];
declare const parachuteImages: string[];
declare const characterImages: string[];
declare const audioVolume: number;

// hide scene after ... ms
const hideSceneTimeout:number = 5 * 60 * 1000;

// variable where last frame time is stored
let prevTime = performance.now();

// variables for hiding and showing scene
let sceneShowTime = performance.now();
let sceneOpacity = 0;
let isSceneShown: boolean = false;

let currentRound:Round;

// The main game loop
function GameLoop()
{
    // Clearing the display
    ctx.clearRect(0,0,dropcanvas.width,dropcanvas.height);

    // calculating elapsed time
    let curTime = performance.now();
    let elapsedTime = (curTime - prevTime) / 1000;
    prevTime = curTime;

    // hidding or showing the scene
    if(isSceneShown && sceneOpacity < 1) sceneOpacity += 5*elapsedTime;
    else if(!isSceneShown && sceneOpacity > 0) sceneOpacity -= 5*elapsedTime;
    if(sceneOpacity > 1) sceneOpacity = 1;
    else if(sceneOpacity < 0) sceneOpacity = 0;
    ctx.globalAlpha = sceneOpacity;


    if(currentRound)
    {
        if(!isSceneShown && sceneOpacity == 0)
        {
            currentRound = undefined;
        }
        else
        {
            currentRound.Tick(elapsedTime);
            currentRound.Draw();
        }

        // hide the scene if it is shown for too long 
        if(curTime - sceneShowTime > hideSceneTimeout)
        {
            isSceneShown = false;
        }
    }
    else if(isSceneShown) // if current round didn't exists but scene is shown
    {
        // creating new round
        currentRound = new Round();
        sceneShowTime = performance.now();
    }

    // with this funciton we saying browser that we want draw animation. "Browser, please make note that next frame is animation and call GameLoop to handle the animation"
    window.requestAnimationFrame(GameLoop);
}

// !dropshow
function DropShow()
{
    isSceneShown = true;
    sceneShowTime = performance.now();
}

// !drophide
function DropHide()
{
    isSceneShown = false;
}

// !dropreset
function DropReset()
{
    DropShow();
    currentRound = new Round();
}

// !drop
function Drop(nickname:string, options:{angle:number, force:number, imageUrl:string})
{
    // show drop and reset timer
    DropShow();

    if(currentRound === undefined)
        currentRound = new Round();

    // i didn't remember why i've decided to check if option not undefined 🤔
    if(options !== undefined)
    {
        // arrow function to not write code twice
        let spawn = (img: HTMLImageElement = undefined) =>
        {
            let character = currentRound.SpawnCharacter(nickname, img);
            if (options.angle !== undefined)
                character.SetAngle(options.angle);
            if (options.force !== undefined)
                character.SetForce(options.force);
        };

        if(options.imageUrl !== undefined)
        {
            // waiting until image downloaded and then spawn a character
            let img = new Image();
            img.onload = () => spawn(img);
            img.src = options.imageUrl;
        }
        else spawn();
    }
}


// if channel is specified then we can do websocket things
if (twitchChannel !== undefined && twitchChannel != "")
{
    // creating websocket connection
    var webSocket = new WebSocket(websocketAddress);

    // interval identifier for pinging
    var intervalHandler: number;

    // when connection is open
    const onopen = (ev) =>
    {
        // we sending twitch channel which chat we wanna listen
        webSocket.send(twitchChannel);

        // every minnute we sending `ping`
        // we actually do not need to send ping because in websocket protocol there is already build in ping feature
        // but my server code should do something at least :< let him ping pong :<
        intervalHandler = setInterval(() =>
        {
            webSocket.send("info ping");
        }, 60_000);
    };

    // when we receive a message we parsing it
    const onmessage = (ev) =>
    {
        let packet = (ev.data as string).trim();
        let split = packet.split(" ");
        if (split.length > 1 && split[0] == "info")
        {
            switch (split[1])
            {
                case "dropshow": DropShow(); break;
                case "drophide": DropHide(); break;
                case "dropreset": DropReset(); break;
                case "drop":
                    if (split.length < 3) break;

                    let nickname = split[2];
                    let options: { angle: number, force: number, imageUrl: string } = { angle: undefined, force: undefined, imageUrl: undefined };

                    let digits = [];
                    let strings = [];

                    split.slice(3).forEach(el => /^\d+$/.test(el) ? digits.push(parseInt(el)) : strings.push(el));

                    if (digits.length > 0) options.angle = digits[0];
                    if (digits.length > 1) options.force = digits[1];

                    if (strings.length > 0) options.imageUrl = strings[0];

                    Drop(nickname, options);
                    break;
            }
        }
    };

    // when connection is closed after a second trying to reconnect
    const onclose = (ev) =>
    {
        clearInterval(intervalHandler);

        setTimeout(() =>
        {
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

function LoadAudio(uri: string)
{
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
    .then(()=>Round.LoadFlags(flagImages))
    .then(()=>Character.LoadParachutes(parachuteImages))
    .then(()=>Character.LoadCharacters(characterImages))
    .then(()=>
    {
        DropShow();
        window.requestAnimationFrame(GameLoop);
    });

