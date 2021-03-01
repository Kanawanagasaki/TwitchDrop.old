class WebClient
{
    private _uri:string;
    private _channel:string;
    private _socket:WebSocket;
    private _isOpen:boolean;

    private _commands:CommandsCollection;

    public Game:GameEnvironment;

    public constructor(game:GameEnvironment, uri:string, channel:string)
    {
        this.Game = game;

        this._uri = uri;
        this._channel = channel;
        this._socket = null;
        this._isOpen = false;

        this._commands = new CommandsCollection(this);
        
        this.Init();

        setInterval(()=>this.Pinger(), 60_000);
    }

    private Init()
    {
        if(this._socket !== null)
        {
            this._socket.close(1000);
            this._socket = null;
        }

        this._socket = new WebSocket(this._uri);
        this._socket.onopen = ()=>this.OnOpen();
        this._socket.onmessage = (ev)=>this.OnMessage(ev);
        this._socket.onclose = ()=>this.OnClose();
    }

    private OnOpen()
    {
        this._socket.send(this._channel);
        this._isOpen = true;
    }

    private OnMessage(ev:MessageEvent<string>)
    {
        this._commands.Parse(ev.data);
    }

    private OnClose()
    {
        this._isOpen = false;
        this._socket = null;

        setTimeout(() => this.Init(), 2500);
    }

    private Pinger()
    {
        if(this._isOpen)
            this._socket.send("info ping");
    }
}