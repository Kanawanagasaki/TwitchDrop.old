class RoundEnvironment extends WorldEnvironment
{
    public Start:StartEntity;
    public Finish:FinishEntity;

    public Winner:CharacterEntity;
    public WinnerDistance:number;

    private _droppedCharacters:{[nickname:string]:CharacterEntity};

    public constructor(game:GameEnvironment)
    {
        super(game);

        this.Start = new StartEntity();
        this.Finish = new FinishEntity();

        this.Winner = null;
        this.WinnerDistance = 0;

        this._droppedCharacters = {};

        this.Spawn(this.Start);
        this.Spawn(this.Finish);
    }

    public Drop(nickname:string, options:any)
    {
        if(nickname in this._droppedCharacters) return this._droppedCharacters[nickname];

        let character = new CharacterEntity(nickname);
        character.Pos = new Vector(this.Start.Pos.X, 0);

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

        let landWidth = Math.max(this.Finish.Pos.X, this.Game.Width - this.Finish.Pos.X);
        let distanceToFlag = Math.abs(this.Finish.Pos.X - character.Pos.X);

        let percent = 100 - distanceToFlag / landWidth * 100;
        character.DistanceFromFlag = percent;

        if(percent > this.WinnerDistance || this.Winner === null)
        {
            if(this.Winner !== null)
                this.Winner.OnLose();

            this.WinnerDistance = percent;
            this.Winner = character;
            character.OnWin();
        }
        else character.OnLose();
    }

    public Despawn(obj:AObject)
    {
        super.Despawn(obj);

        if(obj instanceof CharacterEntity && obj.Nickname in this._droppedCharacters)
        {
            delete this._droppedCharacters[obj.Nickname];
            if(this.Winner == obj)
            {
                this.Winner = null;
                this.WinnerDistance = 0;
                for(let nickname in this._droppedCharacters)
                {
                    this.CheckVictory(this._droppedCharacters[nickname]);
                }
            }
        }
    }
}