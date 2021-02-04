using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Concurrent;
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

        private ConcurrentQueue<string> _messages = new ConcurrentQueue<string>();
        private bool _handleClose = false;

        private Thread _outThread;

        public WebClient(WebSocket socket)
        {
            this._socket = socket;
            this.IsConnected = true;
        }

        public async Task Run()
        {
            while(IsConnected)
            {
                try
                {
                    string packet = await ReadPacket();
                    if (packet == "info ping")
                    {
                        await SendInfoAsync("pong");
                    }
                }
                catch
                {
                    await CloseAsync();
                }
            }
        }

        public void Handle()
        {
            _outThread = new Thread(async ()=>
            {
                while (IsConnected)
                {
                    while (_messages.Count != 0)
                    {
                        if (_messages.TryDequeue(out var message))
                        {
                            await SendMessageAsync(message);
                        }
                    }

                    if (_handleClose)
                    {
                        await CloseAsync();
                    }

                    await Task.Delay(1000);
                }
            });
            _outThread.Start();
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

        public void SendInfo(string info)
        {
            _messages.Enqueue($"info {info}");
        }

        public async Task SendInfoAsync(string info)
        {
            await SendMessageAsync($"info {info}");
        }

        public async Task SendErrorAsync(string error)
        {
            await SendMessageAsync($"error {error}");
        }

        public async Task SendMessageAsync(string message)
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

        public async Task CloseAsync()
        {
            if(_socket.State == WebSocketState.Open)
            {
                await _socket.CloseAsync(WebSocketCloseStatus.Empty, null, CancellationToken.None);
            }
            IsConnected = false;
            OnConnectionClose?.Invoke(this);
        }

        public void Close()
        {
            _handleClose = true;
        }
    }
}
