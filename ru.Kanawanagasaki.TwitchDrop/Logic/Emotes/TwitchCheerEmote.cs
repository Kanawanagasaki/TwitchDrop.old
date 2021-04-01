using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop.Logic.Emotes
{
    public class TwitchCheerEmote : AEmote
    {
        public string Prefix { get; private set; }
        public List<TwitchCheerTier> Tiers { get; private set; } = new List<TwitchCheerTier>();

        public override string Uri => Tiers.FirstOrDefault()?.Uri;
        public override string Name => Prefix;
        public override string Space => "twitchcheers";

        public TwitchCheerEmote(JToken jObj)
        {
            Prefix = jObj.Value<string>("prefix");

            var tiers = jObj.Value<JArray>("tiers");
            foreach(var tier in tiers)
                Tiers.Add(new TwitchCheerTier(this, tier));
        }
        
        public TwitchCheerTier GetTierEmote(int bits)
        {
            TwitchCheerTier ret = Tiers.FirstOrDefault();
            foreach(var tier in Tiers)
            {
                if (tier.MinBits <= bits && tier.MinBits > (ret?.MinBits ?? -1))
                {
                    ret = tier;
                }
            }
            return ret;
        }
    }
}
