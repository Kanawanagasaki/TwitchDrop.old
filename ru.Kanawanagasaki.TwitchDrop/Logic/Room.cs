using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using TwitchLib.Client.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class Room
    {
        private static Dictionary<string, BttvEmote> BttvEmotes = new Dictionary<string, BttvEmote>();

        public string Channel { get; private set; }

        public delegate void Destroying(Room room);
        public event Destroying OnDestroying;

        private ChatClient _chat;
        private ConcurrentDictionary<uint, WebClient> _webs = new ConcurrentDictionary<uint, WebClient>();
        private System.Timers.Timer _timer;

        static Room()
        {
            using (HttpClient http = new HttpClient())
            {
                var response = http.GetAsync("https://api.betterttv.net/3/cached/emotes/global").Result;
                var json = response.Content.ReadAsStringAsync().Result;
                var globalBttvEmotes = JsonConvert.DeserializeObject<BttvEmote[]>(json);
                foreach(var emote in globalBttvEmotes)
                {
                    BttvEmotes.Add(emote.Code, emote);
                    if (emote.ImageType == "gif")
                        emote.CreateAnimation();
                }
            }
        }

        public Room(string channel, ChatClient chat)
        {
            Channel = channel.ToLower();
            _chat = chat;

            if (!_chat.IsJoined(Channel))
                _chat.JoinChannel(Channel);

            _chat.OnCommandReceive += OnTwitchCommandReceive;

            _timer = new System.Timers.Timer();
            _timer.Interval = 60 * 1000;
            _timer.Elapsed += OnTimerElapsed;
            _timer.Start();

            chat.Api((clientid, token)=>
            {
                using (HttpClient http = new HttpClient())
                {
                    http.DefaultRequestHeaders.Add("Client-Id", clientid);
                    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var response = http.GetAsync($"https://api.twitch.tv/helix/users?login={channel}").Result;
                    var json = response.Content.ReadAsStringAsync().Result;
                    if (response.StatusCode == System.Net.HttpStatusCode.OK)
                    {
                        var obj = JsonConvert.DeserializeObject<JObject>(json);
                        var userId = obj.Value<JArray>("data").First.Value<string>("id");

                        try
                        {
                            http.DefaultRequestHeaders.Clear();
                            response = http.GetAsync($"https://api.betterttv.net/3/cached/users/twitch/{userId}").Result;
                            json = response.Content.ReadAsStringAsync().Result;
                            var bttvEmotes = JsonConvert.DeserializeObject<JObject>(json);
                            var channelEmotes = bttvEmotes.Value<JArray>("channelEmotes");
                            if(channelEmotes != null)
                            {
                                foreach (var jObj in channelEmotes.Values<JObject>())
                                {
                                    var emote = new BttvEmote(jObj);
                                    BttvEmotes[emote.Code] = emote;
                                    if (emote.ImageType == "gif")
                                        emote.CreateAnimation();
                                }
                            }
                            var sharedEmotes = bttvEmotes.Value<JArray>("sharedEmotes");
                            if(sharedEmotes != null)
                            {
                                foreach (var jObj in sharedEmotes.Values<JObject>())
                                {
                                    var emote = new BttvEmote(jObj);
                                    BttvEmotes[emote.Code] = emote;
                                    if (emote.ImageType == "gif")
                                        emote.CreateAnimation();
                                }
                            }
                        }
                        catch(Exception e)
                        {
                            Console.Error.WriteLine($"[{DateTime.Now}] Catch error while trying to get bttv emotes on channel {userId}\n{e.Message}\n{e.StackTrace}\n\n{json}\n");
                        }
                    }
                    else
                    {
                        Console.Error.WriteLine($"[{DateTime.Now}] Failed to get id of {channel} channel\n{json}");
                    }
                }
            });
        }

        private void OnTimerElapsed(object sender, System.Timers.ElapsedEventArgs e)
        {
            if(_webs.Count == 0)
            {
                _chat.LeavingChannel(Channel);
                OnDestroying?.Invoke(this);
            }
        }

        public void ProcessWebClient(WebClient web)
        {
            if (web.ChannelName != Channel) return;
            if (!_chat.IsJoined(Channel))
                _chat.JoinChannel(Channel);

            web.OnInfoReceived += OnWebInfoReceived;
            web.OnErrorReceived += OnWebErrorReceived;
            web.OnConnectionClose += OnWebConnectionClose;

            _webs[web.Id] = web;
        }

        private void OnWebInfoReceived(WebClient client, string command, string[] args)
        {
            if (command == "ping") client.SendInfoAsync("pong").Wait();
            else client.SendErrorAsync(command, 404, "Command not found").Wait();
        }

        private void OnWebErrorReceived(WebClient client, string command, int code, string error)
        {
            Console.WriteLine($"[{DateTime.Now}] Client sent error on command '{command}' with code {code} and text '{error}' in {Channel} channel");
        }

        private void OnWebConnectionClose(WebClient client)
        {
            while(!_webs.TryRemove(client.Id, out _))
            {
                Thread.Sleep(10);
            }
        }

        private void OnTwitchCommandReceive(string channel, string username, string displayname, string command, List<string> args, EmoteSet emotes)
        {
            if (channel != Channel) return;

            switch(command)
            {
                case "dropparachute": args.Insert(0, "parachute"); Drop(displayname, args, emotes); break;
                case "drop": Drop(displayname, args, emotes); break;
                case "dropshow": DropShow(); break;
                case "drophide": DropHide(username); break;
                case "dropreset": DropReset(username); break;
            }
        }

        private void Drop(string username, List<string> args, EmoteSet emotes)
        {
            List<decimal> digits = new List<decimal>();
            List<string> strings = new List<string>();
            List<BttvEmote> bttvEmotes = new List<BttvEmote>();
            foreach (var str in args)
            {
                if (BttvEmotes.ContainsKey(str))
                    bttvEmotes.Add(BttvEmotes[str]);
                else if (decimal.TryParse(str, out var num))
                    digits.Add(num);
                else
                    strings.Add(str);
            }

            decimal? angle = null;
            if (digits.Count > 0) angle = digits[0];
            decimal? initSpeed = null;
            if (digits.Count > 1) initSpeed = digits[1];

            bool canParachute = strings.Count > 0 && (strings[0].ToLower() == "parachute" || strings[0].ToLower() == "true" || strings[0].ToLower() == "yes" || strings[0] == "1");

            string image = null;
            if (emotes.Emotes.Count != 0)
            {
                var emote = emotes.Emotes.First();
                Dictionary<string, object> info = new Dictionary<string, object>();
                info["isAnimation"] = false;
                info["url"] = emote.ImageUrl.Substring(0, emote.ImageUrl.Length - 3) + "3.0";

                string json = JsonConvert.SerializeObject(info);
                image = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
            }
            else if(bttvEmotes.Count != 0)
            {
                var emote = bttvEmotes.First();
                Dictionary<string, object> info;
                if (emote.IsAnimation)
                    info = emote.GetAnimationInfo();
                else info = new Dictionary<string, object>();
                info["isAnimation"] = emote.IsAnimation;
                info["url"] = emote.GetAnimationUrl();

                string json = JsonConvert.SerializeObject(info);
                image = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
            }

            Drop(username, angle, initSpeed, canParachute, image);
        }

        private void Drop(string username, decimal? angle, decimal? initSpeed, bool canParachute, string image)
        {
            List<string> args = new List<string>();
            args.Add(username);
            if (angle.HasValue) args.Add(angle.Value.ToString().Replace(',', '.'));
            if (initSpeed.HasValue) args.Add(initSpeed.Value.ToString().Replace(',', '.'));

            args.Add(canParachute?"true":"false");
            if (image != null) args.Add(image);

            SendInfoToAllWeb("drop", args);
        }

        private void DropShow()
        {
            SendInfoToAllWeb("dropshow");
        }

        private void DropHide(string username)
        {
            if (username != Channel) return;
            SendInfoToAllWeb("drophide");
        }

        private void DropReset(string username)
        {
            if (username != Channel) return;
            SendInfoToAllWeb("dropreset");
        }

        private void SendInfoToAllWeb(string command, List<string> args = null)
        {
            foreach(var client in _webs.Values)
            {
                client.SendInfoAsync(command, args).Wait();
            }
        }
    }
}
