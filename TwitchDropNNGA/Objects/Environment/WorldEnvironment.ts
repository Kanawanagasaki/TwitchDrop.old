class WorldEnvironment implements IDrawable
{
    public Game:GameEnvironment;
    public Objects:AObject[];

    public constructor(game:GameEnvironment)
    {
        this.Game = game;
        this.Objects = [];
    }

    public Spawn(obj:AObject)
    {
        if(obj === undefined || obj === null) return;
        let index = this.Objects.findIndex(o=>o.Id == obj.Id);
        if(index >= 0) this.Objects[index];

        let spawned = false;
        let zIndex = obj.GetZIndex();
        for(let i = 0; i < this.Objects.length; i++)
        {
            if(zIndex < this.Objects[i].GetZIndex())
            {
                this.Objects.splice(i, 0, obj);
                spawned = true;
                break;
            }
        }
        if(!spawned) this.Objects.push(obj);

        obj.OnSpawn(this);
    }

    public Despawn(obj:AObject)
    {
        if(obj === undefined || obj === null) return;
        let index = this.Objects.findIndex(o=>o.Id == obj.Id);
        if(index < 0) return;

        this.Objects.splice(index, 1);
        obj.OnDespawn();
    }

    public Tick(time:number)
    {
        for(let obj of this.Objects)
        {
            obj.SaveMeasures();
        }
        for(let obj of this.Objects)
        {
            obj.PreTick(time);
        }
        for(let obj of this.Objects)
        {
            obj.Tick(time);
        }
        for(let obj of this.Objects)
        {
            obj.PostTick(time);
        }
    }
}