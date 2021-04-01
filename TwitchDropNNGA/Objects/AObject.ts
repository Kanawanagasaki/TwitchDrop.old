abstract class AObject implements IDrawable
{
    private static ID_AI:number = 0;
    public Id:number;

    public Pos:Vector;
    public RotationAngle:number;
    public Scale:Vector;

    public PrevPos:Vector;
    public PrevRotationAngle:number;
    public PrevScale:Vector;

    public Size:Vector;

    public World:WorldEnvironment;
    private _spawnTime:number;
    protected get LifeTime() { return this.World.Game.GetTime() - this._spawnTime; }

    public constructor()
    {
        this.Id = ++AObject.ID_AI;

        this.Pos = new Vector(0, 0);
        this.RotationAngle = 0;
        this.Scale = new Vector(1, 1);

        this.PrevPos = new Vector(0, 0);
        this.PrevRotationAngle = 0;
        this.PrevScale = new Vector(1, 1);

        this.Size = new Vector(64, 64);
    }

    public OnSpawn(world:WorldEnvironment)
    {
        this.World = world;
        this._spawnTime = world.Game.GetTime();
    }

    public OnDespawn()
    {
        this.World = undefined;
    }

    public SaveMeasures()
    {
        this.PrevPos = this.Pos;
        this.PrevRotationAngle = this.RotationAngle;
        this.PrevScale = this.Scale;
    }

    public abstract GetZIndex():number;

    public PreTick(time:number){}
    public abstract Tick(time:number);
    public PostTick(time:number){}
}