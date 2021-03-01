class DropHideCommand extends ACommand
{
    public GetName = ()=>"drophide";

    public Info(args: string[])
    {
        this.Client.Game.Round.Hide();
    }

    public Error(code: number, message: string) {}
}