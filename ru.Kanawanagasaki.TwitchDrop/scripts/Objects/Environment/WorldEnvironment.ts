class WorldEnvironment implements IDrawable
{
    public Game:GameEnvironment;
    public Objects:AObject[];

    private _despawning:AObject[];

    public constructor(game:GameEnvironment)
    {
        this.Game = game;
        this.Objects = [];
        this._despawning = [];
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

    public Despawn(obj:AObject, immediately:boolean = false)
    {
        if(obj === undefined || obj === null) return;
        let index = this.Objects.findIndex(o=>o.Id == obj.Id);
        if(index < 0) return;

        if(immediately)
        {
            this.Objects.splice(index, 1);
            obj.OnDespawn();
        }
        else this._despawning.push(obj);
    }

    public IsSpawned(obj:AObject)
    {
        return this.Objects.some(o=>o.Id == obj.Id);
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

        for(let i = 0; i < this._despawning.length; i++)
        {
            this._despawning[i].Opacity -= 2 * time;
            if(this._despawning[i].Opacity < 0)
            {
                let obj = this._despawning.splice(i, 1)[0];
                i--;

                let index = this.Objects.findIndex(o=>o.Id == obj.Id);
                if(index < 0) continue;
                
                this.Objects.splice(index, 1);
                obj.OnDespawn();
            }
        }
    }

    public Draw(ctx:CanvasRenderingContext2D)
    {
        for(let obj of this.Objects)
        {
            obj.PreDraw(ctx);
            obj.Draw(ctx);
            obj.PostDraw(ctx);
        }
    }
}