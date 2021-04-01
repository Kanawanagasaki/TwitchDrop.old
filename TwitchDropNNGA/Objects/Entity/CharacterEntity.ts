class CharacterEntity extends APhysicable
{
    public Nickname:string;

    public EdgeBounces:number;

    public IsOnGround:boolean;
    public IsWinner:boolean;
    public DistanceFromFlag:number;

    public CanParachute:boolean;

    public OnLand:()=>any;

    private _isFalling:boolean;
    private _isParachuting:boolean;
    private _isRolling:boolean;

    private _parachute:ParachuteEntity;

    private _gravityForce:Vector;
    private _dragForce:Vector;
    private _rollingForce:Vector;

    private _parachutingStabilizedAngleTime:number;

    public constructor(nickname:string)
    {
        super();

        this.Nickname = nickname;

        this.EdgeBounces = 0;

        this.Size = new Vector(64, 64);
        this.CollisionRadius = 24;

        this.IsOnGround = false;
        this.IsWinner = false;
        this.DistanceFromFlag = 0;

        this.CanParachute = false;

        this._isFalling = true;
        this._isParachuting = false;
        this._isRolling = false;

        this._parachute = null;

        this._parachutingStabilizedAngleTime = 0;

        this.SetAngle(Math.random() * 360);
        this.SetInitialSpeed(Math.random() * 10);
    }

    public OnSpawn(world:WorldEnvironment)
    {
        super.OnSpawn(world);

        this._gravityForce = new Vector(0, world.Game.Height);
        this._dragForce = new Vector();
        this._rollingForce = new Vector();

        this.ApplyForce("gravity", this._gravityForce);
        this.ApplyForce("drag", this._dragForce);
    }

    public SetAngle(angle:number)
    {
        angle %= 360;
        angle = 180 - Math.abs(angle - 180);
        let rad = angle * (Math.PI / 180);
        this.RotationAngle = rad;

        let length = Math.max(1, this.Velocity.Length());
        this.Velocity = new Vector(Math.cos(rad), Math.sin(rad)).Scale(length);
    }

    public SetInitialSpeed(factor:number)
    {
        if(factor < 0) factor = 0;
        if(factor > 10) factor = 10;

        factor *= 35;
        factor *= Math.abs(this.Velocity.Normalize().X) + 1;
        factor += 200;

        this.Velocity = this.Velocity.Normalize().Scale(factor);
    }

    protected OnCollisionWith(obj: ACollidable) {}

    protected CanCollideWith(obj: ACollidable): boolean
    {
        return false;
    }

    public Tick(time:number)
    {
        if(this.IsOnGround) return;

        if( (this.Pos.X - this.Size.X / 2 < 0 && this.Velocity.X < 0) || 
            (this.Pos.X + this.Size.X / 2 > this.World.Game.Width && this.Velocity.X > 0) )
        {
            this.EdgeBounces++;
            this.Velocity = this.Velocity.ScaleX(-1);
            if(this._isRolling)
            {
                this._rollingForce = this._rollingForce.ScaleX(-1);
                this.ApplyForce("rolling", this._rollingForce);
            }
        }

        if(this._isFalling) this.Falling(time);
        if(this._isParachuting) this.Parachuting(time);
        else if(this._isRolling) this.Rolling(time);
        
        super.Tick(time);
    }

    public OnWin()
    {
        this.IsWinner = true;
    }

    public OnLose()
    {
        this.IsWinner = false;
    }

    private Rotate(time:number)
    {
        let angle = time * Math.PI * (this.Velocity.X / (this.Size.X * 2));

        this.RotationAngle %= Math.PI * 2;
        if(this.RotationAngle < -Math.PI) this.RotationAngle += Math.PI * 2;
        if(this.RotationAngle > Math.PI) this.RotationAngle -= Math.PI * 2;

        this.RotationAngle += angle;
        return angle;
    }

    private Falling(time:number)
    {
        this.Rotate(time);

        if(this.CanParachute && this.Pos.Y > this.World.Game.Height * 0.2)
        {
            this._isFalling = false;
            this._isParachuting = true;

            this._parachute = new ParachuteEntity(this);
            this._parachute.Pos = this.Pos;
            this._parachute.Velocity = this.Velocity.Scale(-0.8);
            this.World.Spawn(this._parachute);
        }
        else if(this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height)
        {
            if(this.Velocity.Y > 0)
            {
                if(this.Velocity.Y < this.Size.Y)
                    this.Roll();
                else
                {
                    this.Velocity = this.Velocity.ScaleY(-0.75).ScaleX(0.75);
                }
            }
        }
    }

    private Parachuting(time:number)
    {
        if(this.Velocity.Y > 100 && this._gravityForce.Y >= 0)
        {
            this._dragForce = new Vector(0, -this.World.Game.Height * 2);
            this.ApplyForce("drag", this._dragForce);
        }
        else if(this.Velocity.Y < 100 && this._gravityForce.Y != 0)
        {
            this._dragForce = new Vector();
            this.ApplyForce("drag", this._dragForce);
        }

        if(Math.abs(this.RotationAngle) > Math.PI / 8)
        {
            this._parachutingStabilizedAngleTime = this.LifeTime;
            this.RotationAngle -= Math.sign(this.RotationAngle) * Math.PI * 4 * time;
        }
        else
            this.RotationAngle = Math.sin((this.LifeTime - this._parachutingStabilizedAngleTime) / 1000) * Math.PI / 8;

        if(this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height)
        {
            this._parachute.Velocity = this.PrevVelocity;
            this.World.Despawn(this._parachute);
            this.Roll();
        }
    }

    private Roll()
    {
        this._isFalling = false;
        this._isParachuting = false;
        this._isRolling = true;

        this.Pos = new Vector(this.Pos.X, this.World.Game.Height - this.Size.Y/2);
        this.Velocity = new Vector(this.Velocity.X, 0);

        this.RemoveForce("gravity");
        this.RemoveForce("drag");
        
        if(-Math.PI * 0.65 < this.RotationAngle && this.RotationAngle < Math.PI * 0.65)
            this._rollingForce = new Vector(Math.sign(this.RotationAngle) * -this.Size.X, 0);
        else
            this._rollingForce = new Vector(Math.sign(this.Velocity.X) * this.Size.X, 0);
        
        this.ApplyForce("rolling", this._rollingForce);
    }

    private Rolling(time:number)
    {
        let angle = this.Rotate(time);

        if(Math.sign(this.RotationAngle) != Math.sign(this.RotationAngle - angle))
            this.Landed();
    }

    private Landed()
    {
        this._isFalling = false;
        this._isParachuting = false;
        this._isRolling = false;
        this.IsOnGround = true;

        this.Pos = new Vector(this.Pos.X, this.World.Game.Height - this.Size.Y/2);
        this.Velocity = new Vector();

        this.RemoveForce("rolling");
        this.RemoveForce("gravity");

        this.RotationAngle = 0;

        if(this.OnLand()) this.OnLand();
    }

    public GetZIndex = ()=>2;
}