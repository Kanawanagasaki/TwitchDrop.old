using Microsoft.AspNetCore.Http;
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

        public static async Task Init()
        {
            string settings = File.ReadAllText("settings.json");
            var jObj = JsonConvert.DeserializeObject<JObject>(settings);

            string botname = jObj.GetValue("twitchBot").ToString();
            string oauth = jObj.GetValue("twitchOAuth").ToString();
            string clientid = jObj.GetValue("twitchClientId").ToString();
            string secret = jObj.GetValue("twitchSecret").ToString();

            _chat = new ChatClient(botname, oauth, clientid, secret);
            await _chat.Init();
        }

        public static async Task ProcessWebClient(WebClient web)
        {
            try
            {
                string channel = await web.ReadChannel();

                if(!string.IsNullOrWhiteSpace(channel))
                {
                    if (!_rooms.ContainsKey(channel))
                    {
                        var room = new Room(channel, _chat);
                        await room.LoadEmotes();
                        room.OnDestroying += OnRoomDestroying;
                        _rooms.TryAdd(channel, room);
                    }

                    if (_rooms.TryGetValue(channel, out var outRoom))
                        outRoom.ProcessWebClient(web);

                    if (web.IsConnected)
                    {
                        await web.Init();
                        await web.Run();
                    }
                }
            }
            catch(Exception e)
            {
                Console.WriteLine($"[{DateTime.Now}] Error occurred while trying to process web client\n\t- {e.Message}");
            }
        }

        private static void OnRoomDestroying(Room room)
        {
            _rooms.TryRemove(room.Channel, out _);
        }
    }
}
