using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ru.Kanawanagasaki.TwitchDrop.Logic.Emotes;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using TwitchLib.Client.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class Room
    {
        private static Dictionary<string, BttvEmote> BttvEmotes = new Dictionary<string, BttvEmote>();
        private static Dictionary<string, TwitchCheerEmote> CheerEmotes = new Dictionary<string, TwitchCheerEmote>();
        private static Dictionary<string, string> Emoji = new Dictionary<string, string>();

        public string Channel { get; private set; }
        public string ChannelId { get; private set; }

        public delegate void Destroying(Room room);
        public event Destroying OnDestroying;

        private ChatClient _chat;
        private ConcurrentDictionary<uint, WebClient> _webs = new ConcurrentDictionary<uint, WebClient>();
        private System.Timers.Timer _timer;

        private uint _lastEventId = 1000;
        private Dictionary<uint, (string command, string args)> _events = new Dictionary<uint, (string command, string args)>();

        private static Random Rand = new Random();

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
        }

        public async Task LoadEmotes()
        {
            await _chat.Api(async (clientid, token) =>
            {
                using (HttpClient http = new HttpClient())
                {
                    http.DefaultRequestHeaders.Add("Client-Id", clientid);
                    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var response = await http.GetAsync($"https://api.twitch.tv/helix/users?login={Channel}");
                    var json = await response.Content.ReadAsStringAsync();
                    if (response.StatusCode == System.Net.HttpStatusCode.OK)
                    {
                        var obj = JsonConvert.DeserializeObject<JObject>(json);
                        ChannelId = obj.Value<JArray>("data").First.Value<string>("id");

                        try
                        {
                            http.DefaultRequestHeaders.Clear();
                            response = await http.GetAsync($"https://api.betterttv.net/3/cached/users/twitch/{ChannelId}");
                            json = await response.Content.ReadAsStringAsync();
                            var bttvEmotes = JsonConvert.DeserializeObject<JObject>(json);
                            var channelEmotes = bttvEmotes.Value<JArray>("channelEmotes");
                            if (channelEmotes != null)
                            {
                                foreach (var jObj in channelEmotes.Values<JObject>())
                                {
                                    var emote = new BttvEmote(jObj);
                                    BttvEmotes[emote.Code] = emote;
                                }
                            }
                            var sharedEmotes = bttvEmotes.Value<JArray>("sharedEmotes");
                            if (sharedEmotes != null)
                            {
                                foreach (var jObj in sharedEmotes.Values<JObject>())
                                {
                                    var emote = new BttvEmote(jObj);
                                    BttvEmotes[emote.Code] = emote;
                                }
                            }
                        }
                        catch (Exception e)
                        {
                            Console.Error.WriteLine($"[{DateTime.Now}] Catch error while trying to get bttv emotes on channel {Channel}#{ChannelId}\n{e.Message}\n{e.StackTrace}\n\n{json}\n");
                        }
                    }
                    else
                    {
                        Console.Error.WriteLine($"[{DateTime.Now}] Failed to get id of {Channel} channel\n{json}");
                    }
                }
            });

            await _chat.Api(async (clientid, token)=>
            {
                using (HttpClient http = new HttpClient())
                {
                    http.DefaultRequestHeaders.Add("Client-Id", clientid);
                    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var response = await http.GetAsync($"https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id={ChannelId}");
                    var json = await response.Content.ReadAsStringAsync();
                    if (response.StatusCode == System.Net.HttpStatusCode.OK)
                    {
                        var obj = JsonConvert.DeserializeObject<JObject>(json);
                        var data = obj.Value<JArray>("data");
                        foreach (var item in data)
                        {
                            var emote = new TwitchCheerEmote(item);
                            if(!CheerEmotes.ContainsKey(emote.Prefix))
                                CheerEmotes[emote.Prefix] = emote;
                        }
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

            var lastEventId = web.GetLastEventId();
            var notSendedEvents = _events.Where(e=>!lastEventId.HasValue || e.Key > lastEventId).OrderBy(e=>e.Key);
            foreach(var e in notSendedEvents)
            {
                web.AddAsyncAction(async () => await web.SendInfoAsync(e.Key, e.Value.command, e.Value.args));
            }
        }

        private void OnWebInfoReceived(WebClient client, string command, string[] args)
        {
            if (command == "ping") client.AddAsyncAction(async () => await client.SendInfoAsync(null, "pong", ""));
            else client.AddAsyncAction(async () => await client.SendErrorAsync(null, command, 404, "Command not found"));
        }

        private void OnWebErrorReceived(WebClient client, string command, int code, string error)
        {
            Console.WriteLine($"[{DateTime.Now}] Client sent error on command '{command}' with code {code} and text '{error}' in {Channel} channel");
        }

        private void OnWebConnectionClose(WebClient client)
        {
            _webs.TryRemove(client.Id, out _);
        }

        private void OnTwitchCommandReceive(ChatMessage message, string command, List<string> args, string rawArgs)
        {
            if (message.Channel != Channel) return;

            switch(command)
            {
                case "dropparachute": args.Insert(0, "parachute"); Drop(message.DisplayName, args, message.EmoteSet, message.Bits); break;
                case "dropcake": args.Insert(0, "cake"); Drop(message.DisplayName, args, message.EmoteSet, message.Bits); break;
                case "drop": Drop(message.DisplayName, args, message.EmoteSet, message.Bits); break;
                case "dropshow": DropShow(); break;
                case "drophide": DropHide(message.Username.ToLower()); break;
                case "dropreset": DropReset(message.Username.ToLower()); break;
            }
        }

        private void Drop(string username, List<string> args, EmoteSet twitchEmotes, int bitsCount)
        {
            List<decimal> digits = new List<decimal>();
            List<string> strings = new List<string>();
            List<AEmote> emotes = new List<AEmote>();
            emotes.AddRange(twitchEmotes.Emotes.Select(e => new TwitchEmote(e)));

            string[] reservedWords = new[] { "parachute", "cake" };

            foreach (var arg in args)
            {
                if(reservedWords.Contains(arg))
                {
                    strings.Add(arg);
                }
                else if(bitsCount > 0)
                {
                    var match = CheerEmotes.Select(i=>i.Value).Where(i=>Regex.IsMatch(arg, $"^{i.Prefix}[0-9]*$"));
                    foreach (var item in match)
                        emotes.Add(item.GetTierEmote(bitsCount));
                }
                else
                {
                    string str = arg;
                    if (Emoji.ContainsKey(arg)) str = Emoji[arg];

                    var path = Path.Combine("wwwroot", "img", "custom");
                    var dir = new DirectoryInfo(path);

                    if (arg=="something")
                        emotes.Add(GetRandomEmote(dir));
                    else if (BttvEmotes.ContainsKey(str))
                        emotes.Add(BttvEmotes[str]);
                    else
                    {
                        var custom = GetCustomEmote(dir, str);
                        if(custom != null)
                            emotes.Add(custom);
                        else if (decimal.TryParse(str, out var num))
                            digits.Add(num);
                        else
                            strings.Add(str);
                    }
                }
            }

            decimal? angle = null;
            if (digits.Count > 0) angle = digits[0];
            decimal? initSpeed = null;
            if (digits.Count > 1) initSpeed = digits[1];

            bool canParachute = strings.Contains("parachute");
            bool isCake = strings.Contains("cake") || (DateTime.Now.Day == 3 && DateTime.Now.Month == 4);

            if(bitsCount > 0)
            {
                foreach(var emote in emotes)
                {
                    Drop(username, angle, initSpeed, bitsCount, true, canParachute, isCake ? true : null, emote?.GetInfo());
                }
            }
            else
            {
                AEmote emote = emotes.FirstOrDefault();
                Drop(username, angle, initSpeed, bitsCount, false, canParachute, isCake ? true : null, emote?.GetInfo());
            }
        }

        private void Drop(string username, decimal? angle, decimal? initSpeed, int? bits, bool ignoreDropped, bool canParachute, bool? isCake, Dictionary<string, object> image)
        {
            var info = new Dictionary<string, object>();
            info["canParachute"] = canParachute;
            info["ignoreDropped"] = ignoreDropped;
            if (angle.HasValue) info["angle"] = angle.Value.ToString().Replace(',', '.');
            if (initSpeed.HasValue) info["initSpeed"] = initSpeed.Value.ToString().Replace(',', '.');
            if (bits.HasValue && bits.Value > 0) info["bits"] = bits;
            if (isCake.HasValue) info["isCake"] = isCake;

            var options = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(info)));
            var sprite = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(image)));

            SendInfoToAllWeb("drop", new List<string>() { username, options, sprite });
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
            string message = $"";
            if (args != null) message = string.Join(" ", args);
            SendInfoToAllWeb(command, message);
        }

        private void SendInfoToAllWeb(string command, string args)
        {
            _lastEventId++;
            _events[_lastEventId] = (command, args);
            foreach (var client in _webs.Values)
            {
                client.AddAsyncAction(async () => await client.SendInfoAsync(_lastEventId, command, args));
            }
        }

        public static async Task Init()
        {
            using (HttpClient http = new HttpClient())
            {
                var response = await http.GetAsync("https://api.betterttv.net/3/cached/emotes/global");
                var json = await response.Content.ReadAsStringAsync();
                var globalBttvEmotes = JsonConvert.DeserializeObject<BttvEmote[]>(json);
                foreach (var emote in globalBttvEmotes)
                {
                    BttvEmotes.Add(emote.Code, emote);
                    if (emote.ImageType == "gif")
                        emote.CreateAnimation();
                }
            }

            if(File.Exists("wwwroot/static/emoji.json"))
            {
                string json = await File.ReadAllTextAsync("wwwroot/static/emoji.json");
                var array = JsonConvert.DeserializeObject<JArray>(json);
                foreach (var item in array)
                {
                    string emoji = item.Value<string>("emoji");
                    string name = item.Value<string>("name");

                    Emoji[emoji] = name;
                }
            }
        }

        private static CustomEmote GetCustomEmote(DirectoryInfo dir, string name)
        {
            var files = dir.GetFiles();
            var file = files.Where(f=>$"{name.ToLower()}.png".EndsWith(f.Name.ToLower())).OrderBy(f=>Rand.NextDouble());
            if(file.Count() != 0) return new CustomEmote(file.First());

            var emotes = new List<CustomEmote>();

            var dirs = dir.GetDirectories();
            var folder = dirs.Where(d=>name.ToLower().Contains(d.Name.ToLower())).OrderBy(f=>Rand.NextDouble());
            if(folder.Count() != 0)
            {
                var emote = GetCustomEmote(folder.First(), name);
                if(emote != null) emotes.Add(emote);
            }
            else
            {
                foreach(var d in dirs)
                {
                    var emote = GetCustomEmote(d, name);
                    if(emote != null) emotes.Add(emote);
                }
            }
            if(emotes.Count == 0) return null;
            else return emotes[Rand.Next(0, emotes.Count)];
        }

        private static AEmote GetRandomEmote(DirectoryInfo dir)
        {
            if(Rand.Next(0, 3) == 0)
            {
                var bttvs = BttvEmotes.Values.ToList();
                return bttvs[Rand.Next(0, bttvs.Count)];
            }

            var files = dir.GetFiles();
            var dirs = dir.GetDirectories();

            if(files.Length == 0 && dirs.Length == 0) return null;
            else if(dirs.Length == 0)
            {
                var file = files[Rand.Next(0, files.Length)];
                return new CustomEmote(file);
            }
            else if(files.Length == 0)
            {
                var d = dirs[Rand.Next(0, dirs.Length)];
                return GetRandomEmote(d);
            }
            else
            {
                if(Rand.Next(0, 2) == 0)
                {
                    var file = files[Rand.Next(0, files.Length)];
                    return new CustomEmote(file);
                }
                else
                {
                    var d = dirs[Rand.Next(0, dirs.Length)];
                    return GetRandomEmote(d);
                }
            }
        }
    }
}
