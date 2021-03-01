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
        private static uint _aiId = 10000;

        private WebSocket _socket = null;
        private byte[] _buffer = new byte[1024 * 4];

        public uint Id { get; private set; } = 0;
        public bool IsConnected { get; private set; }
        public string ChannelName { get; private set; }

        public delegate void InfoReceived(WebClient client, string command, string[] args);
        public event InfoReceived OnInfoReceived;
        public delegate void ErrorReceived(WebClient client, string command, int code, string error);
        public event ErrorReceived OnErrorReceived;
        public delegate void ConnectionClosed(WebClient client);
        public event ConnectionClosed OnConnectionClose;

        public WebClient(WebSocket socket)
        {
            Id = _aiId++;

            _socket = socket;
            IsConnected = true;
        }

        public async Task Run()
        {
            while (IsConnected)
            {
                if (_socket.CloseStatus.HasValue)
                {
                    await CloseAsync();
                }
                else
                {
                    try
                    {
                        string packet = await ReadPacket();
                        string[] split = packet.Split(' ');
                        if (split.Length > 1 && split[0] == "info")
                        {
                            OnInfoReceived?.Invoke(this, split[1], split.Skip(2).ToArray());
                        }
                        else if (split.Length > 2 && split[0] == "error")
                        {
                            int code = -1;
                            int.TryParse(split[2], out code);
                            OnErrorReceived?.Invoke(this, split[1], code, string.Join(" ", split.Skip(3)));
                        }
                    }
                    catch
                    {
                        await CloseAsync();
                    }
                }
            }
        }

        public async Task<string> ReadChannel()
        {
            if(ChannelName == null)
                ChannelName = await ReadPacket();
            return ChannelName;
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
                await CloseAsync();

            return packet;
        }

        public async Task SendInfoAsync(string command, IEnumerable<string> args = null)
        {
            string message = $"info {command}";
            if (args != null) message += " " + string.Join(" ", args);
            await SendMessageAsync(message);
        }

        public async Task SendErrorAsync(string command, int code, string error)
        {
            await SendMessageAsync($"error {command} {code} {error}");
        }

        public async Task SendMessageAsync(string message)
        {
            if (!this.IsConnected) return;
            if (_socket.CloseStatus.HasValue)
                await CloseAsync();
            else
            {
                var bytes = Encoding.UTF8.GetBytes(message);
                await _socket.SendAsync(new ArraySegment<byte>(bytes, 0, bytes.Length), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }

        public async Task CloseAsync()
        {
            if(!_socket.CloseStatus.HasValue && _socket.State != WebSocketState.Aborted)
                await _socket.CloseAsync(WebSocketCloseStatus.Empty, null, CancellationToken.None);
            IsConnected = false;
            OnConnectionClose?.Invoke(this);
        }
    }
}
