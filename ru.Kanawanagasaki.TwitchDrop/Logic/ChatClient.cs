using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using TwitchLib.Client;
using TwitchLib.Client.Models;
using TwitchLib.Communication.Clients;
using TwitchLib.Communication.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class ChatClient
    {
        private TwitchClient _twitch;

        private List<string> _joinedChannels = new List<string>();

        private List<string> _leavingChannels = new List<string>();
        private Thread _thread;

        private string _botname;
        private string _oauth;
        private string _clientid;
        private string _secret;
        private string _accessToken;

        private bool _isInitializing = false;

        private DateTime _accessTokenExpireDT;

        public delegate void CommandReceive(ChatMessage message, string command, List<string> args, string rawArgs);
        public event CommandReceive OnCommandReceive;

        public bool IsConnected { get; private set; } = false;

        public ChatClient(string botname, string oauth, string clientid, string secret)
        {
            _botname = botname;
            _oauth = oauth;
            _clientid = clientid;
            _secret = secret;
        }

        public async Task Init()
        {
            await UpdateToken();
            new Timer(async (e) => await OnTimerElapsed(), null, 0, 30 * 60 * 1000);
        }

        public async Task Api(Func<string, string, Task> action)
        {
            await action(_clientid, _accessToken);
        }

        private async Task UpdateToken()
        {
            Console.WriteLine($"[{DateTime.Now}] Updating Access Token");

            if(File.Exists("twitchaccesstoken.json"))
            {
                var json = await File.ReadAllTextAsync("twitchaccesstoken.json");

                var obj = JsonConvert.DeserializeObject<JObject>(json);

                _accessToken = obj.Value<string>("access_token");
                var expiresIn = obj.Value<int>("expires_in");
                _accessTokenExpireDT = DateTime.UtcNow.AddSeconds(expiresIn - 5 * 60);
                
                if(_accessTokenExpireDT > DateTime.UtcNow)
                {
                    Console.WriteLine($"[{DateTime.Now}] Access Token Updated From Cache");
                    return;
                }
            }

            var data = new Dictionary<string, string>();
            data["client_id"] = _clientid;
            data["client_secret"] = _secret;
            data["grant_type"] = "client_credentials";
            data["scope"] = "";

            using (HttpClient http = new HttpClient())
            using (FormUrlEncodedContent content = new FormUrlEncodedContent(data))
            {
                var response = await http.PostAsync("https://id.twitch.tv/oauth2/token", content);
                if(response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    await File.WriteAllTextAsync("twitchaccesstoken.json", json);

                    var obj = JsonConvert.DeserializeObject<JObject>(json);

                    _accessToken = obj.Value<string>("access_token");
                    var expiresIn = obj.Value<int>("expires_in");
                    _accessTokenExpireDT = DateTime.UtcNow.AddSeconds(expiresIn - 5 * 60);

                    Console.WriteLine($"[{DateTime.Now}] Access Token Updated");
                }
                else
                {
                    var errorJson = await response.Content.ReadAsStringAsync();
                    Console.Error.WriteLine($"[{DateTime.Now}] Failed to update Access Token\n\t - {errorJson}");
                }
            }
        }

        public bool IsJoined(string channel)
        {
            return _joinedChannels.Contains(channel);
        }

        public void JoinChannel(string channel)
        {
            if (!IsConnected)
            {
                _joinedChannels.Add(channel);
                this.InitConnection();
            }
            else _twitch.JoinChannel(channel);
        }

        public void LeavingChannel(string channel)
        {
            if(!_leavingChannels.Contains(channel))
                _leavingChannels.Add(channel);
        }

        public void LeaveChannel(string channel)
        {
            if (!IsConnected)
            {
                if(_joinedChannels.Contains(channel))
                    _joinedChannels.Remove(channel);
            }    
            else _twitch.LeaveChannel(channel);
        }

        private async Task OnTimerElapsed()
        {
            while(_leavingChannels.Count != 0)
            {
                string channel = _leavingChannels.First();
                LeaveChannel(channel);
                _leavingChannels.RemoveAt(0);
            }

            if(_accessTokenExpireDT < DateTime.UtcNow)
            {
                await UpdateToken();
            }
        }

        private void InitConnection()
        {
            if(_isInitializing || (_twitch != null && _twitch.IsConnected)) return;
            _isInitializing = true;

            _thread = new Thread(()=>
            {
                Console.WriteLine($"[{DateTime.Now}] Initializing connection to twitch with '{_botname}' botname");

                if (_twitch != null)
                {
                    if (IsConnected)
                        _twitch.Disconnect();
                    _twitch = null;
                }

                ConnectionCredentials credentials = new ConnectionCredentials(_botname, _oauth);
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

                _isInitializing = false;
            });
            _thread.Start();
        }

        private void OnConnected(object sender, TwitchLib.Client.Events.OnConnectedArgs e)
        {
            Console.WriteLine($"[{DateTime.Now}] Successfully connected to twitch");

            IsConnected = true;
            foreach (var channel in _joinedChannels)
            {
                _twitch.JoinChannel(channel);
            }
        }

        private void OnJoinedChannel(object sender, TwitchLib.Client.Events.OnJoinedChannelArgs e)
        {
            Console.WriteLine($"[{DateTime.Now}] Channel '{e.Channel}' joined");
            if (!_joinedChannels.Contains(e.Channel))
                _joinedChannels.Add(e.Channel);
        }

        public void SendMessage(string channel, string message)
        {
            _twitch.SendMessage(channel, message);
        }

        private void OnMessageReceived(object sender, TwitchLib.Client.Events.OnMessageReceivedArgs e)
        {
            if (!e.ChatMessage.Message.StartsWith("!")) return;

            string message = "";
            int buffIndex = 0;
            foreach(var emote in e.ChatMessage.EmoteSet.Emotes.OrderBy(e=>e.StartIndex))
            {
                message += e.ChatMessage.Message.Substring(buffIndex, emote.StartIndex - buffIndex);
                buffIndex = emote.EndIndex + 1;
            }
            message += e.ChatMessage.Message.Substring(Math.Max(0, Math.Min(buffIndex, e.ChatMessage.Message.Length)));
            message = Regex.Replace(message.Substring(1), " {2,}", " ");

            string[] split = message.Split(' ');
            string command = split[0];

            if (command == "") return;

            switch(command)
            {
                case "bf":
                case "brnfck":
                case "brainfuck":
                    Brainfuck(e.ChatMessage.Channel, e.ChatMessage.DisplayName, string.Join(" ", e.ChatMessage.Message.Split(' ').Skip(1)));
                    break;
                default: 
                    OnCommandReceive?.Invoke(   e.ChatMessage,
                                                command,
                                                split.Skip(1).ToList(),
                                                string.Join(" ", e.ChatMessage.Message.Split(' ').Skip(1)));
                    break;
            }
        }

        private void OnLeftChannel(object sender, TwitchLib.Client.Events.OnLeftChannelArgs e)
        {
            Console.WriteLine($"[{DateTime.Now}] Channel '{e.Channel}' left");
            if (_joinedChannels.Contains(e.Channel))
                _joinedChannels.Remove(e.Channel);
            if(_joinedChannels.Count == 0)
                _twitch.Disconnect();
        }

        private void OnDisconnected(object sender, TwitchLib.Communication.Events.OnDisconnectedEventArgs e)
        {
            Console.WriteLine($"[{DateTime.Now}] Disconnected from twitch");
            IsConnected = false;

            if(_joinedChannels.Count != 0)
                InitConnection();
        }

        private void Brainfuck(string channel, string displayname, string args)
        {
            char[] symbs = new[] {'>','<','+','-','.',',','[',']'};
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
            var encoding = Encoding.GetEncoding("windows-1251");

            byte[] arr = new byte[2048];
            int arrI = 0;
            int i = 0;
            int iterations = 0;

            string code = "";
            string input = "";

            foreach(var c in args)
                if(symbs.Contains(c)) code += c;
                else input += c;
            
            var inputArr = encoding.GetBytes(input).ToList();
            var outputArr = new List<byte>();

            while(iterations < 32_000 && i < code.Length && outputArr.Count < 500)
            {
                switch(code[i])
                {
                    case '>':
                        arrI = (arrI+1) % arr.Length;
                        break;
                    case '<':
                        arrI--;
                        while(arrI < 0) arrI += arr.Length;
                        break;
                    case '+':
                        arr[arrI]++;
                        break;
                    case '-':
                        arr[arrI]--;
                        break;
                    case '.':
                        outputArr.Add(arr[arrI]);
                        break;
                    case ',':
                        if(inputArr.Count > 0)
                        {
                            arr[arrI] = inputArr[0];
                            inputArr.RemoveAt(0);
                        }
                        else arr[arrI] = 0;
                        break;
                    case '[':
                        if(arr[arrI] == 0)
                        {
                            while(i < code.Length && code[i] != ']')
                                i++;
                        }
                        break;
                    case ']':
                        if(arr[arrI] != 0)
                        {
                            i--;
                            int brk = 0;
                            while(i > 0)
                            {
                                if(code[i] == ']') brk++;
                                if(code[i] == '[')
                                {
                                    if(brk == 0) break;
                                    else brk--;
                                }
                                i--;
                            }
                        }
                        break;
                }
                iterations++;
                i++;
            }

            string output = encoding.GetString(outputArr.Where(c=>c>=32).ToArray());
            if(output == "" && iterations == 32000) _twitch.SendMessage(channel, $"@{displayname} your code takes a long time to execute");
            else if(output == "") _twitch.SendMessage(channel, $"@{displayname} there is nothing to output");
            else
            {
                _twitch.SendMessage(channel, output);
            }
        }
    }
}
