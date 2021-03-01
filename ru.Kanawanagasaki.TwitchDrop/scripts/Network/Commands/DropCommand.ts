class DropCommand extends ACommand
{
    public GetName = () => "drop";

    // info drop <nickname> <angle> <initSpeed> <canparachute> <imageUrl>
    public Info(args: string[])
    {
        if (args.length == 0) return;

        let nickname = args[0];
        let options:any = {};

        let digits:number[] = [];
        let strings:string[] = [];

        args.slice(1).forEach(el => /^[+-]?([0-9]*[.])?[0-9]+$/.test(el) ? digits.push(parseFloat(el)) : strings.push(el));

        if (digits.length > 0) options.angle = digits[0];
        if (digits.length > 1) options.initSpeed = digits[1];

        if (strings.length > 0) options.canParachute = strings[0].toLowerCase() == "true";

        if (strings.length > 1)
        {
            let base64 = strings[1];
            let json = atob(base64);
            let info = JSON.parse(json);

            options.sprite = new Sprite(info.url);
            options.sprite.OnLoad = ()=>
            {
                if(info.isAnimation)
                    options.sprite.Animate(info.width, info.height, info.fps, info.framesCount);
                this.Client.Game.Round.Drop(nickname, options);
            };

        }
        else this.Client.Game.Round.Drop(nickname, options);
    }

    public Error(code: number, message: string) {}
}