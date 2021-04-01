using Newtonsoft.Json.Linq;

namespace ru.Kanawanagasaki.TwitchDrop.Logic.Emotes
{
    public class BttvEmote : AEmote
    {
        public string Id { get; set; }
        public string Code { get; set; }
        public string ImageType { get; set; }

        public override string Uri => $"https://cdn.betterttv.net/emote/{Id}/3x";
        public override string Name => Id;
        public override string Space => "bttv";

        public BttvEmote(JObject jObj)
        {
            if (jObj is null) return;

            Id = jObj.Value<string>("id");
            Code = jObj.Value<string>("code");
            ImageType = jObj.Value<string>("imageType");

            if (ImageType == "gif") CreateAnimation();
        }

        public override string ToString()
        {
            return $"{Id} - {Code}.{ImageType}";
        }
    }
}
