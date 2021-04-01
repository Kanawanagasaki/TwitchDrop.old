abstract class WebClient
{
    protected channel:string;

    protected commands:CommandsCollection;

    public Game:GameEnvironment;

    public constructor(game:GameEnvironment, channel:string)
    {
        this.Game = game;
        this.channel = channel;
        this.commands = new CommandsCollection(this);
        setTimeout(()=>this.Init(), 0);
    }

    public SendInfo(command:string, args:string|string[])
    {
        if(Array.isArray(args))
            args = args.join(" ");
        this.SendMessage(`info ${args}`);
    }

    public SendError(command:string, code:number, message:string)
    {
        this.SendMessage(`error ${command} ${code} ${message}`);
    }
    
    public abstract SendMessage(message:string);

    protected abstract Init();
    protected abstract OnOpen();
    protected abstract OnMessage(message:string);
    protected abstract OnClose();
}