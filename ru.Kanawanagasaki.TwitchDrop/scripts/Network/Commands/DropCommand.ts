class DropCommand extends ACommand
{
    public GetName = () => "drop";

    public Info(args: string[])
    {
        if (args.length < 3) return;

        let nickname = args[0];
        let options = JSON.parse(atob(args[1]));
        let image = JSON.parse(atob(args[2]));

        if(image)
        {
            options.sprite = new Sprite(image.url);
            options.sprite.OnLoad = ()=>
            {
                if(image.isAnimation)
                    options.sprite.Animate(image.width, image.height, image.fps, image.framesCount);
                this.Client.Game.Round.Drop(nickname, options);
            };
            options.sprite.OnError = ()=>
            {
                options.sprite = undefined;
                this.Client.Game.Round.Drop(nickname, options);
            };
        }
        else this.Client.Game.Round.Drop(nickname, options);
    }

    public Error(code: number, message: string) {}
}