using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TwitchLib.Client.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic.Emotes
{
    public class TwitchEmote : AEmote
    {
        private Emote _emote;

        public override string Uri => _emote.ImageUrl.Replace("1.0", "3.0").Replace("1.gif", "3.gif");
        public override string Name => _emote.Name;
        public override string Space => "twitch";

        public TwitchEmote(Emote emote)
        {
            _emote = emote;
            if (Uri.EndsWith(".gif")) CreateAnimation();
        }
    }
}
