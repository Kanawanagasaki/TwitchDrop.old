class FinishEntity extends AObject
{
    public constructor()
    {
        super();
        this.Size = new Vector(128, 128);
    }

    public OnSpawn(world:WorldEnvironment)
    {
        super.OnSpawn(world);
        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), world.Game.Height);
    }

    public Tick(time:number){}

    public GetZIndex = ()=>0;
}