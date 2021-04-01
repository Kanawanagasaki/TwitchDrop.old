abstract class ACollidable extends AObject
{
    public CollisionRadius:number;

    public constructor()
    {
        super();

        this.CollisionRadius = 0;
    }

    public Tick(time:number)
    {
        for(let obj of this.World.Objects)
        {
            if(obj != this && obj instanceof ACollidable && this.CanCollideWith(obj))
            {
                let direction = obj.PrevPos.Sub(this.Pos);
                if(direction.Length() < this.CollisionRadius + obj.CollisionRadius)
                    this.OnCollisionWith(obj);
            }
        }
    }

    protected abstract OnCollisionWith(obj:ACollidable);
    protected abstract CanCollideWith(obj:ACollidable):boolean;
}