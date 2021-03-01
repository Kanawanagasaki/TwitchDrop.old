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

    public Opacity:number;
    public Size:Vector;
    protected Sprite:Sprite;

    public World:WorldEnvironment;
    private _spawnTime:number;
    protected get LifeTime() { return performance.now() - this._spawnTime; }

    public constructor(sprite:Sprite)
    {
        this.Id = ++AObject.ID_AI;

        this.Pos = new Vector(0, 0);
        this.RotationAngle = 0;
        this.Scale = new Vector(1, 1);

        this.PrevPos = new Vector(0, 0);
        this.PrevRotationAngle = 0;
        this.PrevScale = new Vector(1, 1);

        this.Opacity = 1;
        this.Size = new Vector(64, 64);
        this.Sprite = sprite;
    }

    public OnSpawn(world:WorldEnvironment)
    {
        this.World = world;
        this._spawnTime = performance.now();
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

    public PreDraw(ctx:CanvasRenderingContext2D)
    {
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(this.Opacity, 0), 1);
        ctx.translate(this.Pos.X, this.Pos.Y);
        if(this.RotationAngle != 0)
            ctx.rotate(this.RotationAngle);
        if(this.Scale.X != 1 || this.Scale.Y != 1)
            ctx.scale(this.Scale.X, this.Scale.Y);
    }
    public Draw(ctx:CanvasRenderingContext2D)
    {
        if(this.Sprite)
            this.Sprite.Draw(ctx, -this.Size.X/2, -this.Size.Y/2, this.Size.X, this.Size.Y, this.LifeTime);
    }
    public PostDraw(ctx:CanvasRenderingContext2D)
    {
        ctx.restore();
    }

    public abstract GetZIndex():number;

    public PreTick(time:number){}
    public abstract Tick(time:number);
    public PostTick(time:number){}
}