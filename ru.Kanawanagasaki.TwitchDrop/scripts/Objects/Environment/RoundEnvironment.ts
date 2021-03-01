class RoundEnvironment extends WorldEnvironment
{
    private _hideCooldown:number;
    private _showTime:number;

    private _start:StartEntity;
    private _finish:FinishEntity;

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

        this._start = new StartEntity();
        this._finish = new FinishEntity();

        this._winner = null;
        this._winnerDistance = 0;

        this._isHidden = false;
        this._droppedCharacters = {};
        this._actionQueue = [];

        this.Spawn(this._start);
        this.Spawn(this._finish);
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
        if(!this._start.IsReady || !this._finish.IsReady)
        {
            this._actionQueue.push(()=>this.Show());
            return;
        }

        this._showTime = performance.now();
        this._isHidden = false;

        if(this._start.IsHidden)
            this._start.Show();
        if(this._finish.IsHidden)
            this._finish.Show();
    }

    public Hide()
    {
        if(!this._start.IsReady || !this._finish.IsReady)
        {
            this._actionQueue.push(()=>this.Hide());
            return;
        }
        
        for(let obj of this.Objects)
        {
            if(obj.Id != this._start.Id && obj.Id != this._finish.Id)
                this.Despawn(obj);
        }

        this._isHidden = true;

        if(!this._start.IsHidden)
            this._start.Hide();
        if(!this._finish.IsHidden)
            this._finish.Hide();
    }

    public Reset()
    {
        if(!this._start.IsReady || !this._finish.IsReady)
        {
            this._actionQueue.push(()=>this.Reset());
            return;
        }
        
        for(let obj of this.Objects)
        {
            if(obj.Id != this._start.Id && obj.Id != this._finish.Id)
                this.Despawn(obj);
        }

        this._showTime = performance.now();
        this._isHidden = false;

        if(this._start.IsHidden)
            this._start.Show();
        else this._start.Reset();

        if(this._finish.IsHidden)
            this._finish.Show();
        else this._finish.Reset();
    }

    public Drop(nickname:string, options:any)
    {
        if(!this._start.IsReady || !this._finish.IsReady)
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

        if(nickname in this._droppedCharacters) return this._droppedCharacters[nickname];
        if(options.sprite === undefined) options.sprite = this.Game.Sprites.Get("characters/neko");

        let character = new CharacterEntity(nickname, options.sprite);
        character.Pos = new Vector(this._start.Pos.X, 0);

        if(options.canParachute !== undefined) character.CanParachute = options.canParachute;
        if(options.angle !== undefined) character.SetAngle(options.angle);
        if(options.initSpeed !== undefined) character.SetInitialSpeed(options.initSpeed);

        character.OnLand = ()=> this.CheckVictory(character);

        this.Spawn(character);
        this._droppedCharacters[nickname] = character;

        return character;
    }

    private CheckVictory(character:CharacterEntity)
    {
        if(!character.IsOnGround) return;

        let landWidth = Math.max(this._finish.Pos.X, this.Game.Width - this._finish.Pos.X);
        let distanceToFlag = Math.abs(this._finish.Pos.X - character.Pos.X);

        let percent = 100 - distanceToFlag / landWidth * 100;
        character.DistanceFromFlag = percent;

        if(percent > this._winnerDistance || this._winner === null)
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
        if(obj.Id == this._start.Id || obj.Id == this._finish.Id)
            super.Spawn(obj);
        else if(!this._isHidden && this._start.IsReady && this._finish.IsReady)
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