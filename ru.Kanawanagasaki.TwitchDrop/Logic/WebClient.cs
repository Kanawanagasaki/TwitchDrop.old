using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using TwitchLib.Client;
using TwitchLib.Client.Models;
using TwitchLib.Communication.Clients;
using TwitchLib.Communication.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class WebClient
    {
        public bool IsConnected { get; private set; }

        private WebSocket _socket = null;
        private byte[] _buffer = new byte[1024 * 4];
        public string ChannelName { get; private set; }

        public delegate void ConnectionClosed(WebClient client);
        public event ConnectionClosed OnConnectionClose;

        public WebClient(WebSocket socket)
        {
            this._socket = socket;
            this.IsConnected = true;
        }

        public async Task Run()
        {
            while(IsConnected)
            {
                string packet = await ReadPacket();

                // do something?
            }
        }

        public async Task<string> ReadChannel()
        {
            if(ChannelName == null)
                ChannelName = await ReadPacket();
            return ChannelName;
        }

        public bool CheckConnection()
        {
            return _socket.State == WebSocketState.Open;
        }

        private async Task<string> ReadPacket()
        {
            string packet = "";
            WebSocketReceiveResult result = await _socket.ReceiveAsync(new ArraySegment<byte>(_buffer), CancellationToken.None);
            while (!result.CloseStatus.HasValue)
            {
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    string part = Encoding.UTF8.GetString(_buffer, 0, result.Count);
                    packet += part;
                }

                if (!result.EndOfMessage) result = await _socket.ReceiveAsync(new ArraySegment<byte>(_buffer), CancellationToken.None);
                else break;
            }

            if (result.CloseStatus.HasValue)
            {
                IsConnected = false;
                OnConnectionClose?.Invoke(this);
            }

            return packet;
        }

        public async Task SendInfo(string info)
        {
            await SendMessage($"info {info}");
        }

        public async Task SendError(string error)
        {
            await SendMessage($"error {error}");
        }

        public async Task SendMessage(string message)
        {
            if (!this.IsConnected) return;
            if (_socket.State != WebSocketState.Open)
            {
                IsConnected = false;
                OnConnectionClose?.Invoke(this);
            }
            else
            {
                if (!message.EndsWith("\n")) message = $"{message}\n";
                var bytes = Encoding.UTF8.GetBytes(message);
                await _socket.SendAsync(new ArraySegment<byte>(bytes, 0, bytes.Length), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }

        public async Task Close()
        {
            await _socket.CloseAsync(WebSocketCloseStatus.Empty, null, CancellationToken.None);
            IsConnected = false;
            OnConnectionClose?.Invoke(this);
        }
    }
}
