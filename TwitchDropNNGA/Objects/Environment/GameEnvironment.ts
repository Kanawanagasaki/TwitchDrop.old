class GameEnvironment
{
    private static POPULATION = 128;

    public Width:number;
    public Height:number;

    private _time:number;

    public constructor(width:number, height:number)
    {
        this.Width = width;
        this.Height = height;
        this._time = 0;

        this.Run();
    }

    private Run()
    {
        let nns:NN[] = [];
        for(let i = 0; i < GameEnvironment.POPULATION; i++)
        {
            let nn = new NN();
            nns.push(nn);
        }
        
        let level = 80;

        for(let i = 0; i <= 1_000_000; i++)
        {
            let results = this.Simulate(nns, level);

            if(i % 10 == 0 && results.length > 0)
            {
                let avr = 0;
                for(let j = 0; j < results.length; j++)
                    avr += results[j].score;
                console.log("Generation", (i+1), "LeveL", level);
                console.log("Average", avr/results.length);
                console.log("Best scores", results.slice(0, GameEnvironment.POPULATION / 16).map(r=>r.score));
                console.log("Completed", results.slice(0, GameEnvironment.POPULATION / 16).map(r=>r.completed));
                console.log("Best NN", results[0].nn.Id, results[0].nn.Weights, results[0].nn.Bias);
                console.log("--------------------");

                fs.appendFileSync("./NNs.log", `Generation: ${i+1} Level: ${level} Id: ${results[0].nn.Id} Completed: ${results[0].completed} Score: ${results[0].score}\nWeights: ${JSON.stringify(results[0].nn.Weights)}\nBiases: ${JSON.stringify(results[0].nn.Bias)}\n\n`);
            }
            else
            {
                let avr = 0;
                for(let j = 0; j < results.length; j++)
                    avr += results[j].score;
                console.log((i+1), level, results[0].completed, avr/results.length, results[0].score);
            }

            nns = results.slice(0, GameEnvironment.POPULATION / 16).map(r=>r.nn);

            for(let j = nns.length; j < GameEnvironment.POPULATION / 16; j++)
                nns.push(new NN());

            let len = nns.length;
            for(let j = 0; j < len; j++)
            {
                for(let k = 0; k < len; k++)
                {
                    if(j != k)
                    {
                        let nn = new NN(nns[j], nns[k]);
                        nn.TryMutate();
                        nns.push(nn);
                    }
                }
            }

            for(let i = nns.length; i < GameEnvironment.POPULATION; i++)
            {
                let nn = new NN(nns[i % GameEnvironment.POPULATION]);
                nn.TryMutate();
                nns.push(nn);
            }
            if(results[0].completed > 80) level++;
        }
    }

    private Simulate(nns:NN[], level:number)
    {
        let scores:{nn:NN, score:number, completed:number}[] = [];

        for(let i = 0; i < nns.length; i++)
            scores[i] = {nn:nns[i], score:0, completed:0};

        for(let a = 0; a < 100; a++)
        {
            this._time = 0;
    
            let round = new RoundEnvironment(this);
            if(a % 20 == 0)
            {
                round.Start.Pos = new Vector(this.Width/2+Math.random()*50, 0);
                round.Finish.Pos = new Vector(this.Width/2+Math.random()*50, this.Height);
            }
            else if(a % 20 == 10)
            {
                round.Finish.Pos = new Vector(round.Start.Pos.X, this.Height);
            }

            let agents:{char:CharacterEntity, index:number}[] = [];
    
            for(let i = 0; i < nns.length; i++)
            {
                let inputs:number[] = [];
                inputs[0] = round.Start.Pos.X / this.Width;
                inputs[1] = round.Finish.Pos.X / this.Width;
    
                let outputs = nns[i].Execute(inputs);
                if(outputs[0] > 1 || outputs[1] > 1) continue;
    
                let options:any = {};
                options.angle = outputs[0] * 90 + 90;
                options.initSpeed = outputs[1] * 5 + 5;
                options.canParachute = outputs[2]>outputs[3];
    
                let char = round.Drop("agent " + i, options);
                agents.push({ char:char, index:i });
            }
    
            if(Object.keys(agents).length == 0) return [];
    
            while(agents.some(a=>!a.char.IsOnGround))
            {
                this._time+=16;
                round.Tick(0.016);
            }

            for(let i = 0; i < agents.length; i++)
            {
                scores[agents[i].index].score += agents[i].char.DistanceFromFlag > level ? agents[i].char.DistanceFromFlag : 0;
                scores[agents[i].index].completed += agents[i].char.DistanceFromFlag > level ? 1 : 0;
            }
        }

        return scores.sort((a, b) => b.score - a.score);
    }

    public GetTime()
    {
        return this._time;
    }
}