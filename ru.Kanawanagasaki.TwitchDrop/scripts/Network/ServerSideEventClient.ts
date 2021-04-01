class ServerSideEventClient extends WebClient
{
    private _eventSource:EventSource;

    private _lastId = 0;

    public constructor(game:GameEnvironment, channel:string)
    {
        super(game, channel);
    }

    private GetUri = ()=>`${location.protocol}//${location.host}/sse/${this.channel}${this._lastId>0?`/${this._lastId}`:``}`;

    protected Init()
    {
        if(this._eventSource)
        {
            this._eventSource.close();
            this._eventSource = null;
        }

        this._eventSource = new EventSource(this.GetUri());
        this._eventSource.onopen = ()=>this.OnOpen;
        this._eventSource.onmessage = (ev)=>this.OnMessage(ev.data);
        this._eventSource.onerror = ()=>
        {
            setInterval(()=>
            {
                if(this._eventSource.readyState && this._eventSource.readyState == EventSource.CLOSED)
                {
                    this.OnClose();
                }
            }, 10000);
        }
    }

    public SendMessage(message: string)
    {
        var split = message.split(' ');
        if(split.length > 2 && split[0] == "info" && split[1] == "id")
            this._lastId = parseInt(split[2]);
    }

    protected OnOpen() {}

    protected OnMessage(message:string)
    {
        this.commands.Parse(message);
    }

    protected OnClose()
    {
        if(this._eventSource)
        {
            this._eventSource.close();
            this._eventSource = null;
        }
        setTimeout(() => this.Init(), 2500);
    }
}