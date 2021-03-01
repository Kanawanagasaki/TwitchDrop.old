class StartEntity extends AObject
{
    private _angularVelocity:number;

    private _isHiding:boolean;
    private _isShowing:boolean;

    private _isResetting:boolean;
    private _resetStage:number;
    private _isClockwise:boolean;
    private _circlePos1:Vector;
    private _circlePos2:Vector;
    
    private _animationTime:number;

    public IsHidden:boolean;

    public IsReady:boolean;

    public constructor()
    {
        super(null);

        this.Size = new Vector(32, 32);

        this.Init();
    }

    private Init()
    {
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

    public OnSpawn(world:WorldEnvironment)
    {
        super.OnSpawn(world);
        this.Sprite = world.Game.Sprites.Get("arrow");

        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), 0);

        this.IsHidden = false;
        this.IsReady = true;
    }

    public Tick(time: number)
    {
        if(this._isHiding)
        {
            if( this.Pos.Y < -this.Size.Y || this.Pos.Y > this.World.Game.Height + this.Size.Y ||
                this.Pos.X < -this.Size.X || this.Pos.X > this.World.Game.Width + this.Size.X)
            {
                this._isHiding = false;
                this.IsHidden = true;
                this.IsReady = true;
        
                this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), -this.Size.Y*2);
            }
            else
            {
                this._angularVelocity = Math.sin(this.LifeTime / 1000) * Math.PI * 2;
                this._angularVelocity += (Math.random()-0.5) * 2 * Math.PI * time;
                this.RotationAngle += this._angularVelocity * time;
                this.Pos = this.Pos.Add(Vector.FromAngle(this.RotationAngle + Math.PI/2).Scale(time * this.Size.Y * 16));
            }
        }
        if(this._isShowing)
        {
            if(this.Pos.Y > 0)
            {
                this._isShowing = false;
                this.IsReady = true;

                this.Pos = new Vector(this.Pos.X, 0);
            }
            else
            {
                this.Pos = this.Pos.Add(new Vector(0, time * this.Size.Y * 8));
            }
        }
        if(this._isResetting)
        {
            if(this._resetStage < 4)
                this.Pos = this.Pos.Add(Vector.FromAngle(this.RotationAngle + Math.PI/2).Scale(time * this.Size.Y * 16));

            if(this._resetStage == 0)
            {
                if(this.Pos.Y > this._circlePos1.Y)
                    this._resetStage = 1;
            }
            if(this._resetStage == 1)
            {
                let direction = this.Pos.Sub(this._circlePos1);
                let distance = direction.Length();
                if(distance > this.Size.Y * 2)
                    this.Pos = this._circlePos1.Add(direction.Normalize().Scale(this.Size.Y * 2));
                let angle = direction.Angle();
                if( (this._isClockwise && angle >= Math.PI / 2) ||
                    (!this._isClockwise && angle <= Math.PI / 2))
                {
                    this.Pos = new Vector(this.Pos.X, this._circlePos1.Y + this.Size.Y * 2);
                    this.RotationAngle = Math.PI/2 * (this._isClockwise?1:-1);
                    this._resetStage = 2;
                }
                else this.RotationAngle = angle - (this._isClockwise?0:Math.PI);
            }
            if(this._resetStage == 2)
            {
                if(this._isClockwise && this.Pos.X < this._circlePos2.X)
                    this._resetStage = 3
                if(!this._isClockwise && this.Pos.X > this._circlePos2.X)
                    this._resetStage = 3
            }
            if(this._resetStage == 3)
            {
                let direction = this.Pos.Sub(this._circlePos2);
                let distance = direction.Length();
                if(distance > this.Size.Y * 2)
                    this.Pos = this._circlePos2.Add(direction.Normalize().Scale(this.Size.Y * 2));
                let angle = direction.Angle();
                if( (this._isClockwise && 0 < angle && angle < Math.PI*0.25) ||
                    (!this._isClockwise && Math.PI*0.75 < angle && angle < Math.PI))
                {
                    this.Pos = new Vector(this._circlePos2.X + this.Size.X * 2 * (this._isClockwise?1:-1), this.Pos.Y);
                    this.RotationAngle = 0;
                    this._animationTime = this.LifeTime;
                    this._resetStage = 4;
                }
                else this.RotationAngle = angle - (this._isClockwise?0:Math.PI);
            }
            if(this._resetStage == 4)
            {
                let elapsed = this.LifeTime - this._animationTime;
                this.Pos = new Vector(this.Pos.X, this.Size.Y * 3 + Math.sin(Math.PI/2*(elapsed/200)) * this.Size.Y * 3);
                if(elapsed > 600)
                {
                    this.Pos = new Vector(this.Pos.X, 0);
                    this.IsReady = true;
                    this._isResetting = false;
                    this._resetStage = 0;
                }
            }
        }
    }

    public Show()
    {
        if(this._isShowing) return;

        if(this.IsHidden)
            this.Sprite = this.World.Game.Sprites.Get("arrow");

        this.Init();

        this._isShowing = true;

        this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), -this.Size.Y*2);
    }

    public Hide()
    {
        if(this._isHiding) return;
        this.Init();

        this._isHiding = true;
    }

    public Reset()
    {
        if(this._isResetting) return;
        this.Init();

        this._isResetting = true;

        let newPos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), 0);
        
        this._isClockwise = newPos.X < this.Pos.X;

        this._circlePos1 = new Vector(this.Pos.X + this.Size.X * 2 * (this._isClockwise?-1:1), this.Size.Y * 3);
        this._circlePos2 = new Vector(newPos.X + this.Size.X * 2 * (this._isClockwise?-1:1), this.Size.Y * 3);
    }

    public Draw(ctx: CanvasRenderingContext2D)
    {
        if(this.IsHidden) return;

        this.Sprite.Draw(ctx,   -this.Size.X/2, this.Size.Y/8 + Math.sin(this.LifeTime/1000*Math.PI) * this.Size.Y/4,
                                this.Size.X,    this.Size.Y, this.LifeTime);
    }

    public GetZIndex = () => 0;
}