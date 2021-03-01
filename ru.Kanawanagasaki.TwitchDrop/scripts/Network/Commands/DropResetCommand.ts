class DropResetCommand extends ACommand
{
    public GetName = ()=> "dropreset";

    public Info(args: string[])
    {
        this.Client.Game.Round.Reset();
    }

    public Error(code: number, message: string){}
}