class CommandsCollection
{
    private _commands:{[name:string]:ACommand};

    public constructor(client:WebClient)
    {
        this._commands = {};

        this.Register(new DropCommand(client));
        this.Register(new DropShowCommand(client));
        this.Register(new DropHideCommand(client));
        this.Register(new DropResetCommand(client));
        this.Register(new IdCommand(client));
    }

    public Register(command:ACommand)
    {
        if(command.GetName() in this._commands) return;
        this._commands[command.GetName()] = command;
    }

    public Parse(packet:string)
    {
        let split = packet.split(' ');
        if(split.length < 2) return;

        let type = split[0];
        let commandName = split[1];

        if(!(commandName in this._commands)) return;
        
        if(type == "info") this._commands[commandName].Info(split.slice(2));
        else if(type == "error")
        {
            if(split.length < 4) return;

            let code = parseInt(split[2]);
            let message = split.splice(3).join(" ");

            this._commands[commandName].Error(code, message);
        }
    }
}