class SpriteCollection
{
    private _collection: { [name:string] : Sprite } = {};
    private _childs: { [dir:string] : SpriteCollection } = {};
    private _parent:SpriteCollection;
    private _directory:string;

    public constructor(directory:string = "", parent:SpriteCollection = undefined)
    {
        this._directory = directory;
        this._parent = parent;
    }

    public GetFullnameDir()
    {
        if(this._parent !== undefined) return this._parent.GetFullnameDir() + this._directory + "/";
        else return this._directory + "/";
    }

    public Load(uris:any)
    {
        return new Promise((resolver)=>
        {
            let found = 0;
            let loaded = 0;

            for(let key in uris)
            {
                let item = uris[key];
                if(typeof item === "string")
                {
                    if(!(key in this._collection))
                    {
                        found++;

                        let sprite = new Sprite(this.GetFullnameDir() + item);
                        sprite.OnLoad = ()=>
                        {
                            loaded++;
                            if(loaded == found)
                                resolver(0);
                        };
                        this._collection[sprite.GetName()] = sprite;
                    }
                }
                else if(typeof item === "object")
                {
                    if(!(key in this._childs))
                    {
                        found++;

                        let collection = new SpriteCollection(key, this);
                        collection.Load(item).then(()=>
                        {
                            loaded++;
                            if(loaded == found)
                                resolver(0);
                        });
                        this._childs[key] = collection;
                    }
                }
            }

            if(found == 0) resolver(0);
        });
    }

    public Get(path:string) : Sprite
    {
        while(path[0] == "/") path = path.substring(1);

        let slashIndex = path.indexOf("/");
        if(slashIndex < 0)
        {
            if(path in this._collection) return this._collection[path];
            else if(path in this._childs) return this._childs[path].GetRandom();
            else return undefined;
        }
        else
        {
            let dir = path.substring(0, slashIndex);
            path = path.substring(slashIndex + 1);
            if(dir in this._childs) return this._childs[dir].Get(path);
            else return undefined;
        }
    }

    public GetRandom() : Sprite
    {
        let values = Object.keys(this._collection).map(key => this._collection[key]);
        return values[Math.floor(Math.random() * values.length)];
    }
}