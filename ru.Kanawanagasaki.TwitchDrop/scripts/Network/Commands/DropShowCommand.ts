class DropShowCommand extends ACommand
{
    public GetName = ()=>"dropshow";

    public Info(args: string[])
    {
        this.Client.Game.Round.Show();
    }

    public Error(code: number, message: string) {}
}