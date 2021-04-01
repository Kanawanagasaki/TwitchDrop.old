class StartEntity extends AObject
{
    public constructor()
    {
        super();

        this.Size = new Vector(32, 32);
    }

    public OnSpawn(world:WorldEnvironment)
    {
        super.OnSpawn(world);
        this.Pos = new Vector(100 + Math.floor(Math.random() * (world.Game.Width - 200)), 0);
    }

    public Tick(time: number) {}

    public GetZIndex = () => 0;
}