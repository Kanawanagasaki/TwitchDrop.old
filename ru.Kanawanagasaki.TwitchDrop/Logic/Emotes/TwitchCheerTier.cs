using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop.Logic.Emotes
{
    public class TwitchCheerTier : AEmote
    {
        public int Id { get; private set; }
        public int MinBits { get; private set; }

        public override string Uri => BestImage();
        public override string Name => $"{_cheer.Name}{MinBits}";
        public override string Space => _cheer.Space;

        private Dictionary<string, Dictionary<string, Dictionary<string, string>>> _images = new Dictionary<string, Dictionary<string, Dictionary<string, string>>>();
        private TwitchCheerEmote _cheer;

        public TwitchCheerTier(TwitchCheerEmote cheer, JToken jObj)
        {
            _cheer = cheer;

            Id = jObj.Value<int>("id");
            MinBits = jObj.Value<int>("min_bits");

            bool hasAnimated = false;

            var images = jObj.Value<JObject>("images");
            foreach(var background in images.Properties())
            {
                _images.Add(background.Name, new Dictionary<string, Dictionary<string, string>>());
                foreach(var state in background.Value.Value<JObject>().Properties())
                {
                    if (state.Name == "animated") hasAnimated = true;

                    _images[background.Name].Add(state.Name, new Dictionary<string, string>());
                    foreach(var scale in state.Value.Value<JObject>().Properties())
                    {
                        _images[background.Name][state.Name].Add(scale.Name, scale.Value.Value<string>());
                    }
                }
            }

            if (hasAnimated)
                this.CreateAnimation();
        }

        private string BestImage()
        {
            Dictionary<string, Dictionary<string, string>> states;
            if (_images.ContainsKey("light"))
                states = _images["light"];
            else states = _images.First().Value;

            Dictionary<string, string> scales;
            if (states.ContainsKey("animated"))
                scales = states["animated"];
            else scales = states.First().Value;

            if (scales.ContainsKey("3")) return scales["3"];
            else return scales.First().Value;
        }
    }
}
