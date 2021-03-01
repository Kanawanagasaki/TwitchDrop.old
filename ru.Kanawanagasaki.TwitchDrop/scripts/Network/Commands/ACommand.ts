abstract class ACommand
{
    protected Client:WebClient;

    public constructor(client:WebClient)
    {
        this.Client = client;
    }

    public abstract GetName():string;
    public abstract Info(args:string[]);
    public abstract Error(code:number, message:string);
}