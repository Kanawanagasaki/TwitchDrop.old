class Character
{
    // static arrays where images stored once page is loaded
    private static _parachuteImages:HTMLImageElement[] = [];
    private static _characterImages:HTMLImageElement[] = [];

    // twitch nickname corresponding to this character
    public Nickname: string;

    // Position, Velocity and Acceleration
    public Pos: Vector;
    public Velocity: Vector;
    public Acceleration: Vector;

    // Position, Velocity and Acceleration but in last frame. Used to calculate collision
    public PrevPos: Vector;
    public PrevVelocity: Vector;
    public PrevAcceleration: Vector;

    // Angle of the character. Only visual
    public CharacterAngle: number = 0;
    // Parachute angle only visual as well
    public ParachuteAngle:number = 0;

    // Randomly chosen imagse from static arrays above for character and parachute for this object
    private _characterImage:HTMLImageElement;
    private _parachuteImage:HTMLImageElement;

    // size of character, 64x64 pixels
    private _size: Vector = new Vector(64, 64);
    private _collisionRadius: number = 48;

    // size of parachute, 204x204 pixels
    private _parachuteSize:Vector = new Vector(204, 204);

    private _startFallingTime:number;
    private _fallingTime: number;

    private _isParachuting:boolean = false;
    public IsOnGround:boolean = false;
    public IsWinner:boolean = false;

    // distance to flag from 0 to 100. less is better. calculated when character hit the ground
    public DistanceToFlag:number = 100;

    // OnLanded is callback for when character is hit the ground
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

    // Sets the center to be at pos
    public SetPosition(pos:Vector)
    {
        // Position of character is given position minus half of size of character
        this.Pos = pos.Sub(this._size.Scale(0.5));
        return this;
    }

    // Sets the drop angle in degrees
    public SetAngle(angle:number)
    {
        angle = angle % 181;
        let rad = angle * (Math.PI / 180);
        
        let length = this.Velocity.Length();
        this.Velocity = new Vector(Math.cos(rad), Math.sin(rad)).Scale(length);
        return this;
    }

    // Sets the drop initial speed
    public SetForce(force:number)
    {
        if(force < 0) force = 0;
        if(force > 10) force = 10;

        // min: 200 pixels per second, max: 700 pixels per second
        force = force * 50 + 200;
        this.Velocity = this.Velocity.Normalize().Scale(force).ScaleX(2.5);
        return this;
    }

    // Saving measures from previous frame
    public SaveMeasures()
    {
        this.PrevPos = this.Pos;
        this.PrevVelocity = this.Velocity;
        this.PrevAcceleration = this.Acceleration;
    }

    // Checking collision with another character
    public CheckCollision(char:Character)
    {
        // if we are on the ground or char is on ground we skipping the check
        if (this.IsOnGround || char.IsOnGround) return;
        // or if we not parachuting we skipping check as well, it done for if two players decided to drop at the same time
        if(!this._isParachuting) return;

        // direction to the char
        let direction = char.PrevPos.Sub(this.Pos);
        let distance = direction.Length();

        if(distance < this._collisionRadius)
        {
            let charSpeed = char.PrevVelocity.Length();
            this.Velocity = direction.Normalize().Scale(-charSpeed);

            /*
                So, what we've done?
                If distance from this to char is less than collision radius then
                store char's speed and scale normalized direction vector by it's negative value.

                Think about it, this check is done for 2 character
                so later we will check it for char with this as argument.
                
                And actually what we've done is we swap speeds between this and char
                and set moving direction to be away from char that we collide with
            */
        }
    }

    // Get center actually. Center of the character
    public GetMiddlePosition()
    {
        return this.Pos.Add(this._size.Scale(0.5));
    }

    // Logic tick, in time stored elapsed time from previous frame
    public Tick(time:number)
    {
        // if we on ground we skipping tick
        if (this.IsOnGround) return;


        this._fallingTime = performance.now() - this._startFallingTime;

        // bounce of the edge
        if( (this.Pos.X + this._size.X > dropcanvas.width && this.Velocity.X > 0) ||
            (this.Pos.X < 0 && this.Velocity.X < 0) )
                this.Velocity = this.Velocity.ScaleX(-1);

        // If we not parachuting yet
        if(!this._isParachuting)
        {
            // and if we falling more than half a second OR if we pass half a screen
            if(this._fallingTime > 500 || this.Pos.Y >= dropcanvas.height / 2)
            {
                // we now parashuting
                this._isParachuting = true;

                // play parachute sound
                parachuteOgg.play();

                // Scaling Y and X velocity so we falling max 100 pixel per second and horizontal speed is 350 pixel per second max
                if(this.Velocity.Y > 100)
                    this.Velocity = this.Velocity.ScaleY(100 / this.Velocity.Y);
                if(Math.abs(this.Velocity.X) > 350)
                    this.Velocity = this.Velocity.ScaleX(350 / Math.abs(this.Velocity.X));

                // do not accelerate while we parachuting
                this.Acceleration = new Vector(0, 0);
            }
        }
        else
        {
            // if we are parachuting slower than 100 pixel per second we adding acceleration, otherwise no acceleration
            if (this.Velocity.Y < 100 && this.Acceleration.Y == 0)
                this.Acceleration = new Vector(0, dropcanvas.height * 2);
            else if (this.Acceleration.Y != 0)
                this.Acceleration = new Vector(0, 0);
        }

        // Applying Acceleration and velocity
        this.Velocity = this.Velocity.Add(this.Acceleration.Scale(time));
        this.Pos = this.Pos.Add(this.Velocity.Scale(time));

        // Calculating character angle, it just visual
        this.CharacterAngle = Math.sin(this._fallingTime / 1000) * Math.PI / 8;

        // landing logic
        if(this.Pos.Y + this._size.Y > dropcanvas.height)
        {
            // setting Y coord to be on vertical edge
            this.Pos = new Vector(this.Pos.X, dropcanvas.height - this._size.Y);

            this.CharacterAngle = 0;

            this.IsOnGround = true;
            this._isParachuting = false;

            // play landing sound
            landingOgg.play();

            // calling callback
            if(this.OnLanded)
                this.OnLanded();
        }


        // Calculating parachute angle, it just visual
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

    public Draw()
    {
        ctx.save();
        
        ctx.translate(this.Pos.X + this._size.X / 2, this.Pos.Y + this._size.Y / 2);

        if(this.IsOnGround && !this.IsWinner)
            ctx.globalAlpha = 0.25;

        if(this._isParachuting)
        {
            ctx.save();
            ctx.rotate(this.ParachuteAngle);
            ctx.drawImage(this._parachuteImage, - this._parachuteSize.X / 2, - this._parachuteSize.Y, this._parachuteSize.X, this._parachuteSize.Y);
            ctx.restore();
        }

        ctx.save();
        ctx.rotate(this.CharacterAngle);
        ctx.drawImage(this._characterImage, - this._size.X / 2, - this._size.Y / 2, this._size.X, this._size.Y);
        ctx.restore();

        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = '24px Sans-serif';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;

        ctx.strokeText(this.Nickname, 0, -this._size.Y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.Nickname, 0, -this._size.Y);

        if (this.IsWinner) {
            // now larger is better Kappa
            let scoreText = "⭐ " + (100 - Math.floor(this.DistanceToFlag * 10) / 10).toLocaleString("en-US");

            ctx.strokeText(scoreText, 0, -this._size.Y - 24);
            ctx.fillStyle = 'yellow';
            ctx.fillText(scoreText, 0, -this._size.Y - 24);
        }

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