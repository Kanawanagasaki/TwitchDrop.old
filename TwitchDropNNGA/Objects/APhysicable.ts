abstract class APhysicable extends ACollidable
{
    private _forces:{ [name:string]:Vector }

    public Velocity:Vector;
    public PrevVelocity:Vector;

    public get Acceleration():Vector
    {
        let ret = new Vector();
        for(let forceName in this._forces)
            ret = ret.Add(this._forces[forceName]);
        return ret;
    }

    public constructor()
    {
        super();

        this._forces = {};
        this.Velocity = new Vector();
    }

    public SaveMeasures()
    {
        super.SaveMeasures();

        this.PrevVelocity = this.Velocity;
    }

    public ApplyForce(name:string, vector:Vector)
    {
        this._forces[name] = vector;
    }

    public RemoveForce(name:string)
    {
        if(name in this._forces)
            delete this._forces[name];
    }

    public Tick(time:number)
    {
        super.Tick(time);

        this.Velocity = this.Velocity.Add(this.Acceleration.Scale(time));
        this.Pos = this.Pos.Add(this.Velocity.Scale(time));
    }
}