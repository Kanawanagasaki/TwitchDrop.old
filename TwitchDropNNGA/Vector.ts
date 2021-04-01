class Vector
{
    public X: number;
    public Y: number;

    public constructor(x: number = 0, y: number = 0)
    {
        this.X = x;
        this.Y = y;
    }

    public Add(vec:Vector)
    {
        return new Vector(this.X + vec.X, this.Y + vec.Y);
    }

    public Sub(vec:Vector)
    {
        return new Vector(this.X - vec.X, this.Y - vec.Y);
    }

    public Scale(scale:number)
    {
        return new Vector(this.X * scale, this.Y * scale);
    }

    public ScaleX(scale:number)
    {
        return new Vector(this.X * scale, this.Y);
    }

    public ScaleY(scale:number)
    {
        return new Vector(this.X, this.Y * scale);
    }

    public Normalize()
    {
        let len = this.Length();
        return new Vector(this.X / len, this.Y / len);
    }

    public Length()
    {
        return Math.sqrt(this.X * this.X + this.Y * this.Y);
    }

    public Angle()
    {
        return Math.atan2(this.Y, this.X);
    }

    public static Random()
    {
        return Vector.FromAngle(Math.random() * Math.PI * 2);
    }

    public static FromAngle(angle:number)
    {
        let x = Math.cos(angle);
        let y = Math.sin(angle);
        return new Vector(x, y);
    }
}