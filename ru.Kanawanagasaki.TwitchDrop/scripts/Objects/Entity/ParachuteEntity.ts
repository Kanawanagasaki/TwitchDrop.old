class ParachuteEntity extends AAttachable
{
    private _character:CharacterEntity;
    private _distanceToChar:number;

    private _magicNumbers:{x:number,y:number}[];

    public constructor(character:CharacterEntity, sprite:Sprite)
    {
        super(sprite);

        this.Size = new Vector(204, 120);
        this.AttachmentDistance = 128;

        this._character = character;
        this._distanceToChar = 0;

        this._magicNumbers = 
        [
            {x:100, y:48},
            {x:53, y:66},
            {x:34, y:92},
            {x:38, y:123},
            {x:81, y:138},
            {x:128, y:135},
            {x:174, y:138},
            {x:217, y:122},
            {x:221, y:92},
            {x:202, y:65},
            {x:154, y:48},
        ];
    }

    public OnSpawn(world:WorldEnvironment)
    {
        super.OnSpawn(world);

        this.Velocity = new Vector(0, -world.Game.Height);
        this.AttachTo(this._character);
    }

    protected OnTension(prevPos: Vector, time: number)
    {
        
    }

    protected OnCollisionWith(obj: ACollidable)
    {

    }

    protected CanCollideWith(obj: ACollidable): boolean
    {
        return false;
    }

    public PostTick(time:number)
    {
        super.PostTick(time);
        
        if(this.IsAttached)
        {
            let direction = this._character.Pos.Sub(this.Pos);
            this.RotationAngle = direction.Angle() - Math.PI/2;
            this._distanceToChar = direction.Length();
        }
    }

    public Draw(ctx:CanvasRenderingContext2D)
    {
        super.Draw(ctx);

        if(this.IsAttached)
        {
            for(let coord of this._magicNumbers)
            {
                let x = coord.x;
                let y = coord.y;
    
                x = (x - this.Sprite.Size.X/2) / (this.Sprite.Size.X/2);
                y = (y - this.Sprite.Size.Y/2) / (this.Sprite.Size.Y/2);
    
                x *= this.Size.X/2;
                y *= this.Size.Y/2;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(0, this._distanceToChar);
                ctx.stroke();
            }
        }
    }

    public GetZIndex = () => 1;
}