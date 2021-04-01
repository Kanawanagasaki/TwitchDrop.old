abstract class AAttachable extends APhysicable
{
    public IsAttached:boolean;
    public AttachedTo:APhysicable;
    public AttachmentDistance:number;

    public constructor()
    {
        super();

        this.IsAttached = false;
        this.AttachedTo = null;
        this.AttachmentDistance = 0;
    }

    public AttachTo(obj:APhysicable)
    {
        this.IsAttached = true;
        this.AttachedTo = obj;
    }

    public Detach()
    {
        this.IsAttached = false;
        this.AttachedTo = null;
    }

    public PostTick(time:number)
    {
        super.PostTick(time);

        if(!this.IsAttached) return;

        if(this.AttachmentDistance == 0)
        {
            this.Pos = this.AttachedTo.Pos;
        }
        else
        {
            let direction = this.Pos.Sub(this.AttachedTo.Pos);
            let distance = direction.Length();
            if(distance > this.AttachmentDistance)
            {
                let prevPos = this.Pos;
                this.Pos = this.AttachedTo.Pos.Add(direction.Scale(this.AttachmentDistance / distance));
                this.OnTension(prevPos, time);
            }
        }
    }

    protected abstract OnTension(prevPos:Vector, time:number);
}