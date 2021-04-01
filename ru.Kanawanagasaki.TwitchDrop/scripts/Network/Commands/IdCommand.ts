class IdCommand extends ACommand
{
    public GetName = () => "id";

    public Info(args: string[])
    {
        if(args.length > 1 && parseInt(args[0]) > 0)
            this.Client.SendInfo(this.GetName(), args[0]);
    }

    public Error(code: number, message: string){}
}