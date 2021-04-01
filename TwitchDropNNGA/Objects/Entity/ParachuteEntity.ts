class ParachuteEntity extends AAttachable
{
    private _character:CharacterEntity;

    public constructor(character:CharacterEntity)
    {
        super();

        this.Size = new Vector(204, 120);
        this.AttachmentDistance = 128;

        this._character = character;
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
        }
    }

    public GetZIndex = () => 1;
}