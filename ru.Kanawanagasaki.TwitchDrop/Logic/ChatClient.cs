using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
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

        // used to reconnect to channels when we disconnecting from chat
        private List<string> _joinedChannels = new List<string>();

        // used to not leave channel, but give time websocket to reconnect  
        private List<string> _leavingChannels = new List<string>();
        private System.Timers.Timer _timer;

        private string _botname;
        private string _oauth;
        private string _clientid;
        private string _secret;
        private string _accessToken;

        private DateTime _accessTokenExpireDT;

        public delegate void CommandReceive(string channel, string username, string displayname, string command, List<string> args, EmoteSet emotes);
        public event CommandReceive OnCommandReceive;

        public bool IsConnected { get; private set; } = false;

        public ChatClient(string botname, string oauth, string clientid, string secret)
        {
            _botname = botname;
            _oauth = oauth;
            _clientid = clientid;
            _secret = secret;

            InitConnection();
            UpdateToken();

            _timer = new System.Timers.Timer();
            _timer.Interval = 5 * 60 * 1000;
            _timer.Elapsed += OnTimerElapsed;
            _timer.Start();
        }

        public void Api(Action<string, string> action)
        {
            action(_clientid, _accessToken);
        }

        private void UpdateToken()
        {
            Console.WriteLine($"[{DateTime.Now}] Updating Access Token");

            var data = new Dictionary<string, string>();
            data["client_id"] = _clientid;
            data["client_secret"] = _secret;
            data["grant_type"] = "client_credentials";
            data["scope"] = "";

            using (HttpClient http = new HttpClient())
            using (FormUrlEncodedContent content = new FormUrlEncodedContent(data))
            {
                var response = http.PostAsync("https://id.twitch.tv/oauth2/token", content).Result;
                if(response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    var json = response.Content.ReadAsStringAsync().Result;
                    var obj = JsonConvert.DeserializeObject<JObject>(json);

                    _accessToken = obj.Value<string>("access_token");
                    var expiresIn = obj.Value<int>("expires_in");
                    _accessTokenExpireDT = DateTime.UtcNow.AddSeconds(expiresIn - 5 * 60);

                    Console.WriteLine($"[{DateTime.Now}] Access Token Updated");
                }
                else
                {
                    var errorJson = response.Content.ReadAsStringAsync().Result;
                    Console.Error.WriteLine($"[{DateTime.Now}] Failed to update Access Token\n{errorJson}");
                }
            }
        }

        public bool IsJoined(string channel)
        {
            return _joinedChannels.Contains(channel);
        }

        public void JoinChannel(string channel)
        {
            if (!IsConnected) _joinedChannels.Add(channel);
            else _twitch.JoinChannel(channel);
        }

        public void LeavingChannel(string channel)
        {
            if(!_leavingChannels.Contains(channel))
                _leavingChannels.Add(channel);
        }

        public void LeaveChannel(string channel)
        {
            if (!IsConnected && _joinedChannels.Contains(channel))
                _joinedChannels.Remove(channel);
            else _twitch.LeaveChannel(channel);
        }

        private void OnTimerElapsed(object sender, System.Timers.ElapsedEventArgs e)
        {
            while(_leavingChannels.Count != 0)
            {
                string channel = _leavingChannels.First();
                LeaveChannel(channel);
                _leavingChannels.RemoveAt(0);
            }

            if(_accessTokenExpireDT < DateTime.UtcNow)
            {
                UpdateToken();
            }
        }

        private void InitConnection()
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

            OnCommandReceive?.Invoke(e.ChatMessage.Channel, e.ChatMessage.Username.ToLower(), e.ChatMessage.DisplayName, command, split.Skip(1).ToList(), e.ChatMessage.EmoteSet);
        }

        private void OnLeftChannel(object sender, TwitchLib.Client.Events.OnLeftChannelArgs e)
        {
            Console.WriteLine($"[{DateTime.Now}] Channel '{e.Channel}' left");
            if (_joinedChannels.Contains(e.Channel))
                _joinedChannels.Remove(e.Channel);
        }

        private void OnDisconnected(object sender, TwitchLib.Communication.Events.OnDisconnectedEventArgs e)
        {
            Console.WriteLine($"[{DateTime.Now}] Disconnected from twitch");
            IsConnected = false;
            InitConnection();
        }
    }
}
