class RoundEnvironment extends WorldEnvironment
{
    private _hideCooldown:number;
    private _showTime:number;

    public Start:StartEntity;
    public Finish:FinishEntity;

    private _winner:CharacterEntity;
    private _winnerDistance:number;

    private _isHidden:boolean;
    private _droppedCharacters:{[nickname:string]:CharacterEntity};
    private _actionQueue:(()=>any)[];

    public constructor(game:GameEnvironment, hideCooldown:number)
    {
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

    public Tick(time:number)
    {
        super.Tick(time);
        if(this._actionQueue.length > 0)
            this._actionQueue.splice(0, 1)[0]();
        if(!this._isHidden && this._showTime + this._hideCooldown < performance.now())
        {
            this._showTime = performance.now();
            this.Hide();
        }
    }

    public Show()
    {
        if(!this.Start.IsReady || !this.Finish.IsReady)
        {
            this._actionQueue.push(()=>this.Show());
            return;
        }

        this._showTime = performance.now();
        this._isHidden = false;

        if(this.Start.IsHidden)
            this.Start.Show();
        if(this.Finish.IsHidden)
            this.Finish.Show();
    }

    public Hide()
    {
        if(!this.Start.IsReady || !this.Finish.IsReady)
        {
            this._actionQueue.push(()=>this.Hide());
            return;
        }
        
        for(let obj of this.Objects)
        {
            if(obj.Id != this.Start.Id && obj.Id != this.Finish.Id)
                this.Despawn(obj);
        }

        this._isHidden = true;

        if(!this.Start.IsHidden)
            this.Start.Hide();
        if(!this.Finish.IsHidden)
            this.Finish.Hide();
    }

    public Reset()
    {
        if(!this.Start.IsReady || !this.Finish.IsReady)
        {
            this._actionQueue.push(()=>this.Reset());
            return;
        }
        
        for(let obj of this.Objects)
        {
            if(obj.Id != this.Start.Id && obj.Id != this.Finish.Id)
                this.Despawn(obj);
        }

        this._showTime = performance.now();
        this._isHidden = false;

        if(this.Start.IsHidden)
            this.Start.Show();
        else this.Start.Reset();

        if(this.Finish.IsHidden)
            this.Finish.Show();
        else this.Finish.Reset();
    }

    public Drop(nickname:string, options:any)
    {
        if(!this.Start.IsReady || !this.Finish.IsReady)
        {
            this._actionQueue.push(()=>this.Drop(nickname, options));
            return;
        }
        if(this._isHidden)
        {
            this.Show();
            this._actionQueue.push(()=>this.Drop(nickname, options));
            return;
        }
        
        this._showTime = performance.now();

        if(nickname in this._droppedCharacters && !options.ignoreDropped) return this._droppedCharacters[nickname];
        if(options.sprite === undefined) options.sprite = this.Game.Sprites.Get("characters/neko");

        let character = new CharacterEntity(nickname, options.sprite);
        character.Pos = new Vector(this.Start.Pos.X, 0);

        if("angle" in options) character.SetAngle(options.angle);
        if("initSpeed" in options) character.SetInitialSpeed(options.initSpeed);
        if("bits" in options) character.Charge(options.bits);
        if("canParachute" in options) character.CanParachute = options.canParachute;
        if("isCake" in options && options.isCake) character.MakeACake();

        character.OnLand = ()=> this.CheckVictory(character);

        this.Spawn(character);
        this._droppedCharacters[nickname + (options.ignoreDropped?"/"+character.Id:"")] = character;

        return character;
    }

    private CheckVictory(character:CharacterEntity)
    {
        if(!character.IsOnGround) return;

        let landWidth = Math.max(this.Finish.Pos.X, this.Game.Width - this.Finish.Pos.X);
        let distanceToFlag = Math.abs(this.Finish.Pos.X - character.Pos.X);

        let percent = 100 - distanceToFlag / landWidth * 100;
        character.DistanceFromFlag = percent;

        if(percent > this._winnerDistance || this._winner === null || !this.IsSpawned(this._winner))
        {
            if(this._winner !== null)
                this._winner.OnLose();

            this._winnerDistance = percent;
            this._winner = character;
            character.OnWin();
        }
        else character.OnLose();
    }

    public Spawn(obj:AObject)
    {
        if(obj.Id == this.Start.Id || obj.Id == this.Finish.Id)
            super.Spawn(obj);
        else if(!this._isHidden && this.Start.IsReady && this.Finish.IsReady)
            super.Spawn(obj);
    }

    public Despawn(obj:AObject)
    {
        super.Despawn(obj);

        if(obj instanceof CharacterEntity && obj.Nickname in this._droppedCharacters)
        {
            delete this._droppedCharacters[obj.Nickname];
            if(this._winner == obj)
            {
                this._winner = null;
                this._winnerDistance = 0;
                for(let nickname in this._droppedCharacters)
                {
                    this.CheckVictory(this._droppedCharacters[nickname]);
                }
            }
        }
    }
}