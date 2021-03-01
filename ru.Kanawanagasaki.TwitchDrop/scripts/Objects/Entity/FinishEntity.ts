class FinishEntity extends AObject
{
    private _pole:Sprite;
    private _poleRatio:number;

    private _flag:Sprite;

    private _grassHill1:Sprite;
    private _grassHill1Ratio:number;

    private _grassHill2:Sprite;
    private _grassHill2Ratio:number;

    private _isShowing:boolean;
    private _isHiding:boolean;
    private _isResetting:boolean;

    private _prevPos:Vector;
    private _newPos:Vector;
    private _animationTime:number;
    private _hasChangedSprites:boolean;

    public IsHidden:boolean;
    public IsReady:boolean;

    public constructor()
    {
        super(null);
        this.Size = new Vector(128, 128);
        
        this.Init();
        this.IsReady = true;
    }

    private Init()
    {
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

    public OnSpawn(world:WorldEnvironment)
    {
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

    public Show()
    {
        if(this._isShowing) return;

        if(this.IsHidden)
        {
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
        
        this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), this.World.Game.Height + this.Size.Y*2);
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
        this._prevPos = this.Pos;

        let westDistance = this.Pos.X - 100;
        let eastDistance = (this.World.Game.Width - 200) - (this.Pos.X - 100);

        let min = Math.min(westDistance, eastDistance);
        let max = Math.max(westDistance, eastDistance);

        let distance = Math.floor(Math.max(100, min) + Math.random() * (max - min));

        this._newPos = new Vector(this.Pos.X + distance * Math.sign(eastDistance - westDistance), this.World.Game.Height);
    }

    public Tick(time: number)
    {
        if(this._isShowing || this._isHiding)
        {
            let elapsed = this.LifeTime - this._animationTime;

            if(elapsed > 500)
            {
                if(this._isShowing)
                {
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height);
                    this._isShowing = false;
                    this.IsReady = true;
                }
                if(this._isHiding)
                {
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height + this.Size.Y*2);
                    this._isHiding = false;
                    this.IsHidden = true;
                    this.IsReady = true;
                    this.Pos = new Vector(100 + Math.floor(Math.random() * (this.World.Game.Width - 200)), this.World.Game.Height + this.Size.Y*2);
                }
            }
            else
            {
                if(this._isShowing)
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height + this.Size.Y * 2 * (1 - elapsed / 500));
                if(this._isHiding)
                    this.Pos = new Vector(this.Pos.X, this.World.Game.Height + this.Size.Y * 2 * (elapsed / 500));
            }
        }
        else if(this._isResetting)
        {
            let elapsed = this.LifeTime - this._animationTime;
            let distance = this._prevPos.X - this._newPos.X;
            let x = this._newPos.X + (Math.cos(Math.PI * elapsed/Math.abs(distance)) + 1) / 2 * distance;
            let y = this.World.Game.Height + Math.sin(Math.PI * elapsed/Math.abs(distance)) * this.Size.Y / 2;
            this.Pos = new Vector(x, y);

            if(!this._hasChangedSprites && elapsed > Math.abs(distance)/2)
            {
                this._grassHill1 = this.World.Game.Sprites.Get("flags/grasshill1");
                this._grassHill1Ratio = this._grassHill1.Size.Y / this._grassHill1.Size.X;
        
                this._grassHill2 = this.World.Game.Sprites.Get("flags/grasshill2");
                this._grassHill2Ratio = this._grassHill2.Size.Y / this._grassHill2.Size.X;

                this._hasChangedSprites = true;
            }

            if(elapsed > Math.abs(distance))
            {
                this.Pos = this._newPos;
                this._isResetting = false;
                this.IsReady = true;
            }
        }
    }

    public Draw(ctx: CanvasRenderingContext2D)
    {
        if(this.IsHidden) return;

        let ratio = 0;
        if(this._isHiding)
            ratio = (this.LifeTime - this._animationTime) / 500;
        else if (this._isShowing)
            ratio = 1 - (this.LifeTime - this._animationTime) / 500;
        else if(this._isResetting)
            ratio = Math.sin(Math.PI * (this.LifeTime - this._animationTime) / Math.abs(this._prevPos.X - this._newPos.X)) / 8;

        this._grassHill2.Draw(ctx,  -this.Size.X*0.35,  -this.Size.Y * this._grassHill2Ratio - this.Size.Y * 2 * ratio + this.Size.Y * this._grassHill2Ratio * ratio,
                                    this.Size.X,        this.Size.Y * this._grassHill2Ratio, this.LifeTime);

        this._flag.DrawDistored(ctx, 0, -this.Size.Y+2, this.Size.X * 0.85, this.Size.Y/2,
            (dx, dy) =>
            ({
                x:(dy+0.5)*dx*Math.cos((dy*2-1)*Math.PI - this.LifeTime/500*Math.PI)*2,
                y:dx*Math.cos((dx*2-1)*Math.PI - this.LifeTime/1000*Math.PI)*(dx<0.5?8:dx*16)
            }));

        this._pole.Draw(ctx, 0, -this.Size.Y, this.Size.X / this._poleRatio, this.Size.Y, this.LifeTime);

        this._grassHill1.Draw(ctx,  -this.Size.X*0.35,  -this.Size.Y * this._grassHill1Ratio - this.Size.Y * 2 * ratio + this.Size.Y * this._grassHill1Ratio * ratio,
                                    this.Size.X,        this.Size.Y * this._grassHill1Ratio, this.LifeTime);
    }

    public GetZIndex = ()=>0;
}