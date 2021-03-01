using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public static class Hub
    {
        private static ChatClient _chat;
        private static ConcurrentDictionary<string, Room> _rooms = new ConcurrentDictionary<string, Room>();

        public static void Init()
        {
            string settings = File.ReadAllText("settings.json");
            var jObj = JsonConvert.DeserializeObject<JObject>(settings);

            string botname = jObj.GetValue("twitchBot").ToString();
            string oauth = jObj.GetValue("twitchOAuth").ToString();
            string clientid = jObj.GetValue("twitchClientId").ToString();
            string secret = jObj.GetValue("twitchSecret").ToString();

            _chat = new ChatClient(botname, oauth, clientid, secret);
        }

        public static async Task ProcessWebSocket(WebSocket socket)
        {
            var web = new WebClient(socket);
            string channel = await web.ReadChannel();

            if(!_rooms.ContainsKey(channel))
            {
                var room = new Room(channel, _chat);
                room.OnDestroying += OnRoomDestroying;
                _rooms[channel] = room;
            }

            _rooms[channel].ProcessWebClient(web);

            await web.Run();
        }

        private static void OnRoomDestroying(Room room)
        {
            while(!_rooms.TryRemove(room.Channel, out _))
            {
                Thread.Sleep(10);
            }
        }
    }
}
