class GameEnvironment
{
    private _canvas:HTMLCanvasElement;
    private _context:CanvasRenderingContext2D;

    private _websocketAddress:string;
    private _client:WebClient;

    private _channel:string;

    public Sprites:SpriteCollection;
    public Audio:AudioDevice;

    public Width:number;
    public Height:number;

    public Round:RoundEnvironment;
    private _prevFrameTime:number;

    public constructor()
    {
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

        this._websocketAddress = websocketAddress;
        this._channel = twitchChannel;

        this.Sprites = new SpriteCollection(spritesPath);
        this.Sprites.Load(images)
            .then(()=>
            {
                this.Init();
                this.Start();
            });
        
        this.Audio = new AudioDevice(audioVolume);
    }

    private Init()
    {
        this.Round = new RoundEnvironment(this, hideCooldown);
        this._prevFrameTime = performance.now();

        this.SetupAnimations();

        if(this._websocketAddress && this._channel)
            this._client = new WebClient(this, this._websocketAddress, this._channel);
        else this.Simulate();
    }

    private Simulate()
    {
        let index = 0;
        let nicknames:string[] =
        [
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
        setInterval(()=>
        {
            let char = game.Round.Drop(nicknames[index++], {canParachute:Math.random()<0.55});
            if(index >= nicknames.length) index = 0;
            setTimeout(()=>
            {
                game.Round.Despawn(char);
            }, 30_000);
        }, 3_500);
    }

    private SetupAnimations()
    {
        this.Sprites.Get("arrow").Animate(58, 66, 48);
    }

    private Start()
    {
        window.requestAnimationFrame(()=>this.GameLoop());
    }

    private GameLoop()
    {
        let currentTime = performance.now();
        let elapsedTime = (currentTime - this._prevFrameTime) / 1000;
        this._prevFrameTime = currentTime;

        this.Round.Tick(elapsedTime);

        this._context.clearRect(0, 0, this.Width, this.Height);
        this.Round.Draw(this._context);
        
        window.requestAnimationFrame(()=>this.GameLoop());
    }
}