class AudioDevice
{
    private _tracks:{[name:string]:HTMLAudioElement};
    private _volume:number;

    public constructor(volume:number)
    {
        this._tracks = {};
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
        let audio = new Audio(uri);
        audio.volume = this._volume;

        audio.play();
        audio.pause();
        audio.currentTime = 0;

        let name = uri;
        let slashIndex = name.lastIndexOf("/");
        if(slashIndex >= 0) name = name.substr(slashIndex+1);
        let dotIndex = name.lastIndexOf(".");
        if(dotIndex >= 0) name = name.substr(0, dotIndex);

        this._tracks[name] = audio;
    }

    public Play(name:string)
    {
        if(name in this._tracks)
        {
            let node = this._tracks[name].cloneNode(true) as HTMLAudioElement;
            node.volume = this._volume;
            node.play();
        }
    }

    public Stop(name:string)
    {
        if(name in this._tracks)
        {
            this._tracks[name].pause();
            this._tracks[name].currentTime = 0;
        }
    }
}