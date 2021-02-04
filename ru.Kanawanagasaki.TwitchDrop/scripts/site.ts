///<reference path="vector.ts" />
///<reference path="character.ts" />
///<reference path="round.ts" />

const dropcanvas = <HTMLCanvasElement>document.getElementById("twitchdropcanvas");
const ctx = dropcanvas.getContext("2d");
ctx.globalAlpha = 0;

declare const twitchChannel: string;
declare const anglesImage: string;
declare const flagImages: string[];
declare const parachuteImages: string[];
declare const characterImages: string[];

const hideSceneTimeout:number = 5 * 60 * 1000;

let prevTime = performance.now();
let sceneShowTime = performance.now();
let sceneOpacity = 0;
let isSceneShown:boolean = false;
let currentRound:Round;

function GameLoop()
{
    ctx.clearRect(0,0,dropcanvas.width,dropcanvas.height);

    let curTime = performance.now();
    let elapsedTime = (curTime - prevTime) / 1000;
    prevTime = curTime;

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

        if(curTime - sceneShowTime > hideSceneTimeout)
        {
            isSceneShown = false;
        }
    }
    else if(isSceneShown)
    {
        currentRound = new Round();
        sceneShowTime = performance.now();
    }

    window.requestAnimationFrame(GameLoop);
}

function DropShow()
{
    isSceneShown = true;
    sceneShowTime = performance.now();
}

function DropHide()
{
    isSceneShown = false;
}

function DropReset()
{
    DropShow();
    currentRound = new Round();
}

function Drop(nickname:string, options:{angle:number, force:number, imageUrl:string})
{
    DropShow();
    if(currentRound === undefined)
        currentRound = new Round();

    if(options!==undefined)
    {
        if(options.imageUrl !== undefined)
        {
            let img = new Image();
            img.onload = ()=>
            {
                let character = currentRound.SpawnCharacter(nickname, img);
                if(options.angle !== undefined)
                    character.SetAngle(options.angle);
                if(options.force !== undefined)
                    character.SetForce(options.force);
            }
            img.src = options.imageUrl;
        }
        else
        {
            let character = currentRound.SpawnCharacter(nickname);
            if(options.angle !== undefined)
                character.SetAngle(options.angle);
            if(options.force !== undefined)
                character.SetForce(options.force);
        }
    }
}

if (twitchChannel != "")
{
    const webSocket = new WebSocket("wss://localhost:5001/ws");
    webSocket.onopen = (ev) =>
    {
        webSocket.send(twitchChannel);
    };
    webSocket.onmessage = (ev) =>
    {
        let packet = (ev.data as string).trim();
        let split = packet.split(" ");
        if(split.length > 1 && split[0] == "info")
        {
            switch(split[1])
            {
                case "dropshow": DropShow(); break;
                case "drophide": DropHide(); break;
                case "dropreset": DropReset(); break;
                case "drop":
                    if(split.length < 3) break;
                    
                    let nickname = split[2];
                    let options:{angle:number,force:number,imageUrl:string} = {angle:undefined,force:undefined,imageUrl:undefined};

                    let digits = [];
                    let strings = [];

                    split.slice(3).forEach(el => /^\d+$/.test(el) ? digits.push(parseInt(el)) : strings.push(el));
                    
                    if(digits.length > 0) options.angle = digits[0];
                    if(digits.length > 1) options.force = digits[1];

                    if(strings.length > 0) options.imageUrl = strings[0];

                    Drop(nickname, options);
                    break;
            }
        }
    };
    webSocket.onclose = (ev) =>
    {
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
    .then(()=>Round.LoadFlags(flagImages))
    .then(()=>Character.LoadParachutes(parachuteImages))
    .then(()=>Character.LoadCharacters(characterImages))
    .then(()=>
    {
        DropShow();
        window.requestAnimationFrame(GameLoop);
    });

