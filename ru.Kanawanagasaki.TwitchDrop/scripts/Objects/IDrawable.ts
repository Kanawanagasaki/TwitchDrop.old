interface IDrawable
{
    Tick(time:number):void;
    Draw(ctx:CanvasRenderingContext2D):void;
}