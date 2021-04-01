class AudioDevice
{
    private static _channelsCount = 8;

    private _tracks:{[name:string]:HTMLAudioElement[]};
    private _channels:{[name:string]:number};

    private _volume:number;

    public constructor(volume:number)
    {
        this._tracks = {};
        this._channels = {};
        this._volume = volume;

        this.Load("/audio/parachute.ogg");
        this.Load("/audio/landing.ogg");
        this.Load("/audio/woo.ogg");

        this.Load("/audio/spring0.ogg");
        this.Load("/audio/spring1.ogg");
        this.Load("/audio/spring2.ogg");
        this.Load("/audio/spring3.ogg");
    }

    public Load(uri:string)
    {
        let name = uri;
        let slashIndex = name.lastIndexOf("/");
        if(slashIndex >= 0) name = name.substr(slashIndex+1);
        let dotIndex = name.lastIndexOf(".");
        if(dotIndex >= 0) name = name.substr(0, dotIndex);

        this._tracks[name] = [];
        for(let i = 0; i < AudioDevice._channelsCount; i++)
        {
            let audio = new Audio(uri);
            audio.volume = this._volume;
            this._tracks[name].push(audio);
        }
        this._channels[name] = 0;
    }

    public Play(name:string)
    {
        if(name in this._tracks)
        {
            let audio = this._tracks[name][this._channels[name]];
            audio.play();

            this._channels[name] = (this._channels[name] + 1) % AudioDevice._channelsCount;
        }
    }
}