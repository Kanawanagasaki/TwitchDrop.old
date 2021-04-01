class NN
{
    private static ID_AI = 1000;
    public Id:number;

    private static HIDDEN_LAYOUTS = 2;
    private static HIDDEN_NEURONS = 5;
    private static INPUT_NEURONS = 2;
    private static OUTPUT_NEUROUNS = 2;

    private static MUTATE_CHANCE = 0.2;

    public Weights:number[];
    public Bias:number[];

    public constructor(parent1:NN = null, parent2:NN = null)
    {
        this.Id = ++NN.ID_AI;

        if(parent1 === null && parent2 === null)
        {
            this.Weights = [];

            let weightsCount = 0;
            weightsCount += NN.INPUT_NEURONS * NN.HIDDEN_NEURONS;
            for(let i = 0; i < NN.HIDDEN_LAYOUTS-1; i++)
                weightsCount += NN.HIDDEN_NEURONS ** 2;
            weightsCount += NN.HIDDEN_NEURONS * NN.OUTPUT_NEUROUNS;

            for(let i = 0; i < weightsCount; i++)
                this.Weights.push(Math.random() * 2 - 1);

            this.Bias = [];
            for(let i = 0; i < NN.HIDDEN_LAYOUTS + 1; i++)
                this.Bias.push(Math.random() * 2 - 1);
        }
        else if(parent2 === null)
        {
            this.Weights = JSON.parse(JSON.stringify(parent1.Weights));
            this.Bias = JSON.parse(JSON.stringify(parent1.Bias));
        }
        else if(parent1 === null)
        {
            this.Weights = JSON.parse(JSON.stringify(parent2.Weights));
            this.Bias = JSON.parse(JSON.stringify(parent2.Bias));
        }
        else
        {
            this.Weights = [];
            for(let i = 0; i < parent1.Weights.length && i < parent2.Weights.length; i++)
                this.Weights.push(Math.random() < 0.5 ? parent1.Weights[i] : parent2.Weights[i]);
            this.Bias = [];
            for(let i = 0; i < parent1.Bias.length && i < parent2.Bias.length; i++)
                this.Bias.push(Math.random() < 0.5 ? parent1.Bias[i] : parent2.Bias[i]);
        }
    }

    public TryMutate()
    {
        for(let i = 0; i < this.Weights.length; i++)
        {
            if(Math.random() <= NN.MUTATE_CHANCE)
                this.Weights[i] *= (Math.random() * 0.4 + 0.8) * Math.sign(Math.random()-0.5);
        }
        for(let i = 0; i < this.Bias.length; i++)
        {
            if(Math.random() <= NN.MUTATE_CHANCE)
                this.Bias[i] *= (Math.random() * 0.4 + 0.8) * Math.sign(Math.random()-0.5);
        }
    }

    public Execute(input:number[])
    {
        let output:number[] = [];
        for(let i = 0; i < NN.OUTPUT_NEUROUNS; i++)
            output.push(this.CalculateNeuron(input, NN.HIDDEN_LAYOUTS + 1, i));
        return output;
    }

    private CalculateNeuron(input:number[], layout:number, neuron:number) : number
    {
        if(layout == 0) return input[neuron];
        
        let summ = 0;
        for(let i = 0; i < (layout==1?NN.INPUT_NEURONS:NN.HIDDEN_NEURONS); i++)
        {
            let value = this.CalculateNeuron(input, layout-1, i);
            value *= this.GetWeight(layout-1, i, neuron);
            summ += value;
        }
        summ += this.Bias[layout-1];

        return Math.tanh(summ);
    }

    private GetWeight(layout:number, neuron1:number, neuron2:number)
    {
        let index:number = 0;
        if(layout == 0)
        {
            index = neuron1 * NN.HIDDEN_NEURONS + neuron2;
        }
        else if(layout == NN.HIDDEN_LAYOUTS)
        {
            index = NN.INPUT_NEURONS * NN.HIDDEN_NEURONS;
            for(let i = 0; i < NN.HIDDEN_LAYOUTS - 1; i++)
                index += NN.HIDDEN_NEURONS ** 2;
            index += neuron1 * NN.OUTPUT_NEUROUNS + neuron2;
        }
        else
        {
            index = NN.INPUT_NEURONS * NN.HIDDEN_NEURONS;
            for(let i = 0; i < layout - 1; i++)
                index += NN.HIDDEN_NEURONS ** 2;
            index += neuron1 * NN.HIDDEN_NEURONS + neuron2;
        }

        return this.Weights[index];
    }
}