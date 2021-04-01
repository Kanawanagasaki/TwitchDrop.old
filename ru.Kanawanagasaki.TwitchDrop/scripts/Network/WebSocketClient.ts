class WebSocketClient extends WebClient
{
    private _uri:string;
    private _socket:WebSocket;

    private _lastId:number;

    public constructor(game:GameEnvironment, channel:string)
    {
        super(game, channel);

        this.Game = game;
        this._uri = `${location.protocol==="https:"?"wss://":"ws://"}${location.host}/ws`;

        setInterval(()=>this.Pinger(), 60_000);
    }

    protected Init()
    {
        if(this._socket)
        {
            this._socket.close(1000);
            this._socket = null;
        }

        this._socket = new WebSocket(this._uri);
        this._socket.onopen = ()=>this.OnOpen();
        this._socket.onmessage = (ev)=>this.OnMessage(ev.data);
        this._socket.onclose = ()=>this.OnClose();
    }

    public SendMessage(message: string)
    {
        if(this._socket)
            this._socket.send(message);
    }

    protected OnOpen()
    {
        this._socket.send(this.channel);
    }

    protected OnMessage(message:string)
    {
        this.commands.Parse(message);
    }

    protected OnClose()
    {
        this._socket = null;
        setTimeout(() => this.Init(), 2500);
    }

    private Pinger()
    {
        if(this._socket)
            this._socket.send("info ping");
    }
}