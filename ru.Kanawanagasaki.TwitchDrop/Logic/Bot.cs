using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TwitchLib.Client;
using TwitchLib.Client.Models;
using TwitchLib.Communication.Clients;
using TwitchLib.Communication.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public static class Bot
    {
        private static TwitchClient _twitch = null;
        private static bool _isConnected = false;
        private static ConcurrentDictionary<string, List<WebClient>> _connections = new ConcurrentDictionary<string, List<WebClient>>();

        public static void Init()
        {
            string settings = File.ReadAllText("settings.json");
            var jObj = JsonConvert.DeserializeObject<JObject>(settings);

            ConnectionCredentials credentials = new ConnectionCredentials(jObj.GetValue("twitchBot").ToString(), jObj.GetValue("twitchOAuth").ToString());
            var clientOptions = new ClientOptions
            {
                MessagesAllowedInPeriod = 750,
                ThrottlingPeriod = TimeSpan.FromSeconds(30)
            };
            WebSocketClient twitchClient = new WebSocketClient(clientOptions);
            _twitch = new TwitchClient(twitchClient);
            _twitch.Initialize(credentials);

            _twitch.OnConnected += OnConnected;
            _twitch.OnJoinedChannel += OnJoinedChannel;
            _twitch.OnMessageReceived += OnMessageReceived;
            _twitch.OnLeftChannel += OnLeftChannel;
            _twitch.OnDisconnected += OnDisconnected;

            _twitch.Connect();
        }

        public static void ConnectWebClient(string channel, WebClient cl)
        {
            if (!_isConnected) return;

            if (!_connections.ContainsKey(channel))
                _connections.TryAdd(channel, new List<WebClient>());
            _connections[channel].Add(cl);

            cl.OnConnectionClose += WebClient_OnConnectionClose;

            _twitch.JoinChannel(channel);
        }

        private static void WebClient_OnConnectionClose(WebClient client)
        {
            if (!_isConnected) return;

            if (_connections.ContainsKey(client.ChannelName))
            {
                if(_connections[client.ChannelName].Contains(client))
                {
                    _connections[client.ChannelName].Remove(client);
                }
                if(_connections[client.ChannelName].Count == 0)
                {
                    _connections.TryRemove(client.ChannelName, out _);
                    _twitch.LeaveChannel(client.ChannelName);
                }
            }

        }

        private static void OnConnected(object sender, TwitchLib.Client.Events.OnConnectedArgs e)
        {
            _isConnected = true;

            Console.WriteLine($"[{DateTime.Now.ToString()}] Connected");
        }

        private static void OnJoinedChannel(object sender, TwitchLib.Client.Events.OnJoinedChannelArgs e)
        {
            //_twitch.SendMessage(e.Channel, "Use `!drop <emote> <angle> <force>` to drop");

            Console.WriteLine($"[{DateTime.Now.ToString()}] Joined Channel {e.Channel}");
        }

        private static void OnMessageReceived(object sender, TwitchLib.Client.Events.OnMessageReceivedArgs e)
        {
            if (!_isConnected) return;

            if (_connections.ContainsKey(e.ChatMessage.Channel))
            {
                var clients = _connections[e.ChatMessage.Channel];
                string message = e.ChatMessage.Message;

                if (message.StartsWith("!"))
                    Console.WriteLine($"[{DateTime.Now.ToString()}] {e.ChatMessage.Channel} - {e.ChatMessage.DisplayName}: {message}");

                string[] split = message.Split(" ").Where(str => !string.IsNullOrWhiteSpace(str)).ToArray();
                if (split.Length == 0) return;

                switch (split[0])
                {
                    case "!drop":
                        List<int> digits = new List<int>();
                        foreach (var str in split)
                        {
                            if (int.TryParse(str, out var num))
                                digits.Add(num);
                        }

                        int angle = digits.Count > 0 ? digits[0] : -1;
                        int force = digits.Count > 1 ? digits[1] : -1;

                        Emote emote = null;
                        if (e.ChatMessage.EmoteSet.Emotes.Count > 0)
                            emote = e.ChatMessage.EmoteSet.Emotes.First();

                        string info = "drop";
                        info += " " + e.ChatMessage.DisplayName;
                        if (angle != -1) info += " " + angle;
                        if (force != -1) info += " " + force;
                        if (emote != null) info += " " + emote.ImageUrl.Substring(0, emote.ImageUrl.Length - 3) + "3.0";

                        foreach (var client in clients)
                        {
                            if(client.IsConnected)
                                client.SendInfo(info);
                        }
                        break;
                    case "!dropshow":
                        foreach (var client in clients)
                            if (client.IsConnected)
                                client.SendInfo("dropshow");
                        break;
                    case "!drophide":
                        if (e.ChatMessage.Username != e.ChatMessage.Channel) break;
                        foreach (var client in clients)
                            if (client.IsConnected)
                                client.SendInfo("drophide");
                        break;
                    case "!dropreset":
                        if (e.ChatMessage.Username != e.ChatMessage.Channel) break;
                        foreach (var client in clients)
                            if (client.IsConnected)
                                client.SendInfo("dropreset");
                        break;
                }
            }
        }

        private static void OnLeftChannel(object sender, TwitchLib.Client.Events.OnLeftChannelArgs e)
        {
            if (!_isConnected) return;
            RemoveClients(e.Channel);
            Console.WriteLine($"[{DateTime.Now.ToString()}] Left Channel {e.Channel}");
        }

        private static void RemoveClients(string channel)
        {
            if (_connections.ContainsKey(channel))
            {
                _connections.TryRemove(channel, out var clients);
                foreach (var client in clients)
                {
                    client.Close();
                }
            }
        }

        private static void OnDisconnected(object sender, TwitchLib.Communication.Events.OnDisconnectedEventArgs e)
        {
            _isConnected = false;
            Console.WriteLine($"[{DateTime.Now.ToString()}] Disconnected");
        }
    }
}
