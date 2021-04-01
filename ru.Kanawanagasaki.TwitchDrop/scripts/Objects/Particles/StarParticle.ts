class StarParticle extends Particle
{
    public constructor(pos:Vector, velocity:Vector)
    {
        super(null);
        this.Pos = pos;
        this.Velocity = velocity.Add(Vector.Random().Scale((Math.random()+4)*8));
        this.Size = new Vector(32, 32);
    }

    public OnSpawn(world:WorldEnvironment)
    {
        super.OnSpawn(world);
        this.Sprite = world.Game.Sprites.Get("particles/star");
    }

    public Tick(time:number)
    {
        super.Tick(time);
        this.RotationAngle = Math.PI / 8 * Math.sin(this.LifeTime/200);
        if( (this.Pos.X - this.Size.X / 2 < 0 && this.Velocity.X < 0) || 
            (this.Pos.X + this.Size.X / 2 > this.World.Game.Width && this.Velocity.X > 0) )
            this.Velocity = this.Velocity.ScaleX(-1);
        if( (this.Pos.Y - this.Size.Y / 2 < 0 && this.Velocity.Y < 0) || 
            (this.Pos.Y + this.Size.Y / 2 > this.World.Game.Height && this.Velocity.Y > 0) )
            this.Velocity = this.Velocity.ScaleY(-1);
    }
}