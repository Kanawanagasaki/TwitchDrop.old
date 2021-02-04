class Character
{
    private static _parachuteImages:HTMLImageElement[] = [];
    private static _characterImages:HTMLImageElement[] = [];

    public Nickname: string;

    public Pos:Vector;
    public PrevPos:Vector;
    public Velocity:Vector;
    public PrevVelocity:Vector;
    public Acceleration:Vector;
    public PrevAcceleration:Vector;

    public CharacterAngle:number = 0;
    public ParachuteAngle:number = 0;

    private _characterImage:HTMLImageElement;
    private _parachuteImage:HTMLImageElement;

    private _size:Vector = new Vector(64, 64);
    private _collisionRadius:number = 48;
    private _parachuteSize:Vector = new Vector(204, 204);

    private _startFallingTime:number;
    private _fallingTime:number;
    private _isParachuting:boolean = false;
    public IsOnGround:boolean = false;
    public IsWinner:boolean = false;

    public DistanceToFlag:number = 100;

    public OnLanded:()=>any = undefined;

    public constructor(nickname: string, charImg:HTMLImageElement = undefined)
    {
        this.Nickname = nickname;
        if(charImg !== undefined)
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

    public SetPosition(pos:Vector)
    {
        this.Pos = pos.Sub(this._size.Scale(0.5));
        return this;
    }

    public SetAngle(angle:number)
    {
        angle = angle % 181;
        let rad = angle * (Math.PI / 180);
        
        let length = this.Velocity.Length();
        this.Velocity = new Vector(Math.cos(rad), Math.sin(rad)).Scale(length);
        return this;
    }

    public SetForce(force:number)
    {
        if(force < 0) force = 0;
        if(force > 10) force = 10;

        force = force * 50 + 200;
        this.Velocity = this.Velocity.Normalize().Scale(force).ScaleX(2.5);
        return this;
    }

    public SaveMeasures()
    {
        this.PrevPos = this.Pos;
        this.PrevVelocity = this.Velocity;
        this.PrevAcceleration = this.Acceleration;
    }

    public CheckCollision(char:Character)
    {
        if(this.IsOnGround || char.IsOnGround) return;
        if(!this._isParachuting) return;

        let direction = char.PrevPos.Sub(this.Pos);
        let distance = direction.Length();
        if(distance < this._collisionRadius)
        {
            let charSpeed = char.PrevVelocity.Length();
            this.Velocity = direction.Normalize().Scale(-charSpeed)
        }
    }

    public GetMiddlePosition()
    {
        return this.Pos.Add(this._size.Scale(0.5));
    }

    public Tick(time:number)
    {
        this._fallingTime = performance.now() - this._startFallingTime;

        if(!this.IsOnGround)
        {
            if( (this.Pos.X + this._size.X > dropcanvas.width && this.Velocity.X > 0) ||
                (this.Pos.X < 0 && this.Velocity.X < 0) )
                    this.Velocity = this.Velocity.ScaleX(-1);
    
            if(!this._isParachuting)
            {
                if(this._fallingTime > 500 || this.Pos.Y >= dropcanvas.height / 2)
                {
                    this._isParachuting = true;
                    parachuteOgg.play();

                    if(this.Velocity.Y > 100)
                        this.Velocity = this.Velocity.ScaleY(100 / this.Velocity.Y);
                    if(Math.abs(this.Velocity.X) > 350)
                        this.Velocity = this.Velocity.ScaleX(350 / Math.abs(this.Velocity.X));
                    
                    this.Acceleration = new Vector(0, 0);
                }
            }

            if(this.Velocity.Y < 100 && this.Acceleration.Y == 0)
                this.Acceleration = new Vector(0, dropcanvas.height * 2);
            else if(this.Acceleration.Y != 0)
                this.Acceleration = new Vector(0, 0);

            this.Velocity = this.Velocity.Add(this.Acceleration.Scale(time));
            this.Pos = this.Pos.Add(this.Velocity.Scale(time));
            this.CharacterAngle = Math.sin(this._fallingTime / 1000) * Math.PI / 8;

            if(this.Pos.Y + this._size.Y > dropcanvas.height)
            {
                this.Pos = new Vector(this.Pos.X, dropcanvas.height - this._size.Y);
                this.CharacterAngle = 0;
                this.IsOnGround = true;
                this._isParachuting = false;
                landingOgg.play();
                if(this.OnLanded)
                    this.OnLanded();
            }

            let velocityDirection = Math.atan2(this.Velocity.Y, this.Velocity.X);
            velocityDirection -= Math.PI / 2;
            velocityDirection /= 4;

            if(this.ParachuteAngle < velocityDirection)
                this.ParachuteAngle += Math.PI / 32;
            else if(this.ParachuteAngle > velocityDirection)
                this.ParachuteAngle -= Math.PI / 32;
            if(Math.abs(this.ParachuteAngle - velocityDirection) < Math.PI / 32)
                this.ParachuteAngle = velocityDirection;
        }
    }

    public Draw()
    {
        ctx.save();
        
        ctx.translate(this.Pos.X + this._size.X / 2, this.Pos.Y + this._size.Y / 2);

        if(this.IsOnGround && !this.IsWinner)
            ctx.globalAlpha = 0.25;

        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = '24px Sans-serif';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;

        ctx.strokeText(this.Nickname, 0, -this._size.Y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.Nickname, 0, -this._size.Y);

        if(this.IsWinner)
        {
            let scoreText = "⭐" + (Math.floor(this.DistanceToFlag * 10) / 10).toLocaleString("en-US");

            ctx.strokeText(scoreText, 0, -this._size.Y-24);
            ctx.fillStyle = 'yellow';
            ctx.fillText(scoreText, 0, -this._size.Y-24);
        }

        if(this._isParachuting)
        {
            ctx.save();
            ctx.rotate(this.ParachuteAngle);
            ctx.drawImage(this._parachuteImage, - this._parachuteSize.X / 2, - this._parachuteSize.Y, this._parachuteSize.X, this._parachuteSize.Y);        
            ctx.restore();
        }
        ctx.rotate(this.CharacterAngle);
        ctx.drawImage(this._characterImage, - this._size.X / 2, - this._size.Y / 2, this._size.X, this._size.Y);

        ctx.restore();
    }

    public static LoadParachutes(urls:string[])
    {
        return Character.LoadImages(urls, this._parachuteImages);
    }

    public static LoadCharacters(urls:string[])
    {
        return Character.LoadImages(urls, this._characterImages);
    }

    private static LoadImages(urls:string[], array:HTMLImageElement[])
    {
        return new Promise((resolve, reject)=>
        {
            let loaded = 0;

            urls.forEach((url)=>
            {
                let img = new Image();
                img.onload = () =>
                {
                    array.push(img);
                    loaded++;
                    if(loaded == urls.length)
                        resolve(array);
                };
                img.src = url;
            });
        });
    }

    public static GetRandomParachute()
    {
        return Character._parachuteImages[Math.floor(Math.random() * Character._parachuteImages.length)];
    }

    public static GetRandomCharacter()
    {
        return Character._characterImages[Math.floor(Math.random() * Character._characterImages.length)];
    }
}