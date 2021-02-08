class Round
{
    // static variables to store images
    private static _flagImages:HTMLImageElement[] = [];
    private static _anglesImage:HTMLImageElement;

    // start and finish positions
    public Start:Vector;
    public Finish:Vector;

    // dropping characters
    private _characters: { [nickname: string]: Character } = {};

    // Random image flag for this round
    private _flagImage:HTMLImageElement;

    private _winnerDistance:number = 0;
    private _winnerNickname:string = "";

    public constructor()
    {
        this.Start = new Vector(100 + Math.floor(Math.random() * (dropcanvas.width - 200)), 0);
        this.Finish = new Vector(100 + Math.floor(Math.random() * (dropcanvas.width - 200)), dropcanvas.height);

        this._flagImage = Round.GetRandomFlag();
    }

    // Spawning a character
    public SpawnCharacter(nickname:string, img:HTMLImageElement = undefined)
    {
        if(this.HasCharacter(nickname))
            return this._characters[nickname];
        
        let character = new Character(nickname, img);
        character.SetPosition(this.Start);
        this._characters[nickname] = character;

        // play woo sound
        wooOgg.play();

        // When character landed we checking if this character is won the round
        character.OnLanded = ()=>
        {
            let landWidth = Math.max(this.Finish.X, dropcanvas.width - this.Finish.X);
            let distanceToFlag = Math.abs(this.Finish.X - character.GetMiddlePosition().X);

            let percent = distanceToFlag / landWidth * 100;
            character.DistanceToFlag = percent;

            let hasCharacter = this.HasCharacter(this._winnerNickname);

            if(percent < this._winnerDistance || !hasCharacter)
            {
                if(hasCharacter)
                    this._characters[this._winnerNickname].IsWinner = false;

                this._winnerDistance = percent;
                this._winnerNickname = character.Nickname;
                character.IsWinner = true;
            }
        };

        return character;
    }

    public HasCharacter(nickname:string)
    {
        return nickname in this._characters;
    }

    public Tick(time:number)
    {
        // every tick we saving previous measures
        for(let nickname in this._characters)
            this._characters[nickname].SaveMeasures();

        // and then checking for collisions and ticking characters
        for(let nickname in this._characters)
        {
            for(let nickname2 in this._characters)
            {
                if(nickname == nickname2) continue;
                this._characters[nickname].CheckCollision(this._characters[nickname2]);
            }

            this._characters[nickname].Tick(time);
        }
    }

    public Draw()
    {
        ctx.drawImage(this._flagImage, this.Finish.X, this.Finish.Y - 128, 128, 128);
        ctx.drawImage(Round._anglesImage, this.Start.X - 32, this.Start.Y, 64, 32);

        for(let nickname in this._characters)
        {
            this._characters[nickname].Draw();
        }
    }

    public static LoadFlags(urls:string[])
    {
        return Round.LoadImages(urls, this._flagImages);
    }

    public static LoadAngles(url:string)
    {
        return new Promise((resolve, reject)=>
        {
            let img = new Image();
            img.onload = () =>
            {
                this._anglesImage = img;
                resolve(this._anglesImage);
            };
            img.src = url;
        });
    }

    private static LoadImages(urls:string[], array:HTMLImageElement[])
    {
        return new Promise((resolve, reject)=>
        {
            let loaded = 0;

            urls.forEach((url)=>
            {
                let img = new Image();
                img.onload = () =>
                {
                    array.push(img);
                    loaded++;
                    if(loaded == urls.length)
                        resolve(array);
                };
                img.src = url;
            });
        });
    }

    public static GetRandomFlag()
    {
        return Round._flagImages[Math.floor(Math.random() * Round._flagImages.length)];
    }
}