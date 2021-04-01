class Particle extends APhysicable
{
    public LifeTimeLength:number;

    public constructor(sprite:Sprite)
    {
        super(sprite);

        this.LifeTimeLength = 1000;
    }

    public Tick(time:number)
    {
        super.Tick(time);

        if(this.LifeTime > this.LifeTimeLength)
            this.World.Despawn(this);
    }

    protected OnCollisionWith(obj: ACollidable) {}
    protected CanCollideWith(obj: ACollidable): boolean
    {
        return false;
    }
    public GetZIndex(): number
    {
        return 0;
    }
}